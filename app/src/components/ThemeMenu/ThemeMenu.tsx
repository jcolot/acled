import React, { useContext } from "react";
import { Switch } from "antd";
import { MdModeNight, MdOutlineLightMode } from "react-icons/md";
import { GlobalStateContext } from "../../contexts/GlobalStateContext";
import "./ThemeMenu.css";

const ThemeMenu = () => {
  const globals = useContext(GlobalStateContext);
  return (
    <Switch
      id="theme-switch"
      size="small"
      style={{ margin: "0 10px 0 5px" }}
      defaultChecked={globals.globalState.theme === "LIGHT"}
      checkedChildren={<MdOutlineLightMode style={{ margin: "2px 0 0 0" }} fontSize={12} />}
      unCheckedChildren={<MdModeNight style={{ margin: "-4px 0 0 0" }} fontSize={12} />}
      onChange={(value) => {
        globals.dispatch({
          type: "THEME",
          theme: value ? "LIGHT" : "DARK",
        });
      }}
    />
  );
};

export default ThemeMenu;
