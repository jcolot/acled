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
export default `\
#define SHADER_NAME rect-layer-vertex-shader

attribute vec3 positions; // Vertex positions of the rectangle
attribute vec3 instancePositions; // Instance positions in world coordinates
attribute vec3 instancePositions64Low; // Low precision part of instance positions for high precision calculations
attribute float instanceRectWidth; // Width of the rectangle
attribute float instanceRectHeight; // Height of the rectangle
attribute vec2 instanceRectOffsets; // Offsets for positioning the rectangle
attribute float instanceLineWidths; // Line width for the rectangle border
attribute vec4 instanceFillColors; // Fill color for the rectangle
attribute vec4 instanceLineColors; // Line color for the rectangle border
attribute vec3 instancePickingColors; // Colors used for picking (selection)

uniform float opacity; // Opacity of the rectangle
uniform float lineWidthScale; // Scale factor for the line width
uniform float lineWidthMinPixels; // Minimum line width in pixels
uniform float lineWidthMaxPixels; // Maximum line width in pixels
uniform float stroked; // Flag indicating if the rectangle has a border
uniform bool filled; // Flag indicating if the rectangle is filled
uniform bool antialiasing; // Flag indicating if antialiasing is enabled
uniform bool billboard; // Flag indicating if the rectangle is billboarded (always faces the camera)
uniform int rectUnits; // Units for rectangle dimensions
uniform int offsetUnits; // Units for rectangle offsets
uniform int lineWidthUnits; // Units for line width

varying vec4 vFillColor; // Varying variable for fill color
varying vec4 vLineColor; // Varying variable for line color
varying vec2 unitPosition; // Varying variable for unit position in [0, 1] space
varying float innerUnitWidth; // Varying variable for inner unit width
varying float innerUnitHeight; // Varying variable for inner unit height

void main(void) {
  geometry.worldPosition = instancePositions; // Set world position for geometry
  geometry.uv = positions.xy; // Set UV coordinates for geometry
  geometry.pickingColor = instancePickingColors; // Set picking color for geometry

  // Calculate rectangle dimensions in pixels
  float rect_width_pixels = project_size_to_pixel(instanceRectWidth, rectUnits);
  float rect_height_pixels = project_size_to_pixel(instanceRectHeight, rectUnits);
  
  // Calculate and clamp line width in pixels
  float line_width_pixels = clamp(
    project_size_to_pixel(lineWidthScale * instanceLineWidths, lineWidthUnits),
    lineWidthMinPixels, lineWidthMaxPixels
  );

  // Adjust rectangle dimensions to account for stroke width
  float half_line_width = line_width_pixels / 2.0;
  rect_width_pixels += stroked * half_line_width;
  rect_height_pixels += stroked * half_line_width;

  // Calculate padding for edge smoothing
  float edge_padding_width = antialiasing ? (rect_width_pixels + SMOOTH_EDGE_RADIUS) / rect_width_pixels : 1.0;
  float edge_padding_height = antialiasing ? (rect_height_pixels + SMOOTH_EDGE_RADIUS) / rect_height_pixels : 1.0;

  // Position in [0, 1] space from the top-left corner
  unitPosition = vec2(positions.x * edge_padding_width, positions.y * edge_padding_height);

  // Calculate inner unit dimensions
  innerUnitWidth = 1.0 - stroked * line_width_pixels / rect_width_pixels;
  innerUnitHeight = 1.0 - stroked * line_width_pixels / rect_height_pixels;
  
  // Handle billboard and non-billboard cases
  if (billboard) {
    gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
    vec3 offset = vec3(unitPosition.x * rect_width_pixels, unitPosition.y * rect_height_pixels, 0.0);
    DECKGL_FILTER_SIZE(offset, geometry);
    gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);
  } else {
    vec3 offset = vec3(unitPosition.x * project_pixel_size(rect_width_pixels), unitPosition.y * project_pixel_size(rect_height_pixels), 0.0);
    DECKGL_FILTER_SIZE(offset, geometry);
    gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset, geometry.position);
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  }
  
  // Apply rectangle offsets based on units
  if (offsetUnits == UNIT_PIXELS) {
    gl_Position.xy += project_pixel_size_to_clipspace(instanceRectOffsets) / gl_Position.w;
  } else if (offsetUnits == UNIT_METERS) {
    // Convert offsets from pixels to world space
    vec2 offset = vec2(
      project_size_to_pixel(instanceRectOffsets.x, rectUnits),
      project_size_to_pixel(instanceRectOffsets.y, rectUnits)
    );
    gl_Position.xy += project_pixel_size_to_clipspace(offset) / gl_Position.w;
  }

  // Set fill and line colors with opacity
  vFillColor = vec4(instanceFillColors.rgb, instanceFillColors.a * opacity);
  DECKGL_FILTER_COLOR(vFillColor, geometry);
  vLineColor = vec4(instanceLineColors.rgb, instanceLineColors.a * opacity);
  DECKGL_FILTER_COLOR(vLineColor, geometry);
}
`;
