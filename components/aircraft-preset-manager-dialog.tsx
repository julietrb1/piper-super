import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Trash } from "lucide-react";
import { useAircraftModel } from "@/hooks/use-aircraft-model";
import {
  useAircraftPresets,
  AircraftPreset,
  aircraftPresetDB,
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
  aircraft: z.string().min(1, "Aircraft callsign is required"),
  weightLbs: z.coerce
    .number<number>()
    .min(500, "Weight must be at least 500 lbs")
    .max(3000, "Weight must be less than 3000 lbs"),
  armIn: z.coerce
    .number<number>()
    .min(50, "Arm must be at least 50 inches")
    .max(150, "Arm must be less than 150 inches"),
});

export function AircraftPresetManagerDialog() {
  const { model } = useAircraftModel();
  const { presets, refreshPresets, isLoading } = useAircraftPresets();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "delete" | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<AircraftPreset | null>(
    null,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aircraft: "",
      weightLbs: 1500,
      armIn: 85,
    },
    mode: "onChange",
  });

  const filteredPresets = presets.filter((p) => p.subtype === model);

  const handleAdd = () => {
    setMode("add");
    setSelectedPreset(null);
    form.reset({
      aircraft: "",
      weightLbs: 1500,
      armIn: 85,
    });
  };

  const handleEdit = (preset: AircraftPreset) => {
    setMode("edit");
    setSelectedPreset(preset);
    form.setValue("aircraft", preset.aircraft);
    form.setValue("weightLbs", preset.weightLbs);
    form.setValue("armIn", preset.armIn);
  };

  const handleDelete = (preset: AircraftPreset) => {
    setMode("delete");
    setSelectedPreset(preset);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (mode === "add") {
        await aircraftPresetDB.create({
          ...data,
          subtype: model,
        });
      } else if (mode === "edit" && selectedPreset) {
        await aircraftPresetDB.update({
          ...selectedPreset,
          ...data,
        });
      } else if (mode === "delete" && selectedPreset) {
        await aircraftPresetDB.delete(selectedPreset);
      }

      await refreshPresets();
      setMode(null);
      setSelectedPreset(null);
      form.reset();
    } catch (error) {
      console.error("Error managing aircraft preset:", error);
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
          Manage Aircraft Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Aircraft Presets</DialogTitle>
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

                  {filteredPresets.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No aircraft presets found for {model}
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {filteredPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-3"
                        >
                          <div>
                            <div className="font-medium">{preset.aircraft}</div>
                            <div className="text-sm text-muted-foreground">
                              {preset.weightLbs} lbs @ {preset.armIn} in
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
                      name="aircraft"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <InputWithLabel
                              id="aircraft"
                              labelText="Aircraft Callsign"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weightLbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <NumberInputWithLabel
                                id="weightLbs"
                                labelText="Weight (lbs)"
                                min={1000}
                                max={3000}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="armIn"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <NumberInputWithLabel
                                id="armIn"
                                labelText="Arm (in)"
                                min={70}
                                max={100}
                                step={0.1}
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
                  Are you sure you want to delete the aircraft preset &quot;
                  {selectedPreset.aircraft}&quot;?
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
