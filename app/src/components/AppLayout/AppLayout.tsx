import React, { useContext, useState } from "react";
import { Outlet, useMatches } from "react-router-dom";
import { Layout, ConfigProvider } from "antd";
import NavigationMenu from "../NavigationMenu/NavigationMenu";
import HeaderMenu from "../HeaderMenu/HeaderMenu";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { GlobalStateContext } from "../../contexts/GlobalStateContext";
const { Content, Sider } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(true);

  const toggleCollapse = () => setCollapsed(!collapsed);
  const Icon = collapsed ? MenuUnfoldOutlined : MenuFoldOutlined;
  const { globalState } = useContext(GlobalStateContext);
  const matches = useMatches();
  let id = "root";
  if (matches.length >= 2) {
    id = matches[1].id;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: globalState.algorithm,
        token: {
          colorPrimary: "#3f60b4",
        },
      }}
    >
      <Layout id={id} className={globalState.theme.toLowerCase()}>
        {process.env.SHOW_SIDER && (
          <Sider
            collapsible
            theme="light"
            collapsed={collapsed}
            width={200}
            collapsedWidth={75}
            onCollapse={toggleCollapse}
            trigger={null}
            style={{
              zIndex: 5,
              position: "relative",
              boxShadow: "2px 0px 3px lightgrey",
            }}
          >
            {toggleCollapse && ( // show only if we have toggleCollapse
              <div
                style={{
                  width: 75,
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon className="trigger" onClick={toggleCollapse} />
              </div>
            )}
            <NavigationMenu />
          </Sider>
        )}
        <HeaderMenu toggleCollapse={toggleCollapse} collapsed={collapsed} />
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default AppLayout;
