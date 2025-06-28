import {
  ClimbFigures,
  ClimbPerformance,
  realClimbFigures,
} from "@/lib/performance-models";

const mapClimbFigure = ([
  isaTempDeviation,
  altHundreds,
  minutes,
  fuelGal,
]: ClimbFigures) => ({
  x: isaTempDeviation,
  y: altHundreds,
  z1: minutes,
  z2: fuelGal,
});
const mappedClimbFigures = realClimbFigures.map(mapClimbFigure);

const climbGrid: BicubicGrid = [
  mappedClimbFigures.filter(({ x }) => x === -15),
  mappedClimbFigures.filter(({ x }) => x === 0),
  mappedClimbFigures.filter(({ x }) => x === 15),
  mappedClimbFigures.filter(({ x }) => x === 30),
];

// TypeScript implementation of bicubic interpolation

interface DataPoint {
  x: number;
  y: number;
  z1: number;
  z2: number;
}

type BicubicGrid = DataPoint[][]; // Arbitrary grid of input data points

/**
 * Cubic interpolation kernel for 1D interpolation.
 * @param t Normalized distance (0 <= t <= 1).
 * @returns Interpolation weights.
 */
function cubicWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;

  return [
    -0.5 * t3 + t2 - 0.5 * t,
    1.5 * t3 - 2.5 * t2 + 1,
    -1.5 * t3 + 2 * t2 + 0.5 * t,
    0.5 * t3 - 0.5 * t2,
  ];
}

/**
 * Interpolates along a single dimension.
 * @param p Array of 4 values to interpolate.
 * @param weights Array of 4 weights.
 * @returns Interpolated value.
 */
function interpolate1D(p: (number | undefined)[], weights: number[]): number {
  return p.reduce(
    (sum, value, index) => sum! + (value ?? 0) * weights[index],
    0
  )!;
}

/**
 * Finds the index and interpolation factor for a value within a grid.
 * @param value The value to locate.
 * @param points Array of grid points.
 * @returns Index of the lower bound and interpolation factor.
 */
function locate(
  value: number,
  points: number[]
): { index: number; factor: number } {
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    if (value >= points[i] && value <= points[i + 1]) {
      const factor = (value - points[i]) / (points[i + 1] - points[i]);
      return { index: i, factor };
    }
  }
  throw new Error("Value out of bounds.");
}

/**
 * Bicubic interpolation function for an arbitrary grid.
 * @param grid Arbitrary grid of data points.
 * @param x Interpolated x-coordinate.
 * @param y Interpolated y-coordinate.
 * @returns Interpolated z1 and z2 values.
 */
function bicubicInterpolate(
  grid: BicubicGrid,
  x: number,
  y: number
): { z1: number; z2: number } {
  const xPoints = grid.map(row => row[0].x);
  const yPoints = grid[0].map(point => point.y);

  const { index: xIndex, factor: tx } = locate(x, xPoints);
  const { index: yIndex, factor: ty } = locate(y, yPoints);

  const wx = cubicWeights(tx);
  const wy = cubicWeights(ty);

  const z1Rows: number[] = [];
  const z2Rows: number[] = [];

  // Interpolate along the y-direction for each row
  for (let i = -1; i <= 2; i++) {
    const xi = Math.max(0, Math.min(xIndex + i, grid.length - 1));
    const row = grid[xi];

    const z1Row = interpolate1D(
      [
        row[Math.max(0, yIndex - 1)]?.z1,
        row[yIndex]?.z1,
        row[Math.min(yIndex + 1, row.length - 1)]?.z1,
        row[Math.min(yIndex + 2, row.length - 1)]?.z1,
      ],
      wy
    );
    z1Rows.push(z1Row);

    const z2Row = interpolate1D(
      [
        row[Math.max(0, yIndex - 1)]?.z2,
        row[yIndex]?.z2,
        row[Math.min(yIndex + 1, row.length - 1)]?.z2,
        row[Math.min(yIndex + 2, row.length - 1)]?.z2,
      ],
      wy
    );
    z2Rows.push(z2Row);
  }

  // Interpolate along the x-direction using the results of the y-interpolations
  const z1 = interpolate1D(z1Rows, wx);
  const z2 = interpolate1D(z2Rows, wx);

  return { z1, z2 };
}

export function calculateClimb(
  isaTempDeviation: number,
  altHundreds: number
): ClimbPerformance {
  const bicubicResult = bicubicInterpolate(
    climbGrid,
    isaTempDeviation,
    altHundreds
  );
  return {
    minutes: Math.round(bicubicResult.z1),
    fuelGal: bicubicResult.z2,
  };
}
