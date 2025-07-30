/**
 * Flight Planning Page
 *
 * Main page for the flight planning feature with a two-pane layout:
 * - Left: Forms for aircraft, stages, waypoints
 * - Right: Three tables (waypoints, leg metrics, scenario matrix)
 */

"use client";

import { useState, useEffect } from "react";
import {
  useAircraftModel,
  AircraftModelProvider,
} from "@/hooks/use-aircraft-model";
import { computeTopOfClimb, lookupAircraft } from "@/lib/performance";
import { useOpenAipWorker } from "@/hooks/use-open-aip-worker";
import {
  flightPlanDB,
  openAipDB,
  useFlightPlans,
} from "@/hooks/use-flight-plans";
import {
  FlightPlan,
  FlightStage,
  RouteVariant,
  Waypoint,
} from "@/lib/flight-plan-types";
import { computeAllLegMetrics, LegMetrics } from "@/lib/geometry";
import { WaypointTable } from "@/components/WaypointTable";
import { LegMetricsTable } from "@/components/LegMetricsTable";
import { ScenarioMatrix, Scenario } from "@/components/ScenarioMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Save, Trash2, Upload } from "lucide-react";
import * as turf from "@turf/turf";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

export default function FlightPlanningPage() {
  return (
    <AircraftModelProvider>
      <FlightPlanningContent />
    </AircraftModelProvider>
  );
}

function FlightPlanningContent() {
  const { model, setModel } = useAircraftModel();
  const {
    isLoading: isWorkerLoading,
    error: workerError,
    queryAirspaceCrossings,
    shortestOCTARoute,
    lookupAirport,
    reload: reloadWorkerData,
  } = useOpenAipWorker();
  const {
    flightPlans,
    isLoading: isPlansLoading,
    error: plansError,
    refreshFlightPlans,
  } = useFlightPlans();

  // State for the current flight plan
  const [currentPlan, setCurrentPlan] = useState<FlightPlan>({
    id: uuidv4(),
    name: "New Flight Plan",
    aircraftId: "warrior3", // Pre-loaded with warrior3 only
    stages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // State for the current stage being edited
  const [departureIcao, setDepartureIcao] = useState("");
  const [destinationIcao, setDestinationIcao] = useState("");

  // State for scenarios and leg metrics
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [legMetrics, setLegMetrics] = useState<LegMetrics[]>([]);

  // State for data loading
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [airportsUploaded, setAirportsUploaded] = useState(false);
  const [airspaceUploaded, setAirspaceUploaded] = useState(false);

  // Check for existing data on component load
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const airportsData = await openAipDB.getGeoJSON("airports");
        const airspaceData = await openAipDB.getGeoJSON("airspace");

        setAirportsUploaded(!!airportsData);
        setAirspaceUploaded(!!airspaceData);
      } catch (error) {
        console.error("Error checking existing data:", error);
      }
    };

    checkExistingData();
  }, []);

  // Update leg metrics when flight plan changes
  useEffect(() => {
    if (currentPlan.stages.length > 0) {
      // Get all waypoints from the first variant of each stage
      const allWaypoints = currentPlan.stages.flatMap((stage) =>
        stage.variants.length > 0 ? stage.variants[0].waypoints : [],
      );

      if (allWaypoints.length >= 2) {
        const metrics = computeAllLegMetrics(allWaypoints);
        setLegMetrics(metrics);
      } else {
        setLegMetrics([]);
      }
    } else {
      setLegMetrics([]);
    }
  }, [currentPlan]);

  // Handle aircraft selection (restricted to warrior3 only)
  const handleAircraftChange = (newModel: string) => {
    if (newModel === "warrior3") {
      setModel("warrior3");
      setCurrentPlan((prev) => ({
        ...prev,
        aircraftId: "warrior3",
      }));
    }
  };

  // Handle adding a new stage
  const handleAddStage = async () => {
    if (!departureIcao || !destinationIcao) {
      alert("Please enter both departure and destination ICAO codes");
      return;
    }

    try {
      // Look up the actual coordinates for the departure and destination airports
      const [depAirport, destAirport] = await Promise.all([
        lookupAirport(departureIcao),
        lookupAirport(destinationIcao),
      ]);

      if (!depAirport) {
        alert(`Departure airport ${departureIcao} not found in database`);
        return;
      }

      if (!destAirport) {
        alert(`Destination airport ${destinationIcao} not found in database`);
        return;
      }

      const depCoords: [number, number] = depAirport.coordinates;
      const destCoords: [number, number] = destAirport.coordinates;

      // Create a direct line between departure and destination
      const line = turf.lineString([depCoords, destCoords]);

      // Check for airspace crossings
      const crossings = await queryAirspaceCrossings(line.geometry, 85); // Assuming FL85

      // Create waypoints for the direct route (CTA variant)
      const ctaWaypoints: Waypoint[] = [
        {
          id: uuidv4(),
          name: departureIcao,
          lat: depCoords[1],
          lon: depCoords[0],
          altitudeFromHereFt: 0,
          windTrueHeading_deg: null,
          temperature_C: null,
          isAirport: true,
          visitNoLand: false,
          groundTimeMin: 0,
          refuelOptional: false,
        },
        {
          id: uuidv4(),
          name: destinationIcao,
          lat: destCoords[1],
          lon: destCoords[0],
          altitudeFromHereFt: 0,
          windTrueHeading_deg: null,
          temperature_C: null,
          isAirport: true,
          visitNoLand: false,
          groundTimeMin: 0,
          refuelOptional: false,
        },
      ];

      // Create the CTA variant
      const ctaVariant: RouteVariant = {
        id: uuidv4(),
        name: "CTA",
        type: "CTA",
        waypoints: ctaWaypoints,
        ete: null,
        fuel: null,
        topOfClimb: null,
        topOfDescent: null,
      };

      // Create variants array with CTA variant
      const variants: RouteVariant[] = [ctaVariant];

      // If there are airspace crossings, create an OCTA variant
      if (crossings.length > 0) {
        // Get the OCTA route
        const { route } = await shortestOCTARoute(depCoords, destCoords, {
          avoidCTA: true,
          fl: 85, // Assuming FL85
        });

        // Create waypoints for the OCTA route
        const octaWaypoints: Waypoint[] = [
          {
            id: uuidv4(),
            name: departureIcao,
            lat: depCoords[1],
            lon: depCoords[0],
            altitudeFromHereFt: 0,
            windTrueHeading_deg: null,
            temperature_C: null,
            isAirport: true,
            visitNoLand: false,
            groundTimeMin: 0,
            refuelOptional: false,
          },
        ];

        // Add intermediate waypoints
        for (let i = 1; i < route.length - 1; i++) {
          octaWaypoints.push({
            id: uuidv4(),
            name: `WP-${i}`,
            lat: route[i][1],
            lon: route[i][0],
            altitudeFromHereFt: 8500, // Assuming 8500 ft
            windTrueHeading_deg: null,
            temperature_C: null,
            isAirport: false,
            visitNoLand: false,
            groundTimeMin: 0,
            refuelOptional: false,
          });
        }

        // Add destination
        octaWaypoints.push({
          id: uuidv4(),
          name: destinationIcao,
          lat: destCoords[1],
          lon: destCoords[0],
          altitudeFromHereFt: 0,
          windTrueHeading_deg: null,
          temperature_C: null,
          isAirport: true,
          visitNoLand: false,
          groundTimeMin: 0,
          refuelOptional: false,
        });

        // Create the OCTA variant
        const octaVariant: RouteVariant = {
          id: uuidv4(),
          name: "OCTA",
          type: "OCTA",
          waypoints: octaWaypoints,
          ete: null,
          fuel: null,
          topOfClimb: null,
          topOfDescent: null,
        };

        // Add OCTA variant
        variants.push(octaVariant);
      }

      // Create the new stage
      const newStage: FlightStage = {
        id: uuidv4(),
        name: `Stage ${currentPlan.stages.length + 1}`,
        departureIcao,
        destinationIcao,
        variants,
      };

      // Add the new stage to the flight plan and update performance calculations
      setCurrentPlan((prev) => {
        const updatedPlan = {
          ...prev,
          stages: [...prev.stages, newStage],
          updatedAt: new Date(),
        };

        // Update performance calculations for the new plan
        const aircraft = lookupAircraft(updatedPlan.aircraftId);
        const updatedStages = updatedPlan.stages.map((stage) => {
          const updatedVariants = stage.variants.map((variant) => {
            // Calculate top of climb
            const topOfClimb = computeTopOfClimb(
              variant.waypoints,
              aircraft,
              0, // Assuming ISA deviation of 0
            );

            // Calculate ETE and fuel (simplified for now)
            let totalEte = 0;
            let totalFuel = 0;

            for (let i = 0; i < variant.waypoints.length - 1; i++) {
              const wp1 = variant.waypoints[i];
              const wp2 = variant.waypoints[i + 1];

              // Calculate distance
              const distance = turf.distance(
                turf.point([wp1.lon, wp1.lat]),
                turf.point([wp2.lon, wp2.lat]),
                { units: "nauticalmiles" },
              );

              // Calculate TAS
              const tas = aircraft.tasKt(
                wp1.temperature_C || 15, // Default to 15°C if not specified
                wp1.altitudeFromHereFt || 0,
              );

              // Calculate time (hours)
              const time = distance / tas;

              // Calculate fuel
              const fuel =
                aircraft.cruiseFuelFlowLph(
                  wp1.temperature_C || 15, // Default to 15°C if not specified
                  wp1.altitudeFromHereFt || 0,
                ) * time;

              totalEte += time * 60; // Convert to minutes
              totalFuel += fuel;

              // Add ground time if this is a visit-no-land waypoint
              if (wp1.isAirport && wp1.visitNoLand) {
                totalEte += wp1.groundTimeMin;
              }
            }

            return {
              ...variant,
              ete: Math.round(totalEte),
              fuel: Math.round(totalFuel),
              topOfClimb,
            };
          });

          return {
            ...stage,
            variants: updatedVariants,
          };
        });

        const finalPlan = {
          ...updatedPlan,
          stages: updatedStages,
        };

        // Generate scenarios with the updated plan
        setTimeout(() => {
          generateScenarios(finalPlan);
        }, 0);

        return finalPlan;
      });

      // Clear inputs
      setDepartureIcao("");
      setDestinationIcao("");
    } catch (error) {
      console.error("Error adding stage:", error);
      alert(`Error adding stage: ${error}`);
    }
  };

  // Update performance calculations for all stages and variants
  const updatePerformanceCalculations = () => {
    const aircraft = lookupAircraft(currentPlan.aircraftId);

    const updatedStages = currentPlan.stages.map((stage) => {
      const updatedVariants = stage.variants.map((variant) => {
        // Calculate top of climb
        const topOfClimb = computeTopOfClimb(
          variant.waypoints,
          aircraft,
          0, // Assuming ISA deviation of 0
        );

        // Calculate ETE and fuel (simplified for now)
        let totalEte = 0;
        let totalFuel = 0;

        for (let i = 0; i < variant.waypoints.length - 1; i++) {
          const wp1 = variant.waypoints[i];
          const wp2 = variant.waypoints[i + 1];

          // Calculate distance
          const distance = turf.distance(
            turf.point([wp1.lon, wp1.lat]),
            turf.point([wp2.lon, wp2.lat]),
            { units: "nauticalmiles" },
          );

          // Calculate TAS
          const tas = aircraft.tasKt(
            wp1.temperature_C || 15, // Default to 15°C if not specified
            wp1.altitudeFromHereFt || 0,
          );

          // Calculate time (hours)
          const time = distance / tas;

          // Calculate fuel
          const fuel =
            aircraft.cruiseFuelFlowLph(
              wp1.temperature_C || 15, // Default to 15°C if not specified
              wp1.altitudeFromHereFt || 0,
            ) * time;

          totalEte += time * 60; // Convert to minutes
          totalFuel += fuel;

          // Add ground time if this is a visit-no-land waypoint
          if (wp1.isAirport && wp1.visitNoLand) {
            totalEte += wp1.groundTimeMin;
          }
        }

        return {
          ...variant,
          ete: Math.round(totalEte),
          fuel: Math.round(totalFuel),
          topOfClimb,
        };
      });

      return {
        ...stage,
        variants: updatedVariants,
      };
    });

    setCurrentPlan((prev) => ({
      ...prev,
      stages: updatedStages,
      updatedAt: new Date(),
    }));
  };

  // Generate scenarios based on the current flight plan
  const generateScenarios = (planToUse?: FlightPlan) => {
    const plan = planToUse || currentPlan;
    // Get all possible combinations of variants and refueling options
    const newScenarios: Scenario[] = [];

    // Helper function to generate all combinations
    const generateCombinations = (
      stageIndex: number,
      currentCombination: Array<{
        stageId: string;
        variantId: string;
        refuel: boolean;
      }>,
    ) => {
      if (stageIndex >= plan.stages.length) {
        // We have a complete combination, create a scenario
        const id = uuidv4();
        const name = currentCombination
          .map((item) => {
            const stage = plan.stages.find((s) => s.id === item.stageId);
            const variant = stage?.variants.find(
              (v) => v.id === item.variantId,
            );
            return `${variant?.type}${item.refuel ? "+Fuel" : ""}`;
          })
          .join(" → ");

        // Calculate total ETE and fuel
        let totalEte = 0;
        let totalFuel = 0;
        let fuelRemain = 181; // Assuming full tanks for Warrior III

        for (let i = 0; i < currentCombination.length; i++) {
          const { stageId, variantId, refuel } = currentCombination[i];
          const stage = plan.stages.find((s) => s.id === stageId);
          const variant = stage?.variants.find((v) => v.id === variantId);

          if (variant) {
            totalEte += variant.ete || 0;

            // If refueling, reset fuel remaining
            if (refuel) {
              fuelRemain = 181; // Assuming full tanks for Warrior III
            }

            // Deduct fuel for this leg
            fuelRemain -= variant.fuel || 0;
            totalFuel += variant.fuel || 0;
          }
        }

        newScenarios.push({
          id,
          name,
          stageVariants: currentCombination,
          totalEte,
          totalFuel,
          fuelRemain,
          isValid: fuelRemain >= 30, // Assuming 30L minimum reserve
        });

        return;
      }

      const stage = plan.stages[stageIndex];

      // For each variant in this stage
      for (const variant of stage.variants) {
        // Check if this stage has refueling options
        const hasRefuelOption = variant.waypoints.some(
          (wp) => wp.isAirport && wp.refuelOptional,
        );

        if (hasRefuelOption) {
          // Try both with and without refueling
          generateCombinations(stageIndex + 1, [
            ...currentCombination,
            { stageId: stage.id, variantId: variant.id, variantType: variant.type, refuel: false },
          ]);

          generateCombinations(stageIndex + 1, [
            ...currentCombination,
            { stageId: stage.id, variantId: variant.id, variantType: variant.type, refuel: true },
          ]);
        } else {
          // No refueling option, just add the variant
          generateCombinations(stageIndex + 1, [
            ...currentCombination,
            { stageId: stage.id, variantId: variant.id, variantType: variant.type, refuel: false },
          ]);
        }
      }
    };

    // Start generating combinations
    generateCombinations(0, []);

    // Limit to 1024 scenarios as per requirements
    setScenarios(newScenarios.slice(0, 1024));
  };

  // Handle file upload for airports
  const handleAirportsUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".geojson")) {
      setDataLoadError("Please upload a GeoJSON file");
      return;
    }

    setIsLoadingData(true);
    setDataLoadError(null);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text) as GeoJSON.FeatureCollection;

      // Validate that it's a valid GeoJSON
      if (
        !geojson.type ||
        geojson.type !== "FeatureCollection" ||
        !geojson.features
      ) {
        throw new Error("Invalid GeoJSON format");
      }

      // Store in IndexedDB
      await openAipDB.storeGeoJSON("airports", geojson);
      setAirportsUploaded(true);

      // Reload worker data
      reloadWorkerData();

      // Clear the input
      event.target.value = "";
    } catch (error) {
      console.error("Error uploading airports:", error);
      setDataLoadError(`Error uploading airports: ${error}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle file upload for airspace
  const handleAirspaceUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".geojson")) {
      setDataLoadError("Please upload a GeoJSON file");
      return;
    }

    setIsLoadingData(true);
    setDataLoadError(null);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text) as GeoJSON.FeatureCollection;

      // Validate that it's a valid GeoJSON
      if (
        !geojson.type ||
        geojson.type !== "FeatureCollection" ||
        !geojson.features
      ) {
        throw new Error("Invalid GeoJSON format");
      }

      // Store in IndexedDB
      await openAipDB.storeGeoJSON("airspace", geojson);
      setAirspaceUploaded(true);

      // Reload worker data
      reloadWorkerData();

      // Clear the input
      event.target.value = "";
    } catch (error) {
      console.error("Error uploading airspace:", error);
      setDataLoadError(`Error uploading airspace: ${error}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle saving the flight plan
  const handleSavePlan = async () => {
    try {
      await flightPlanDB.update(currentPlan);
      refreshFlightPlans();
      alert("Flight plan saved successfully");
    } catch (error) {
      console.error("Error saving flight plan:", error);
      alert(`Error saving flight plan: ${error}`);
    }
  };

  // Handle waypoint updates
  const handleWaypointUpdate = (
    stageIndex: number,
    variantIndex: number,
    waypointIndex: number,
    waypoint: Waypoint,
  ) => {
    const newStages = [...currentPlan.stages];
    newStages[stageIndex].variants[variantIndex].waypoints[waypointIndex] =
      waypoint;
    setCurrentPlan((prev) => ({
      ...prev,
      stages: newStages,
      updatedAt: new Date(),
    }));
    updatePerformanceCalculations();
  };

  const handleWaypointDelete = (
    stageIndex: number,
    variantIndex: number,
    waypointIndex: number,
  ) => {
    const newStages = [...currentPlan.stages];
    newStages[stageIndex].variants[variantIndex].waypoints.splice(
      waypointIndex,
      1,
    );
    setCurrentPlan((prev) => ({
      ...prev,
      stages: newStages,
      updatedAt: new Date(),
    }));
    updatePerformanceCalculations();
  };

  const handleWaypointInsert = (
    stageIndex: number,
    variantIndex: number,
    waypointIndex: number,
  ) => {
    const newStages = [...currentPlan.stages];
    const waypoints = newStages[stageIndex].variants[variantIndex].waypoints;

    // Create a new waypoint between the current and next waypoint
    const currentWp = waypoints[waypointIndex - 1];
    const nextWp = waypoints[waypointIndex];

    if (currentWp && nextWp) {
      const newWaypoint: Waypoint = {
        id: uuidv4(),
        name: `WP-${waypointIndex}`,
        lat: (currentWp.lat + nextWp.lat) / 2,
        lon: (currentWp.lon + nextWp.lon) / 2,
        altitudeFromHereFt: currentWp.altitudeFromHereFt,
        windTrueHeading_deg: null,
        temperature_C: null,
        isAirport: false,
        visitNoLand: false,
        groundTimeMin: 0,
        refuelOptional: false,
      };

      waypoints.splice(waypointIndex, 0, newWaypoint);
    }

    setCurrentPlan((prev) => ({
      ...prev,
      stages: newStages,
      updatedAt: new Date(),
    }));
    updatePerformanceCalculations();
  };

  // Render loading state
  if (isWorkerLoading || isPlansLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  // Render error state
  if (workerError || plansError) {
    return (
      <div className="container mx-auto p-4">
        Error: {workerError || plansError}
      </div>
    );
  }

  // Get all waypoints for the tables (from first variant of each stage)
  const allWaypoints = currentPlan.stages.flatMap((stage) =>
    stage.variants.length > 0 ? stage.variants[0].waypoints : [],
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Flight Planning</h1>
        <Link
          href="/"
          className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
        >
          Back to Home
        </Link>
      </div>

      {/* Two-pane flex layout */}
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Left pane: Forms */}
        <div className="w-1/2 space-y-4 overflow-y-auto">
          {/* Data Upload Card */}
          <Card>
            <CardContent>
              <div className="space-y-4">
                {/* Error display */}
                {dataLoadError && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {dataLoadError}
                  </div>
                )}

                {/* Airports upload */}
                <div>
                  <Label htmlFor="airports-upload">Airports GeoJSON</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="airports-upload"
                      type="file"
                      accept=".geojson"
                      onChange={handleAirportsUpload}
                      disabled={isLoadingData}
                      className="flex-1"
                    />
                    {airportsUploaded && (
                      <span className="text-green-600 text-sm">✓ Uploaded</span>
                    )}
                  </div>
                </div>

                {/* Airspace upload */}
                <div>
                  <Label htmlFor="airspace-upload">Airspace GeoJSON</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="airspace-upload"
                      type="file"
                      accept=".geojson"
                      onChange={handleAirspaceUpload}
                      disabled={isLoadingData}
                      className="flex-1"
                    />
                    {airspaceUploaded && (
                      <span className="text-green-600 text-sm">✓ Uploaded</span>
                    )}
                  </div>
                </div>

                {/* Loading indicator */}
                {isLoadingData && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Processing file...</span>
                  </div>
                )}

                {/* Status */}
                {airportsUploaded && airspaceUploaded && (
                  <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>
                        All data uploaded successfully! You can now create
                        flight plans.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Flight Plan Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Flight Plan</CardTitle>
              <CardDescription>Configure your flight plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Flight plan name */}
                <div>
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    value={currentPlan.name}
                    onChange={(e) =>
                      setCurrentPlan((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Aircraft selection - restricted to warrior3 only */}
                <div>
                  <Label htmlFor="aircraft">Aircraft</Label>
                  <Select
                    value={currentPlan.aircraftId}
                    onValueChange={handleAircraftChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select aircraft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warrior3">
                        Piper Warrior III (PA-28-161)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Add new stage */}
                <div className="border p-4 rounded-md">
                  <h3 className="text-sm font-medium mb-2">Add New Stage</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="departure">Departure ICAO</Label>
                      <Input
                        id="departure"
                        value={departureIcao}
                        onChange={(e) =>
                          setDepartureIcao(e.target.value.toUpperCase())
                        }
                        placeholder="e.g., YSBK"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destination ICAO</Label>
                      <Input
                        id="destination"
                        value={destinationIcao}
                        onChange={(e) =>
                          setDestinationIcao(e.target.value.toUpperCase())
                        }
                        placeholder="e.g., YSCB"
                      />
                    </div>
                  </div>

                  {(!airportsUploaded || !airspaceUploaded) && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center space-x-2 text-yellow-800">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm font-medium">
                          Please upload airports and airspace data above before
                          adding stages
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="mt-2 w-full"
                    onClick={handleAddStage}
                    disabled={
                      !departureIcao ||
                      !destinationIcao ||
                      !airportsUploaded ||
                      !airspaceUploaded
                    }
                    title={
                      !airportsUploaded || !airspaceUploaded
                        ? "Please upload airports and airspace data first"
                        : !departureIcao || !destinationIcao
                          ? "Please enter departure and destination ICAO codes"
                          : "Add a new flight stage"
                    }
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Stage
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPlan({
                      id: uuidv4(),
                      name: "New Flight Plan",
                      aircraftId: "warrior3",
                      stages: [],
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    })
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
                <Button onClick={handleSavePlan}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right pane: Three tables */}
        <div className="w-1/2 space-y-4 overflow-y-auto">
          {/* Waypoint Table */}
          <Card>
            <CardHeader>
              <CardTitle>Waypoints</CardTitle>
              <CardDescription>
                Flight plan waypoints with editable properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WaypointTable
                waypoints={allWaypoints}
                onWaypointUpdate={(index, waypoint) => {
                  // Find which stage and variant this waypoint belongs to
                  let currentIndex = 0;
                  for (
                    let stageIndex = 0;
                    stageIndex < currentPlan.stages.length;
                    stageIndex++
                  ) {
                    const stage = currentPlan.stages[stageIndex];
                    if (stage.variants.length > 0) {
                      const variant = stage.variants[0];
                      if (
                        index >= currentIndex &&
                        index < currentIndex + variant.waypoints.length
                      ) {
                        const waypointIndex = index - currentIndex;
                        handleWaypointUpdate(
                          stageIndex,
                          0,
                          waypointIndex,
                          waypoint,
                        );
                        return;
                      }
                      currentIndex += variant.waypoints.length;
                    }
                  }
                }}
                onWaypointDelete={(index) => {
                  // Find which stage and variant this waypoint belongs to
                  let currentIndex = 0;
                  for (
                    let stageIndex = 0;
                    stageIndex < currentPlan.stages.length;
                    stageIndex++
                  ) {
                    const stage = currentPlan.stages[stageIndex];
                    if (stage.variants.length > 0) {
                      const variant = stage.variants[0];
                      if (
                        index >= currentIndex &&
                        index < currentIndex + variant.waypoints.length
                      ) {
                        const waypointIndex = index - currentIndex;
                        handleWaypointDelete(stageIndex, 0, waypointIndex);
                        return;
                      }
                      currentIndex += variant.waypoints.length;
                    }
                  }
                }}
                onWaypointInsert={(index) => {
                  // Find which stage and variant this waypoint belongs to
                  let currentIndex = 0;
                  for (
                    let stageIndex = 0;
                    stageIndex < currentPlan.stages.length;
                    stageIndex++
                  ) {
                    const stage = currentPlan.stages[stageIndex];
                    if (stage.variants.length > 0) {
                      const variant = stage.variants[0];
                      if (
                        index >= currentIndex &&
                        index <= currentIndex + variant.waypoints.length
                      ) {
                        const waypointIndex = index - currentIndex;
                        handleWaypointInsert(stageIndex, 0, waypointIndex);
                        return;
                      }
                      currentIndex += variant.waypoints.length;
                    }
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Leg Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leg Details</CardTitle>
              <CardDescription>
                Distance, true track, and magnetic track for each leg
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LegMetricsTable
                waypoints={allWaypoints}
                legMetrics={legMetrics}
              />
            </CardContent>
          </Card>

          {/* Scenario Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Scenario Matrix</CardTitle>
              <CardDescription>
                All feasible combinations of CTA/OCTA routes and refuel choices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScenarioMatrix scenarios={scenarios} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OpenAIP database revision / validity */}
      <div className="mt-4 text-sm text-gray-500">
        OpenAIP Database Revision: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
