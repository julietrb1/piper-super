/**
 * Unit tests for geometry utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  calculateMidpoint,
  computeLegMetrics,
  computeAllLegMetrics,
  calculateTotalDistance
} from '@/lib/geometry';

describe('Geometry Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between Sydney and Melbourne correctly', () => {
      // Sydney: -33.8688, 151.2093
      // Melbourne: -37.8136, 144.9631
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);

      // Expected distance is approximately 443 nautical miles
      expect(distance).toBeCloseTo(443, 0);
    });

    it('should return 0 for identical points', () => {
      const distance = calculateDistance(-33.8688, 151.2093, -33.8688, 151.2093);
      expect(distance).toBe(0);
    });

    it('should handle crossing the antimeridian', () => {
      // Test points on either side of 180° longitude
      const distance = calculateDistance(0, 179, 0, -179);
      expect(distance).toBeCloseTo(120, 0); // Approximately 2° of longitude at equator
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing from Sydney to Melbourne correctly', () => {
      // Sydney to Melbourne should be roughly southwest (around 225°)
      const bearing = calculateBearing(-33.8688, 151.2093, -37.8136, 144.9631);

      expect(bearing).toBeGreaterThan(200);
      expect(bearing).toBeLessThan(250);
    });

    it('should return 0 for due north', () => {
      const bearing = calculateBearing(0, 0, 1, 0);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should return 90 for due east', () => {
      const bearing = calculateBearing(0, 0, 0, 1);
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('should return 180 for due south', () => {
      const bearing = calculateBearing(1, 0, 0, 0);
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('should return 270 for due west', () => {
      const bearing = calculateBearing(0, 1, 0, 0);
      expect(bearing).toBeCloseTo(270, 0);
    });
  });

  describe('calculateMidpoint', () => {
    it('should calculate midpoint between Sydney and Melbourne correctly', () => {
      const [midLat, midLon] = calculateMidpoint(-33.8688, 151.2093, -37.8136, 144.9631);

      // Midpoint should be roughly halfway between the two cities
      expect(midLat).toBeCloseTo(-35.8, 0);
      expect(midLon).toBeCloseTo(148.1, 0);
    });

    it('should return the same point for identical coordinates', () => {
      const [midLat, midLon] = calculateMidpoint(-33.8688, 151.2093, -33.8688, 151.2093);

      expect(midLat).toBeCloseTo(-33.8688, 4);
      expect(midLon).toBeCloseTo(151.2093, 4);
    });
  });

  describe('computeLegMetrics', () => {
    it('should compute leg metrics correctly for Sydney to Melbourne', () => {
      const p1 = { lat: -33.8688, lon: 151.2093 };
      const p2 = { lat: -37.8136, lon: 144.9631 };

      const metrics = computeLegMetrics(p1, p2);

      expect(metrics.distanceNM).toBeCloseTo(443, 0);
      expect(metrics.trueTrackDeg).toBeGreaterThan(200);
      expect(metrics.trueTrackDeg).toBeLessThan(250);

      // Magnetic track should be different from true track due to magnetic variation
      expect(metrics.magTrackDeg).not.toBe(metrics.trueTrackDeg);
      expect(metrics.magTrackDeg).toBeGreaterThanOrEqual(0);
      expect(metrics.magTrackDeg).toBeLessThan(360);
    });

    it('should handle short distances correctly', () => {
      const p1 = { lat: -33.8688, lon: 151.2093 };
      const p2 = { lat: -33.8700, lon: 151.2100 }; // Very close points

      const metrics = computeLegMetrics(p1, p2);

      expect(metrics.distanceNM).toBeGreaterThan(0);
      expect(metrics.distanceNM).toBeLessThan(1);
      expect(metrics.trueTrackDeg).toBeGreaterThanOrEqual(0);
      expect(metrics.trueTrackDeg).toBeLessThan(360);
      expect(metrics.magTrackDeg).toBeGreaterThanOrEqual(0);
      expect(metrics.magTrackDeg).toBeLessThan(360);
    });
  });

  describe('computeAllLegMetrics', () => {
    it('should compute metrics for multiple waypoints', () => {
      const waypoints = [
        { lat: -33.8688, lon: 151.2093 }, // Sydney
        { lat: -35.3075, lon: 149.1244 }, // Canberra
        { lat: -37.8136, lon: 144.9631 }  // Melbourne
      ];

      const allMetrics = computeAllLegMetrics(waypoints);

      expect(allMetrics).toHaveLength(2); // 3 waypoints = 2 legs

      // First leg: Sydney to Canberra
      expect(allMetrics[0].distanceNM).toBeGreaterThan(0);
      expect(allMetrics[0].trueTrackDeg).toBeGreaterThanOrEqual(0);
      expect(allMetrics[0].trueTrackDeg).toBeLessThan(360);

      // Second leg: Canberra to Melbourne
      expect(allMetrics[1].distanceNM).toBeGreaterThan(0);
      expect(allMetrics[1].trueTrackDeg).toBeGreaterThanOrEqual(0);
      expect(allMetrics[1].trueTrackDeg).toBeLessThan(360);
    });

    it('should return empty array for single waypoint', () => {
      const waypoints = [{ lat: -33.8688, lon: 151.2093 }];
      const allMetrics = computeAllLegMetrics(waypoints);

      expect(allMetrics).toHaveLength(0);
    });

    it('should return empty array for no waypoints', () => {
      const waypoints: Array<{ lat: number; lon: number }> = [];
      const allMetrics = computeAllLegMetrics(waypoints);

      expect(allMetrics).toHaveLength(0);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should calculate total distance for multiple waypoints', () => {
      const waypoints = [
        { lat: -33.8688, lon: 151.2093 }, // Sydney
        { lat: -35.3075, lon: 149.1244 }, // Canberra
        { lat: -37.8136, lon: 144.9631 }  // Melbourne
      ];

      const totalDistance = calculateTotalDistance(waypoints);

      // Should be sum of Sydney-Canberra + Canberra-Melbourne distances
      expect(totalDistance).toBeGreaterThan(400);
      expect(totalDistance).toBeLessThan(600);
    });

    it('should return 0 for single waypoint', () => {
      const waypoints = [{ lat: -33.8688, lon: 151.2093 }];
      const totalDistance = calculateTotalDistance(waypoints);

      expect(totalDistance).toBe(0);
    });

    it('should return 0 for no waypoints', () => {
      const waypoints: Array<{ lat: number; lon: number }> = [];
      const totalDistance = calculateTotalDistance(waypoints);

      expect(totalDistance).toBe(0);
    });
  });
});
