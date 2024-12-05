// eslint-disable-file
// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import { Layer, project32, picking, UNIT } from "@deck.gl/core";
import GL from "@luma.gl/constants";
import { Model, Geometry } from "@luma.gl/core";

import vs from "./rect-layer-vertex.glsl";
import fs from "./rect-layer-fragment.glsl";

import type { LayerProps, LayerDataSource, UpdateParameters, Accessor, Unit, Position, Color, DefaultProps } from "@deck.gl/core";

const DEFAULT_COLOR: [number, number, number, number] = [0, 0, 0, 255];

/** All props supported by the RectLayer */
export type ScatterplotLayerProps<DataT = any> = _ScatterplotLayerProps<DataT> & LayerProps;

/** Props added by the RectLayer */
type _ScatterplotLayerProps<DataT> = {
  data: LayerDataSource<DataT>;
  /**
   * The units of the rect, one of `'meters'`, `'common'`, and `'pixels'`.
   * @default 'meters'
   */
  rectUnits?: Unit;
  /**
   * The units of the offset, one of `'meters'`, `'common'`, and `'pixels'`.
   * @default 'meters'
   */
  offsetUnits?: Unit;
  /**
   * Rect width multiplier.
   * @default 1
   */
  rectScale?: number;
  /**
   * The minimum rect width in pixels. This prop can be used to prevent the rect from getting too small when zoomed out.
   * @default 0
   */
  rectMinPixels?: number;
  /**
   * The maximum rect width in pixels. This prop can be used to prevent the rect from getting too big when zoomed in.
   * @default Number.MAX_SAFE_INTEGER
   */
  rectMaxPixels?: number;

  /**
   * The units of the stroke width, one of `'meters'`, `'common'`, and `'pixels'`.
   * @default 'meters'
   */
  lineWidthUnits?: Unit;
  /**
   * Stroke width multiplier.
   * @default 1
   */
  lineWidthScale?: number;
  /**
   * The minimum stroke width in pixels. This prop can be used to prevent the line from getting too thin when zoomed out.
   * @default 0
   */
  lineWidthMinPixels?: number;
  /**
   * The maximum stroke width in pixels. This prop can be used to prevent the circle from getting too thick when zoomed in.
   * @default Number.MAX_SAFE_INTEGER
   */
  lineWidthMaxPixels?: number;

  /**
   * Draw the outline of points.
   * @default false
   */
  stroked?: boolean;
  /**
   * Draw the filled area of points.
   * @default true
   */
  filled?: boolean;
  /**
   * If `true`, rendered circles always face the camera. If `false` circles face up (i.e. are parallel with the ground plane).
   * @default false
   */
  billboard?: boolean;
  /**
   * If `true`, circles are rendered with smoothed edges. If `false`, circles are rendered with rough edges. Antialiasing can cause artifacts on edges of overlapping circles.
   * @default true
   */
  antialiasing?: boolean;

  /**
   * Center position accessor.
   */
  getPosition?: Accessor<DataT, Position>;
  /**
   * Rect width accessor.
   * @default 1
   */
  getRectWidth?: Accessor<DataT, number>;
  /**
   * Rect height accessor.
   * @default 1
   */
  getRectHeight?: Accessor<DataT, number>;
  /**
   * Fill color accessor.
   * @default [0, 0, 0, 255]
   */
  getFillColor?: Accessor<DataT, Color>;
  /**
   * Stroke color accessor.
   * @default [0, 0, 0, 255]
   */
  getLineColor?: Accessor<DataT, Color>;
  /**
   * Stroke width accessor.
   * @default 1
   */
  getLineWidth?: Accessor<DataT, number>;
  /**
   * @deprecated Use `getLineWidth` instead
   */
  strokeWidth?: number;
  /**
   * @deprecated Use `stroked` instead
   */
  outline?: boolean;
  /**
   * @deprecated Use `getFillColor` and `getLineColor` instead
   */
  getColor?: Accessor<DataT, Color>;
};

const defaultProps: DefaultProps<ScatterplotLayerProps> = {
  rectUnits: "meters",
  offsetUnits: "meters",
  rectScale: { type: "number", min: 0, value: 1 },
  rectMinPixels: { type: "number", min: 0, value: 0 }, //  min point rect in pixels
  rectMaxPixels: { type: "number", min: 0, value: Number.MAX_SAFE_INTEGER }, // max point rect in pixels

  lineWidthUnits: "meters",
  lineWidthScale: { type: "number", min: 0, value: 1 },
  lineWidthMinPixels: { type: "number", min: 0, value: 0 },
  lineWidthMaxPixels: { type: "number", min: 0, value: Number.MAX_SAFE_INTEGER },

  stroked: false,
  filled: true,
  billboard: false,
  antialiasing: true,
  getRectWidth: { type: "accessor", value: 1 },
  getRectHeight: { type: "accessor", value: 1 },
  getRectOffset: { type: "accessor", value: [0, 0] },

  getPosition: { type: "accessor", value: (x) => x.position },
  getFillColor: { type: "accessor", value: DEFAULT_COLOR },
  getLineColor: { type: "accessor", value: DEFAULT_COLOR },
  getLineWidth: { type: "accessor", value: 1 },

  // deprecated
  strokeWidth: { deprecatedFor: "getLineWidth" },
  outline: { deprecatedFor: "stroked" },
  getColor: { deprecatedFor: ["getFillColor", "getLineColor"] },
};

/** Render circles at given coordinates. */
/* eslint-disable-next-line */
export default class RectLayer<DataT = any, ExtraPropsT extends object = {}> extends Layer<ExtraPropsT & Required<_ScatterplotLayerProps<DataT>>> {
  static defaultProps = defaultProps;
  /* eslint-disable-next-line */
  static layerName: string = "RectLayer";

  getShaders() {
    return super.getShaders({ vs, fs, modules: [project32, picking] });
  }

  initializeState() {
    this.getAttributeManager()!.addInstanced({
      instancePositions: {
        size: 3,
        type: GL.DOUBLE,
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: "getPosition",
      },
      instanceRectWidth: {
        size: 1,
        transition: true,
        accessor: "getRectWidth",
        defaultValue: 1,
      },
      instanceRectHeight: {
        size: 1,
        transition: true,
        accessor: "getRectHeight",
        defaultValue: 1,
      },
      instanceRectOffsets: {
        // New attribute
        size: 2,
        transition: true,
        accessor: "getRectOffset",
        defaultValue: [0, 0],
      },
      instanceFillColors: {
        size: this.props.colorFormat.length,
        transition: true,
        normalized: true,
        type: GL.UNSIGNED_BYTE,
        accessor: "getFillColor",
        defaultValue: [0, 0, 0, 255],
      },
      instanceLineColors: {
        size: this.props.colorFormat.length,
        transition: true,
        normalized: true,
        type: GL.UNSIGNED_BYTE,
        accessor: "getLineColor",
        defaultValue: [0, 0, 0, 255],
      },
      instanceLineWidths: {
        size: 1,
        transition: true,
        accessor: "getLineWidth",
        defaultValue: 1,
      },
    });
  }

  updateState(params: UpdateParameters<this>) {
    super.updateState(params);

    if (params.changeFlags.extensionsChanged) {
      const { gl } = this.context;
      this.state.model?.delete();
      this.state.model = this._getModel(gl);
      this.getAttributeManager()!.invalidateAll();
    }
  }

  draw({ uniforms }) {
    const {
      rectUnits,
      offsetUnits,
      rectScale,
      rectMinPixels,
      rectMaxPixels,
      stroked,
      filled,
      billboard,
      antialiasing,
      lineWidthUnits,
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels,
    } = this.props;

    this.state.model
      .setUniforms(uniforms)
      .setUniforms({
        stroked: stroked ? 1 : 0,
        filled,
        billboard,
        antialiasing,
        rectUnits: UNIT[rectUnits],
        offsetUnits: UNIT[offsetUnits],
        focalDistance: 1.0,
        rectScale,
        rectMinPixels,
        rectMaxPixels,
        lineWidthUnits: UNIT[lineWidthUnits],
        lineWidthScale,
        lineWidthMinPixels,
        lineWidthMaxPixels,
      })
      .draw();
  }

  protected _getModel(gl) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];

    return new Model(gl, {
      ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        drawMode: GL.TRIANGLE_FAN,
        vertexCount: 4,
        attributes: {
          positions: { size: 3, value: new Float32Array(positions) },
        },
      }),
      isInstanced: true,
    });
  }
}
