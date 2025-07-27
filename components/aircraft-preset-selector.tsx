import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BasicWeight } from "@/lib/basic-weight";
import { useCallback, useMemo } from "react";
import { useAircraftModel } from "@/hooks/use-aircraft-model";

// Rearranged to allow lookup by subtype
const basicWeightsByType: Record<string, BasicWeight[]> = {
  warrior3: [
    {
      aircraft: "FTQ",
      subtype: "warrior3",
      weightLbs: 1478,
      armIn: 86.9,
    },
    {
      aircraft: "LXJ",
      subtype: "warrior3",
      weightLbs: 1571,
      armIn: 86.5,
    },
    {
      aircraft: "LXQ",
      subtype: "warrior3",
      weightLbs: 1573,
      armIn: 86.7,
    },
    {
      aircraft: "TAJ",
      subtype: "warrior3",
      weightLbs: 1578,
      armIn: 86.1,
    },
    {
      aircraft: "TXU",
      subtype: "warrior3",
      weightLbs: 1570,
      armIn: 86.2,
    },
    {
      aircraft: "VPN",
      subtype: "warrior3",
      weightLbs: 1570,
      armIn: 86.7,
    },
    {
      aircraft: "VPU",
      subtype: "warrior3",
      weightLbs: 1529,
      armIn: 86.0,
    },
  ],
  arrow3: [
    {
      aircraft: "VPF",
      subtype: "arrow3",
      weightLbs: 1821,
      armIn: 86.5,
    },
    {
      aircraft: "FTH",
      subtype: "arrow3",
      weightLbs: 1740,
      armIn: 86.3,
    },
  ],
};

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
  const filteredWeights = basicWeightsByType[model] || [];

  const matchedWeight = useMemo(
    () =>
      filteredWeights.find((w) => w.weightLbs === weightLbs && w.armIn === armIn),
    [filteredWeights, weightLbs, armIn],
  );

  const handleValueChange = useCallback(
    (callsign: string) => {
      const newPreset = filteredWeights.find((bw) => bw.aircraft === callsign);
      if (newPreset) onPresetSelected(newPreset);
    },
    [filteredWeights, onPresetSelected],
  );

  return (
    <ToggleGroup
      type="single"
      value={matchedWeight?.aircraft}
      onValueChange={handleValueChange}
      className="justify-start"
    >
      {filteredWeights.map((bw) => (
        <ToggleGroupItem
          key={bw.aircraft}
          value={bw.aircraft}
          aria-label={`Set ${bw.aircraft}`}
        >
          {bw.aircraft}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
