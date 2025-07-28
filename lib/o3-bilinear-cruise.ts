export interface CruiseRow {
  pa: number; // pressure altitude (ft)

  /* full set of ISA break-points for which RPM is published */
  isa: number[]; // e.g. [-15, 0, +10, +20, +30]
  rpm: number[]; // same length as isa[]

  /* TAS only at the first and last ISA of this row.
     If only one ISA exists (e.g. 10,000 ft), TAS is constant. */
  tasLo: number; // TAS at isa[0]
  tasHi: number; // TAS at isa[isa.length-1]
}

/* 1-D interpolation/extrapolation inside a single monotone array */
function interp1(xs: number[], ys: number[], v: number): number {
  if (v <= xs[0]) return ys[0];
  if (v >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (v >= xs[i] && v <= xs[i + 1]) {
      const t = (v - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  throw new Error("interp1: value not bracketed");
}

/* Linear interpolation of a value between two altitudes        */
const lerp = (a: number, b: number, w: number): number => a + w * (b - a);

interface CruiseResult {
  rpm: number;
  tas: number;
}

export function cruiseLookup(
  paFt: number,
  isaDevC: number,
  rows: CruiseRow[],
): CruiseResult {
  /* ── 1. Locate the two altitude rows that bracket paFt ── */
  if (paFt <= rows[0].pa) {
    return interpolateInRow(rows[0], isaDevC);
  }
  if (paFt >= rows[rows.length - 1].pa) {
    return interpolateInRow(rows[rows.length - 1], isaDevC);
  }

  let iLow = 0;
  for (let i = 0; i < rows.length - 1; i++)
    if (paFt >= rows[i].pa && paFt <= rows[i + 1].pa) {
      iLow = i;
      break;
    }

  const low = rows[iLow];
  const high = rows[iLow + 1];

  /* ── 2. Interpolate ISA inside each of those two rows ── */
  const { rpm: rpmL, tas: tasL } = interpolateInRow(low, isaDevC);
  const { rpm: rpmH, tas: tasH } = interpolateInRow(high, isaDevC);

  /* ── 3. Blend the two altitude results ── */
  const w = (paFt - low.pa) / (high.pa - low.pa);

  return {
    rpm: Math.round(lerp(rpmL, rpmH, w) / 10) * 10,
    tas: Math.round(lerp(tasL, tasH, w)),
  };
}

/* --- helper that does the in-row job, including TAS endpoints --- */
function interpolateInRow(row: CruiseRow, isaDevC: number): CruiseResult {
  /* RPM: full table available → normal 1-D interpolation          */
  const rpmVal = interp1(row.isa, row.rpm, isaDevC);

  /* TAS: only two endpoints (or identical endpoints)              */
  const isaLo = row.isa[0];
  const isaHi = row.isa[row.isa.length - 1];

  let tasVal: number;
  if (isaLo === isaHi) {
    // constant TAS row (10 000 ft)
    tasVal = row.tasLo;
  } else {
    const t = (isaDevC - isaLo) / (isaHi - isaLo);
    tasVal = row.tasLo + t * (row.tasHi - row.tasLo);
  }
  return { rpm: rpmVal, tas: tasVal };
}
