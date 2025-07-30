/**
 * Web Worker for parsing GeoJSON data and building spatial indexes
 *
 * This worker handles the parsing of GeoJSON data for airports and airspaces,
 * and builds spatial indexes (R-tree for polygons, KD-tree for points) for
 * efficient spatial queries.
 */

import * as turf from "@turf/turf";
import rbush from "rbush";
import KDBush from "kdbush";
import { AirportFeature, AirspaceFeature } from "@/lib/flight-plan-types";

// Define types for our data structures
interface AirportPoint {
  x: number; // longitude
  y: number; // latitude
  i: number; // index in the original array
}

interface AirportProperties {
  icaoCode?: string;
  name?: string;
  elevation?: {
    value?: number;
    unit?: string;
    referenceDatum?: string;
  };
}

interface AirspaceBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  i: number; // index in the original array
}

// Define more specific message types
type LoadAirportsMessage = {
  type: "loadAirports";
  data: GeoJSON.FeatureCollection;
};

type LoadAirspaceMessage = {
  type: "loadAirspace";
  data: GeoJSON.FeatureCollection;
};

type QueryAirspaceCrossingsMessage = {
  type: "queryAirspaceCrossings";
  data: { line: GeoJSON.LineString; fl: number };
};

type ShortestOCTARouteMessage = {
  type: "shortestOCTARoute";
  data: {
    depLatLon: [number, number];
    destLatLon: [number, number];
    constraints: {
      avoidCTA: boolean;
      fl: number;
    };
  };
};

type LookupAirportMessage = {
  type: "lookupAirport";
  data: { icaoCode: string };
};

// Define the message types
type WorkerMessage =
  | LoadAirportsMessage
  | LoadAirspaceMessage
  | QueryAirspaceCrossingsMessage
  | ShortestOCTARouteMessage
  | LookupAirportMessage;

// Spatial indexes
let airportIndex: KDBush | null = null;
let airportIndexMap: number[] | null = null; // Maps KDBush indices to feature indices
let airspaceIndex: rbush<AirspaceBBox> | null = null;
let airports: GeoJSON.FeatureCollection | null = null;
let airspaces: GeoJSON.FeatureCollection | null = null;

// Handle messages from the main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case "loadAirports":
      handleLoadAirports(data);
      break;
    case "loadAirspace":
      handleLoadAirspace(data);
      break;
    case "queryAirspaceCrossings":
      handleQueryAirspaceCrossings(data);
      break;
    case "shortestOCTARoute":
      handleShortestOCTARoute(data);
      break;
    case "lookupAirport":
      handleLookupAirport(data);
      break;
    default:
      self.postMessage({
        type: "error",
        error: `Unknown message type: ${type}`,
      });
  }
};

/**
 * Handle loading airport data
 */
function handleLoadAirports(data: GeoJSON.FeatureCollection) {
  try {
    airports = data;

    // Build KD-tree index for airports
    const points = data.features.map((feature, i) => {
      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      return {
        x: coords[0], // longitude
        y: coords[1], // latitude
        i, // index in the original array
      };
    });

    // Create KDBush index with the correct constructor signature
    airportIndex = new KDBush(points.length, 64, Float64Array);

    // Create mapping array to map KDBush indices to feature indices
    airportIndexMap = [];

    // Add each point to the index and store the mapping
    for (const point of points) {
      const kdbushIndex = airportIndex.add(point.x, point.y);
      airportIndexMap[kdbushIndex] = point.i;
    }

    // Finish building the index
    airportIndex.finish();

    self.postMessage({
      type: "airportsLoaded",
      count: data.features.length,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `Error loading airports: ${error}`,
    });
  }
}

/**
 * Handle loading airspace data
 */
function handleLoadAirspace(data: GeoJSON.FeatureCollection) {
  try {
    airspaces = data;

    // Build R-tree index for airspaces
    const items = data.features.map((feature, i) => {
      const bbox = turf.bbox(feature);
      return {
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
        i, // index in the original array
      };
    });

    airspaceIndex = new rbush<AirspaceBBox>();
    airspaceIndex.load(items);

    self.postMessage({
      type: "airspaceLoaded",
      count: data.features.length,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `Error loading airspace: ${error}`,
    });
  }
}

/**
 * Query airspace crossings for a given line
 */
function handleQueryAirspaceCrossings(data: {
  line: GeoJSON.LineString;
  fl: number;
}) {
  try {
    if (!airspaces) {
      throw new Error("Airspace data not loaded");
    }

    const { line, fl } = data;

    // Check if airspace data is empty (no features uploaded)
    if (!airspaces.features || airspaces.features.length === 0) {
      // Return empty crossings array - no airspace to cross
      self.postMessage({
        type: "airspaceCrossings",
        crossings: [],
      });
      return;
    }

    if (!airspaceIndex) {
      throw new Error("Airspace index not built");
    }
    const bbox = turf.bbox(line);

    // Query the R-tree for potential intersections
    const hits = airspaceIndex.search({
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
    });

    // Check each potential intersection
    const crossings: AirspaceFeature[] = [];
    for (const hit of hits) {
      const airspace = airspaces.features[hit.i] as GeoJSON.Feature<
        GeoJSON.Polygon,
        {
          lowerLimit?: {
            value: number;
            unit?: string;
            referenceDatum?: string;
          };
          upperLimit?: {
            value: number;
            unit?: string;
            referenceDatum?: string;
          };
          name?: string;
          icaoClass?: string;
          id?: string;
          type?: string;
        }
      >;

      // Check if the flight level is within the airspace vertical limits
      const lowerLimit = airspace.properties?.lowerLimit?.value || 0;
      const upperLimit = airspace.properties?.upperLimit?.value || 999;

      if (fl >= lowerLimit && fl <= upperLimit) {
        // Check if the line intersects the airspace
        if (
          turf.booleanIntersects(
            line,
            airspace,
          )
        ) {
          // Create a proper AirspaceFeature object
          const airspaceFeature: AirspaceFeature = {
            id: (
              airspace.properties?.id ||
              airspace.id ||
              `airspace-${hit.i}`
            ).toString(),
            name: airspace.properties?.name || `Airspace ${hit.i}`,
            type: airspace.properties?.type || "unknown",
            icaoClass: airspace.properties?.icaoClass || "unknown",
            upperLimit: {
              value: upperLimit,
              unit: airspace.properties?.upperLimit?.unit || "ft",
              referenceDatum:
                airspace.properties?.upperLimit?.referenceDatum || "MSL",
            },
            lowerLimit: {
              value: lowerLimit,
              unit: airspace.properties?.lowerLimit?.unit || "ft",
              referenceDatum:
                airspace.properties?.lowerLimit?.referenceDatum || "MSL",
            },
            geometry: airspace.geometry,
          };
          crossings.push(airspaceFeature);
        }
      }
    }

    self.postMessage({
      type: "airspaceCrossings",
      crossings,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `Error querying airspace crossings: ${error}`,
    });
  }
}

/**
 * Look up an airport by ICAO code
 */
function handleLookupAirport(data: { icaoCode: string }) {
  try {
    if (!airports) {
      throw new Error("Airports data not loaded");
    }

    const { icaoCode } = data;

    // Check if airports data is empty (no features uploaded)
    if (!airports.features || airports.features.length === 0) {
      self.postMessage({
        type: "airportLookup",
        airport: null,
      });
      return;
    }

    // Search for the airport by ICAO code
    const airport = airports.features.find(
      (feature) => {
        const props = feature.properties as AirportProperties;
        return props?.icaoCode?.toUpperCase() === icaoCode.toUpperCase();
      }
    );

    if (!airport) {
      self.postMessage({
        type: "airportLookup",
        airport: null,
      });
      return;
    }

    // Extract coordinates from the airport geometry
    const coords = (airport.geometry as GeoJSON.Point).coordinates;
    const airportProps = airport.properties as AirportProperties;

    self.postMessage({
      type: "airportLookup",
      airport: {
        icaoCode: airportProps?.icaoCode || icaoCode,
        name: airportProps?.name || "Unknown",
        coordinates: [coords[0], coords[1]] as [number, number],
        elevation: airportProps?.elevation?.value || 0,
      },
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `Error looking up airport: ${error}`,
    });
  }
}

/**
 * Find the shortest route that avoids controlled airspace
 */
function handleShortestOCTARoute(data: {
  depLatLon: [number, number];
  destLatLon: [number, number];
  constraints: {
    avoidCTA: boolean;
    fl: number;
  };
}) {
  try {
    if (!airspaceIndex || !airspaces) {
      throw new Error("Airspace data not loaded");
    }

    const { depLatLon, destLatLon, constraints } = data;
    const { avoidCTA, fl } = constraints;

    // If not avoiding CTA, just return the direct route
    if (!avoidCTA) {
      const route = [depLatLon, destLatLon];
      self.postMessage({
        type: "octaRoute",
        route,
      });
      return;
    }

    // Create a direct line between departure and destination
    const directLine = turf.lineString([depLatLon, destLatLon]);

    // Buffer the line by 1 NM
    const buffered = turf.buffer(directLine, 1, { units: "nauticalmiles" });

    // Find intersecting airspaces
    // Get the bounding box of the buffered line
    const bbox = turf.bbox(buffered!);
    const hits = airspaceIndex.search({
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
    });

    // If no intersections, return the direct route
    if (hits.length === 0) {
      const route = [depLatLon, destLatLon];
      self.postMessage({
        type: "octaRoute",
        route,
      });
      return;
    }

    // Get the intersecting airspaces
    const intersectingAirspaces = hits
      .map((hit) => airspaces!.features[hit.i])
      .filter((airspace) => {
        const airspaceWithProps = airspace as GeoJSON.Feature<
          GeoJSON.Polygon,
          {
            lowerLimit?: {
              value: number;
              unit?: string;
              referenceDatum?: string;
            };
            upperLimit?: {
              value: number;
              unit?: string;
              referenceDatum?: string;
            };
            name?: string;
            icaoClass?: string;
            id?: string;
            type?: string;
          }
        >;
        const lowerLimit = airspaceWithProps.properties?.lowerLimit?.value || 0;
        const upperLimit =
          airspaceWithProps.properties?.upperLimit?.value || 999;
        return (
          fl >= lowerLimit &&
          fl <= upperLimit &&
          turf.booleanIntersects(
            buffered!,
            airspace!,
          )
        );
      });

    // If no intersections at the specified flight level, return the direct route
    if (intersectingAirspaces.length === 0) {
      const route = [depLatLon, destLatLon];
      self.postMessage({
        type: "octaRoute",
        route,
      });
      return;
    }

    // Build visibility graph nodes
    const nodes: [number, number][] = [depLatLon, destLatLon];

    // Add tangent points for each airspace
    for (const airspace of intersectingAirspaces) {
      const polygon = airspace.geometry as GeoJSON.Polygon;
      const coords = polygon.coordinates[0];

      // Calculate tangent points from departure and destination to this airspace
      const tangentPoints = calculateTangentPoints(depLatLon, destLatLon, coords);

      // Add tangent points to nodes
      for (const point of tangentPoints) {
        nodes.push(point);
      }
    }

    // Helper function to calculate tangent points
    function calculateTangentPoints(
      start: [number, number],
      end: [number, number],
      polygonCoords: number[][]
    ): [number, number][] {
      const tangents: [number, number][] = [];

      // For each edge of the polygon, find the vertices that could be tangent points
      for (let i = 0; i < polygonCoords.length - 1; i++) {
        const vertex = polygonCoords[i] as [number, number];

        // Check if this vertex could be a useful tangent point
        // by ensuring it's not inside the polygon when connected to start/end
        const isUsefulTangent = isVertexUsefulForRouting(vertex, start, end, polygonCoords);

        if (isUsefulTangent) {
          tangents.push(vertex);
        }
      }

      // Limit the number of tangent points to avoid too many nodes
      // Sort by distance to the direct line and take the closest ones
      const directLine = turf.lineString([start, end]);
      tangents.sort((a, b) => {
        const distA = turf.pointToLineDistance(turf.point(a), directLine, { units: "nauticalmiles" });
        const distB = turf.pointToLineDistance(turf.point(b), directLine, { units: "nauticalmiles" });
        return distA - distB;
      });

      // Return at most 6 tangent points per airspace to keep performance reasonable
      return tangents.slice(0, 6);
    }

    // Helper function to determine if a vertex is useful for routing
    function isVertexUsefulForRouting(
      vertex: [number, number],
      start: [number, number],
      end: [number, number],
      polygonCoords: number[][]
    ): boolean {
      try {
        // Create lines from start and end to this vertex
        const startToVertex = turf.lineString([start, vertex]);
        const vertexToEnd = turf.lineString([vertex, end]);
        const polygon = turf.polygon([polygonCoords]);

        // Check if these lines intersect the polygon interior
        // If they don't intersect, this vertex is a good tangent point
        const startIntersects = turf.booleanIntersects(startToVertex, polygon);
        const endIntersects = turf.booleanIntersects(vertexToEnd, polygon);

        return !startIntersects && !endIntersects;
      } catch (error) {
        // If there's an error in the geometric calculation, include the vertex to be safe
        return true;
      }
    }

    // Add nearby VFR waypoints (if available)
    if (airportIndex && airports) {
      // Find airports within 15 NM of the direct line
      const buffer15nm = turf.buffer(directLine, 15, {
        units: "nauticalmiles",
      });
      const bbox15nm = turf.bbox(buffer15nm!);

      const nearbyKdbushIds = airportIndex.range(
        bbox15nm[0],
        bbox15nm[1],
        bbox15nm[2],
        bbox15nm[3],
      );

      for (const kdbushId of nearbyKdbushIds) {
        // Use the mapping to get the original feature index
        const featureIndex = airportIndexMap![kdbushId];
        const airport = airports.features[featureIndex];
        const coords = (airport.geometry as GeoJSON.Point).coordinates;
        nodes.push([coords[0], coords[1]]);

        // Limit total nodes to prevent performance issues
        if (nodes.length > 100) {
          console.warn('Node limit reached, stopping airport addition');
          break;
        }
      }
    }

    // Final check on total node count
    if (nodes.length > 150) {
      console.warn(`Large number of nodes (${nodes.length}), this may impact performance`);
      // Optionally reduce nodes by keeping only the most relevant ones
      const directLine = turf.lineString([depLatLon, destLatLon]);
      const nodeDistances = nodes.slice(2).map((node, index) => ({
        node,
        index: index + 2,
        distance: turf.pointToLineDistance(turf.point(node), directLine, { units: "nauticalmiles" })
      }));

      // Sort by distance to direct line and keep closest 100 nodes plus start/end
      nodeDistances.sort((a, b) => a.distance - b.distance);
      const keepNodes = [nodes[0], nodes[1]]; // Keep start and end
      for (let i = 0; i < Math.min(98, nodeDistances.length); i++) {
        keepNodes.push(nodeDistances[i].node);
      }
      nodes.length = 0;
      nodes.push(...keepNodes);
    }

    // Build graph edges
    const graph = new Map<number, Map<number, number>>();

    for (let i = 0; i < nodes.length; i++) {
      graph.set(i, new Map());

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;

        // Check if the edge intersects any airspace
        const edge = turf.lineString([nodes[i], nodes[j]]);
        let intersects = false;

        for (const airspace of intersectingAirspaces) {
          if (
            turf.booleanIntersects(
              edge,
              airspace,
            )
          ) {
            intersects = true;
            break;
          }
        }

        if (!intersects) {
          // Calculate distance
          const distance = turf.distance(
            turf.point(nodes[i]),
            turf.point(nodes[j]),
            { units: "nauticalmiles" },
          );

          // Add edge to graph
          graph.get(i)!.set(j, distance);
        }
      }
    }

    // A* search
    const start = 0; // departure
    const goal = 1; // destination

    // Heuristic function (great-circle distance)
    const heuristic = (node: number) => {
      return turf.distance(turf.point(nodes[node]), turf.point(nodes[goal]), {
        units: "nauticalmiles",
      });
    };

    // Priority queue implementation for A*
    class PriorityQueue {
      private items: Array<{ node: number; priority: number }> = [];

      enqueue(node: number, priority: number) {
        const item = { node, priority };
        let added = false;

        for (let i = 0; i < this.items.length; i++) {
          if (item.priority < this.items[i].priority) {
            this.items.splice(i, 0, item);
            added = true;
            break;
          }
        }

        if (!added) {
          this.items.push(item);
        }
      }

      dequeue(): number | null {
        const item = this.items.shift();
        return item ? item.node : null;
      }

      isEmpty(): boolean {
        return this.items.length === 0;
      }

      has(node: number): boolean {
        return this.items.some(item => item.node === node);
      }

      remove(node: number) {
        this.items = this.items.filter(item => item.node !== node);
      }
    }

    const openSet = new PriorityQueue();
    const closedSet = new Set<number>();
    const cameFrom = new Map<number, number>();

    // Cost from start to node
    const gScore = new Map<number, number>();
    gScore.set(start, 0);

    // Estimated total cost from start to goal through node
    const fScore = new Map<number, number>();
    fScore.set(start, heuristic(start));

    // Add start node to open set
    openSet.enqueue(start, fScore.get(start)!);

    // Add timeout protection to prevent infinite loops
    const startTime = Date.now();
    const maxSearchTime = 30000; // 30 seconds maximum
    let iterations = 0;
    const maxIterations = nodes.length * nodes.length; // Reasonable upper bound

    while (!openSet.isEmpty()) {
      // Check for timeout or excessive iterations
      iterations++;
      if (iterations > maxIterations || (Date.now() - startTime) > maxSearchTime) {
        console.warn('A* search timeout or max iterations reached, falling back to direct route');
        break;
      }
      // Get node with lowest fScore
      const current = openSet.dequeue()!;

      // If we reached the goal, reconstruct the path
      if (current === goal) {
        const path: number[] = [current];
        let pathNode = current;
        while (cameFrom.has(pathNode)) {
          pathNode = cameFrom.get(pathNode)!;
          path.unshift(pathNode);
        }

        // Convert path indices to coordinates
        const route = path.map((i) => nodes[i]);

        self.postMessage({
          type: "octaRoute",
          route,
        });
        return;
      }

      // Add current to closed set
      closedSet.add(current);

      // Check neighbors
      const neighbors = graph.get(current) || new Map();
      for (const [neighbor, distance] of neighbors.entries()) {
        // Skip if already processed
        if (closedSet.has(neighbor)) {
          continue;
        }

        // Calculate tentative gScore
        const tentativeGScore = (gScore.get(current) || Infinity) + distance;

        // If this path is better than any previous one
        if (tentativeGScore < (gScore.get(neighbor) || Infinity)) {
          // Update path and scores
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          const newFScore = tentativeGScore + heuristic(neighbor);
          fScore.set(neighbor, newFScore);

          // Add neighbor to openSet if not already there
          if (!openSet.has(neighbor)) {
            openSet.enqueue(neighbor, newFScore);
          } else {
            // Update priority in open set
            openSet.remove(neighbor);
            openSet.enqueue(neighbor, newFScore);
          }
        }
      }
    }

    // If we get here, no path was found
    // Return the direct route as a fallback
    const route = [depLatLon, destLatLon];
    self.postMessage({
      type: "octaRoute",
      route,
      warning: "No OCTA route found, returning direct route",
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: `Error finding OCTA route: ${error}`,
    });
  }
}
