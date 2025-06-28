import { InputWithLabel } from "@/components/input-with-label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { calculateClimb } from "@/lib/performance-bicubic";
import { ClimbPerformance } from "@/lib/performance-models";
import { Slider } from "@/components/ui/slider";

const formSchema = z.object({
  fromAltHundreds: z.coerce.number().gte(0).lte(120),
  toAltHundreds: z.coerce.number().gte(0).lte(120),
  fromIsaTempDeviation: z.coerce.number().gte(-15).lte(30),
  toIsaTempDeviation: z.coerce.number().gte(-15).lte(30),
});

export function ClimbCalc() {
  const { control, watch, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromAltHundreds: 0,
      toAltHundreds: 10,
      fromIsaTempDeviation: 0,
      toIsaTempDeviation: 0,
    },
    mode: "onChange",
  });

  const {
    fromIsaTempDeviation: fromIsaTempDeviationStr,
    fromAltHundreds: fromAltHundredsStr,
    toAltHundreds: toAltHundredsStr,
    toIsaTempDeviation: toIsaTempDeviationStr,
  } = watch();
  const fromIsaTempDeviation = Number(fromIsaTempDeviationStr);
  const fromAltHundreds = Number(fromAltHundredsStr);
  const toIsaTempDeviation = Number(toIsaTempDeviationStr);
  const toAltHundreds = Number(toAltHundredsStr);
  let fromClimb: ClimbPerformance | null, toClimb: ClimbPerformance | null;
  try {
    fromClimb = calculateClimb(fromIsaTempDeviation, fromAltHundreds);
  } catch {
    fromClimb = null;
  }
  try {
    toClimb = calculateClimb(toIsaTempDeviation, toAltHundreds);
  } catch {
    toClimb = null;
  }
  const minutes = (toClimb?.minutes ?? 0) - (fromClimb?.minutes ?? 0);
  const fuelGal = (toClimb?.fuelGal ?? 0) - (fromClimb?.fuelGal ?? 0);
  const fuelL = Math.round(fuelGal * 3.8 * 10) / 10;
  const fromTempC = Math.round(
    15 + fromIsaTempDeviation - (2 * fromAltHundreds) / 10,
  );
  const toTempC = Math.round(
    15 + toIsaTempDeviation - (2 * toAltHundreds) / 10,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-8">
        <FormField
          control={control}
          name="fromAltHundreds"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-24"
              id="fromaltitude"
              type="number"
              labelText="From alt (x100)"
              min={0}
              max={120}
              {...field}
            />
          )}
        />
        <Slider
          value={[fromAltHundreds]}
          onValueChange={(x) => setValue("fromAltHundreds", x[0])}
          min={0}
          max={65}
          step={5}
          className="max-w-48 mt-4"
        />
      </div>
      <div className="flex flex-row gap-8">
        <FormField
          control={control}
          name="toAltHundreds"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-24"
              id="toaltitude"
              type="number"
              labelText="To alt (x100)"
              min={0}
              max={120}
              {...field}
            />
          )}
        />
        <Slider
          value={[toAltHundreds]}
          onValueChange={(x) => setValue("toAltHundreds", x[0])}
          min={10}
          max={75}
          step={5}
          className="max-w-48 mt-4"
        />
      </div>
      <div className="flex flex-row gap-8">
        <FormField
          control={control}
          name="fromIsaTempDeviation"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-24"
              id="fromIsaTempDeviation"
              type="number"
              labelText="From temp ISA"
              min={-15}
              max={30}
              {...field}
            />
          )}
        />{" "}
        <Slider
          value={[fromIsaTempDeviation]}
          onValueChange={(x) => setValue("fromIsaTempDeviation", x[0])}
          min={-5}
          max={20}
          step={1}
          className="max-w-48 mt-4"
        />
      </div>
      <div className="flex flex-row gap-8">
        <FormField
          control={control}
          name="toIsaTempDeviation"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-24"
              id="toIsaTempDeviation"
              type="number"
              labelText="To temp ISA"
              min={-15}
              max={30}
              {...field}
            />
          )}
        />
        <Slider
          value={[toIsaTempDeviation]}
          onValueChange={(x) => setValue("toIsaTempDeviation", x[0])}
          min={-5}
          max={20}
          step={1}
          className="max-w-48 mt-4"
        />
      </div>
      <div className="grid grid-cols-2 max-w-64">
        <div className="text-muted-foreground">Minutes</div>
        <div>{minutes.toLocaleString()}</div>
        <div className="text-muted-foreground">Fuel</div>
        <div>
          {fuelL.toFixed(1)} L{" "}
          <span className="text-muted-foreground">
            / {fuelGal.toFixed(1)} gal
          </span>
        </div>
        <div className="text-muted-foreground">Temp</div>
        <div>
          {fromTempC}/{toTempC}˚C
        </div>
      </div>
    </div>
  );
}
