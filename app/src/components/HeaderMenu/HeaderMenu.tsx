import React, { useContext } from "react";
import { Layout, Menu, Row, Col, theme } from "antd";
import ThemeMenu from "../ThemeMenu/ThemeMenu";
import "./HeaderMenu.css";
import { useMatches, Link } from "react-router-dom";
import { menuRoutes } from "../../routes";
import { GlobalStateContext } from "../../contexts/GlobalStateContext";
import logo from "../../assets/images/2024-ACLED-Horizontal-Logo-420.webp";

const { Header } = Layout;
const { useToken } = theme;

const HeaderMenu = ({}) => {
  const { globalState } = useContext(GlobalStateContext);
  const theme = globalState.theme;
  const matches = useMatches();
  const selectedKey = matches?.[matches.length - 1]?.id || "";
  const token = useToken();
  const items = menuRoutes.map((route) => ({
    disabled: route.disabled || false,
    key: route.id,
    label: (
      <Link to={route.path}>
        <span>{route.title}</span>
      </Link>
    ),
  }));
  return (
    <Header className="header-menu">
      <Row style={{ flexFlow: "no-wrap", height: "100%" }}>
        <Col
          xs={8}
          lg={6}
          xxl={5}
          style={{
            display: "flex",
            height: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span style={{ marginLeft: 16, display: "flex", alignItems: "center" }}>With data from </span>
          <a href="https://acleddata.com/" target="_blank" rel="noreferrer">
            <img
              src={logo}
              alt="logo"
              className="header-logo"
              style={{ height: 36, position: "relative", top: 7, left: 8, filter: `grayscale(1)` }}
            />
          </a>
        </Col>
        <Col
          xs={8}
          lg={14}
          xxl={14}
          style={{
            display: "flex",
            height: "100%",
          }}
        >
          {/* <Menu */}
          {/*   style={{ */}
          {/*     minWidth: 0, */}
          {/*     flex: "auto", */}
          {/*     color: `${token.colorText} !important`, */}
          {/*     borderBottom: 0, */}
          {/*   }} */}
          {/*   items={items} */}
          {/*   selectedKeys={[selectedKey]} */}
          {/*   mode="horizontal" */}
          {/* /> */}
        </Col>
        <Col
          xs={8}
          lg={4}
          xxl={5}
          style={{
            display: "flex",
            justifyContent: "end",
            alignItems: "center",
            height: 50,
          }}
        >
          <ThemeMenu />
        </Col>
      </Row>
    </Header>
  );
};

export default HeaderMenu;
