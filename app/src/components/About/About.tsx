import React, { useContext } from "react";
import { Row, Col, Typography } from "antd";
import { GlobalStateContext } from "../../contexts/GlobalStateContext";

function About() {
  const globals = useContext(GlobalStateContext);

  return (
    <div style={{ padding: 8 }}>
      <Row type="flex" style={{ height: "100%", margin: "40px 0" }} gutter={8}>
        <Col offset={5} span={14} style={{ height: "100%", marginTop: 64 }}>
          <Typography.Text>
            <h1>Master's Thesis Web Application</h1>
            <h2>Visualization of Epidemiological Data with Geospatial and Temporal Components</h2>
            <span style={{ fontStyle: "italic", marginBottom: 16 }}>By Julien Colot, August 2024</span>

            <section id="introduction">
              <h2>Introduction</h2>
              <p>
                This application is being developed as part of my master's thesis on techniques for visualizing epidemiological data with geospatial
                and temporal components. The report accompanying this application will be completed in August 2024 in pursuit of a Master in
                Statistics and Data Science at the University of Hasselt (Belgium). The goal of this application is to compare techniques of dynamic
                data aggregation for interactive visualization, specifically focusing on epidemiological data, using the{" "}
                <a href="https://labs.mosquitoalert.com/metadata_public_portal/README.html">MosquitoAlert user reports dataset</a> and{" "}
                <a href="https://www.data.gouv.fr/fr/datasets/synthese-des-indicateurs-de-suivi-de-lepidemie-covid-19/">Covid-19 data in France</a>.
              </p>
            </section>

            <section id="mosquitoalert">
              <h2>MosquitoAlert Dataset</h2>
              <p>
                This section of the application visualizes the MosquitoAlert reports dataset, which contains information about different species of
                mosquitoes collected through the Mosquito Alert citizen science initiative. The goal is to visualize this data both temporally and
                geospatially, enabling a comprehensive understanding of mosquito species' spatial distributions and trends over time.
              </p>
              <p>
                The visualization uses <a href="https://eng.uber.com/h3/">H3 hexagonal spatial indexing</a> (developed by Uber) to dynamically
                aggregate data based on the zoom level. This allows users to explore data at varying levels of detail, from broad overviews to
                detailed, localized insights. The species of mosquitoes are represented using a color scheme, with options to view the data as small
                bar plots per hexagon or as packed proportional circles.
              </p>
            </section>

            <section id="covid19">
              <h2>Covid-19 in France</h2>
              <p>
                This section focuses on the Covid-19 pandemic in France. The dataset includes various indicators such as case numbers,
                hospitalizations, ICU hospitalizations, and deaths at the French department level. Like the MosquitoAlert section, this part of the
                application provides both temporal and geospatial visualizations.
              </p>
              <p>
                Using <a href="https://eng.uber.com/h3/">H3</a> and <a href="https://duckdb.org/">DuckDB</a>, combined with data from{" "}
                <a href="https://www.kontur.io/portfolio/population-dataset/">Kontur's population dataset</a>, the visualization shows the population
                affected through circles proportional to the population count within H3-defined hexagons. The selected indicator is represented using
                a color scheme. This allows users to interactively explore the pandemic's progression and impact across different departments of
                France. Additionally, an animation feature enables users to visualize the pandemic's evolution over time.
              </p>
            </section>

            <section id="technology">
              <h2>Technology Overview</h2>
              <p>
                The application runs in the browser without dependence on an external API. The datasets are loaded from Parquet files, which are
                ingested into a <a href="https://duckdb.org/">DuckDB</a> database and queried directly in the browser using SQL. The frontend is built
                with <a href="https://reactjs.org/">React</a> and <a href="https://ant.design/">Ant Design</a>, and the visualizations are created
                with <a href="https://deck.gl/">Deck.gl</a> (map) and <a href="https://d3js.org/">D3.js</a> (timeline).
              </p>
              <p>
                The application leverages <a href="https://eng.uber.com/h3/">H3</a>, to efficiently manage and visualize geospatial data. This allows
                for dynamic aggregation of data based on the user's zoom level, providing a responsive user experience.
              </p>
              <p>
                Similarly, for time, the data is aggregated into variable time buckets based on the user's selected time range. This allows users to
                fluidly explore the data at different temporal resolutions, from minute (MosquitoAlert) or daily (COVID-19) to monthly views.
              </p>
              <p>
                The proposed technique of grid aggregation using H3 is compared to the established technique of hierarchical greedy clustering in
                terms of visual appearance, performance, and user experience. The goal is to determine the most effective method for visualizing
                large-scale datasets with geospatial and temporal components. The results of this comparison will be presented in the final thesis.
              </p>
              <p>
                <a href="https://duckdb.org/">DuckDB</a>, an in-process SQL OLAP database management system, is used for its high-performance querying
                capabilities. This combination of H3 and DuckDB ensures that the application can handle relatively large datasets in the browser and
                perform complex aggregations on-the-fly, making it an effective solution for interactive data visualization.
              </p>
            </section>
          </Typography.Text>
        </Col>
      </Row>
    </div>
  );
}

export default About;
