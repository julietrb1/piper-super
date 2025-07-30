/**
 * Scenario Matrix Component
 *
 * Displays a table of all feasible combinations of routes and refueling options,
 * showing ETE, fuel consumption, and fuel remaining for each scenario.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface Scenario {
  id: string;
  name: string;
  stageVariants: Array<{
    stageId: string;
    variantId: string;
    variantType: 'CTA' | 'OCTA';
    refuel: boolean;
  }>;
  totalEte: number | null;
  totalFuel: number | null;
  fuelRemain: number | null;
  isValid: boolean;
}

export interface ScenarioMatrixProps {
  scenarios: Scenario[];
  fuelCapacity?: number;
  minReserve?: number;
}

export function ScenarioMatrix({
  scenarios,
  fuelCapacity = 181, // Default for Warrior III
  minReserve = 30
}: ScenarioMatrixProps) {
  // Sort scenarios by validity first, then by fuel remaining (descending)
  const sortedScenarios = [...scenarios].sort((a, b) => {
    if (a.isValid !== b.isValid) {
      return a.isValid ? -1 : 1; // Valid scenarios first
    }

    const aFuelRemain = a.fuelRemain || 0;
    const bFuelRemain = b.fuelRemain || 0;
    return bFuelRemain - aFuelRemain; // Higher fuel remaining first
  });

  const formatTime = (minutes: number | null): string => {
    if (minutes === null) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const formatFuel = (liters: number | null): string => {
    if (liters === null) return 'N/A';
    return `${liters.toFixed(1)}L`;
  };

  const getFuelStatus = (fuelRemain: number | null): 'safe' | 'marginal' | 'critical' => {
    if (fuelRemain === null) return 'critical';
    if (fuelRemain >= minReserve + 15) return 'safe';
    if (fuelRemain >= minReserve) return 'marginal';
    return 'critical';
  };

  const getFuelStatusColor = (status: 'safe' | 'marginal' | 'critical'): string => {
    switch (status) {
      case 'safe': return 'text-green-700 bg-green-50';
      case 'marginal': return 'text-yellow-700 bg-yellow-50';
      case 'critical': return 'text-red-700 bg-red-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Scenario</TableHead>
              <TableHead className="text-right">ETE</TableHead>
              <TableHead className="text-right">Fuel Used</TableHead>
              <TableHead className="text-right">Fuel Remain</TableHead>
              <TableHead className="w-20">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedScenarios.map((scenario, index) => {
              const fuelStatus = getFuelStatus(scenario.fuelRemain);
              const statusColor = getFuelStatusColor(fuelStatus);

              return (
                <TableRow
                  key={scenario.id}
                  className={!scenario.isValid ? 'bg-red-50' : ''}
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{scenario.name}</div>
                      <div className="text-xs text-gray-500">
                        {scenario.stageVariants.map((sv, i) => (
                          <span key={i}>
                            {i > 0 && ' → '}
                            <span className={sv.variantType === 'CTA' ? 'text-blue-600' : 'text-orange-600'}>
                              {sv.variantType}
                            </span>
                            {sv.refuel && <span className="text-green-600">+Fuel</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-mono">
                    {formatTime(scenario.totalEte)}
                  </TableCell>

                  <TableCell className="text-right font-mono">
                    {formatFuel(scenario.totalFuel)}
                  </TableCell>

                  <TableCell className={`text-right font-mono ${statusColor}`}>
                    {formatFuel(scenario.fuelRemain)}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={scenario.isValid ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {scenario.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No scenarios generated yet. Add flight stages to see scenario matrix.
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Summary:</strong>
                <ul className="mt-1 space-y-1">
                  <li>Total scenarios: {scenarios.length}</li>
                  <li>Valid scenarios: {scenarios.filter(s => s.isValid).length}</li>
                  <li>Invalid scenarios: {scenarios.filter(s => !s.isValid).length}</li>
                </ul>
              </div>
              <div>
                <strong>Legend:</strong>
                <ul className="mt-1 space-y-1">
                  <li><span className="text-blue-600">CTA</span> - Controlled airspace route</li>
                  <li><span className="text-orange-600">OCTA</span> - Outside controlled airspace</li>
                  <li><span className="text-green-600">+Fuel</span> - Refueling stop</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 border-t pt-2">
            <p>
              <strong>Note:</strong> Scenarios are sorted by validity first, then by fuel remaining.
              Fuel capacity: {fuelCapacity}L, Minimum reserve: {minReserve}L
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of the scenario matrix for smaller spaces
 */
export function ScenarioMatrixCompact({ scenarios, fuelCapacity = 181, minReserve = 30 }: ScenarioMatrixProps) {
  const validScenarios = scenarios.filter(s => s.isValid);
  const topScenarios = validScenarios.slice(0, 5); // Show top 5 valid scenarios

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm">Scenario</TableHead>
              <TableHead className="text-right text-sm">ETE</TableHead>
              <TableHead className="text-right text-sm">Fuel Rem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topScenarios.map((scenario, index) => (
              <TableRow key={scenario.id} className="text-sm">
                <TableCell>
                  <div className="truncate max-w-32" title={scenario.name}>
                    {scenario.name}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {scenario.totalEte ? `${Math.floor(scenario.totalEte / 60)}:${(scenario.totalEte % 60).toString().padStart(2, '0')}` : 'N/A'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {scenario.fuelRemain ? `${scenario.fuelRemain.toFixed(0)}L` : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {scenarios.length > 5 && (
        <div className="text-xs text-gray-500 text-center">
          Showing top 5 of {validScenarios.length} valid scenarios
        </div>
      )}
    </div>
  );
}
