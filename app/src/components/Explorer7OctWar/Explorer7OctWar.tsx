import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactMapGL, { NavigationControl, Popup, useControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ZoomableTimeline from "./timelines/ZoomableTimeline";
import SelectActorList from "./SelectActorList";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "./Explorer.css";
import { GlobalStateContext } from "../../contexts/GlobalStateContext";
import { debounce, throttle } from "lodash";
import useDuckDBTables from "../../hooks/useDuckDBTables";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature } from "geojson";
import * as d3 from "d3";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import * as h3 from "h3-js";
import { Button, Drawer, Modal, Segmented, Select, Spin } from "antd";
import Label from "../UI/Label";
import { SettingOutlined } from "@ant-design/icons";
import useStore from "../../hooks/useStore";
import BrushableTimeline from "./timelines/BrushableTimeline";
import { useQuery } from "@tanstack/react-query";
import CircleLegend from "./legends/CircleLegend";
import colorBrewer from "./colorBrewer";
import EventTable from "./EventTable";

const INITIAL_VIEW_STATE = {
  longitude: 35,
  latitude: 35,
  zoom: 5,
  pitch: 0,
  bearing: 0,
  width: "100%",
  height: "calc(100% - 100px)",
};

function DeckGLOverlay(props) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

// DeckGL react component
const Explorer7OctWar = () => {
  const { globalState } = useContext(GlobalStateContext);
  const [h3Resolution, setH3Resolution] = useState(10);
  const mapRef = useRef();
  const timelineRef = useRef();
  const timelineHeight = 160;
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [h3Indexes, setH3Indexes] = useState([]);
  const [presenceLayerOpacity, setPresenceLayerOpacity] = useState(0.01);
  const [mapBounds, setMapBounds] = useState(null);
  const [maxRadiusPixels, setMaxRadiusPixels] = useState(0);
  const [maxRadiusCount, setMaxRadiusCount] = useState(0);
  const [timeBucket, setTimeBucket] = useState("1 month");
  const [timelineData, setTimelineData] = useState([]);
  const [brushableTimelineData, setBrushableTimelineData] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [selectedActors, setSelectedActors] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("EventCount");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(null);
  const [layerType, setLayerType] = useState("packed-circles");
  const [symbolScale, setSymbolScale] = useState(1);
  const [isH3ResolutionLocked, setIsH3ResolutionLocked] = useState(false);
  const isH3ResolutionLockedRef = useRef(isH3ResolutionLocked);
  const brushableTimelineRef = useRef();
  const setVisibleTimelineDomain = useStore((state) => state.setVisibleTimelineDomain);
  const visibleTimelineDomain = useStore((state) => state.visibleTimelineDomain);
  const [mapReady, setMapReady] = useState(false);
  const [aggregationType, setAggregationType] = useState("h3");
  const tooltipRef = useRef(null);
  const [eventTableData, setEventTableData] = useState([]);

  function calculateTimeBucket(density) {
    const base = 0.032;
    if (density > base * 4 * 24 * 7 * 4.2 * 3) return "1 year";
    if (density > base * 4 * 24 * 7 * 4.2) return "3 months";
    if (density > base * 4 * 24 * 7) return "1 month";
    if (density > base * 4 * 24) return "1 week";
    if (density > base * 4) return "1 day";
    return "1 hour";
  }

  const getH3Resolution = useCallback((zoom, latitude = 0, longitude = 0, targetRadiusPixels = 50, min = 0, max = 15) => {
    // Constants for the Earth's radius and tile size
    const earthRadius = 6378137; // in meters
    const tileSize = 512;

    // Calculate the ground resolution at the given latitude and zoom level
    const groundRes = (Math.cos((latitude * Math.PI) / 180) * 2 * Math.PI * earthRadius) / (tileSize * Math.pow(2, zoom));
    // Find the smallest resolution where the edge length in pixels is less than the desired pixel size
    for (let res = min; res <= max; res++) {
      const area = h3.cellArea(h3.latLngToCell(latitude, longitude, res), h3.UNITS.m2);
      const radiusMeters = Math.sqrt(area / Math.PI);
      const radiusPixels = radiusMeters / groundRes;
      if (radiusPixels <= targetRadiusPixels) {
        return res - 1;
      }
    }

    // Return the highest resolution if none are small enough
    return max;
  }, []);

  const getGroundResolution = useCallback((latitude, zoom) => {
    const tileSize = 512;
    return (Math.cos((latitude * Math.PI) / 180) * 2 * Math.PI * 6378137) / (tileSize * Math.pow(2, zoom));
  }, []);

  const getMaxRadius = useCallback((h3Resolution, zoom, latitude = 0, longitude = 0, units) => {
    const groundResolution = getGroundResolution(latitude, zoom);
    const area = h3.cellArea(h3.latLngToCell(latitude, longitude, h3Resolution), h3.UNITS.m2);
    // Calculate the radius in meters from an hexagon with the given area
    const radiusMeters = Math.sqrt((2 * area) / (3 * Math.sqrt(3)));
    const radiusPixels = radiusMeters / groundResolution;

    let scalingFactor = 1;

    if (radiusPixels > 30) scalingFactor = 30 / radiusPixels;

    if (units === "meters") return radiusMeters * scalingFactor * symbolScale;
    if (units === "pixels") return Math.min(radiusPixels, 30) * symbolScale;
  }, []);

  const updateTooltip = ({ object, x, y }) => {
    if (object) {
      tooltipRef.current.style.display = "block";
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const tooltipHeight = tooltipRef.current.offsetHeight;
      tooltipRef.current.style.left = `${x - tooltipWidth / 2}px`;
      tooltipRef.current.style.top = `${y - tooltipHeight - 10}px`;
      const metricText = selectedMetric === "EventCount" ? "events" : "fatalities";
      tooltipRef.current.innerHTML = `${object.properties.actorName}: ${object.properties.count} ${metricText}`;
    } else {
      tooltipRef.current.style.display = "none";
    }
  };

  const pointLayer = new GeoJsonLayer({
    id: "point-layer",
    data: features,
    stroked: false,
    filled: true,
    pointType: "circle",
    pickable: true,
    onHover: (info) => {
      updateTooltip({ object: info.object, x: info.x, y: info.y });
    },
    onClick: (info) => {
      if (info?.object?.properties?.h3Index) {
        duckDBClient
          .query(
            `
        SELECT *, make_timestamp(timestamp * 1000000) as timestamp, fatalities::INTEGER as fatalities
        FROM acled_reports WHERE h3_cell_to_parent(h3_index, ${h3Resolution}) = '${info.object.properties.h3Index}' 
        AND actor_id = ${info.object.properties.actorId} 
        AND make_timestamp(timestamp * 1000000) BETWEEN '${visibleTimelineDomain[0].toISOString()}'::TIMESTAMP 
        AND '${visibleTimelineDomain[1].toISOString()}'::TIMESTAMP ORDER BY timestamp;
        `,
          )
          .then((data) => {
            setEventTableData(data.toArray().map((row) => row.toJSON()));
          });
      }
    },
    getFillColor: (d) => {
      const { r, g, b, a } = d.properties.color;
      return [r, g, b, a * 255];
    },
    getPointRadius: (d) => d.properties.radius,
    opacity: 0.95,
    beforeId: "waterway-label",
  });

  const h3PresenceLayer = new H3HexagonLayer({
    id: "h3-presence-layer",
    data: h3Indexes,
    extruded: false,
    getHexagon: (d) => d.h3Index,
    getLineColor: globalState.theme === "DARK" ? [255, 255, 255, 100] : [0, 0, 0, 100],
    getLineWidth: 0.5,
    lineWidthUnits: "pixels",
    getFillColor: (d) => (globalState.theme === "DARK" ? [255, 255, 255, 100] : [0, 0, 0, 100]),
    pickable: true,
    opacity: presenceLayerOpacity,
    beforeId: "waterway-label",
  });

  const layers = [];

  if (aggregationType === "none") {
    layers.push(pointLayer);
  } else {
    if (aggregationType === "h3") layers.push(h3PresenceLayer);
    if (layerType === "packed-circles") layers.push(pointLayer);
  }

  const tableNames = ["acled_reports"];
  const { client: duckDBClient, isLoading: isDuckDBTablesLoading } = useDuckDBTables(tableNames);
  const { data: dataTimeDomain } = useQuery(
    ["data-time-domain"],
    async () => {
      const query = `
      SELECT 
        MIN(timestamp)::INT AS min,
        MAX(timestamp)::INT AS max
      FROM 
        acled_reports;
    `;
      const data = await duckDBClient.query(query);
      return Object.values(data.toArray().map((row) => row.toJSON())[0])
        .sort()
        .map((timestamp) => new Date(timestamp * 1000));
    },
    { enabled: !!duckDBClient },
  );

  const { data: actors } = useQuery(
    ["actors"],
    async () => {
      const query = `
      SELECT DISTINCT actor_name as name, actor_id::INT AS id FROM acled_reports;
    `;
      const data = await duckDBClient.query(query);
      const actors = Object.values(data.toArray().map((row) => row.toJSON()));
      return actors;
    },
    { enabled: !!duckDBClient },
  );

  const { data: eventTypes } = useQuery(
    ["event-types"],
    async () => {
      const query = `
      SELECT DISTINCT event_type as eventType, event_type_id::INT AS id FROM acled_reports;
    `;
      const data = await duckDBClient.query(query);
      const eventTypes = Object.values(data.toArray().map((row) => row.toJSON()));
      return eventTypes;
    },
    { enabled: !!duckDBClient },
  );

  useEffect(() => {
    const fetchData = async (duckDBClient) => {
      const mapH3AggregationQuery = `
        WITH avg_ij AS (
          SELECT 
            SUM(CASE WHEN actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) THEN 1 ELSE 0 END) AS totalEventCount,
            SUM(CASE WHEN actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) THEN fatalities ELSE 0 END) AS totalFatalityCount,
            ${selectedActors.map(({ id }) => `SUM(CASE WHEN actor_id = ${id} THEN 1 ELSE 0 END) AS "actor${id}EventCount"`).join(", ")},
            ${selectedActors.map(({ id }) => `SUM(CASE WHEN actor_id = ${id} THEN fatalities ELSE 0 END) AS "actor${id}FatalityCount"`).join(", ")},
            h3_cell_to_parent(h3_index, ${h3Resolution}) as h3_parent_index,
            h3_cell_to_center_child(h3_parent_index, 15) as h3_parent_center_index,
            AVG(h3_cell_to_local_ij(
                h3_cell_to_center_child(h3_cell_to_parent(h3_index, ${h3Resolution}), 15),
                h3_cell_to_center_child(h3_index, 15)
            )[1]::INT) AS avg_i,
            AVG(h3_cell_to_local_ij(
                h3_cell_to_center_child(h3_cell_to_parent(h3_index, ${h3Resolution}), 15),
                h3_cell_to_center_child(h3_index, 15)
            )[2]::INT) AS avg_j,
             FROM
            acled_reports
          WHERE 
            actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) 
            AND make_timestamp(timestamp * 1000000) BETWEEN '${visibleTimelineDomain[0].toISOString()}'::TIMESTAMP AND '${visibleTimelineDomain[1].toISOString()}'::TIMESTAMP
            AND latitude BETWEEN ${mapBounds.minLat} AND ${mapBounds.maxLat} 
            AND longitude BETWEEN ${mapBounds.minLng} AND ${mapBounds.maxLng}
            AND event_type_id = ${selectedEventTypeId}
        GROUP BY h3_parent_index), 
        avg_cells AS (SELECT *, h3_local_ij_to_cell(h3_parent_center_index, avg_i::INT, avg_j::INT) AS avg_cell FROM avg_ij)
        SELECT 
            h3_parent_index as h3Index,
            h3_cell_to_lat(avg_cell) as latitude, 
            h3_cell_to_lng(avg_cell) as longitude,
            h3_cell_area(avg_cell, 'km^2') AS cellArea,
            ${selectedActors.map(({ id }) => `actor${id}EventCount::INTEGER as actor${id}EventCount`).join(", ")},
            ${selectedActors.map(({ id }) => `actor${id}FatalityCount::INTEGER as actor${id}FatalityCount`).join(", ")},
            totalEventCount::INTEGER AS totalEventCount,
            totalFatalityCount::INTEGER AS totalFatalityCount
        FROM avg_cells
        `;

      const timelineQuery = `
        SELECT
            TIME_BUCKET(INTERVAL '${timeBucket}', make_timestamp(timestamp * 1000000)) AS start,
            TIME_BUCKET(
                INTERVAL '${timeBucket}',
                TIME_BUCKET(INTERVAL '${timeBucket}', make_timestamp(timestamp * 1000000)) + INTERVAL '${timeBucket}'
            ) AS end,
            ${selectedActors.map(({ id }) => `SUM(CASE WHEN actor_id = '${id}' THEN 1 ELSE 0 END)::INTEGER AS actor${id}EventCount`).join(", ")},
            ${selectedActors.map(({ id }) => `SUM(CASE WHEN actor_id = '${id}' THEN fatalities ELSE 0 END)::INTEGER AS actor${id}FatalityCount`).join(", ")},
            SUM(CASE WHEN actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) THEN 1 ELSE 0 END)::INTEGER AS totalEventCount,
            SUM(CASE WHEN actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) THEN fatalities ELSE 0 END)::INTEGER AS totalFatalityCount,
        FROM
            acled_reports
        WHERE
            actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) 
            AND make_timestamp(timestamp * 1000000) BETWEEN '${visibleTimelineDomain[0].toISOString()}'::TIMESTAMP AND '${visibleTimelineDomain[1].toISOString()}'::TIMESTAMP
            AND h3_cell_to_lat(CONCAT('0x', h3_index)::UBIGINT) BETWEEN ${mapBounds.minLat} AND ${mapBounds.maxLat} 
            AND h3_cell_to_lng(CONCAT('0x', h3_index)::UBIGINT) BETWEEN ${mapBounds.minLng} AND ${mapBounds.maxLng}
            AND event_type_id = ${selectedEventTypeId}
        GROUP BY
            TIME_BUCKET(INTERVAL '${timeBucket}', make_timestamp(timestamp * 1000000))
        ORDER BY
            start;
      `;

      let mapTable = [];
      let timelineData = [];

      if (selectedActors.length > 0) {
        console.log("fetching data...");
        const mapArrow = await duckDBClient.query(mapH3AggregationQuery);
        const timelineArrow = await duckDBClient.query(timelineQuery);
        mapTable = mapArrow.toArray().map((row) => row.toJSON());
        timelineData = timelineArrow.toArray().map((row) => row.toJSON());
      }

      await setLoading(true);
      const zoom = mapRef.current?.getZoom() || 15;

      let features: Feature[] = [];
      const latitude = mapRef.current.getCenter().lat;
      const longitude = mapRef.current.getCenter().lng;

      const maxRadiusMeters = getMaxRadius(h3Resolution, zoom, latitude, longitude, "meters");
      const maxRadiusPixels = getMaxRadius(h3Resolution, zoom, latitude, longitude, "pixels");

      const maxCount = mapTable.reduce((acc, curr) => {
        if (curr[`total${selectedMetric}`] > acc) {
          return curr[`total${selectedMetric}`];
        }
        return acc;
      }, 0);

      features = mapTable
        .map((row) => {
          const metersByLatitudeDegree = 111111;
          const metersByLongitudeDegree = (Math.PI * 6371000 * Math.cos((row.latitude * Math.PI) / 180)) / 180;

          // Tilt the hexagons by 45 degrees
          const angle = Math.PI / 4;

          const radiuses = selectedActors
            .map((actor) => ({ key: `actor${actor.id}${selectedMetric}`, actorId: actor.id }))
            .map(({ key, actorId }) => {
              return { radius: Math.sqrt(row[key] / maxCount) * maxRadiusMeters, actorId };
            });

          const circlesMeters = d3.packSiblings(radiuses.map(({ radius, actorId }) => ({ r: radius, actorId }))).map((circle) => ({
            x: Math.cos(angle) * circle.x - Math.sin(angle) * circle.y,
            y: Math.sin(angle) * circle.x + Math.cos(angle) * circle.y,
            r: circle.r,
            actorId: circle.actorId,
          }));

          const circlesLatLng = circlesMeters
            .map((circle, index) => {
              const latitude = circle.x / metersByLatitudeDegree + row.latitude;
              const longitude = circle.y / metersByLongitudeDegree + row.longitude;
              const radius = circle.r;
              const actorId = circle.actorId;
              return { latitude, longitude, radius, index, actorId };
            })
            .filter((circle) => circle.radius > 0);

          return circlesLatLng.map((circle, i) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [circle.longitude, circle.latitude],
            },
            properties: {
              color: selectedActors
                .find(({ id }) => {
                  return circle.actorId === id;
                })
                ?.color.toRgb(),
              actorName: selectedActors.find(({ id }) => circle.actorId === id)?.name,
              actorId: circle.actorId,
              count: row[`actor${circle.actorId}${selectedMetric}`],
              radius: circle.radius,
              h3Index: row.h3Index,
              ...(i === 0 ? { ...row } : {}),
              presenceRadius: maxRadiusMeters * 0.5,
            },
          }));
        })
        .flat();

      const h3Indexes = mapTable.filter((row) => row.h3Index);

      return { features, h3Indexes, maxCount, maxRadiusMeters, maxRadiusPixels, timelineData };
    };

    if (duckDBClient?.query && mapBounds && visibleTimelineDomain[0] && visibleTimelineDomain[1]) {
      fetchData(duckDBClient).then(({ features, timelineData, h3Indexes, maxCount, maxRadiusPixels }) => {
        setFeatures(features);
        setH3Indexes(h3Indexes);
        setMaxRadiusCount(maxCount);
        setMaxRadiusPixels(maxRadiusPixels);
        setTimelineData(timelineData);
      });
    }
  }, [
    duckDBClient,
    h3Resolution,
    visibleTimelineDomain,
    mapBounds,
    selectedActors,
    selectedMetric,
    selectedEventTypeId,
    symbolScale,
    layerType,
    aggregationType,
  ]);

  useEffect(() => {
    const fetchData = async (duckDBClient) => {
      // Query the full time range, to display in the brushable timeline
      const brushableTimelineQuery = `
        SELECT
            TIME_BUCKET(INTERVAL '1 week', make_timestamp(timestamp * 1000000)) AS start,
            TIME_BUCKET(
                INTERVAL '1 week',
                TIME_BUCKET(INTERVAL '1 week', make_timestamp(timestamp * 1000000)) + INTERVAL '1 week'
            ) AS end,
            ${selectedActors.map(({ id }) => `SUM(CASE WHEN actor_id = '${id}' THEN 1 ELSE 0 END)::INTEGER AS "actor${id}EventCount"`).join(", ")},
            ${selectedActors.map(({ id }) => `SUM(CASE WHEN actor_id = '${id}' THEN 1 ELSE 0 END)::INTEGER AS "actor${id}FatalityCount"`).join(", ")},
            SUM(CASE WHEN actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) THEN 1 ELSE 0 END)::INTEGER AS totalEventCount,
            SUM(CASE WHEN actor_id IN (${selectedActors.map(({ id }) => id).join(", ")}) THEN fatalities ELSE 0 END)::INTEGER AS totalFatalityCount,
        FROM
            acled_reports
        WHERE
            actor_id IN (${selectedActors.map(({ id }) => id).join(", ")})
            AND event_type_id = ${selectedEventTypeId} 
            AND h3_cell_to_lat(CONCAT('0x', h3_index)::UBIGINT) BETWEEN ${mapBounds.minLat} AND ${mapBounds.maxLat} 
            AND h3_cell_to_lng(CONCAT('0x', h3_index)::UBIGINT) BETWEEN ${mapBounds.minLng} AND ${mapBounds.maxLng}
        GROUP BY
            TIME_BUCKET(INTERVAL '1 week', make_timestamp(timestamp * 1000000))
        ORDER BY
            start;
      `;

      if (selectedActors.length === 0) {
        return { brushableTimelineData: [] };
      }
      const brushableTimelineTable = await duckDBClient.query(brushableTimelineQuery);
      const brushableTimelineData = brushableTimelineTable.toArray().map((row) => row.toJSON());

      await setLoading(true);

      setLoading(false);
      return { brushableTimelineData };
    };

    if (duckDBClient?.query && mapBounds && visibleTimelineDomain[0] && visibleTimelineDomain[1]) {
      fetchData(duckDBClient).then(({ brushableTimelineData }) => {
        setBrushableTimelineData(brushableTimelineData);
        setLoading(false);
      });
    }
  }, [duckDBClient, mapBounds, selectedActors, selectedMetric]);

  useEffect(() => {
    if (mapRef.current) {
      const handleZoom = ({ viewState, target }) => {
        const { transform } = target;
        const { zoom, latitude, longitude } = viewState;
        const min = 0;
        const max = 12;
        const newH3Resolution = getH3Resolution(zoom, latitude, longitude, 15, min, max);
        if (!isH3ResolutionLockedRef.current && newH3Resolution !== h3Resolution) {
          setH3Resolution(newH3Resolution);
        }
        if (mapRef.current && mapRef.current.getBounds) {
          const { _sw, _ne } = mapRef.current.getBounds();
          const maxLat = _ne.lat;
          const minLat = _sw.lat;
          const maxLng = _ne.lng;
          const minLng = _sw.lng;
          onMapBoundsChange({ maxLat, minLat, maxLng, minLng });
        }
      };

      // Function to handle map movements
      const handleMove = () => {
        if (mapRef.current && mapRef.current.getBounds) {
          const { _sw, _ne } = mapRef.current.getBounds();
          const maxLat = _ne.lat;
          const minLat = _sw.lat;
          const maxLng = _ne.lng;
          const minLng = _sw.lng;
          onMapBoundsChange({ maxLat, minLat, maxLng, minLng });
        }
      };

      mapRef.current.on("zoom", handleZoom);
      mapRef.current.on("drag", handleMove);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off("zoom");
        mapRef.current.off("drag");
      }
    };
  }, [mapReady]);

  useEffect(() => {
    if (features) {
      setFeatures([...features]);
    }
  }, [presenceLayerOpacity]);

  const onTimelineZoom = useCallback(
    throttle(({ density, visibleDomain }) => {
      setTimeBucket((prevTimeBucket) => {
        const newTimeBucket = calculateTimeBucket(density);
        if (newTimeBucket !== prevTimeBucket) {
          return newTimeBucket;
        }
        return prevTimeBucket;
      });
      setVisibleTimelineDomain(visibleDomain);
      brushableTimelineRef.current && brushableTimelineRef.current.setBrushedDomain(visibleDomain);
    }, 100),
    [],
  );

  const onTimelineBrush = useCallback(
    throttle(({ brushedDomain }) => {
      setVisibleTimelineDomain(brushedDomain);
      timelineRef.current && timelineRef.current.setVisibleDomain(brushedDomain);
    }, 100),
    [],
  );

  const onMapBoundsChange = useCallback(
    debounce((newMapBounds) => {
      setMapBounds(newMapBounds);
    }, 500),
    [],
  );

  const mapStyle = globalState.theme === "DARK" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

  const paletteHex = colorBrewer.accent;

  return (
    <div id="explorer">
      {isDuckDBTablesLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 150,
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spin spinning={true} />
        </div>
      )}
      <div className="map-container">
        <div
          style={{
            position: "absolute",
            top: 35,
            left: 10,
            zIndex: 1000,
            color: globalState.theme === "DARK" ? "#ffffff" : "#000000",
            padding: 5,
            borderRadius: 5,
            fontSize: 12,
          }}
        >
          <CircleLegend
            circleColor={globalState.theme === "DARK" ? "#ffffff" : "#000000"}
            textColor={globalState.theme === "DARK" ? "#ffffff" : "#000000"}
            title={"Observation counts"}
            ticks={5}
            maxValue={maxRadiusCount}
            maxRadius={maxRadiusPixels}
            width={200}
          />
        </div>

        <ReactMapGL
          initialViewState={INITIAL_VIEW_STATE}
          mapboxAccessToken={process.env.MAPBOX_ACCESS_TOKEN}
          mapStyle={mapStyle}
          onLoad={() => setMapReady(true)}
          ref={mapRef}
        >
          <DeckGLOverlay layers={layers} interleaved />
          <NavigationControl showCompass={false} />
          <div
            ref={tooltipRef}
            style={{
              display: "none",
              position: "absolute",
              zIndex: 1000,
              padding: 5,
              border: globalState.theme === "DARK" ? "0.5px solid #ffffff" : "1px solid #000000",
              backgroundColor: globalState.theme === "DARK" ? "#000000" : "#ffffff",
              color: globalState.theme === "DARK" ? "#ffffff" : "#000000",
              pointerEvents: "none",
              fontSize: 11,
            }}
          ></div>
        </ReactMapGL>
        <Button onClick={() => setIsDrawerOpen(true)} style={{ position: "absolute", top: 135, right: 10 }} icon={<SettingOutlined />} />
        <Drawer
          open={isDrawerOpen}
          title={"Parameters"}
          mask={false}
          rootStyle={{ padding: 10, top: 50, height: `calc(100vh - 50px - ${timelineHeight}px)` }}
          onClose={() => setIsDrawerOpen(false)}
        >
          <Label>Actors</Label>
          <div style={{ marginBottom: 8, marginTop: 8, display: "flex", justifyContent: "left" }}>
            <SelectActorList
              style={{ width: "100%" }}
              onChange={(selectedActors) => {
                if (selectedActors.length > 0) {
                  setSelectedActors(selectedActors);
                }
              }}
              actors={actors}
            />
          </div>
          <div style={{ width: "100%", height: 16 }}></div>
          <Label>Event types</Label>
          <div style={{ marginBottom: 8, marginTop: 8, display: "flex", justifyContent: "left" }}>
            <Select
              style={{ width: "100%" }}
              onChange={(eventTypeId) => {
                setSelectedEventTypeId(eventTypeId);
              }}
              options={(eventTypes || []).map(({ id, eventType }) => ({ value: id, label: eventType }))}
            />
          </div>
          <div style={{ width: "100%", height: 16 }}></div>
          <Label>Metric</Label>
          <div style={{ marginBottom: 8, marginTop: 8, display: "flex", justifyContent: "left" }}>
            <Segmented
              onChange={(metric) => {
                setSelectedMetric(metric);
              }}
              options={[
                {
                  label: "Event count",
                  value: "EventCount",
                },
                {
                  label: "Fatality count",
                  value: "FatalityCount",
                },
              ]}
            />
          </div>
        </Drawer>
      </div>
      {dataTimeDomain && (
        <div className="timeline-container">
          <ZoomableTimeline
            ref={timelineRef}
            data={timelineData}
            categories={selectedActors}
            metric={selectedMetric}
            colorScheme={paletteHex}
            height={120}
            style={{ width: "100%", position: "relative" }}
            domain={dataTimeDomain}
            visibleDomain={dataTimeDomain}
            onZoom={({ density, visibleDomain }) => {
              onTimelineZoom({ visibleDomain, density });
            }}
            theme={globalState.theme}
            onItemClick={() => {}}
          />
          <BrushableTimeline
            ref={brushableTimelineRef}
            data={brushableTimelineData}
            categories={selectedActors}
            metric={selectedMetric}
            height={40}
            domain={dataTimeDomain}
            colorScheme={paletteHex}
            onBrush={onTimelineBrush}
            brushedDomain={dataTimeDomain}
          />
        </div>
      )}
      <Modal open={eventTableData?.length} width={800} onCancel={() => setEventTableData([])} zIndex={2000} footer={null}>
        <EventTable data={eventTableData} />
      </Modal>
    </div>
  );
};
export default Explorer7OctWar;
