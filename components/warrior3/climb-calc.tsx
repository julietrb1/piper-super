import { InputWithLabel } from "@/components/input-with-label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { calculateClimb } from "@/lib/performance-bicubic";
import { ClimbPerformance } from "@/lib/performance-models";
import { Button } from "@/components/ui/button";
import { calcDensityAltitude } from "@/lib/utils";

const formSchema = z.object({
  fromAltHundreds: z.coerce.number().gte(0).lte(120),
  toAltHundreds: z.coerce.number().gte(0).lte(120),
  fromIsaDeviation: z.coerce.number().gte(-15).lte(30),
  toIsaDeviation: z.coerce.number().gte(-15).lte(30),
});

export function Warrior3ClimbCalc() {
  const { control, watch, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromAltHundreds: 0,
      toAltHundreds: 25,
      fromIsaDeviation: 0,
      toIsaDeviation: 0,
    },
    mode: "onChange",
  });

  const {
    fromIsaDeviation: fromIsaDeviationStr,
    fromAltHundreds: fromAltHundredsStr,
    toAltHundreds: toAltHundredsStr,
    toIsaDeviation: toIsaDeviationStr,
  } = watch();
  const fromIsaDeviation = Number(fromIsaDeviationStr);
  const fromAltHundreds = Number(fromAltHundredsStr);
  const fromDensityAlt = calcDensityAltitude(fromAltHundreds, fromIsaDeviation);
  const toIsaDeviation = Number(toIsaDeviationStr);
  const toAltHundreds = Number(toAltHundredsStr);
  const toDensityAlt = calcDensityAltitude(toAltHundreds, toIsaDeviation);
  let fromClimb: ClimbPerformance | null, toClimb: ClimbPerformance | null;
  try {
    fromClimb = calculateClimb(fromIsaDeviation, fromAltHundreds);
  } catch {
    fromClimb = null;
  }
  try {
    toClimb = calculateClimb(toIsaDeviation, toAltHundreds);
  } catch {
    toClimb = null;
  }
  const minutes = Math.ceil(
    (toClimb?.minutes ?? 0) - (fromClimb?.minutes ?? 0),
  );
  const fuelGal = (toClimb?.fuelGal ?? 0) - (fromClimb?.fuelGal ?? 0);
  const fuelL = Math.round(fuelGal * 3.8 * 10) / 10;
  const fromTempC = Math.round(
    15 + fromIsaDeviation - (2 * fromAltHundreds) / 10,
  );
  const toTempC = Math.round(15 + toIsaDeviation - (2 * toAltHundreds) / 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-1">
        <FormField
          control={control}
          name="fromAltHundreds"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-16"
              id="fromaltitude"
              type="number"
              labelText="From alt"
              min={0}
              max={120}
              {...field}
            />
          )}
        />
        <Button
          className="mt-6"
          size="sm"
          variant="secondary"
          onClick={() => setValue("fromAltHundreds", fromAltHundreds - 10)}
        >
          -
        </Button>
        <Button
          className="mt-6 mr-3"
          size="sm"
          variant="secondary"
          onClick={() => setValue("fromAltHundreds", fromAltHundreds + 10)}
        >
          +
        </Button>
        <FormField
          control={control}
          name="toAltHundreds"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-16"
              id="toaltitude"
              type="number"
              labelText="To alt"
              min={0}
              max={120}
              {...field}
            />
          )}
        />
        <Button
          className="mt-6"
          size="sm"
          variant="secondary"
          onClick={() => setValue("toAltHundreds", toAltHundreds - 10)}
        >
          -
        </Button>
        <Button
          className="mt-6"
          size="sm"
          variant="secondary"
          onClick={() => setValue("toAltHundreds", toAltHundreds + 10)}
        >
          +
        </Button>
      </div>
      <div className="flex flex-row gap-1">
        <FormField
          control={control}
          name="fromIsaDeviation"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-16"
              id="fromIsaDeviation"
              type="number"
              labelText="From ISA"
              min={-15}
              max={30}
              {...field}
            />
          )}
        />{" "}
        <Button
          className="mt-6"
          size="sm"
          variant="secondary"
          onClick={() => setValue("fromIsaDeviation", fromIsaDeviation - 1)}
        >
          -
        </Button>
        <Button
          className="mt-6 mr-3"
          size="sm"
          variant="secondary"
          onClick={() => setValue("fromIsaDeviation", fromIsaDeviation + 1)}
        >
          +
        </Button>
        <FormField
          control={control}
          name="toIsaDeviation"
          render={({ field }) => (
            <InputWithLabel
              className="max-w-16"
              id="toIsaDeviation"
              type="number"
              labelText="To ISA"
              min={-15}
              max={30}
              {...field}
            />
          )}
        />
        <Button
          className="mt-6"
          size="sm"
          variant="secondary"
          onClick={() => setValue("toIsaDeviation", toIsaDeviation - 1)}
        >
          -
        </Button>
        <Button
          className="mt-6"
          size="sm"
          variant="secondary"
          onClick={() => setValue("toIsaDeviation", toIsaDeviation + 1)}
        >
          +
        </Button>
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
        <div className="text-muted-foreground">Density alt</div>
        <div>
          {fromDensityAlt.toLocaleString()}/{toDensityAlt.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
