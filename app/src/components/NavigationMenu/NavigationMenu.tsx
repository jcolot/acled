import { Menu } from "antd";
import { Link } from "react-router-dom";
import { menuRoutes } from "../../routes";

function NavigationMenu({ currentPath, collapsed }) {

  const items = menuRoutes
    .map((route) => ({
      disabled: route.disabled || false,
      key: route.id,
      icon: <route.icon />,
      label: (
        <Link to={route.path}>
          <span>{route.title}</span>
        </Link>
      )
    }));

  return (
    <Menu
      items={items}
      mode="inline"
      selectedKeys={[currentPath]}
      collapsed={collapsed}
      style={{ borderRight: collapsed ? "1px solid #e8e8e8" : "none" }} // right border fix
    />
  );
}

export default NavigationMenu;
