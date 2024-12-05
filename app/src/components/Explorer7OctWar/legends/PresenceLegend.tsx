import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const PresenceLegend = ({ title, radius, shape, shapeColor, width, textColor, opacity }) => {
  const legendRef = useRef();

  useEffect(() => {
    const svg = d3.select(legendRef.current);
    svg.selectAll("*").remove();

    const height = 120;
    svg.attr("width", width).attr("height", height);

    const shapeSvg = svg
      .selectAll("circle")
      .data([radius])
      .enter()
      .append("circle")
      .attr("cx", (d, i) => 15)
      .attr("cy", height / 2)
      .attr("r", (d) => d)
      .attr("fill", shapeColor)
      .attr("stroke", "gray");

    if (title)
      svg.append("text").attr("x", 0).attr("y", 35).attr("fill", textColor).attr("text-anchor", "left").style("font-weight", "bold").text(title);
  }, [title]);

  return <svg ref={legendRef}></svg>;
};

export default PresenceLegend;
