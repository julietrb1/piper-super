import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  fuelBurnL: number;
}

export function MinFuelTable({ fuelBurnL }: Props) {
  const [isSolo, setSolo] = useState(false);
  const [holdingL, setHoldingL] = useState<0 | 15 | 30>(0);
  const addPerHourBurnL = 36;
  const taxiL = 5;
  const finResL = 15;
  const unusableL = 8;
  const legalMinL = Math.ceil(taxiL + fuelBurnL + holdingL + finResL);
  const tenPctL = Math.ceil(legalMinL / 10);
  const vdo15m = isSolo ? addPerHourBurnL / 4 : 0;
  const companyMinL = Math.ceil(
    legalMinL + legalMinL / 10 + vdo15m + unusableL
  );

  return (
    <div className="flex flex-col space-y-4">
      <Table className="max-w-52 font-mono">
        <TableHeader>
          <TableRow>
            <TableHead colSpan={2}>Minimum fuel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Taxi</TableCell>
            <TableCell className="text-right">{taxiL}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Trip</TableCell>
            <TableCell className="text-right">{fuelBurnL}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Holding</TableCell>
            <TableCell className="text-right">{holdingL}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Final res.</TableCell>
            <TableCell className="text-right">{finResL}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-primary-foreground">
            <TableCell>Legal min.</TableCell>
            <TableCell className="text-right">{legalMinL}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>10%</TableCell>
            <TableCell className="text-right">{tenPctL}</TableCell>
          </TableRow>
          <TableRow className={cn({ "text-muted-foreground": !vdo15m })}>
            <TableCell>15m VDO</TableCell>
            <TableCell className="text-right">{vdo15m || "--"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Unusable</TableCell>
            <TableCell className="text-right">{unusableL}</TableCell>
          </TableRow>
          <TableRow className="font-bold bg-primary-foreground">
            <TableCell>Company min.</TableCell>
            <TableCell className="text-right">{companyMinL}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <RadioGroup
        defaultValue="none"
        onValueChange={(val) =>
          setHoldingL(val === "none" ? 0 : val === "30m" ? 15 : 30)
        }
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="none" id="intertempo-none" />
          <Label htmlFor="intertempo-none">No holding</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="30m" id="intertempo-30m" />
          <Label htmlFor="intertempo-30m">30m</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="60m" id="intertempo-60m" />
          <Label htmlFor="intertempo-60m">60m</Label>
        </div>
      </RadioGroup>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="solo"
          checked={isSolo}
          onCheckedChange={() => setSolo((prev) => !prev)}
        />
        <label
          htmlFor="solo"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Solo
        </label>
      </div>
    </div>
  );
}
