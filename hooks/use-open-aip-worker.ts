import { useEffect, useRef, useState } from "react";
import { openAipDB } from "./use-flight-plans";
import { AirspaceFeature } from "@/lib/flight-plan-types";

// Define the worker message types
type WorkerResponse = {
  type:
    | "airportsLoaded"
    | "airspaceLoaded"
    | "airspaceCrossings"
    | "octaRoute"
    | "airportLookup"
    | "error";
  count?: number;
  crossings?: AirspaceFeature[];
  route?: [number, number][];
  airport?: {
    icaoCode: string;
    name: string;
    coordinates: [number, number];
    elevation: number;
  } | null;
  warning?: string;
  error?: string;
};

/**
 * Hook for using the OpenAIP Web Worker
 *
 * This hook provides a convenient interface for interacting with the OpenAIP Web Worker,
 * which handles parsing GeoJSON data and building spatial indexes for efficient spatial queries.
 */
export function useOpenAipWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [airportsLoaded, setAirportsLoaded] = useState(false);
  const [airspaceLoaded, setAirspaceLoaded] = useState(false);
  const [airportsCount, setAirportsCount] = useState(0);
  const [airspaceCount, setAirspaceCount] = useState(0);

  // Initialize the worker
  useEffect(() => {
    // Create the worker
    workerRef.current = new Worker(
      new URL("../workers/open-aip-loader.worker.ts", import.meta.url),
      { type: "module" },
    );

    // Set up the message handler
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, count, crossings, route, warning, error } = event.data;

      switch (type) {
        case "airportsLoaded":
          setAirportsLoaded(true);
          if (count !== undefined) setAirportsCount(count);
          // Check if both are loaded after this update
          setAirspaceLoaded((prev) => {
            setIsLoading(!(true && prev)); // airports is now true
            return prev;
          });
          break;
        case "airspaceLoaded":
          setAirspaceLoaded(true);
          if (count !== undefined) setAirspaceCount(count);
          // Check if both are loaded after this update
          setAirportsLoaded((prev) => {
            setIsLoading(!(prev && true)); // airspace is now true
            return prev;
          });
          break;
        case "error":
          setError(error || "Unknown error");
          setIsLoading(false); // Stop loading on error
          break;
      }
    };

    // Load the data
    loadData();

    // Clean up the worker when the component unmounts
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Function to load the data from IndexedDB and send it to the worker
  const loadData = async () => {
    try {
      let airportsLoaded = false;
      let airspaceLoaded = false;

      // Load airports data
      const airportsData = await openAipDB.getGeoJSON("airports");
      if (airportsData) {
        workerRef.current?.postMessage({
          type: "loadAirports",
          data: airportsData,
        });
        airportsLoaded = true;
      } else {
        // No airports data - send empty dataset to worker
        workerRef.current?.postMessage({
          type: "loadAirports",
          data: { type: "FeatureCollection", features: [] },
        });
        setAirportsLoaded(true);
        setAirportsCount(0);
        airportsLoaded = true;
      }

      // Load airspace data
      const airspaceData = await openAipDB.getGeoJSON("airspace");
      if (airspaceData) {
        workerRef.current?.postMessage({
          type: "loadAirspace",
          data: airspaceData,
        });
        airspaceLoaded = true;
      } else {
        // No airspace data - send empty dataset to worker
        workerRef.current?.postMessage({
          type: "loadAirspace",
          data: { type: "FeatureCollection", features: [] },
        });
        setAirspaceLoaded(true);
        setAirspaceCount(0);
        airspaceLoaded = true;
      }

      // If both completed immediately (no data), set loading to false
      if (airportsLoaded && airspaceLoaded && !airportsData && !airspaceData) {
        setIsLoading(false);
      }
    } catch (err) {
      setError(`Error loading data: ${err}`);
      setIsLoading(false);
    }
  };

  /**
   * Query airspace crossings for a given line
   * @param line GeoJSON LineString
   * @param fl Flight level
   * @returns Promise that resolves to an array of airspace features
   */
  const queryAirspaceCrossings = (
    line: GeoJSON.LineString,
    fl: number,
  ): Promise<AirspaceFeature[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject("Worker not initialized");
        return;
      }

      // Set up a one-time message handler for this query
      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const { type, crossings, error } = event.data;

        if (type === "airspaceCrossings") {
          workerRef.current?.removeEventListener("message", messageHandler);
          resolve(crossings || []);
        } else if (type === "error") {
          workerRef.current?.removeEventListener("message", messageHandler);
          reject(error || "Unknown error");
        }
      };

      workerRef.current.addEventListener("message", messageHandler);

      // Send the query to the worker
      workerRef.current.postMessage({
        type: "queryAirspaceCrossings",
        data: { line, fl },
      });
    });
  };

  /**
   * Find the shortest route that avoids controlled airspace
   * @param depLatLon Departure coordinates [lon, lat]
   * @param destLatLon Destination coordinates [lon, lat]
   * @param constraints Routing constraints
   * @returns Promise that resolves to an array of coordinates
   */
  const shortestOCTARoute = (
    depLatLon: [number, number],
    destLatLon: [number, number],
    constraints: { avoidCTA: boolean; fl: number },
  ): Promise<{ route: [number, number][]; warning?: string }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject("Worker not initialized");
        return;
      }

      // Set up a one-time message handler for this query
      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const { type, route, warning, error } = event.data;

        if (type === "octaRoute") {
          workerRef.current?.removeEventListener("message", messageHandler);
          resolve({ route: route || [depLatLon, destLatLon], warning });
        } else if (type === "error") {
          workerRef.current?.removeEventListener("message", messageHandler);
          reject(error || "Unknown error");
        }
      };

      workerRef.current.addEventListener("message", messageHandler);

      // Send the query to the worker
      workerRef.current.postMessage({
        type: "shortestOCTARoute",
        data: { depLatLon, destLatLon, constraints },
      });
    });
  };

  /**
   * Look up an airport by ICAO code
   * @param icaoCode The ICAO code of the airport to look up
   * @returns Promise that resolves to airport information or null if not found
   */
  const lookupAirport = (
    icaoCode: string,
  ): Promise<{
    icaoCode: string;
    name: string;
    coordinates: [number, number];
    elevation: number;
  } | null> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject("Worker not initialized");
        return;
      }

      // Set up a one-time message handler for this query
      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const { type, airport, error } = event.data;

        if (type === "airportLookup") {
          workerRef.current?.removeEventListener("message", messageHandler);
          resolve(airport);
        } else if (type === "error") {
          workerRef.current?.removeEventListener("message", messageHandler);
          reject(error || "Unknown error");
        }
      };

      workerRef.current.addEventListener("message", messageHandler);

      // Send the query to the worker
      workerRef.current.postMessage({
        type: "lookupAirport",
        data: { icaoCode },
      });
    });
  };

  return {
    isLoading,
    error,
    airportsLoaded,
    airspaceLoaded,
    airportsCount,
    airspaceCount,
    queryAirspaceCrossings,
    shortestOCTARoute,
    lookupAirport,
    reload: loadData,
  };
}
