/**
 * Waypoint Table Component
 *
 * Displays a table of waypoints with their properties including
 * name, coordinates, altitude, wind, and temperature.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export interface WaypointTableProps {
  waypoints: Array<{
    id: string;
    name: string;
    lat: number;
    lon: number;
    altitudeFromHereFt: number | null;
    windTrueHeadingDeg?: number | null;
    temperatureC?: number | null;
    visitOnly?: boolean;
    groundTimeMin?: number;
  }>;
  onWaypointUpdate: (index: number, waypoint: WaypointTableProps['waypoints'][0]) => void;
  onWaypointDelete: (index: number) => void;
  onWaypointInsert: (index: number) => void;
  editable?: boolean;
}

export function WaypointTable({
  waypoints,
  onWaypointUpdate,
  onWaypointDelete,
  onWaypointInsert,
  editable = true
}: WaypointTableProps) {
  const handleFieldUpdate = (index: number, field: keyof WaypointTableProps['waypoints'][0], value: string | number | boolean | null) => {
    const updatedWaypoint = {
      ...waypoints[index],
      [field]: value
    };
    onWaypointUpdate(index, updatedWaypoint);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Lat</TableHead>
              <TableHead>Lon</TableHead>
              <TableHead>Alt (ft)</TableHead>
              <TableHead>Wind (°T)</TableHead>
              <TableHead>Temp (°C)</TableHead>
              <TableHead>Options</TableHead>
              {editable && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {waypoints.map((waypoint, index) => (
              <TableRow key={waypoint.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>

                <TableCell>
                  {editable ? (
                    <Input
                      value={waypoint.name}
                      onChange={(e) => handleFieldUpdate(index, 'name', e.target.value)}
                      className="w-20"
                    />
                  ) : (
                    waypoint.name
                  )}
                </TableCell>

                <TableCell>
                  {editable ? (
                    <Input
                      type="number"
                      step="0.0001"
                      value={waypoint.lat}
                      onChange={(e) => handleFieldUpdate(index, 'lat', parseFloat(e.target.value))}
                      className="w-24"
                    />
                  ) : (
                    waypoint.lat.toFixed(4)
                  )}
                </TableCell>

                <TableCell>
                  {editable ? (
                    <Input
                      type="number"
                      step="0.0001"
                      value={waypoint.lon}
                      onChange={(e) => handleFieldUpdate(index, 'lon', parseFloat(e.target.value))}
                      className="w-24"
                    />
                  ) : (
                    waypoint.lon.toFixed(4)
                  )}
                </TableCell>

                <TableCell>
                  {editable ? (
                    <Input
                      type="number"
                      value={waypoint.altitudeFromHereFt || ''}
                      onChange={(e) => handleFieldUpdate(index, 'altitudeFromHereFt',
                        e.target.value ? parseInt(e.target.value) : null)}
                      className="w-20"
                      placeholder="0"
                    />
                  ) : (
                    waypoint.altitudeFromHereFt || 'N/A'
                  )}
                </TableCell>

                <TableCell>
                  {editable ? (
                    <Input
                      type="number"
                      min="0"
                      max="360"
                      value={waypoint.windTrueHeadingDeg || ''}
                      onChange={(e) => handleFieldUpdate(index, 'windTrueHeadingDeg',
                        e.target.value ? parseInt(e.target.value) : null)}
                      className="w-16"
                      placeholder="---"
                    />
                  ) : (
                    waypoint.windTrueHeadingDeg || '---'
                  )}
                </TableCell>

                <TableCell>
                  {editable ? (
                    <Input
                      type="number"
                      min="-50"
                      max="50"
                      value={waypoint.temperatureC || ''}
                      onChange={(e) => handleFieldUpdate(index, 'temperatureC',
                        e.target.value ? parseInt(e.target.value) : null)}
                      className="w-16"
                      placeholder="15"
                    />
                  ) : (
                    waypoint.temperatureC || '15'
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    {editable ? (
                      <>
                        <Checkbox
                          id={`visit-${waypoint.id}`}
                          checked={waypoint.visitOnly || false}
                          onCheckedChange={(checked) =>
                            handleFieldUpdate(index, 'visitOnly', !!checked)}
                        />
                        <Label htmlFor={`visit-${waypoint.id}`} className="text-xs">
                          Visit
                        </Label>

                        {waypoint.visitOnly && (
                          <Input
                            type="number"
                            min="0"
                            value={waypoint.groundTimeMin || 0}
                            onChange={(e) => handleFieldUpdate(index, 'groundTimeMin',
                              parseInt(e.target.value) || 0)}
                            className="w-12"
                            placeholder="15"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {waypoint.visitOnly && (
                          <span className="text-xs text-blue-600">
                            Visit {waypoint.groundTimeMin}min
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>

                {editable && (
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onWaypointInsert(index + 1)}
                        title="Insert waypoint after this one"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>

                      {waypoints.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWaypointDelete(index)}
                          title="Delete this waypoint"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {waypoints.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No waypoints defined yet. Add a flight stage to get started.
        </div>
      )}
    </div>
  );
}
