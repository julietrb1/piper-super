function bilinear(
  x: number,
  y: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  f00: number,
  f10: number,
  f01: number,
  f11: number,
): number {
  const t = (x - x0) / (x1 - x0);
  const u = (y - y0) / (y1 - y0);
  return (
    (1 - t) * (1 - u) * f00 +
    t * (1 - u) * f10 +
    (1 - t) * u * f01 +
    t * u * f11
  );
}

export interface BilinearGrid {
  pa: number[]; // [1000, 2000, ... ]
  isa: number[]; // [-15, 0, 30]
  table: number[][]; // same dimensions as pa × isa
}

export function lookup(
  paFt: number,
  isaDevC: number,
  grid: BilinearGrid,
): number {
  /* helper to find bounding indices */
  const idx = (arr: number[], v: number): [number, number] => {
    if (v <= arr[0]) return [0, 0];
    if (v >= arr[arr.length - 1]) {
      const last = arr.length - 1;
      return [last, last];
    }
    for (let i = 0; i < arr.length - 1; i++) {
      if (v >= arr[i] && v <= arr[i + 1]) return [i, i + 1];
    }
    throw new Error("should never get here");
  };

  const [i0, i1] = idx(grid.pa, paFt);
  const [j0, j1] = idx(grid.isa, isaDevC);

  /* fast exits if the point is exactly on a grid line */
  if (i0 === i1 && j0 === j1) return grid.table[i0][j0];
  if (i0 === i1) {
    // linear in ISA only
    const f0 = grid.table[i0][j0];
    const f1 = grid.table[i0][j1];
    return (
      f0 +
      ((f1 - f0) * (isaDevC - grid.isa[j0])) / (grid.isa[j1] - grid.isa[j0])
    );
  }
  if (j0 === j1) {
    // linear in PA only
    const f0 = grid.table[i0][j0];
    const f1 = grid.table[i1][j0];
    return (
      f0 + ((f1 - f0) * (paFt - grid.pa[i0])) / (grid.pa[i1] - grid.pa[i0])
    );
  }

  /* full bilinear interpolation */
  return bilinear(
    paFt,
    isaDevC,
    grid.pa[i0],
    grid.pa[i1],
    grid.isa[j0],
    grid.isa[j1],
    grid.table[i0][j0],
    grid.table[i1][j0],
    grid.table[i0][j1],
    grid.table[i1][j1],
  );
}
