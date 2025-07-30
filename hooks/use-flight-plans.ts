import { useEffect, useState } from "react";
import { FlightPlan } from "@/lib/flight-plan-types";
import { DB_NAME, DB_VERSION } from "@/hooks/use-presets";

export const FLIGHT_PLAN_STORE_NAME = "flight-plans";
export const OPEN_AIP_STORE_NAME = "open-aip";

// Initialize the database with the flight plan store
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION + 1);

    request.onerror = (event) => {
      reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const openDbRequest = event.target as IDBOpenDBRequest;
      if (openDbRequest.result == null || openDbRequest.transaction == null) {
        reject("Database upgrade failed");
        return;
      }
      const db = openDbRequest.result;

      // Create flight plan store if it doesn't exist
      if (!db.objectStoreNames.contains(FLIGHT_PLAN_STORE_NAME)) {
        const store = db.createObjectStore(FLIGHT_PLAN_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("aircraftId", "aircraftId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // Create OpenAIP store if it doesn't exist
      if (!db.objectStoreNames.contains(OPEN_AIP_STORE_NAME)) {
        const store = db.createObjectStore(OPEN_AIP_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });
};

// Flight plan database operations
export const flightPlanDB = {
  async getAll(): Promise<FlightPlan[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FLIGHT_PLAN_STORE_NAME, "readonly");
      const store = transaction.objectStore(FLIGHT_PLAN_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(`Error getting flight plans: ${request.error}`);
      };
    });
  },

  async getById(id: string): Promise<FlightPlan | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FLIGHT_PLAN_STORE_NAME, "readonly");
      const store = transaction.objectStore(FLIGHT_PLAN_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(`Error getting flight plan: ${request.error}`);
      };
    });
  },

  async create(flightPlan: Omit<FlightPlan, "id">): Promise<FlightPlan> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FLIGHT_PLAN_STORE_NAME, "readwrite");
      const store = transaction.objectStore(FLIGHT_PLAN_STORE_NAME);

      // Generate a unique ID
      const id = crypto.randomUUID();
      const planWithId = { ...flightPlan, id };

      const request = store.add(planWithId);

      request.onsuccess = () => {
        resolve(planWithId as FlightPlan);
      };

      request.onerror = () => {
        reject(`Error creating flight plan: ${request.error}`);
      };
    });
  },

  async update(flightPlan: FlightPlan): Promise<FlightPlan> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FLIGHT_PLAN_STORE_NAME, "readwrite");
      const store = transaction.objectStore(FLIGHT_PLAN_STORE_NAME);

      // Update the updatedAt timestamp
      const updatedPlan = {
        ...flightPlan,
        updatedAt: new Date()
      };

      const request = store.put(updatedPlan);

      request.onsuccess = () => {
        resolve(updatedPlan);
      };

      request.onerror = () => {
        reject(`Error updating flight plan: ${request.error}`);
      };
    });
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FLIGHT_PLAN_STORE_NAME, "readwrite");
      const store = transaction.objectStore(FLIGHT_PLAN_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(`Error deleting flight plan: ${request.error}`);
      };
    });
  },
};

// OpenAIP database operations
export const openAipDB = {
  async storeGeoJSON(type: 'airports' | 'airspace', data: GeoJSON.FeatureCollection): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OPEN_AIP_STORE_NAME, "readwrite");
      const store = transaction.objectStore(OPEN_AIP_STORE_NAME);

      // Check if we already have this type
      const index = store.index("type");
      const request = index.get(type);

      request.onsuccess = () => {
        const existingData = request.result;
        const entry = {
          id: existingData?.id || crypto.randomUUID(),
          type,
          data,
          updatedAt: new Date()
        };

        const putRequest = store.put(entry);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          reject(`Error storing GeoJSON data: ${putRequest.error}`);
        };
      };

      request.onerror = () => {
        reject(`Error checking for existing GeoJSON data: ${request.error}`);
      };
    });
  },

  async getGeoJSON(type: 'airports' | 'airspace'): Promise<GeoJSON.FeatureCollection | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OPEN_AIP_STORE_NAME, "readonly");
      const store = transaction.objectStore(OPEN_AIP_STORE_NAME);
      const index = store.index("type");
      const request = index.get(type);

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };

      request.onerror = () => {
        reject(`Error getting GeoJSON data: ${request.error}`);
      };
    });
  },

  async getLastUpdated(type: 'airports' | 'airspace'): Promise<Date | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OPEN_AIP_STORE_NAME, "readonly");
      const store = transaction.objectStore(OPEN_AIP_STORE_NAME);
      const index = store.index("type");
      const request = index.get(type);

      request.onsuccess = () => {
        resolve(request.result?.updatedAt || null);
      };

      request.onerror = () => {
        reject(`Error getting last updated timestamp: ${request.error}`);
      };
    });
  }
};

// Hook for accessing flight plans
export function useFlightPlans() {
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load flight plans
  const loadFlightPlans = async () => {
    try {
      const fetchedPlans = await flightPlanDB.getAll();
      setFlightPlans(
        [...fetchedPlans].sort((a, b) =>
          b.updatedAt.getTime() - a.updatedAt.getTime()
        )
      );
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError(`Error fetching flight plans: ${err}`);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFlightPlans();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DB_NAME) {
        loadFlightPlans();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    flightPlans,
    isLoading,
    error,
    refreshFlightPlans: loadFlightPlans,
  };
}

// Hook for accessing OpenAIP data
export function useOpenAipData(type: 'airports' | 'airspace') {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load OpenAIP data
  const loadData = async () => {
    try {
      const fetchedData = await openAipDB.getGeoJSON(type);
      const fetchedLastUpdated = await openAipDB.getLastUpdated(type);
      setData(fetchedData);
      setLastUpdated(fetchedLastUpdated);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError(`Error fetching OpenAIP data: ${err}`);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  return {
    data,
    lastUpdated,
    isLoading,
    error,
    refreshData: loadData,
  };
}
