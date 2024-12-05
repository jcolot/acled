import { CompassOutlined } from "@ant-design/icons";
import { useMap } from "react-map-gl";
import { Button } from "antd";
import { useState } from "react";
import React from 'react'


const PitchBearingSwitch = () => {
  const {current: map} = useMap();
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  map.once("pitch", () => {
    setPitch(map.getPitch());
  });

  map.once("bearing", () => {
    setBearing(map.getBearing());
  });

  return (
    <div
      style={{
        transition: "opacity 0.6s",
        willChange: "opacity",
        width: 34,
        height: 24,
      }}
    >
      <div style={{ width: "fit-content", height: "fit-content" }}>
        {pitch || bearing ? (
          <Button
            size="small"
            onClick={() => {
              setPitch(0);
              setBearing(0);
              map.setPitch(0);
              map.setBearing(0);
            }}
          >
            <CompassOutlined />
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() => {
              setPitch(60);
              setBearing(0);
              map.setPitch(60);
              map.setBearing(0);
            }}
          >
            3D
          </Button>
        )}
      </div>
    </div>
  );
}

export default PitchBearingSwitch;
