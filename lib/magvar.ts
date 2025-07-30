/**
 * Magnetic variation calculation for AU/NZ region
 *
 * This module provides a minimal bilinear-interpolated grid for calculating
 * magnetic variation in the Australia/New Zealand region.
 */

// Magnetic variation grid data for AU/NZ region (simplified)
// Grid covers approximately: 110°E to 180°E longitude, -50°S to -10°S latitude
// Values are in degrees, positive = East, negative = West
const MAG_VAR_GRID = {
  // Grid bounds
  minLat: -50,
  maxLat: -10,
  minLon: 110,
  maxLon: 180,

  // Grid resolution (degrees)
  latStep: 10,
  lonStep: 10,

  // Magnetic variation values (degrees E+/W-)
  // Grid points from SW to NE: [lat][lon]
  values: [
    // -50°S row (110°E to 180°E)
    [15, 16, 17, 18, 19, 20, 21],
    // -40°S row
    [12, 13, 14, 15, 16, 17, 18],
    // -30°S row
    [9, 10, 11, 12, 13, 14, 15],
    // -20°S row
    [6, 7, 8, 9, 10, 11, 12],
    // -10°S row
    [3, 4, 5, 6, 7, 8, 9]
  ]
};

/**
 * Calculate magnetic variation using bilinear interpolation
 * @param lat Latitude in degrees (negative for South)
 * @param lon Longitude in degrees (positive for East)
 * @returns Magnetic variation in degrees (positive = East, negative = West)
 */
export function getMagVar(lat: number, lon: number): number {
  // Clamp coordinates to grid bounds
  const clampedLat = Math.max(MAG_VAR_GRID.minLat, Math.min(MAG_VAR_GRID.maxLat, lat));
  const clampedLon = Math.max(MAG_VAR_GRID.minLon, Math.min(MAG_VAR_GRID.maxLon, lon));

  // Calculate grid indices
  const latIndex = (clampedLat - MAG_VAR_GRID.minLat) / MAG_VAR_GRID.latStep;
  const lonIndex = (clampedLon - MAG_VAR_GRID.minLon) / MAG_VAR_GRID.lonStep;

  // Get integer indices for grid corners
  const lat1 = Math.floor(latIndex);
  const lat2 = Math.min(lat1 + 1, MAG_VAR_GRID.values.length - 1);
  const lon1 = Math.floor(lonIndex);
  const lon2 = Math.min(lon1 + 1, MAG_VAR_GRID.values[0].length - 1);

  // Get fractional parts for interpolation
  const latFrac = latIndex - lat1;
  const lonFrac = lonIndex - lon1;

  // Get corner values
  const v11 = MAG_VAR_GRID.values[lat1][lon1]; // SW corner
  const v12 = MAG_VAR_GRID.values[lat1][lon2]; // SE corner
  const v21 = MAG_VAR_GRID.values[lat2][lon1]; // NW corner
  const v22 = MAG_VAR_GRID.values[lat2][lon2]; // NE corner

  // Bilinear interpolation
  const v1 = v11 * (1 - lonFrac) + v12 * lonFrac; // South edge
  const v2 = v21 * (1 - lonFrac) + v22 * lonFrac; // North edge
  const result = v1 * (1 - latFrac) + v2 * latFrac; // Final interpolation

  return Math.round(result * 10) / 10; // Round to 1 decimal place
}

/**
 * Get magnetic variation for a specific location with error handling
 * @param lat Latitude in degrees
 * @param lon Longitude in degrees
 * @returns Magnetic variation in degrees, or 0 if coordinates are invalid
 */
export function getMagVarSafe(lat: number, lon: number): number {
  try {
    if (isNaN(lat) || isNaN(lon)) {
      return 0;
    }
    return getMagVar(lat, lon);
  } catch (error) {
    console.warn(`Error calculating magnetic variation for ${lat}, ${lon}:`, error);
    return 0;
  }
}
