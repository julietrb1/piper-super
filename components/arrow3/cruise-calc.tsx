"use client";

import { InputWithLabel } from "@/components/input-with-label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  calcMP55Power2200,
  calcMP55Power2500,
  calcMP65Power2200,
  calcMP65Power2500,
  calcMP75Power2500,
  calculateTas55,
  calculateTas65,
  calculateTas75,
} from "@/lib/arrow3/cruise";
import { calcDensityAltitude, calculateTempFromIsa } from "@/lib/utils";

const formSchema = z.object({
  altHundreds: z.coerce.number().gte(0).lte(120),
  isaTempDeviation: z.coerce.number().gte(-15).lte(30),
});

export function Arrow3CruiseCalc() {
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
  const isaDeviation = Number(isaTempDeviationStr);
  const pressAltHundreds = Number(altHundredsStr);
  const densityAlt = calcDensityAltitude(pressAltHundreds, isaDeviation);

  const tas55 = Math.round(calculateTas55(densityAlt));
  const mp55Power2200 = calcMP55Power2200(pressAltHundreds);
  const mp55Power2500 = calcMP55Power2500(pressAltHundreds);

  const tas65 = Math.round(calculateTas65(densityAlt));
  const mp65Power2200 = calcMP65Power2200(pressAltHundreds);
  const mp65Power2500 = calcMP65Power2500(pressAltHundreds);

  const tas75 = Math.round(calculateTas75(densityAlt));
  const mp75Power2500 = calcMP75Power2500(pressAltHundreds);

  const tempC = calculateTempFromIsa(pressAltHundreds, isaDeviation);

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
          onClick={() => setValue("altHundreds", pressAltHundreds - 10)}
        >
          -
        </Button>
        <Button
          className="mt-6 mr-3"
          size="sm"
          variant="secondary"
          onClick={() => setValue("altHundreds", pressAltHundreds + 10)}
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
          onClick={() => setValue("isaTempDeviation", isaDeviation - 1)}
        >
          -
        </Button>
        <Button
          className="mt-6 mr-3"
          size="sm"
          variant="secondary"
          onClick={() => setValue("isaTempDeviation", isaDeviation + 1)}
        >
          +
        </Button>
      </div>
      <div className="grid grid-cols-2 max-w-64">
        <div className="col-span-2 mb-2">
          ( 2200<span className="text-muted-foreground">/2500</span> RPM )
        </div>
        <div className="text-muted-foreground">55% TAS</div>
        <div>
          {tas55.toLocaleString()} ({mp55Power2200 || "--"}
          <span className="text-muted-foreground">
            /{mp55Power2500 || "--"}
          </span>
          )
        </div>
        <div className="text-muted-foreground">65% TAS</div>
        <div>
          {tas65.toLocaleString()} ({mp65Power2200 || "--"}
          <span className="text-muted-foreground">
            /{mp65Power2500 || "--"}
          </span>
          )
        </div>
        <div className="text-muted-foreground">75% TAS</div>
        <div>
          {tas75.toLocaleString()} (--
          <span className="text-muted-foreground">
            /{mp75Power2500 || "--"}
          </span>
          )
        </div>
        <div className="text-muted-foreground">Temp</div>
        <div>{tempC}˚C</div>
        <div className="text-muted-foreground">Density alt</div>
        <div>{densityAlt.toLocaleString()}</div>
      </div>
    </div>
  );
}
