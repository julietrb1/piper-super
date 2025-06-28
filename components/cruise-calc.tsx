import { calcWarrior3Cruise } from "@/lib/performance-calc";
import { InputWithLabel } from "@/components/input-with-label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";

const formSchema = z.object({
  altHundreds: z.coerce
    .number()
    .gte(0)
    .lte(120),
  isaTempDeviation: z.coerce
    .number()
    .gte(-15)
    .lte(30),
});

export function CruiseCalc() {
  const { control, watch, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      altHundreds: 10,
      isaTempDeviation: 0,
    },
    mode: "onChange",
  });

  const {
    isaTempDeviation: isaTempDeviationStr,
    altHundreds: altHundredsStr,
  } = watch();
  const isaTempDeviation = Number(isaTempDeviationStr);
  const altHundreds = Number(altHundredsStr);
  const cruise = calcWarrior3Cruise(altHundreds, isaTempDeviation);
  const tempC = Math.round(15 + isaTempDeviation - 2 * (altHundreds / 10));

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-row gap-8">
        <FormField
          control={control}
          name="altHundreds"
          render={({ field }) => (
            <InputWithLabel
              id="altHundreds"
              labelText="Alt (x100)"
              type="number"
              min={0}
              max={120}
              {...field}
            />
          )}
        />
        <Slider
          value={[altHundreds]}
          onValueChange={x => setValue("altHundreds", x[0])}
          min={0}
          max={115}
          step={5}
          className="max-w-48 mt-4"
        />
      </div>
      <div className="flex flex-row gap-8">
        <FormField
          control={control}
          name="isaTempDeviation"
          render={({ field }) => (
            <InputWithLabel
              id="isaTempDeviation"
              labelText="Temp ISA"
              type="number"
              min={-15}
              max={30}
              {...field}
            />
          )}
        />
        <Slider
          value={[isaTempDeviation]}
          onValueChange={x => setValue("isaTempDeviation", x[0])}
          min={-5}
          max={20}
          step={1}
          className="max-w-48 mt-4"
        />
      </div>
      <div className="grid grid-cols-2 max-w-64">
        <div className="text-muted-foreground">RPM</div>
        <div>{cruise.rpm.toLocaleString()}</div>
        <div className="text-muted-foreground">TAS</div>
        <div>{cruise.tas.toLocaleString()}</div>
        <div className="text-muted-foreground">Temp</div>
        <div>{tempC}˚C</div>
        <div className="text-muted-foreground">Press alt (x100)</div>
        <div>{cruise.altHundreds.toLocaleString()}</div>
      </div>
    </div>
  );
}
