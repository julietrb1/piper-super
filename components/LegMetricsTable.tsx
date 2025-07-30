/**
 * Leg Metrics Table Component
 *
 * Displays a table of leg metrics including distance, true track,
 * and magnetic track for each segment between waypoints.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LegMetrics } from "@/lib/geometry";

export interface LegMetricsTableProps {
  waypoints: Array<{
    id: string;
    name: string;
    lat: number;
    lon: number;
  }>;
  legMetrics: LegMetrics[];
}

export function LegMetricsTable({ waypoints, legMetrics }: LegMetricsTableProps) {
  // Calculate totals
  const totalDistance = legMetrics.reduce((sum, leg) => sum + leg.distanceNM, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Leg</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Distance (NM)</TableHead>
              <TableHead className="text-right">True Track (°)</TableHead>
              <TableHead className="text-right">Mag Track (°)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {legMetrics.map((leg, index) => (
              <TableRow key={`leg-${index}`}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{waypoints[index]?.name || `WP-${index + 1}`}</TableCell>
                <TableCell>{waypoints[index + 1]?.name || `WP-${index + 2}`}</TableCell>
                <TableCell className="text-right font-mono">
                  {leg.distanceNM.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {leg.trueTrackDeg.toString().padStart(3, '0')}°
                </TableCell>
                <TableCell className="text-right font-mono">
                  {leg.magTrackDeg.toString().padStart(3, '0')}°
                </TableCell>
              </TableRow>
            ))}

            {/* Total row */}
            {legMetrics.length > 0 && (
              <TableRow className="border-t-2 font-semibold bg-gray-50">
                <TableCell colSpan={3} className="text-right">
                  Total Distance:
                </TableCell>
                <TableCell className="text-right font-mono">
                  {totalDistance.toFixed(1)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {legMetrics.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No leg metrics available. Add waypoints to see leg calculations.
        </div>
      )}

      {legMetrics.length > 0 && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Note:</strong> Magnetic tracks are calculated using magnetic variation at the midpoint of each leg.
          </p>
          <p>
            Distances are great-circle distances. True tracks are initial bearings.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of the leg metrics table for smaller spaces
 */
export function LegMetricsTableCompact({ waypoints, legMetrics }: LegMetricsTableProps) {
  const totalDistance = legMetrics.reduce((sum, leg) => sum + leg.distanceNM, 0);

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="text-right">Dist</TableHead>
              <TableHead className="text-right">TT°</TableHead>
              <TableHead className="text-right">MT°</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {legMetrics.map((leg, index) => (
              <TableRow key={`leg-${index}`} className="text-sm">
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="text-right font-mono">
                  {leg.distanceNM.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {leg.trueTrackDeg.toString().padStart(3, '0')}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {leg.magTrackDeg.toString().padStart(3, '0')}
                </TableCell>
              </TableRow>
            ))}

            {legMetrics.length > 0 && (
              <TableRow className="border-t font-semibold text-sm bg-gray-50">
                <TableCell>Tot</TableCell>
                <TableCell className="text-right font-mono">
                  {totalDistance.toFixed(1)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
