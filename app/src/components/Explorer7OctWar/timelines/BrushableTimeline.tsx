// @ts-nocheck
import "./Timeline.css";
import React, { useEffect, forwardRef, useRef, useImperativeHandle } from "react";
import useWindowSize from "../../../hooks/useWindowSize";
import { useContext } from "react";
import * as d3 from "d3";
import { GlobalStateContext } from "../../../contexts/GlobalStateContext";
import * as Plot from "@observablehq/plot";
import toCamelCase from "../../../utils/toCamelCase";

const species = ["aedes-albopictus", "aedes-aegypti", "aedes-japonicus", "aedes-koreicus", "culex-pipiens"];
const speciesKeys = species.map((s) => {
  return `${toCamelCase(s)}ReportCount`;
});

const createTimeline = (options: any) => {
  const { data, brushedDomain, domain, height, width, onBrush, theme, colorScheme } = {
    data: [],
    min: new Date().setFullYear(new Date().getFullYear() - 1),
    max: new Date().setFullYear(new Date().getFullYear() + 1),
    domain: [new Date().setMonth(new Date().getMonth() - 1), new Date()],
    height: 40,
    onBrush: () => {
      // do nothing
    },
    theme: "LIGHT",
    colorScheme: d3.schemeCategory10,
    ...options,
  };
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  const xScale = d3
    .scaleUtc()
    .domain(domain)
    .range([10, width - 10]);

  const setup = (data) => {
    const svg = d3
      .create("svg")
      .classed("timeline", true)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", `max-width: 100%; color: ${theme === "LIGHT" ? "black" : "white"};`);

    const brushSvg = d3
      .create("svg")
      .classed("timeline-brush", true)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const node = svg.node();

    const update = (newData) => {
      data = newData;
      const stack = d3.stack().keys(speciesKeys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
      const stackedData = data.length ? stack(data) : [];

      const plot = Plot.plot({
        padding: 0,
        marginBottom: 0,
        marginTop: 10,
        marginLeft: 10,
        marginRight: 10,
        width,
        height,
        x: { domain: xScale.domain(), axis: null },
        y: { grid: true, axis: null },
        marks: stackedData.map((speciesData, i) => {
          return Plot.rectY(speciesData, {
            x1: (d) => d.data.start.getTime(),
            x2: (d) => d.data.end.getTime(),
            y1: (d) => d[0],
            y2: (d) => d[1],
            fill: colorScheme[i],
            insetLeft: 0.2,
            insetRight: 0.2,
          });
        }),
      });
      svg.select(".timeline-data").remove();
      svg.select(".timeline-brush").remove();
      svg.append("g").classed("timeline-data", true).node().appendChild(plot);
      svg.append("g").classed("timeline-brush", true).node().appendChild(brushSvg.node());
      return data;
    };

    const brushMove = (event) => {
      onBrush({ brushedDomain: event.selection.map(xScale.invert) });
    };

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [xScale.range()[1], height],
      ])
      .on("brush", brushMove);

    const getBrushedDomain = () => {
      return [xScale.domain()[0], xScale.domain()[1]];
    };

    brushSvg.call(brush);

    const setBrushedDomain = (newBrushedDomain) => {
      brushSvg.call(brush.move, newBrushedDomain.map(xScale));
    };

    setBrushedDomain(brushedDomain);
    update(data);

    return {
      element: node,
      update,
      setBrushedDomain,
      getBrushedDomain,
    };
  };

  return setup(data);
};

const BrushableTimeline = forwardRef(function BrushableTimeline({ data, height, domain, brushedDomain, onBrush, colorScheme, style }, fwdRef) {
  const { globalState } = useContext(GlobalStateContext);
  const { theme } = globalState;
  const { width } = useWindowSize();
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  // Use useImperativeHandle to expose any internal functions you might need
  useImperativeHandle(fwdRef, () => ({
    updateData: (newData) => {
      if (timelineRef.current) {
        timelineRef.current.update(newData);
      }
    },
    setBrushedDomain: (brushedDomain) => {
      if (timelineRef.current) {
        timelineRef.current.setBrushedDomain(brushedDomain);
      }
    },
    getBrushedDomain: () => {
      if (timelineRef.current) {
        return timelineRef.current.getBrushedDomain();
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
      const { update, zoomTo, element } = (timelineRef.current = createTimeline({
        data,
        domain,
        brushedDomain,
        height,
        width,
        colorScheme,
        onBrush,
        theme,
      }));
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(element);
      timelineRef.current.update = update;
      timelineRef.current.zoomTo = zoomTo;
    }
  }, [width, theme, domain, brushedDomain, height]);

  useEffect(() => {
    if (timelineRef.current && data) {
      timelineRef.current.update(data);
    }
  }, [data]);

  return <div className="brushable-timeline-container" ref={containerRef} style={style} />;
});

export default BrushableTimeline;
