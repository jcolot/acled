import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const CircleLegend = ({ title, ticks, maxValue, maxRadius, circleColor, textColor, width }) => {
  const legendRef = useRef();

  const correctedMaxValue = Math.max(maxValue, ticks + 1);
  const scale = d3.scaleLinear().domain([0, correctedMaxValue]);

  const tickValues = scale.ticks(ticks + 1).splice(1, ticks - 1);

  if (tickValues.length < ticks) {
    tickValues.push(2 * tickValues[tickValues.length - 1] - tickValues[tickValues.length - 2]);
  }

  useEffect(() => {
    const svg = d3.select(legendRef.current);
    svg.selectAll("*").remove();

    const height = 120;
    svg.attr("width", width).attr("height", height);

    const radiusScale = d3.scaleSqrt().domain([0, correctedMaxValue]).range([0, maxRadius]);

    const circlesData = tickValues.map((tickValue) => ({
      radius: radiusScale(tickValue),
      count: tickValue,
    }));

    const circles = svg
      .selectAll("circle")
      .data(circlesData)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => 15 + i * ((width - circlesData[circlesData.length - 1].radius / 2) / tickValues.length + 1))
      .attr("cy", height / 2)
      .attr("r", (d) => d.radius)
      .attr("fill", "transparent")
      .attr("stroke", circleColor);

    const labels = svg
      .selectAll("text")
      .data(circlesData)
      .enter()
      .append("text")
      .attr("x", (d, i) => 15 + i * ((width - circlesData[circlesData.length - 1].radius / 2) / tickValues.length + 1))
      .attr("y", height / 2 + maxRadius + 15)
      .attr("fill", textColor)
      .attr("text-anchor", "middle")
      .text((d) => Math.round(d.count));

    if (title)
      svg.append("text").attr("x", 0).attr("y", 35).attr("fill", textColor).attr("text-anchor", "left").style("font-weight", "bold").text(title);
  }, [title, ticks, maxValue, maxRadius, circleColor, textColor]);

  if (!maxValue || Number.isNaN(maxValue) || !maxRadius || Number.isNaN(maxRadius)) return null;

  return <svg ref={legendRef}></svg>;
};

export default CircleLegend;
