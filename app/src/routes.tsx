import { CompassOutlined } from "@ant-design/icons";
import { Result, Spin } from "antd";
import React from "react";
import { useRouteError } from "react-router-dom";
import AppLayout from "./components/AppLayout/AppLayout";
import HomeButton from "./components/UI/HomeButton";
import RetryButton from "./components/UI/RetryButton";
import Explorer7OctWar from "./components/Explorer7OctWar/Explorer7OctWar";

export const NotFound = () => <Result status="404" title="404" subTitle="Sorry, the page you visited does not exist." extra={<HomeButton />} />;
export const ErrorBoundary = () => {
  const error = useRouteError();
  return <Result status="500" title={error.toString()} subTitle="Sorry, something went wrong" extra={<RetryButton />} />;
};

export const routes = [
  {
    path: "/",
    key: "root",
    id: "root",
    element: <AppLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        id: "events",
        key: "events",
        path: "/",
        element: <Explorer7OctWar />,
        title: "ACLED reports",
        icon: CompassOutlined,
      },
      {
        id: "not-found",
        key: "not-found",
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];

const appendChildren = (routes) => [].concat(...routes.map((route) => (route.children ? appendChildren(route.children) : route)));

export const menuRoutes = appendChildren(routes)
  .filter((route) => !!route.title)
  .map((route) => ({
    id: route.id,
    path: route.path,
    title: route.title,
    icon: route.icon,
  }));
