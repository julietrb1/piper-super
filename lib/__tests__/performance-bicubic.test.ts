import { calculateClimb } from "../performance-bicubic";

describe("calculateClimb", () => {
  test.each([
    [0, 0, 0, 1.0],
    [0, 10, 2, 1.3],
    [0, 20, 3, 1.7],
    [0, 30, 5, 2.0],
    [0, 40, 7, 2.4],
    [0, 50, 10, 3.0],
    [0, 60, 13, 3.6],
    [0, 70, 16, 4.2],
    [0, 80, 20, 5.0],
    [0, 90, 24, 5.9],

    [-15, 0, 0, 1.0],
    [-15, 10, 2, 1.2],
    [-15, 20, 3, 1.6],
    [-15, 30, 5, 2.0],
    [-15, 40, 6, 2.2],
    [-15, 50, 8, 2.6],
    [-15, 60, 10, 3.1],
    [-15, 70, 13, 3.6],
    [-15, 80, 16, 4.1],
    [-15, 90, 19, 4.9],

    [30, 0, 0, 1.0],
    [30, 10, 2, 1.5],
    [30, 20, 5, 2.0],
    [30, 30, 8, 2.4],
    [30, 40, 11, 3.1],
    [30, 50, 15, 4.0],
    [30, 60, 20, 5.0],
    [30, 70, 26, 6.2],
    [30, 80, 35, 8.0],
    [30, 90, 55, 11.8],
  ])(
    "given isaTempDeviation=%p and altHundreds=%p, returns minutes=%p and fuelGal=%p",
    (isaTempDeviation, altHundreds, expectedMinutes, expectedFuelGal) => {
      const result = calculateClimb(isaTempDeviation, altHundreds);

      expect(result.minutes).toBe(expectedMinutes);
      expect(result.fuelGal).toBeCloseTo(expectedFuelGal, 1);
    },
  );
});
