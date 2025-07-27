import { getClimbGal, getClimbMin } from "@/lib/arrow3/climb";

describe("getClimbGal", () => {
  test.each([
    [20, 1],
    [40, 2],
    [60, 3],
    [70, 4],
    [80, 5],
    [100, 6],
    [110, 7],
    [120, 8],
    [130, 9],
    [150, 10],
  ])(
    "given altitude=%p, returns fuelGal=%p",
    (densityAltHundreds, expectedFuelGal) => {
      const result = getClimbGal(densityAltHundreds);
      expect(result).toBe(expectedFuelGal);
    },
  );
});

describe("getClimbMinutes", () => {
  test.each([
    [0, 0],
    [10, 1],
    [20, 2],
    [30, 4],
    [40, 5],
    [50, 6],
    [60, 8],
    [70, 10],
    [80, 12],
    [90, 15],
    [100, 18],
    [110, 21],
    [120, 24],
    [130, 27.5],
    [140, 32],
    [150, 37],
  ])(
    "given altitude=%p, returns minutes=%p",
    (densityAltHundreds, expectedMinutes) => {
      const result = getClimbMin(densityAltHundreds);
      expect(result).toBe(expectedMinutes);
    },
  );
});
