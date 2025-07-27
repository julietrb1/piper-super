"use client";

import { useAircraftModel } from "@/hooks/use-aircraft-model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AircraftModelSelector() {
  const { model, setModel } = useAircraftModel();

  return (
    <Select
      value={model}
      onValueChange={(value) => setModel(value as "warrior3" | "arrow3")}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select aircraft" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="warrior3">Warrior III</SelectItem>
        <SelectItem value="arrow3">Arrow III</SelectItem>
      </SelectContent>
    </Select>
  );
}
