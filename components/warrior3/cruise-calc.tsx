import { calcWarrior3Cruise } from "@/lib/warrior3/performance-calc";
import { InputWithLabel } from "@/components/input-with-label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  altHundreds: z.coerce.number().gte(0).lte(120),
  isaTempDeviation: z.coerce.number().gte(-15).lte(30),
});

export function Warrior3CruiseCalc() {
  const { control, watch, setValue } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      altHundreds: 25,
      isaTempDeviation: 0,
    },
    mode: "onChange",
  });

  const { isaTempDeviation: isaTempDeviationStr, altHundreds: altHundredsStr } =
    watch();
  const isaTempDeviation = Number(isaTempDeviationStr);
  const altHundreds = Number(altHundredsStr);
  const cruise = calcWarrior3Cruise(altHundreds, isaTempDeviation);
  const tempC = Math.round(15 + isaTempDeviation - 2 * (altHundreds / 10));

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex flex-row gap-1">
        <FormField
          control={control}
          name="altHundreds"
          render={({ field }) => (
            <InputWithLabel
              id="altHundreds"
              labelText="Alt"
              type="number"
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
          onClick={() => setValue("altHundreds", altHundreds - 10)}
        >
          -
        </Button>
        <Button
          className="mt-6 mr-3"
          size="sm"
          variant="secondary"
          onClick={() => setValue("altHundreds", altHundreds + 10)}
        >
          +
        </Button>
        <FormField
          control={control}
          name="isaTempDeviation"
          render={({ field }) => (
            <InputWithLabel
              id="isaTempDeviation"
              labelText="ISA"
              type="number"
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
          onClick={() => setValue("isaTempDeviation", isaTempDeviation - 1)}
        >
          -
        </Button>
        <Button
          className="mt-6 mr-3"
          size="sm"
          variant="secondary"
          onClick={() => setValue("isaTempDeviation", isaTempDeviation + 1)}
        >
          +
        </Button>
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
