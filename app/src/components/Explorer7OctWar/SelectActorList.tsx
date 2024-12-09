import React, { useEffect, useState } from "react";
import { Select, List, Typography, Button, ColorPicker } from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { ColorFactory } from "antd/es/color-picker/color";

const SelectActorList: React.FC = ({ onChange, actors, style }) => {
  const [selectedActors, setSelectedActors] = useState([]);
  const [selectValue, setSelectValue] = useState(undefined);
  const [placeholder, setPlaceholder] = useState("Select an actor");

  const onColorChange = (id: string, color: string) => {
    const newSelectedActors = selectedActors.map((actor) => (actor.id === id ? { ...actor, color } : actor));
    setSelectedActors(newSelectedActors);
    onChange(newSelectedActors);
  };
  const onSearch = (value: string) => {};

  return (
    <div className={"list-select"} style={style}>
      <style>{`
        .list-select .ant-list-header { padding: 10px 10px !important; }
        .list-select .ant-list-actor { padding: 10px 8px 10px 16px !important; }
       `}</style>
      <List
        className="select-list"
        dataSource={selectedActors}
        style={{ width: "100%" }}
        bordered
        renderItem={(actor) => (
          <List.Item style={{ display: "flex", justifyContent: "space-between", paddingInline: 16 }}>
            {actor.name}
            <div style={{ display: "flex", gap: 3 }}>
              <ColorPicker format="rgba" defaultValue="#2979be" onChange={(color) => onColorChange(actor.id, color)} disabledAlpha={true} />
              <Button
                icon={<MinusOutlined />}
                onClick={() => {
                  setSelectedActors((selectedActors) => {
                    const index = selectedActors.indexOf(actor);
                    if (index > -1) {
                      selectedActors.splice(index, 1);
                      const newSelectedActors = [...selectedActors];
                      onChange(newSelectedActors);
                      return newSelectedActors;
                    }
                  });
                }}
              />
            </div>
          </List.Item>
        )}
        header={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Select
              style={{ width: "100%", margin: 0 }}
              showSearch
              placeholder={placeholder}
              optionFilterProp="label"
              value={selectValue}
              defaultValue={undefined}
              autoClearSearchValue={true}
              onChange={(value) => {
                const actor = actors.find(({ id }) => id === value);
                setSelectedActors((selectedActors) => {
                  const newActors = [...selectedActors, { ...actor, color: new ColorFactory("#2979be") }];
                  onChange(newActors);
                  return newActors;
                });
                setSelectValue(null);
                setPlaceholder(actor.name);
              }}
              onSearch={onSearch}
              options={(actors || [])
                .filter(({ id }) => !selectedActors.map(({ id }) => id).includes(id))
                .map(({ id, name }) => ({ value: id, label: name }))}
            />
          </div>
        }
      ></List>
    </div>
  );
};

export default SelectActorList;
