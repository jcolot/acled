import React, { useRef } from "react";
import { Row, Col, theme } from "antd";
import noise from "../../utils/noise";
import useWindowSize from "../../hooks/useWindowSize";
import "./Home.css";
import { MailOutlined } from "@ant-design/icons";
import Clock from "../Clock/Clock";

function Home() {
  const ref = useRef();
  const { width, height } = useWindowSize();

  if (ref.current && ref.current.tagName === "CANVAS") {
    ref.current.width = width;
    ref.current.height = height;
    const ctx = ref.current.getContext("2d");
    noise(ctx);
  }

  // const sunPalette = ["#e9311a", "#ed6335", "#f4a65a", "#f9d6a9", "#fff"];
  const sunPalette = ["#e9311a", "#ed6335", "#ecae7d", "#8db4ad", "#026c80", "#064c72"];
  const svgWidth = width < 1000 ? 1000 : width;
  const svgLeft = width < 1000 ? width - 1000 : 0;

  return (
    <div
      style={{
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#033958",
      }}
    ></div>
  );
}

export default Home;
