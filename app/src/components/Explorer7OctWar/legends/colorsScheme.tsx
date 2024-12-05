import * as d3 from "d3";

export const colorSchemeOptions = {
  interpolateBlues: function (t) {
    return d3.interpolateBlues(t);
  },
  interpolateGreens: function (t) {
    return d3.interpolateGreens(t);
  },
  interpolateReds: function (t) {
    return d3.interpolateReds(t);
  },
  interpolateOranges: function (t) {
    return d3.interpolateOranges(t);
  },
  interpolateBuRd: function (t) {
    return d3.interpolateRdBu(1 - t);
  },
  interpolateBuGn: function (t) {
    return d3.interpolateBuGn(t);
  },
  interpolateViridis: function (t) {
    return d3.interpolateViridis(t);
  },
  interpolatePlasma: function (t) {
    return d3.interpolatePlasma(t);
  },
  interpolateMagma: function (t) {
    return d3.interpolateMagma(t);
  },
  interpolateInferno: function (t) {
    return d3.interpolateInferno(t);
  },
};

export function colorSchemeLabel(colorScheme: string) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      {colorScheme}
      <div>
        {[...Array(30)].map((d, i) => (
          <div
            style={{
              display: "inline-block",
              width: 2,
              position: "relative",
              top: 2,
              height: 15,
              backgroundColor: colorSchemeOptions[`interpolate${colorScheme}`](i / 30),
            }}
          />
        ))}
      </div>
    </div>
  );
}
