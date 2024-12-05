import React, { useContext } from "react";
import { Switch } from "antd";
import { UserOutlined } from "@ant-design/icons";
import auth from "../../utils/auth";
import "./UserMenu.css";
import { GlobalStateContext } from "../../contexts/GlobalStateContext";

const UserMenu = () => {
  const { globals } = useContext(GlobalStateContext);
  const logout = () => {
    auth.clearAppStorage();
  };

  const userInfo = auth.getUserInfo();
  const initial = userInfo?.[0].toUpperCase();

  return (
    <>
      <Switch
        id="user-switch"
        size="small"
        defaultChecked={userInfo}
        style={{ margin: "0 10px 0 5px" }}
        checkedChildren={<>{initial}</>}
        unCheckedChildren={<UserOutlined style={{ margin: "18px 0 0 0" }} fontSize={10} />}
        onChange={(value) => {
          value ? (window.location = `${process.env.REACT_APP_STRAPI_HOST}/api/connect/google`) : logout();
        }}
      />
      {/* {userInfo && userInfo} */}
    </>
  );
};

export default UserMenu;
