import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import Axios from "axios";
import getAPI from "../services/api";
import { queryClient } from "../App";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdbWasm,
    mainWorker: new URL("@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js", import.meta.url).toString(),
  },
  eh: {
    mainModule: duckdbWasm,
    mainWorker: new URL("@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js", import.meta.url).toString(),
  },
};

export const getDuckDB = () => {
  return queryClient.fetchQuery({
    queryKey: ["duckdb"],
    queryFn: async () => {
      const logger = new duckdb.VoidLogger();
      // const logger = new duckdb.ConsoleLogger();
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      const worker = await new Worker(bundle.mainWorker);
      const duckDB = new duckdb.AsyncDuckDB(logger, worker);
      await duckDB.instantiate(bundle.mainModule);
      // @ts-ignore
      await duckDB.open({
        allowUnsignedExtensions: true,
        query: {
          castTimestampToDate: true,
        },
      });

      return duckDB;
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });
};

export const getDuckDBClient = () => {
  return queryClient.fetchQuery({
    queryKey: ["duckDBClient"],
    queryFn: async () => {
      const duckDB = await getDuckDB();
      const client = await duckDB.connect();
      await client.query("LOAD parquet;");
      await client.query("INSTALL parquet;");
      await client.query("INSTALL h3 from community;");
      await client.query("LOAD h3;");
      return client;
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });
};

export const getResultAsJSON = (result) => {
  const data = result.toArray();
  const jsonData = data.map((row) => row.toJSON());
  return jsonData;
};

const useDuckDBTables = (tableNames: string[], postQueries?: string[]) => {
  const [progress, setProgress] = useState(0);
  let localProgress = progress;

  const getDataset = async (table) => {
    const api = await getAPI();

    const { data: dataset } = await Axios.request({
      method: "get",
      url: `${window.location.origin}/${table}.parquet`,
      responseType: "arraybuffer",
      onDownloadProgress: (progressEvent) => {
        console.log("localProgress: ", localProgress);
        console.info(`progress downloading ${table}: `, progressEvent.loaded / progressEvent.total);
        setProgress(localProgress + progressEvent.loaded / progressEvent.total / 2);
      },
    });

    // Update the lastUpdated metadata, for future reference
    localProgress += 0.5 / tableNames.length;
    setProgress(localProgress);
    if (0.5 - progress < 0.01) setProgress(0.5);
    return new Uint8Array(dataset);
  };

  const {
    isLoading,
    error,
    data: client,
  } = useQuery({
    queryKey: ["duckDBCreate", tableNames, postQueries],
    queryFn: async () => {
      const duckDB = await getDuckDB();
      const duckDBClient = await getDuckDBClient();

      for (const table of tableNames) {
        await duckDB.registerFileBuffer(table, await getDataset(table));
        await duckDBClient.query(`CREATE TABLE ${table} AS SELECT * FROM parquet_scan('${table}')`);
      }

      if (!postQueries) return duckDBClient;
      let i = 1;
      setProgress(0);
      for (const postQuery of postQueries) {
        setProgress(0.5 + i / postQueries.length / 2);
        i++;
        await client.query(postQuery);
      }
      return client;
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });
  return { client, isLoading, error, progress };
};

export default useDuckDBTables;
