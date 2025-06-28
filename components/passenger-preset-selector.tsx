import { useWeightPresets, weightPresetDB, WeightPreset } from "@/hooks/use-weight-presets";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Trash } from "lucide-react";

interface Props {
  weight: number;
  onPresetSelected: (newWeight: number) => void;
}

interface WeightPresetForm {
  presetName: string;
  weight: number;
}

export function PassengerPresetSelector({ weight, onPresetSelected }: Props) {
  const { weightPresets, isLoading: weightPresetsLoading } = useWeightPresets();
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
    defaultValues: { presetName: "", weight: 0 },
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
        (wp) => wp.weight === Number(newValue)
      );
      if (matchedWeightPreset != null)
        weightPresetDB.delete(matchedWeightPreset);
      setAltMode(null);
    } else if (isAdd && !newAdd && !newDelete) {
      const formValues = getFormValues();
      // TODO: Figure out why valid isn't working correctly.
      if (isFormValid && formValues.presetName && formValues.weight)
        weightPresetDB.create(formValues);
      resetForm();
      setAltMode(null);
    } else if (!Number.isNaN(newValue)) {
      onPresetSelected(Number(newValue));
    }
  };

  return (
    <div className="flex space-x-3">
      {isAdd && (
        <>
          <Input
            className="max-w-40"
            placeholder="Name"
            {...register("presetName")}
          />
          <Input
            className="max-w-40"
            placeholder="Weight"
            {...register("weight")}
          />
        </>
      )}
      <ToggleGroup
        type="single"
        value={weightForToggle}
        onValueChange={handleValueChange}
        className="justify-start"
      >
        {weightPresets.map((wp) => (
          <ToggleGroupItem
            key={wp.presetName}
            value={wp.weight.toString()}
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
