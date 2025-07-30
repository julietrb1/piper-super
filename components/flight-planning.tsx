import { useEffect, useRef, useState } from "react";
import { useAircraftModel } from "@/hooks/use-aircraft-model";
import { computeTopOfClimb, lookupAircraft } from "@/lib/performance";
import { useOpenAipWorker } from "@/hooks/use-open-aip-worker";
import { flightPlanDB, openAipDB, useFlightPlans } from "@/hooks/use-flight-plans";
import { FlightPlan, FlightStage, RouteVariant, Scenario, Waypoint } from "@/lib/flight-plan-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, PlusCircle, Save, Trash2, Upload } from "lucide-react";
import * as turf from "@turf/turf";
import { jsPDF } from "jspdf";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

/**
 * Flight Planning Component
 *
 * This component provides a UI for planning flights, including:
 * - Aircraft selection
 * - Stage definition
 * - Waypoint management
 * - Performance calculations
 * - Map visualization
 * - Scenario matrix
 * - PDF export
 */
export function FlightPlanning() {
  const { model, setModel } = useAircraftModel();
  const { isLoading: isWorkerLoading, error: workerError, queryAirspaceCrossings, shortestOCTARoute, lookupAirport, reload: reloadWorkerData } = useOpenAipWorker();
  const { flightPlans, isLoading: isPlansLoading, error: plansError, refreshFlightPlans } = useFlightPlans();

  // State for the current flight plan
  const [currentPlan, setCurrentPlan] = useState<FlightPlan>({
    id: uuidv4(),
    name: 'New Flight Plan',
    aircraftId: model,
    stages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // State for the current stage being edited
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(null);
  const [departureIcao, setDepartureIcao] = useState('');
  const [destinationIcao, setDestinationIcao] = useState('');

  // State for the map
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // State for scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // State for data loading
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [airportsUploaded, setAirportsUploaded] = useState(false);
  const [airspaceUploaded, setAirspaceUploaded] = useState(false);

  // Check for existing data on component load
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const airportsData = await openAipDB.getGeoJSON('airports');
        const airspaceData = await openAipDB.getGeoJSON('airspace');

        setAirportsUploaded(!!airportsData);
        setAirspaceUploaded(!!airspaceData);
      } catch (error) {
        console.error('Error checking existing data:', error);
      }
    };

    checkExistingData();
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!map && mapContainerRef.current) {
      const newMap = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [134.0, -26.0], // Center on Australia
        zoom: 4
      });

      newMap.on('load', () => {
        setMap(newMap);
      });
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [map]);

  // Update the map when the flight plan changes
  useEffect(() => {
    if (map) {
      // Clear existing layers
      const existingLayers = map.getStyle().layers || [];
      existingLayers.forEach(layer => {
        if (layer.id.startsWith('route-') || layer.id.startsWith('waypoint-')) {
          map.removeLayer(layer.id);
        }
      });

      // Clear existing sources
      const existingSources = Object.keys(map.getStyle().sources || {});
      existingSources.forEach(source => {
        if (source.startsWith('route-') || source.startsWith('waypoint-')) {
          map.removeSource(source);
        }
      });

      // Add routes and waypoints for each stage
      currentPlan.stages.forEach((stage, stageIndex) => {
        stage.variants.forEach((variant, variantIndex) => {
          // Add route line
          const routeCoords = variant.waypoints.map(wp => [wp.lon, wp.lat]);
          if (routeCoords.length >= 2) {
            map.addSource(`route-${stageIndex}-${variantIndex}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoords
                }
              }
            });

            map.addLayer({
              id: `route-${stageIndex}-${variantIndex}`,
              type: 'line',
              source: `route-${stageIndex}-${variantIndex}`,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': variant.type === 'CTA' ? '#0077ff' : '#ff7700',
                'line-width': 3,
                'line-dasharray': variant.type === 'CTA' ? [1, 0] : [2, 2]
              }
            });
          }

          // Add waypoints
          variant.waypoints.forEach((waypoint, waypointIndex) => {
            map.addSource(`waypoint-${stageIndex}-${variantIndex}-${waypointIndex}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {
                  name: waypoint.name,
                  stage: stageIndex + 1,
                  variant: variant.type,
                  altitude: waypoint.altitudeFromHereFt
                },
                geometry: {
                  type: 'Point',
                  coordinates: [waypoint.lon, waypoint.lat]
                }
              }
            });

            map.addLayer({
              id: `waypoint-${stageIndex}-${variantIndex}-${waypointIndex}`,
              type: 'circle',
              source: `waypoint-${stageIndex}-${variantIndex}-${waypointIndex}`,
              paint: {
                'circle-radius': 6,
                'circle-color': waypoint.isAirport ? '#00ff00' : '#ffff00',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#000000'
              }
            });

            // Add waypoint label
            map.addLayer({
              id: `waypoint-label-${stageIndex}-${variantIndex}-${waypointIndex}`,
              type: 'symbol',
              source: `waypoint-${stageIndex}-${variantIndex}-${waypointIndex}`,
              layout: {
                'text-field': ['format',
                  ['get', 'name'], { 'font-scale': 1 },
                  '\n', {},
                  ['concat', 'Stage ', ['get', 'stage']], { 'font-scale': 0.8 }
                ],
                'text-font': ['Open Sans Regular'],
                'text-offset': [0, 1.5],
                'text-anchor': 'top'
              },
              paint: {
                'text-color': '#000000',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2
              }
            });
          });
        });
      });

      // Fit bounds if we have waypoints
      if (currentPlan.stages.length > 0) {
        const allWaypoints = currentPlan.stages.flatMap(stage =>
          stage.variants.flatMap(variant => variant.waypoints)
        );

        if (allWaypoints.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          allWaypoints.forEach(waypoint => {
            bounds.extend([waypoint.lon, waypoint.lat]);
          });

          map.fitBounds(bounds, { padding: 50 });
        }
      }
    }
  }, [map, currentPlan]);

  // Handle aircraft selection
  const handleAircraftChange = (newModel: string) => {
    setModel(newModel as 'warrior3' | 'arrow3');
    setCurrentPlan(prev => ({
      ...prev,
      aircraftId: newModel
    }));
  };

  // Handle adding a new stage
  const handleAddStage = async () => {
    if (!departureIcao || !destinationIcao) {
      alert('Please enter both departure and destination ICAO codes');
      return;
    }

    try {
      // Look up the actual coordinates for the departure and destination airports
      const [depAirport, destAirport] = await Promise.all([
        lookupAirport(departureIcao),
        lookupAirport(destinationIcao)
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
          refuelOptional: false
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
          refuelOptional: false
        }
      ];

      // Create the CTA variant
      const ctaVariant: RouteVariant = {
        id: uuidv4(),
        name: 'CTA',
        type: 'CTA',
        waypoints: ctaWaypoints,
        ete: null,
        fuel: null,
        topOfClimb: null,
        topOfDescent: null
      };

      // Create variants array with CTA variant
      const variants: RouteVariant[] = [ctaVariant];

      // If there are airspace crossings, create an OCTA variant
      if (crossings.length > 0) {
        // Get the OCTA route
        const { route } = await shortestOCTARoute(depCoords, destCoords, {
          avoidCTA: true,
          fl: 85 // Assuming FL85
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
            refuelOptional: false
          }
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
            refuelOptional: false
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
          refuelOptional: false
        });

        // Create the OCTA variant
        const octaVariant: RouteVariant = {
          id: uuidv4(),
          name: 'OCTA',
          type: 'OCTA',
          waypoints: octaWaypoints,
          ete: null,
          fuel: null,
          topOfClimb: null,
          topOfDescent: null
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
        variants
      };

      // Add the new stage to the flight plan and update performance calculations
      setCurrentPlan(prev => {
        const updatedPlan = {
          ...prev,
          stages: [...prev.stages, newStage],
          updatedAt: new Date()
        };

        // Update performance calculations for the new plan
        const aircraft = lookupAircraft(updatedPlan.aircraftId);
        const updatedStages = updatedPlan.stages.map(stage => {
          const updatedVariants = stage.variants.map(variant => {
            // Calculate top of climb
            const topOfClimb = computeTopOfClimb(
              variant.waypoints,
              aircraft,
              0 // Assuming ISA deviation of 0
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
                { units: 'nauticalmiles' }
              );

              // Calculate TAS
              const tas = aircraft.tasKt(
                wp1.temperature_C || 15, // Default to 15°C if not specified
                wp1.altitudeFromHereFt || 0
              );

              // Calculate time (hours)
              const time = distance / tas;

              // Calculate fuel
              const fuel = aircraft.cruiseFuelFlowLph(
                wp1.temperature_C || 15, // Default to 15°C if not specified
                wp1.altitudeFromHereFt || 0
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
              topOfClimb
            };
          });

          return {
            ...stage,
            variants: updatedVariants
          };
        });

        const finalPlan = {
          ...updatedPlan,
          stages: updatedStages
        };

        // Generate scenarios with the updated plan
        setTimeout(() => {
          generateScenarios(finalPlan);
        }, 0);

        return finalPlan;
      });

      // Clear inputs
      setDepartureIcao('');
      setDestinationIcao('');
    } catch (error) {
      console.error('Error adding stage:', error);
      alert(`Error adding stage: ${error}`);
    }
  };

  // Update performance calculations for all stages and variants
  const updatePerformanceCalculations = () => {
    const aircraft = lookupAircraft(currentPlan.aircraftId);

    const updatedStages = currentPlan.stages.map(stage => {
      const updatedVariants = stage.variants.map(variant => {
        // Calculate top of climb
        const topOfClimb = computeTopOfClimb(
          variant.waypoints,
          aircraft,
          0 // Assuming ISA deviation of 0
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
            { units: 'nauticalmiles' }
          );

          // Calculate TAS
          const tas = aircraft.tasKt(
            wp1.temperature_C || 15, // Default to 15°C if not specified
            wp1.altitudeFromHereFt || 0
          );

          // Calculate time (hours)
          const time = distance / tas;

          // Calculate fuel
          const fuel = aircraft.cruiseFuelFlowLph(
            wp1.temperature_C || 15, // Default to 15°C if not specified
            wp1.altitudeFromHereFt || 0
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
          topOfClimb
        };
      });

      return {
        ...stage,
        variants: updatedVariants
      };
    });

    setCurrentPlan(prev => ({
      ...prev,
      stages: updatedStages,
      updatedAt: new Date()
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
      currentCombination: Array<{ stageId: string; variantId: string; refuel: boolean }>
    ) => {
      if (stageIndex >= plan.stages.length) {
        // We have a complete combination, create a scenario
        const id = uuidv4();
        const name = currentCombination.map(item => {
          const stage = plan.stages.find(s => s.id === item.stageId);
          const variant = stage?.variants.find(v => v.id === item.variantId);
          return `${variant?.type}${item.refuel ? '+Fuel' : ''}`;
        }).join(' → ');

        // Calculate total ETE and fuel
        let totalEte = 0;
        let totalFuel = 0;
        let fuelRemain = 181; // Assuming full tanks for Warrior III

        for (let i = 0; i < currentCombination.length; i++) {
          const { stageId, variantId, refuel } = currentCombination[i];
          const stage = plan.stages.find(s => s.id === stageId);
          const variant = stage?.variants.find(v => v.id === variantId);

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
          isValid: fuelRemain >= 30 // Assuming 30L minimum reserve
        });

        return;
      }

      const stage = plan.stages[stageIndex];

      // For each variant in this stage
      for (const variant of stage.variants) {
        // Check if this stage has refueling options
        const hasRefuelOption = variant.waypoints.some(wp => wp.isAirport && wp.refuelOptional);

        if (hasRefuelOption) {
          // Try both with and without refueling
          generateCombinations(stageIndex + 1, [
            ...currentCombination,
            { stageId: stage.id, variantId: variant.id, variantType: variant.type, refuel: false }
          ]);

          generateCombinations(stageIndex + 1, [
            ...currentCombination,
            { stageId: stage.id, variantId: variant.id, variantType: variant.type, refuel: true }
          ]);
        } else {
          // No refueling option, just add the variant
          generateCombinations(stageIndex + 1, [
            ...currentCombination,
            { stageId: stage.id, variantId: variant.id, variantType: variant.type, refuel: false }
          ]);
        }
      }
    };

    // Start generating combinations
    generateCombinations(0, []);

    // Limit to 1024 scenarios as per requirements
    setScenarios(newScenarios.slice(0, 1024));
  };

  // Handle saving the flight plan
  const handleSavePlan = async () => {
    try {
      await flightPlanDB.update(currentPlan);
      refreshFlightPlans();
      alert('Flight plan saved successfully');
    } catch (error) {
      console.error('Error saving flight plan:', error);
      alert(`Error saving flight plan: ${error}`);
    }
  };

  // Handle file upload for airports
  const handleAirportsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.geojson')) {
      setDataLoadError('Please upload a GeoJSON file');
      return;
    }

    setIsLoadingData(true);
    setDataLoadError(null);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text) as GeoJSON.FeatureCollection;

      // Validate that it's a valid GeoJSON
      if (!geojson.type || geojson.type !== 'FeatureCollection' || !geojson.features) {
        throw new Error('Invalid GeoJSON format');
      }

      // Store in IndexedDB
      await openAipDB.storeGeoJSON('airports', geojson);
      setAirportsUploaded(true);

      // Reload worker data
      reloadWorkerData();

      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading airports:', error);
      setDataLoadError(`Error uploading airports: ${error}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle file upload for airspace
  const handleAirspaceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.geojson')) {
      setDataLoadError('Please upload a GeoJSON file');
      return;
    }

    setIsLoadingData(true);
    setDataLoadError(null);

    try {
      const text = await file.text();
      const geojson = JSON.parse(text) as GeoJSON.FeatureCollection;

      // Validate that it's a valid GeoJSON
      if (!geojson.type || geojson.type !== 'FeatureCollection' || !geojson.features) {
        throw new Error('Invalid GeoJSON format');
      }

      // Store in IndexedDB
      await openAipDB.storeGeoJSON('airspace', geojson);
      setAirspaceUploaded(true);

      // Reload worker data
      reloadWorkerData();

      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading airspace:', error);
      setDataLoadError(`Error uploading airspace: ${error}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle exporting to PDF
  const handleExportPdf = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text(currentPlan.name, 105, 20, { align: 'center' });

    // Add aircraft info
    doc.setFontSize(12);
    doc.text(`Aircraft: ${currentPlan.aircraftId}`, 20, 30);

    // Add stages
    let y = 40;
    currentPlan.stages.forEach((stage, stageIndex) => {
      doc.setFontSize(14);
      doc.text(`Stage ${stageIndex + 1}: ${stage.departureIcao} → ${stage.destinationIcao}`, 20, y);
      y += 10;

      stage.variants.forEach(variant => {
        doc.setFontSize(12);
        doc.text(`${variant.type} Route:`, 30, y);
        y += 5;

        doc.setFontSize(10);
        variant.waypoints.forEach(waypoint => {
          doc.text(`${waypoint.name} (${waypoint.lat.toFixed(4)}, ${waypoint.lon.toFixed(4)})`, 40, y);
          y += 5;
        });

        doc.text(`ETE: ${variant.ete || 'N/A'} min, Fuel: ${variant.fuel || 'N/A'} L`, 40, y);
        y += 10;
      });

      y += 5;
    });

    // Add scenario matrix
    if (scenarios.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Scenario Matrix', 105, 20, { align: 'center' });

      // Table header
      doc.setFontSize(10);
      doc.text('Scenario', 20, 30);
      doc.text('ETE (min)', 100, 30);
      doc.text('Fuel (L)', 130, 30);
      doc.text('Fuel Remain (L)', 160, 30);

      // Table rows
      let y = 35;
      scenarios.forEach(scenario => {
        // Set color based on validity
        if (!scenario.isValid) {
          doc.setTextColor(255, 0, 0);
        } else {
          doc.setTextColor(0, 0, 0);
        }

        doc.text(scenario.name, 20, y);
        doc.text(scenario.totalEte?.toString() || 'N/A', 100, y);
        doc.text(scenario.totalFuel?.toString() || 'N/A', 130, y);
        doc.text(scenario.fuelRemain?.toString() || 'N/A', 160, y);

        y += 5;

        // Add a new page if we're running out of space
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
    }

    // Save the PDF
    doc.save(`${currentPlan.name}.pdf`);
  };

  // Render loading state
  if (isWorkerLoading || isPlansLoading) {
    return <div>Loading...</div>;
  }

  // Render error state
  if (workerError || plansError) {
    return <div>Error: {workerError || plansError}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Flight Planning</h1>
        <Link href="/" className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">Back to Home</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left pane: Form */}
        <div>
          {/* Data Upload Card */}
          <Card className="mb-4 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-700">📁 Data Upload Required</CardTitle>
              <CardDescription className="text-blue-600 font-medium">
                You must upload both airports and airspace GeoJSON files before you can create flight plans
              </CardDescription>
            </CardHeader>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Upload the au_airports.geojson file (available in the project root directory)
                  </p>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Upload the au_airspace.geojson file (available in the project root directory)
                  </p>
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
                      <span>All data uploaded successfully! You can now create flight plans.</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
                    onChange={(e) => setCurrentPlan(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                {/* Aircraft selection */}
                <div>
                  <Label htmlFor="aircraft">Aircraft</Label>
                  <Select value={currentPlan.aircraftId} onValueChange={handleAircraftChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select aircraft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warrior3">Piper Warrior III (PA-28-161)</SelectItem>
                      <SelectItem value="arrow3">Piper Arrow III (PA-28R-201)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Stages */}
                <div>
                  <Label>Stages</Label>
                  {currentPlan.stages.length === 0 ? (
                    <p className="text-sm text-gray-500">No stages defined yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stage</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Variants</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentPlan.stages.map((stage, index) => (
                          <TableRow key={stage.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{stage.departureIcao}</TableCell>
                            <TableCell>{stage.destinationIcao}</TableCell>
                            <TableCell>{stage.variants.map(v => v.type).join(', ')}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentStageIndex(index)}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
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
                        onChange={(e) => setDepartureIcao(e.target.value.toUpperCase())}
                        placeholder="e.g., YSBK"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destination ICAO</Label>
                      <Input
                        id="destination"
                        value={destinationIcao}
                        onChange={(e) => setDestinationIcao(e.target.value.toUpperCase())}
                        placeholder="e.g., YSCB"
                      />
                    </div>
                  </div>
                  {(!airportsUploaded || !airspaceUploaded) && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center space-x-2 text-yellow-800">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm font-medium">
                          Please upload airports and airspace data above before adding stages
                        </span>
                      </div>
                    </div>
                  )}
                  <Button
                    className="mt-2 w-full"
                    onClick={handleAddStage}
                    disabled={!departureIcao || !destinationIcao || !airportsUploaded || !airspaceUploaded}
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
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentPlan({
                id: uuidv4(),
                name: 'New Flight Plan',
                aircraftId: model,
                stages: [],
                createdAt: new Date(),
                updatedAt: new Date()
              })}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button onClick={handleSavePlan}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </CardFooter>
          </Card>

          {/* Waypoint editor (shown when a stage is selected) */}
          {currentStageIndex !== null && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Edit Waypoints</CardTitle>
                <CardDescription>
                  Stage {currentStageIndex + 1}: {currentPlan.stages[currentStageIndex].departureIcao} → {currentPlan.stages[currentStageIndex].destinationIcao}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={currentPlan.stages[currentStageIndex].variants[0].id}>
                  <TabsList className="mb-4">
                    {currentPlan.stages[currentStageIndex].variants.map(variant => (
                      <TabsTrigger key={variant.id} value={variant.id}>
                        {variant.type}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {currentPlan.stages[currentStageIndex].variants.map(variant => (
                    <TabsContent key={variant.id} value={variant.id}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Altitude (ft)</TableHead>
                            <TableHead>Wind (°)</TableHead>
                            <TableHead>Temp (°C)</TableHead>
                            <TableHead>Options</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variant.waypoints.map((waypoint, wpIndex) => (
                            <TableRow key={waypoint.id}>
                              <TableCell>{waypoint.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={waypoint.altitudeFromHereFt || ''}
                                  onChange={(e) => {
                                    const newStages = [...currentPlan.stages];
                                    const newWaypoint = {
                                      ...waypoint,
                                      altitudeFromHereFt: e.target.value ? Number(e.target.value) : null
                                    };
                                    newStages[currentStageIndex].variants.find(v => v.id === variant.id)!.waypoints[wpIndex] = newWaypoint;
                                    setCurrentPlan(prev => ({
                                      ...prev,
                                      stages: newStages,
                                      updatedAt: new Date()
                                    }));
                                    updatePerformanceCalculations();
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={waypoint.windTrueHeading_deg || ''}
                                  onChange={(e) => {
                                    const newStages = [...currentPlan.stages];
                                    const newWaypoint = {
                                      ...waypoint,
                                      windTrueHeading_deg: e.target.value ? Number(e.target.value) : null
                                    };
                                    newStages[currentStageIndex].variants.find(v => v.id === variant.id)!.waypoints[wpIndex] = newWaypoint;
                                    setCurrentPlan(prev => ({
                                      ...prev,
                                      stages: newStages,
                                      updatedAt: new Date()
                                    }));
                                    updatePerformanceCalculations();
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={waypoint.temperature_C || ''}
                                  onChange={(e) => {
                                    const newStages = [...currentPlan.stages];
                                    const newWaypoint = {
                                      ...waypoint,
                                      temperature_C: e.target.value ? Number(e.target.value) : null
                                    };
                                    newStages[currentStageIndex].variants.find(v => v.id === variant.id)!.waypoints[wpIndex] = newWaypoint;
                                    setCurrentPlan(prev => ({
                                      ...prev,
                                      stages: newStages,
                                      updatedAt: new Date()
                                    }));
                                    updatePerformanceCalculations();
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                {waypoint.isAirport && (
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`visit-${waypoint.id}`}
                                      checked={waypoint.visitNoLand}
                                      onCheckedChange={(checked) => {
                                        const newStages = [...currentPlan.stages];
                                        const newWaypoint = {
                                          ...waypoint,
                                          visitNoLand: !!checked
                                        };
                                        newStages[currentStageIndex].variants.find(v => v.id === variant.id)!.waypoints[wpIndex] = newWaypoint;
                                        setCurrentPlan(prev => ({
                                          ...prev,
                                          stages: newStages,
                                          updatedAt: new Date()
                                        }));
                                        updatePerformanceCalculations();
                                      }}
                                    />
                                    <Label htmlFor={`visit-${waypoint.id}`}>Visit</Label>

                                    {waypoint.visitNoLand && (
                                      <Input
                                        type="number"
                                        value={waypoint.groundTimeMin}
                                        onChange={(e) => {
                                          const newStages = [...currentPlan.stages];
                                          const newWaypoint = {
                                            ...waypoint,
                                            groundTimeMin: Number(e.target.value)
                                          };
                                          newStages[currentStageIndex].variants.find(v => v.id === variant.id)!.waypoints[wpIndex] = newWaypoint;
                                          setCurrentPlan(prev => ({
                                            ...prev,
                                            stages: newStages,
                                            updatedAt: new Date()
                                          }));
                                          updatePerformanceCalculations();
                                        }}
                                        className="w-16"
                                        placeholder="min"
                                      />
                                    )}

                                    <Checkbox
                                      id={`refuel-${waypoint.id}`}
                                      checked={waypoint.refuelOptional}
                                      onCheckedChange={(checked) => {
                                        const newStages = [...currentPlan.stages];
                                        const newWaypoint = {
                                          ...waypoint,
                                          refuelOptional: !!checked
                                        };
                                        newStages[currentStageIndex].variants.find(v => v.id === variant.id)!.waypoints[wpIndex] = newWaypoint;
                                        setCurrentPlan(prev => ({
                                          ...prev,
                                          stages: newStages,
                                          updatedAt: new Date()
                                        }));
                                        generateScenarios();
                                      }}
                                    />
                                    <Label htmlFor={`refuel-${waypoint.id}`}>Refuel</Label>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="mt-4">
                        <p>ETE: {variant.ete || 'N/A'} min</p>
                        <p>Fuel: {variant.fuel || 'N/A'} L</p>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => setCurrentStageIndex(null)}>
                  Close
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Right pane: Map */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Route Map</CardTitle>
              <CardDescription>Visual representation of your flight plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={mapContainerRef} className="h-96 rounded-md"></div>
            </CardContent>
          </Card>

          {/* Scenario matrix */}
          {scenarios.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Scenario Matrix</CardTitle>
                <CardDescription>All feasible combinations of routes and refueling options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead>ETE (min)</TableHead>
                        <TableHead>Fuel (L)</TableHead>
                        <TableHead>Fuel Remain (L)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarios.map(scenario => (
                        <TableRow key={scenario.id} className={scenario.isValid ? '' : 'bg-red-100'}>
                          <TableCell>{scenario.name}</TableCell>
                          <TableCell>{scenario.totalEte}</TableCell>
                          <TableCell>{scenario.totalFuel}</TableCell>
                          <TableCell>{scenario.fuelRemain}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleExportPdf}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* OpenAIP database revision / validity */}
      <div className="mt-4 text-sm text-gray-500">
        OpenAIP Database Revision: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
