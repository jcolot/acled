import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const SquareLegend = ({ title, ticks, maxValue, maxSideLength, squareColor, textColor, width }) => {
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

    const height = 70;
    svg.attr("width", width).attr("height", height);

    const sideScale = d3.scaleLinear().domain([0, correctedMaxValue]).range([0, maxSideLength]);

    const squaresData = tickValues.map((tickValue) => ({
      side: sideScale(tickValue),
      count: tickValue,
    }));

    const squares = svg
      .selectAll("rect")
      .data(squaresData)
      .enter()
      .append("rect")
      .attr("x", (d, i) => 15 + i * ((width - squaresData[squaresData.length - 1].side / 2) / tickValues.length + 1))
      .attr("y", (d) => height / 2 - d.side / 2)
      .attr("width", (d) => d.side)
      .attr("height", (d) => d.side)
      .attr("fill", "transparent")
      .attr("stroke", squareColor);

    const labels = svg
      .selectAll("text")
      .data(squaresData)
      .enter()
      .append("text")
      .attr("x", (d, i) => 15 + i * ((width - squaresData[squaresData.length - 1].side / 2) / tickValues.length + 1) + d.side / 2)
      .attr("y", height / 2 + maxSideLength / 2 + 15)
      .attr("fill", textColor)
      .attr("text-anchor", "middle")
      .text((d) => Math.round(d.count));

    svg.append("text").attr("x", 0).attr("y", 15).attr("fill", textColor).attr("text-anchor", "left").style("font-weight", "bold").text(title);
  }, [title, ticks, maxValue, maxSideLength, squareColor, textColor]);

  if (!maxValue || Number.isNaN(maxValue) || !maxSideLength || Number.isNaN(maxSideLength)) return null;

  return <svg ref={legendRef}></svg>;
};

export default SquareLegend;
