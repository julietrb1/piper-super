import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash } from "lucide-react";
import {
  useWeightPresetsBase,
  WeightPreset,
  weightPresetDB,
} from "@/hooks/use-presets";
import { InputWithLabel } from "@/components/input-with-label";
import { NumberInputWithLabel } from "@/components/number-input-with-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";

const formSchema = z.object({
  presetName: z.string().min(1, "Preset name is required"),
  weight: z.coerce
    .number<number>()
    .min(0, "Front weight must be at least 0 lbs")
    .max(500, "Front weight max is 500 lbs"),
  rearPassW: z.coerce
    .number<number>()
    .min(0, "Rear weight must be at least 0 lbs")
    .max(500, "Rear weight max is 500 lbs"),
  baggageW: z.coerce
    .number<number>()
    .min(0, "Baggage weight must be at least 0 lbs")
    .max(200, "Baggage weight max is 200 lbs"),
});

export function WeightPresetManagerDialog() {
  const { presets, refreshPresets, isLoading } = useWeightPresetsBase();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<WeightPreset | null>(
    null,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      presetName: "",
      weight: 170,
      rearPassW: 0,
      baggageW: 0,
    },
    mode: "onChange",
  });

  const handleAdd = () => {
    setMode("add");
    setSelectedPreset(null);
    form.reset({
      presetName: "",
      weight: 170,
      rearPassW: 0,
      baggageW: 0,
    });
  };

  const handleEdit = (preset: WeightPreset) => {
    setMode("edit");
    setSelectedPreset(preset);
    form.setValue("presetName", preset.presetName);
    form.setValue("weight", preset.weight);
    form.setValue("rearPassW", preset.rearPassW);
    form.setValue("baggageW", preset.baggageW);
  };

  const handleDelete = (preset: WeightPreset) => {
    setMode("delete");
    setSelectedPreset(preset);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (mode === "add") {
        await weightPresetDB.create(data);
      } else if (mode === "edit" && selectedPreset) {
        await weightPresetDB.update({
          ...selectedPreset,
          ...data,
        });
      } else if (mode === "delete" && selectedPreset) {
        await weightPresetDB.delete(selectedPreset);
      }

      await refreshPresets();
      setMode(null);
      setSelectedPreset(null);
      form.reset();
    } catch (error) {
      console.error("Error managing weight preset:", error);
    }
  };

  const handleCancel = () => {
    setMode(null);
    setSelectedPreset(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Weight Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Weight Presets</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div>Loading presets...</div>
        ) : (
          <>
            {mode === null && (
              <>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Available Presets</h3>
                    <Button onClick={handleAdd} size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add New
                    </Button>
                  </div>

                  {presets.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No weight presets found
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {presets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-3"
                        >
                          <div>
                            <div className="font-medium">
                              {preset.presetName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Front: {preset.weight} lbs, Rear:{" "}
                              {preset.rearPassW} lbs, Baggage: {preset.baggageW}{" "}
                              lbs
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(preset)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(preset)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {(mode === "add" || mode === "edit") && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid gap-4 py-4">
                    <FormField
                      control={form.control}
                      name="presetName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputWithLabel
                              id="presetName"
                              labelText="Preset Name"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <NumberInputWithLabel
                                id="weight"
                                labelText="Front Weight (lbs)"
                                min={0}
                                max={400}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rearPassW"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <NumberInputWithLabel
                                id="rearPassW"
                                labelText="Rear Weight (lbs)"
                                min={0}
                                max={400}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="baggageW"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <NumberInputWithLabel
                                id="baggageW"
                                labelText="Baggage Weight (lbs)"
                                min={0}
                                max={200}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!form.formState.isValid}>
                      {mode === "add" ? "Add" : "Update"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}

            {mode === "delete" && selectedPreset && (
              <div className="py-4">
                <p className="mb-4">
                  Are you sure you want to delete the weight preset &quot;
                  {selectedPreset.presetName}&quot;?
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      onSubmit(selectedPreset as z.infer<typeof formSchema>)
                    }
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
