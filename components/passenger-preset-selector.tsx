import {
  useWeightPresets,
  WeightPreset,
  weightPresetDB,
} from "@/hooks/use-weight-presets";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash } from "lucide-react";
import { InputWithLabel } from "@/components/input-with-label";
import { cn } from "@/lib/utils";

interface Props {
  weight: number;
  onPresetSelected: (preset: WeightPreset) => void;
}

interface WeightPresetForm {
  presetName: string;
  weight: number;
  rearPassW?: number;
  baggageW?: number;
}

export function PassengerPresetSelector({ weight, onPresetSelected }: Props) {
  const {
    weightPresets,
    isLoading: weightPresetsLoading,
    refreshPresets,
  } = useWeightPresets();
  const [altMode, setAltMode] = useState<null | "add" | "delete">(null);
  const weightForToggle = altMode != null ? altMode : weight.toString();
  const isAdd = altMode === "add";
  const isDelete = altMode === "delete";
  const {
    formState: { isValid: isFormValid },
    getValues: getFormValues,
    reset: resetForm,
    register,
  } = useForm<WeightPresetForm>({
    defaultValues: { presetName: "", weight: 0, rearPassW: 20, baggageW: 20 },
    mode: "onChange",
  });

  if (weightPresetsLoading) return "(weight presets loading...)";

  const handleValueChange = (newValue: string): void => {
    const newAdd = newValue === "add";
    const newDelete = newValue === "delete";

    if (newAdd || newDelete) {
      setAltMode(newValue as "add" | "delete");
    } else if (isDelete && !newAdd && !newDelete) {
      const matchedWeightPreset = weightPresets.find(
        (wp) => wp.weight === Number(newValue),
      );
      if (matchedWeightPreset != null) {
        weightPresetDB
          .delete(matchedWeightPreset)
          .then(() => refreshPresets())
          .catch((err) => console.error("Error deleting preset:", err));
      }
      setAltMode(null);
    } else if (isAdd && !newAdd && !newDelete) {
      const formValues = getFormValues();
      // TODO: Figure out why valid isn't working correctly.
      if (isFormValid && formValues.presetName && formValues.weight) {
        weightPresetDB
          .create(formValues)
          .then(() => refreshPresets())
          .catch((err) => console.error("Error creating preset:", err));
      }
      resetForm();
      setAltMode(null);
    } else if (!Number.isNaN(newValue)) {
      const matchedWeightPreset = weightPresets.find(
        (wp) => wp.presetName === newValue,
      );

      if (matchedWeightPreset) {
        // Pass the entire preset object to the callback
        onPresetSelected(matchedWeightPreset);
      } else {
        console.error("No preset found for name:", newValue);
      }
    }
  };

  return (
    <div className={cn("flex space-x-3", { "my-4": isAdd })}>
      {isAdd && (
        <>
          <InputWithLabel
            id="presetName"
            className="max-w-40"
            labelText="Name"
            {...register("presetName")}
          />
          <InputWithLabel
            id="frontWeight"
            className="max-w-40"
            labelText="Front"
            {...register("weight")}
          />
          <InputWithLabel
            id="rearWeight"
            className="max-w-40"
            labelText="Rear"
            {...register("rearPassW")}
          />
          <InputWithLabel
            id="baggageWeight"
            className="max-w-40"
            labelText="Baggage"
            {...register("baggageW")}
          />
        </>
      )}
      <ToggleGroup
        type="single"
        value={weightForToggle}
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
        <ToggleGroupItem value="add">
          <Plus />
        </ToggleGroupItem>
        <ToggleGroupItem value="delete">
          <Trash />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
