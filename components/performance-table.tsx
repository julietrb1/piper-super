import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useState } from "react";
import { BasicWeight } from "@/lib/basic-weight";
import { AircraftPresetSelector } from "./aircraft-preset-selector";
import { PassengerPresetSelector } from "./passenger-preset-selector";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import { SpeedTable } from "./speed-table";
import { cn, lbsToKg, roundOneDec } from "@/lib/utils";
import { MinFuelTable } from "./min-fuel-table";
import { WeightPreset } from "@/hooks/use-weight-presets";

const frontPassA = 80.5;
const rearPassA = 118.1;
const fuelA = 95.0;
const baggageA = 142.8;
const fuelAllowW = -7;
const fuelAllowA = 95;
const fuelAllowM = -665;

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
      <TableCell>{w.toLocaleString()}</TableCell>
      <TableCell>{a?.toFixed(1)}</TableCell>
      <TableCell>{m?.toLocaleString()}</TableCell>
      <TableCell>{wKg?.toLocaleString()}</TableCell>
    </TableRow>
  );
}

export function PerformanceTable() {
  const { register: registerPerformance, watch: watchPerformance } =
    useForm<PerformanceForm>({
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

  const fuelW = Math.round(watchPerformance("fuelL") * 1.58);
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
    if (preset.rearPassW !== undefined) {
      setRearPassW(Number(preset.rearPassW));
    }
    if (preset.baggageW !== undefined) {
      setBaggageW(Number(preset.baggageW));
    }
  };

  return (
    <div className="flex flex-col">
      <AircraftPresetSelector
        weightLbs={basicEmptyW}
        armIn={basicEmptyA}
        onPresetSelected={handleAircraftPresetSelected}
      />
      <PassengerPresetSelector
        weight={frontPassW}
        onPresetSelected={handlePassengerPresetSelected}
      />
      <div className="flex flex-row space-x-2 items-center">
        <Input
          type="number"
          className="max-w-20"
          {...registerPerformance("fuelL")}
        />
        <span>L</span>
        <span className="ps-8">Burn</span>
        <Input
          type="number"
          className="max-w-20"
          {...registerPerformance("burnL")}
        />
        <span>L</span>
      </div>
      <Table className="my-8 max-w-[560px] font-mono">
        <TableHeader>
          <TableRow>
            <TableHead className="py-2">Item</TableHead>
            <TableHead className="py-2 text-right">W (lbs)</TableHead>
            <TableHead className="py-2 text-right">A (in)</TableHead>
            <TableHead className="py-2 text-right">M</TableHead>
            <TableHead className="py-2 text-right">W (kg)</TableHead>
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
            label="Fuel Allowance"
            w={fuelAllowW}
            a={fuelAllowA}
            m={fuelAllowM}
            muted
          />
          <WeightRow label="TOW" w={toW} a={toA} m={toM} wKg={toWKg} primary />
          <WeightRow label="ZFW" w={zfW} a={zfA} m={zfM} wKg={zfWKg} primary />

          <TableRow>
            <TableCell className="text-left">Trip Burn</TableCell>
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
