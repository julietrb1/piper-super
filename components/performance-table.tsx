import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCallback, useState } from "react";
import { AircraftPresetSelector } from "./aircraft-preset-selector";
import { PassengerPresetSelector } from "./passenger-preset-selector";
import { useForm } from "react-hook-form";
import { SpeedTable } from "./speed-table";
import { cn, lbsToKg, roundOneDec } from "@/lib/utils";
import { MinFuelTable } from "./min-fuel-table";
import { WeightPreset } from "@/hooks/use-weight-presets";
import { InputWithLabel } from "@/components/input-with-label";
import { BasicWeight } from "@/lib/basic-weight";
import { Button } from "@/components/ui/button";

const frontPassA = 80.5;
const rearPassA = 118.1;
const fuelA = 95.0;
const baggageA = 142.8;
const fuelAllowW = -7;
const fuelAllowA = 95;
const fuelAllowM = -665;
const taxiL = 5;

interface PerformanceForm {
  fuelL: number;
  burnL: number;
}

interface WeightRowProps {
  label: string;
  w: number;
  a?: number;
  m?: number;
  wKg?: number;
  muted?: boolean;
  primary?: boolean;
}

export function WeightRow({
  label,
  w,
  a,
  m,
  wKg,
  muted,
  primary,
}: WeightRowProps) {
  return (
    <TableRow
      className={cn({
        "text-muted-foreground": muted,
        "bg-primary-foreground font-bold": primary,
      })}
    >
      <TableCell className="text-left">{label}</TableCell>
      <TableCell>{(w || "--").toLocaleString()}</TableCell>
      <TableCell>{a && !isNaN(a) ? a.toFixed(1) : "--"}</TableCell>
      <TableCell>{(m || "--")?.toLocaleString()}</TableCell>
      <TableCell>{(wKg || "--")?.toLocaleString()}</TableCell>
    </TableRow>
  );
}

export function PerformanceTable() {
  const {
    register: registerPerformance,
    watch: watchPerformance,
    setValue,
    resetField,
  } = useForm<PerformanceForm>({
    defaultValues: { fuelL: 181, burnL: 0 },
    mode: "onChange",
  });

  const [basicEmptyW, setBasicEmptyWeight] = useState(0);
  const [basicEmptyA, setBasicEmptyArm] = useState(0);
  const basicEmptyM = Math.ceil(basicEmptyW * basicEmptyA);

  const [frontPassW, setFrontPassW] = useState(0);
  const frontPassM = Math.ceil(frontPassW * frontPassA);

  const [rearPassW, setRearPassW] = useState(0);
  const rearPassM = Math.ceil(rearPassW * rearPassA);

  const fuelL = watchPerformance("fuelL");
  const fuelW = Math.round(fuelL * 1.58);
  const fuelM = Math.ceil(fuelW * fuelA);

  const [baggageW, setBaggageW] = useState(0);
  const baggageM = Math.ceil(baggageW * baggageA);

  const rampW = basicEmptyW + frontPassW + rearPassW + fuelW + baggageW;
  const rampM = basicEmptyM + frontPassM + rearPassM + fuelM + baggageM;
  const rampA = roundOneDec(rampM / rampW);
  const rampWKg = lbsToKg(rampW);

  const toW = rampW + fuelAllowW;
  const toM = rampM + fuelAllowM;
  const toA = roundOneDec(toM / toW);
  const toWKg = lbsToKg(toW);

  const zfW = rampW - fuelW;
  const zfM = rampM - fuelM;
  const zfA = roundOneDec(zfM / zfW);
  const zfWKg = lbsToKg(zfW);

  const fuelBurnL = Number(watchPerformance("burnL"));
  const fuelBurnW = Math.ceil(fuelBurnL * 1.58);
  const lW = toW - fuelBurnW;
  const lWKg = lbsToKg(lW);

  const handleAircraftPresetSelected = (basicWeight: BasicWeight) => {
    setBasicEmptyWeight(basicWeight.weightLbs);
    setBasicEmptyArm(basicWeight.armIn);
  };

  const handlePassengerPresetSelected = (preset: WeightPreset) => {
    setFrontPassW(Number(preset.weight));
    setRearPassW(Number(preset.rearPassW));
    setBaggageW(Number(preset.baggageW));
  };

  const deductFbo = useCallback(() => {
    debugger;
    setValue("fuelL", Math.max(0, fuelL - taxiL - fuelBurnL));
  }, [fuelBurnL, fuelL, setValue]);

  return (
    <div className="flex flex-col">
      <AircraftPresetSelector
        weightLbs={basicEmptyW}
        armIn={basicEmptyA}
        onPresetSelected={handleAircraftPresetSelected}
      />
      <PassengerPresetSelector
        frontPassW={frontPassW}
        rearPassW={rearPassW}
        baggageW={baggageW}
        onPresetSelected={handlePassengerPresetSelected}
      />
      <div className="flex flex-row space-x-2 items-center">
        <InputWithLabel
          id="fob"
          labelText="Fuel (L)"
          type="number"
          className="max-w-20"
          {...registerPerformance("fuelL")}
        />
        <InputWithLabel
          id="burn"
          labelText="FBO (L)"
          type="number"
          className="max-w-20"
          {...registerPerformance("burnL")}
        />
        <Button
          variant="secondary"
          className="mt-5"
          size="sm"
          onClick={deductFbo}
        >
          Deduct all burn
        </Button>
        <Button
          variant="secondary"
          className="mt-5"
          size="sm"
          onClick={() => resetField("fuelL")}
        >
          Reset fuel
        </Button>
      </div>
      <Table className="my-8 max-w-[560px] font-mono">
        <TableHeader>
          <TableRow className="bg-accent">
            <TableHead className="py-2 font-bold">Item</TableHead>
            <TableHead className="py-2 font-bold text-right">W (lbs)</TableHead>
            <TableHead className="py-2 font-bold text-right">A (in)</TableHead>
            <TableHead className="py-2 font-bold text-right">M</TableHead>
            <TableHead className="py-2 font-bold text-right">W (kg)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-right">
          <WeightRow
            label="Basic Empty"
            w={basicEmptyW}
            a={basicEmptyA}
            m={basicEmptyM}
          />
          <WeightRow
            label="Pilot/Front Pass."
            w={frontPassW}
            a={frontPassA}
            m={frontPassM}
          />
          <WeightRow
            label="Rear Pass."
            w={rearPassW}
            a={rearPassA}
            m={rearPassM}
          />
          <WeightRow label="Fuel (48 gal max)" w={fuelW} a={fuelA} m={fuelM} />
          <WeightRow
            label="Baggage (200 lbs max)"
            w={baggageW}
            a={baggageA}
            m={baggageM}
          />
          <WeightRow
            label="Ramp (RW)"
            w={rampW}
            a={rampA}
            m={rampM}
            wKg={rampWKg}
          />
          <WeightRow
            label={`Fuel allowance (${taxiL} L)`}
            w={fuelAllowW}
            a={fuelAllowA}
            m={fuelAllowM}
            muted
          />
          <WeightRow label="TOW" w={toW} a={toA} m={toM} wKg={toWKg} primary />
          <WeightRow label="ZFW" w={zfW} a={zfA} m={zfM} wKg={zfWKg} primary />

          <TableRow>
            <TableCell className="text-left">Trip burn</TableCell>
            <TableCell colSpan={2}>
              ({fuelBurnW.toLocaleString()} lbs)
            </TableCell>
            <TableCell>({fuelBurnL} L)</TableCell>
          </TableRow>

          <WeightRow label="LW" w={lW} wKg={lWKg} primary />
        </TableBody>
      </Table>
      <div className="flex flex-row space-x-28">
        <SpeedTable toW={toW} lW={lW} />
        <MinFuelTable fuelBurnL={fuelBurnL} />
      </div>
    </div>
  );
}
