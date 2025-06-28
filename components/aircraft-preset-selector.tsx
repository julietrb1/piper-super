import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BasicWeight } from "@/lib/basic-weight";
import { useCallback, useMemo } from "react";

const basicWeights: BasicWeight[] = [
  {
    aircraft: "FTQ",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1478,
    armIn: 86.9,
  },
  {
    aircraft: "LXJ",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1571,
    armIn: 86.5,
  },
  {
    aircraft: "LXQ",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1573,
    armIn: 86.7,
  },
  {
    aircraft: "TAJ",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1578,
    armIn: 86.1,
  },
  {
    aircraft: "TXU",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1570,
    armIn: 86.2,
  },
  {
    aircraft: "VPN",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1570,
    armIn: 86.7,
  },
  {
    aircraft: "VPU",
    type: "PA28-161",
    subtype: "Warrior III",
    weightLbs: 1529,
    armIn: 86.0,
  },
];

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
  const matchedWeight = useMemo(
    () =>
      basicWeights.find((w) => w.weightLbs === weightLbs && w.armIn === armIn),
    [weightLbs, armIn]
  );
  const handleValueChange = useCallback(
    (callsign: string) => {
      const newPreset = basicWeights.find((bw) => bw.aircraft === callsign);
      if (newPreset) onPresetSelected(newPreset);
    },
    [basicWeights]
  );

  return (
    <ToggleGroup
      type="single"
      value={matchedWeight?.aircraft}
      onValueChange={handleValueChange}
      className="justify-start"
    >
      {basicWeights.map((bw) => (
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
