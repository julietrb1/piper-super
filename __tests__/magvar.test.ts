/**
 * Unit tests for magnetic variation calculations
 */

import { describe, it, expect } from 'vitest';
import { getMagVar, getMagVarSafe } from '@/lib/magvar';

describe('Magnetic Variation', () => {
  describe('getMagVar', () => {
    it('should return positive values for eastern Australia', () => {
      // Sydney area should have positive (easterly) magnetic variation
      const magVar = getMagVar(-33.8688, 151.2093);
      expect(magVar).toBeGreaterThan(0);
      expect(magVar).toBeLessThan(20); // Reasonable range for AU
    });

    it('should return values within expected range for Melbourne', () => {
      // Melbourne area
      const magVar = getMagVar(-37.8136, 144.9631);
      expect(magVar).toBeGreaterThan(0);
      expect(magVar).toBeLessThan(20);
    });

    it('should return values within expected range for Perth', () => {
      // Perth area (western Australia)
      const magVar = getMagVar(-31.9505, 115.8605);
      expect(magVar).toBeGreaterThan(0);
      expect(magVar).toBeLessThan(20);
    });

    it('should handle coordinates at grid boundaries', () => {
      // Test at minimum latitude boundary
      const magVarMinLat = getMagVar(-50, 130);
      expect(magVarMinLat).toBeGreaterThan(0);
      expect(magVarMinLat).toBeLessThan(25);

      // Test at maximum latitude boundary
      const magVarMaxLat = getMagVar(-10, 130);
      expect(magVarMaxLat).toBeGreaterThan(0);
      expect(magVarMaxLat).toBeLessThan(15);

      // Test at minimum longitude boundary
      const magVarMinLon = getMagVar(-30, 110);
      expect(magVarMinLon).toBeGreaterThan(0);
      expect(magVarMinLon).toBeLessThan(20);

      // Test at maximum longitude boundary
      const magVarMaxLon = getMagVar(-30, 180);
      expect(magVarMaxLon).toBeGreaterThan(0);
      expect(magVarMaxLon).toBeLessThan(25);
    });

    it('should clamp coordinates outside grid bounds', () => {
      // Test coordinates outside the grid - should be clamped to grid bounds
      const magVarNorth = getMagVar(0, 130); // North of grid
      const magVarSouth = getMagVar(-60, 130); // South of grid
      const magVarEast = getMagVar(-30, 200); // East of grid
      const magVarWest = getMagVar(-30, 100); // West of grid

      // All should return reasonable values (clamped to grid)
      expect(magVarNorth).toBeGreaterThan(0);
      expect(magVarNorth).toBeLessThan(25);
      expect(magVarSouth).toBeGreaterThan(0);
      expect(magVarSouth).toBeLessThan(25);
      expect(magVarEast).toBeGreaterThan(0);
      expect(magVarEast).toBeLessThan(25);
      expect(magVarWest).toBeGreaterThan(0);
      expect(magVarWest).toBeLessThan(25);
    });

    it('should perform bilinear interpolation correctly', () => {
      // Test a point that should be interpolated between grid points
      const magVar1 = getMagVar(-35, 145); // Should be interpolated
      const magVar2 = getMagVar(-30, 140); // Grid point
      const magVar3 = getMagVar(-40, 150); // Grid point

      // Interpolated value should be reasonable
      expect(magVar1).toBeGreaterThan(0);
      expect(magVar1).toBeLessThan(25);
      expect(magVar2).toBeGreaterThan(0);
      expect(magVar2).toBeLessThan(25);
      expect(magVar3).toBeGreaterThan(0);
      expect(magVar3).toBeLessThan(25);
    });

    it('should return consistent values for the same coordinates', () => {
      const magVar1 = getMagVar(-33.8688, 151.2093);
      const magVar2 = getMagVar(-33.8688, 151.2093);

      expect(magVar1).toBe(magVar2);
    });

    it('should return values rounded to 1 decimal place', () => {
      const magVar = getMagVar(-33.8688, 151.2093);

      // Check that the value has at most 1 decimal place
      const decimalPlaces = (magVar.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });
  });

  describe('getMagVarSafe', () => {
    it('should return same values as getMagVar for valid coordinates', () => {
      const lat = -33.8688;
      const lon = 151.2093;

      const magVar = getMagVar(lat, lon);
      const magVarSafe = getMagVarSafe(lat, lon);

      expect(magVarSafe).toBe(magVar);
    });

    it('should return 0 for NaN coordinates', () => {
      expect(getMagVarSafe(NaN, 151.2093)).toBe(0);
      expect(getMagVarSafe(-33.8688, NaN)).toBe(0);
      expect(getMagVarSafe(NaN, NaN)).toBe(0);
    });

    it('should handle edge cases gracefully', () => {
      // Test with extreme values
      expect(getMagVarSafe(Infinity, 151.2093)).toBe(0);
      expect(getMagVarSafe(-33.8688, -Infinity)).toBe(0);
      expect(getMagVarSafe(Infinity, Infinity)).toBe(0);
    });

    it('should not throw errors for any input', () => {
      // These should not throw errors
      expect(() => getMagVarSafe(NaN, NaN)).not.toThrow();
      expect(() => getMagVarSafe(Infinity, -Infinity)).not.toThrow();
      expect(() => getMagVarSafe(-999, 999)).not.toThrow();
    });
  });

  describe('Magnetic variation grid coverage', () => {
    it('should cover major Australian cities', () => {
      const cities = [
        { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
        { name: 'Melbourne', lat: -37.8136, lon: 144.9631 },
        { name: 'Brisbane', lat: -27.4698, lon: 153.0251 },
        { name: 'Perth', lat: -31.9505, lon: 115.8605 },
        { name: 'Adelaide', lat: -34.9285, lon: 138.6007 },
        { name: 'Canberra', lat: -35.2809, lon: 149.1300 },
        { name: 'Darwin', lat: -12.4634, lon: 130.8456 },
        { name: 'Hobart', lat: -42.8821, lon: 147.3272 }
      ];

      cities.forEach(city => {
        const magVar = getMagVar(city.lat, city.lon);
        expect(magVar).toBeGreaterThan(0);
        expect(magVar).toBeLessThan(25);
      });
    });

    it('should provide reasonable variation across the continent', () => {
      // Test points across Australia to ensure reasonable variation
      const testPoints = [
        { lat: -12, lon: 130 }, // Northern Australia
        { lat: -45, lon: 147 }, // Southern Australia
        { lat: -25, lon: 115 }, // Western Australia
        { lat: -28, lon: 153 }, // Eastern Australia
        { lat: -35, lon: 138 }  // Central-southern Australia
      ];

      const variations = testPoints.map(point => getMagVar(point.lat, point.lon));

      // All variations should be positive (easterly) for Australia
      variations.forEach(variation => {
        expect(variation).toBeGreaterThan(0);
        expect(variation).toBeLessThan(25);
      });

      // There should be some variation across the continent
      const minVar = Math.min(...variations);
      const maxVar = Math.max(...variations);
      expect(maxVar - minVar).toBeGreaterThan(2); // At least 2 degrees difference
    });
  });
});
