import React from "react";
import { Table } from "antd";

const columns = [
  {
    title: "Actor Name",
    dataIndex: "actor_name",
    key: "name",
  },
  {
    title: "Date",
    key: "timestamp",
    dataIndex: "timestamp",
    render: (timestamp) => new Date(timestamp).toLocaleDateString(),
  },
  {
    title: "Notes",
    dataIndex: "notes",
    key: "notes",
  },
  {
    title: "Fatalities",
    key: "fatalities",
    dataIndex: "fatalities",
  },
];

const EventTable = ({ data }) => {
  return <Table columns={columns} dataSource={data} />;
};

export default EventTable;
