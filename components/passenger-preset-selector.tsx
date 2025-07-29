import { useWeightPresets, WeightPreset } from "@/hooks/use-presets";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMemo } from "react";
import { WeightPresetManagerDialog } from "@/components/weight-preset-manager-dialog";

interface Props {
  frontPassW: number;
  rearPassW: number;
  baggageW: number;
  onPresetSelected: (preset: WeightPreset) => void;
}

export function PassengerPresetSelector({
  frontPassW,
  rearPassW,
  baggageW,
  onPresetSelected,
}: Props) {
  const { weightPresets, isLoading: weightPresetsLoading } = useWeightPresets();

  const matchedWeightPreset = useMemo(() => {
    return weightPresets.find(
      (wp) =>
        wp.weight === frontPassW &&
        wp.rearPassW === rearPassW &&
        baggageW === wp.baggageW,
    );
  }, [baggageW, frontPassW, rearPassW, weightPresets]);

  if (weightPresetsLoading) return "(weight presets loading...)";

  const handleValueChange = (newValue: string): void => {
    if (newValue === "") {
      if (matchedWeightPreset) {
        onPresetSelected(matchedWeightPreset);
      }
      return;
    }

    const foundPreset = weightPresets.find((wp) => wp.presetName === newValue);

    if (foundPreset) {
      onPresetSelected(foundPreset);
    } else {
      console.error("No preset found for name:", newValue);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <ToggleGroup
          type="single"
          value={matchedWeightPreset?.presetName || ""}
          onValueChange={handleValueChange}
          className="justify-start"
          size="lg"
        >
          {weightPresets.map((wp) => (
            <ToggleGroupItem
              key={wp.presetName}
              value={wp.presetName}
              aria-label={`Set ${wp.presetName}`}
            >
              {wp.presetName}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <WeightPresetManagerDialog />
      </div>
    </div>
  );
}
