import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BasicWeight } from "@/lib/basic-weight";
import { useCallback, useMemo } from "react";
import { useAircraftModel } from "@/hooks/use-aircraft-model";
import { useAircraftPresets } from "@/hooks/use-presets";
import { AircraftPresetManagerDialog } from "@/components/aircraft-preset-manager-dialog";

interface Props {
  weightLbs: number;
  armIn: number;
  onPresetSelected: (basicWeight: BasicWeight) => void;
}

export function AircraftPresetSelector({
  weightLbs,
  armIn,
  onPresetSelected,
}: Props) {
  const { model } = useAircraftModel();
  const { presets, isLoading } = useAircraftPresets();

  // Filter presets by the current aircraft model
  const filteredPresets = useMemo(
    () => presets.filter((p) => p.subtype === model),
    [presets, model],
  );

  const matchedWeight = useMemo(
    () =>
      filteredPresets.find(
        (w) => w.weightLbs === weightLbs && w.armIn === armIn,
      ),
    [filteredPresets, weightLbs, armIn],
  );

  const handleValueChange = useCallback(
    (callsign: string) => {
      const newPreset = filteredPresets.find((bw) => bw.aircraft === callsign);
      if (newPreset) onPresetSelected(newPreset);
    },
    [filteredPresets, onPresetSelected],
  );

  if (isLoading) {
    return <div>Loading aircraft presets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <ToggleGroup
          type="single"
          value={matchedWeight?.aircraft || ""}
          onValueChange={handleValueChange}
          className="justify-start"
        >
          {filteredPresets.map((bw) => (
            <ToggleGroupItem
              key={bw.aircraft}
              value={bw.aircraft}
              aria-label={`Set ${bw.aircraft}`}
            >
              {bw.aircraft}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <AircraftPresetManagerDialog />
      </div>
    </div>
  );
}
