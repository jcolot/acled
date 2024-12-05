// @ts-nocheck
import "./Timeline.css";
import React, { useEffect, forwardRef, useRef, useImperativeHandle } from "react";
import useWindowSize from "../../../hooks/useWindowSize";
import { useContext } from "react";
import * as d3 from "d3";
import { GlobalStateContext } from "../../../contexts/GlobalStateContext";
import * as Plot from "@observablehq/plot";
import toCamelCase from "../../../utils/toCamelCase";
import { flatten } from "lodash";

const species = ["aedes-albopictus", "aedes-aegypti", "aedes-japonicus", "aedes-koreicus", "culex-pipiens"];
const speciesKeys = species.map((s) => {
  return `${toCamelCase(s)}ReportCount`;
});

const createTimeline = (data, categories, options: any) => {
  const axis = {};
  const nodes = {};
  let zooming = false;
  let lastUpdateCall = 0;

  const { domain, visibleDomain, selectedPeriod, onItemClick, height, width, onZoom, theme, colorScheme } = {
    domain: [new Date().setFullYear(new Date().getFullYear() - 1), new Date().setFullYear(new Date().getFullYear() + 1)],
    visibleDomain: [new Date().setFullYear(new Date().getFullYear() - 1), new Date().setFullYear(new Date().getFullYear() + 1)],
    selectedPeriod: [null, null],
    height: 120,
    onItemClick: () => {
      // do nothing
    },
    onZoom: () => {
      // do nothing
    },
    radius: 6,
    colorScheme: d3.schemeCategory10,
    theme: "LIGHT",
    ...options,
  };

  const MS_PER_HOUR = 60 * 60 * 1000;

  const yAxisWidth = 50;
  const xAxisHeight = 30;
  // Define original scale
  const originalXScale = d3.scaleUtc().domain(domain).range([yAxisWidth, width]);

  // Copy the original scale for modifications
  let xScale = originalXScale.copy();

  let density = Math.abs(xScale.invert(0) - xScale.invert(1)) / MS_PER_HOUR; // in pixels per hour
  const zoomScaleExtent = [1, 25000];

  const findDensityConfig = (map, value) => {
    for (const [limit, config] of map) {
      if (value < limit) {
        return config;
      }
    }
    return [];
  };

  // the different parts of graduations
  const parts = ["level1Ticks", "level2Ticks"];

  const ensureTimeFormat = (value = "") => {
    return typeof value !== "function" ? d3.utcFormat(value) : value;
  };

  axis["level1Ticks"] = (parentNode, density) => {
    const densityMap = [
      [0.0005, [d3.utcHour, "%B %-d, %Y %H:%M"]],
      [0.05, [d3.utcDay, "%A %-d %B, %Y"]],
      [1, [d3.utcMonth, "%B %Y"]],
      [3, [d3.utcMonth, "%Y"]],
      [Infinity, [d3.utcYear, "%Y"]],
    ];

    let [interval, format] = findDensityConfig(densityMap, density);
    format = ensureTimeFormat(format);

    const el = parentNode.call(d3.axisTop(xScale).ticks(interval).tickFormat(format).tickSizeOuter(0));

    el.select(".domain").remove();

    el.selectAll("text")
      .attr("y", height - 5)
      .attr("x", 6)
      .style("text-anchor", "start");
    el.selectAll("line")
      .attr("y1", height - 15)
      .attr("y2", height);
  };

  axis["level2Ticks"] = (parentNode, density) => {
    const densityMap = [
      [0.0005, [d3.utcMinute, "%M"]],
      [0.05, [d3.utcHour, "%H"]],
      [0.3, [d3.utcDay, "%A %-d"]],
      [0.5, [d3.utcDay, "%a %-d"]],
      [1, [d3.utcDay, "%-d"]],
      [8, [d3.utcMonth, "%B"]],
      [13, [d3.utcMonth, "%b"]],
      [22, [d3.utcMonth, (d) => d3.utcFormat("%B")(d).charAt(0)]],
      [33, [d3.utcMonth.every(3), "Q%q"]],
      [Infinity, [d3.utcMonth.every(3), ""]],
    ];

    let [interval, format] = findDensityConfig(densityMap, density);
    format = ensureTimeFormat(format);

    const el = parentNode.call(d3.axisTop(xScale).ticks(interval).tickFormat(format).tickSizeOuter(0));

    el.select(".domain").remove();

    el.selectAll("text")
      .attr("y", height - 17)
      .attr("x", 6)
      .style("text-anchor", "start");
    el.selectAll("line")
      .attr("y1", height - 15)
      .attr("y2", height - 30); // bottom
  };

  const setup = (data) => {
    const svg = d3
      .create("svg")
      .classed("timeline", true)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", `max-width: 100%; color: ${theme === "LIGHT" ? "black" : "white"};`);

    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "data-clip")
      .append("rect")
      .attr("x", yAxisWidth)
      .attr("y", 0)
      .attr("width", width - yAxisWidth)
      .attr("height", height);

    const node = svg.node();

    const timeAxis = svg.append("g").classed("time-axis", true);

    parts.forEach((part) => {
      nodes[part] = timeAxis.append("g").classed(part, true);
    });

    const timelineDataGroup = svg.append("g").classed("timeline-data", true);

    svg.append("g").classed("brush", true);
    svg.append("g").classed("y-axis", true);

    const update = (newData) => {
      data = newData;
      const stack = d3.stack().keys(speciesKeys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
      const stackedData = data.length ? stack(data) : [];

      const plot = Plot.plot({
        padding: 0,
        marginBottom: 0,
        marginTop: 10,
        marginLeft: yAxisWidth,
        width,
        height: height - xAxisHeight,
        x: { domain: xScale.domain(), axis: null },
        y: { grid: true },
        marks: [
          stackedData.map((speciesData, i) =>
            Plot.rectY(speciesData, {
              x1: (d) => d.data.start,
              x2: (d) => d.data.end,
              y1: (d) => {
                return d[0];
              },
              y2: (d) => d[1],
              fill: colorScheme[i],
              insetLeft: 0.2,
              insetRight: 0.2,
            }),
          ),
          Plot.rectY(data, {
            x1: (d) => d.start,
            x2: (d) => d.end,
            channels: {},
            tip: {
              anchor: "bottom",
              format: {
                x: false,
                y: false,
              },
            },
            fill: "transparent",
            y: (d) => {
              return d.totalReportCount;
            },
          }),
          Plot.ruleY([0]),
        ],
      });

      svg.select(".timeline-data").html("").node().appendChild(plot);

      density = Math.abs(xScale.invert(0) - xScale.invert(1)) / MS_PER_HOUR; // in pixels per hour

      parts.forEach((part) => {
        nodes[part].call(axis[part], density);
      });
      return data;
    };

    const throttledUpdate = (newData, delay) => {
      const now = new Date().getTime();
      if (now - lastUpdateCall < delay) {
        return;
      }
      lastUpdateCall = now;
      // Call the original update function
      update(newData, selectedPeriod);
    };

    const getVisibleDomain = () => {
      return [xScale.domain()[0], xScale.domain()[1]];
    };

    const zoom = d3
      .zoom()
      .scaleExtent(zoomScaleExtent)
      .extent([
        [0, 0],
        [width, 0],
      ])
      .translateExtent([
        [0, 0],
        [width, 0],
      ])
      .on("zoom", ({ transform, sourceEvent }) => {
        xScale = transform.rescaleX(originalXScale);
        // throttle the zoom event

        throttledUpdate(data, 50);
        if (!zooming) {
          zooming = true;
          setTimeout(() => {
            zooming = false;
          }, 100);
        }
        if (sourceEvent) {
          onZoom({
            domain: originalXScale.domain(),
            visibleDomain: xScale.domain(),
            density: Math.abs(xScale.invert(0) - xScale.invert(1)) / MS_PER_HOUR,
          });
        }
      });
    svg.call(zoom);

    const setVisibleDomain = ([start, end]) => {
      const x0 = originalXScale(start);
      const x1 = originalXScale(end);

      const xRangeWidth = xScale.range()[1] - xScale.range()[0];
      const k = xRangeWidth / (x1 - x0);
      svg.call(zoom.scaleTo, k);
      const transform = d3.zoomTransform(svg.node());
      svg.call(zoom.translateBy, (xScale.range()[0] - xScale(start)) / transform.k, 0);
    };

    const setDensity = (density) => {
      const currentDensity = Math.abs(xScale.invert(0) - xScale.invert(1)) / MS_PER_HOUR;
      const densityRatio = currentDensity / density;
      const center = xScale.range()[0] + (xScale.range()[1] - xScale.range()[0]) / 2;

      const transition = svg.transition().duration(750).ease(d3.easeCubic);

      transition.call(zoom.scaleBy, densityRatio, [center, 0]);
    };

    setVisibleDomain(visibleDomain);

    update(data, selectedPeriod);

    return {
      node,
      update,
      setVisibleDomain,
      getVisibleDomain,
      setDensity,
    };
  };

  return setup(data);
};

const ZoomableTimeline = forwardRef(function Timeline(
  { data, height, domain, visibleDomain, colorScheme, selectedPeriod, onZoom, onItemClick, style },
  fwdRef,
) {
  const { globalState } = useContext(GlobalStateContext);
  const { theme } = globalState;
  const { width } = useWindowSize();
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  // Use useImperativeHandle to expose any internal functions you might need
  useImperativeHandle(fwdRef, () => ({
    updateData: (newData) => {
      if (timelineRef.current) {
        timelineRef.current.update(newData, selectedPeriod);
      }
    },
    setVisibleDomain: (visibleDomain) => {
      if (timelineRef.current) {
        timelineRef.current.setVisibleDomain(visibleDomain);
      }
    },
    getVisibleDomain: () => {
      if (timelineRef.current) {
        return timelineRef.current.getVisibleDomain();
      }
    },
    setDensity: (density) => {
      if (timelineRef.current) {
        timelineRef.current.setDensity(density);
      }
    },
  }));

  useEffect(() => {
    if (containerRef.current && width) {
      const { node } = (timelineRef.current = createTimeline({
        data,
        domain,
        visibleDomain,
        selectedPeriod,
        height,
        colorScheme,
        width,
        onZoom,
        onItemClick,
        theme,
      }));
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(node);
    }
  }, [width, height, theme, domain]);

  useEffect(() => {
    if (timelineRef.current && data) {
      timelineRef.current.update(data, selectedPeriod);
    }
  }, [data, selectedPeriod]);

  return <div className="zoomable-timeline-container" ref={containerRef} style={style} />;
});

export default ZoomableTimeline;
