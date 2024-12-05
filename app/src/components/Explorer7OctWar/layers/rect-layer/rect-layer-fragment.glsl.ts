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
#define SHADER_NAME rect-layer-fragment-shader

precision highp float;

uniform bool filled;
uniform float stroked;
uniform bool antialiasing;

varying vec4 vFillColor;
varying vec4 vLineColor;
varying vec2 unitPosition;
varying float innerUnitWidth;
varying float innerUnitHeight;

void main(void) {
  geometry.uv = unitPosition;

  // Check if the fragment is within the bounds of the rectangle
  float inRect = (unitPosition.x >= 0.0 && unitPosition.x <= 1.0 && unitPosition.y >= 0.0 && unitPosition.y <= 1.0) ? 1.0 : 0.0;

  if (inRect == 0.0) {
    discard;
  }

  if (stroked > 0.5) {
    // Check if the fragment is within the bounds of the inner rectangle for the stroke
      // Calculate the inner rectangle boundaries for the stroke
    float halfLineWidthX = (1.0 - innerUnitWidth) / 2.0;
    float halfLineWidthY = (1.0 - innerUnitHeight) / 2.0;

    // Determine if the fragment is part of the line (stroke)
    float isLine = (unitPosition.x < halfLineWidthX || unitPosition.x > 1.0 - halfLineWidthX || unitPosition.y < halfLineWidthY || unitPosition.y > 1.0 - halfLineWidthY) ? 1.0 : 0.0;
    

    if (filled) {
      gl_FragColor = mix(vFillColor, vLineColor, isLine);
    } else {
      if (isLine == 0.0) {
        discard;
      }
      gl_FragColor = vec4(vLineColor.rgb, vLineColor.a * isLine);
    }
  } else if (!filled) {
    discard;
  } else {
    gl_FragColor = vFillColor;
  }


  // Apply alpha based on inRect
  gl_FragColor.a *= inRect;
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
`;
