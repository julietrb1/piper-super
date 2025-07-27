import {
  calcWarrior3VR,
  calcWarrior3VRef,
  calcWarrior3VToss,
} from "@/lib/warrior3/performance-calc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useAircraftModel } from "@/hooks/use-aircraft-model";

interface Props {
  toW: number;
  lW: number;
}

const warrior3Va = 111;
const warrior3MtoW = 2440;

const arrow3Va = 118;
const arrow3MtoW = 2750;

const calcArrow3VRFlaps0 = (w: number) => {
  const speedsDomain = [2000, 2200, 2400, 2600, 2750];
  const vRRange = [60, 63, 66, 69, 71];
  const calculateVRFromWeight = (weight: number) => {
    // Simple linear interpolation
    for (let i = 0; i < speedsDomain.length - 1; i++) {
      if (weight >= speedsDomain[i] && weight <= speedsDomain[i + 1]) {
        const ratio =
          (weight - speedsDomain[i]) / (speedsDomain[i + 1] - speedsDomain[i]);
        return Math.round(vRRange[i] + ratio * (vRRange[i + 1] - vRRange[i]));
      }
    }
    return weight <= speedsDomain[0] ? vRRange[0] : vRRange[vRRange.length - 1];
  };
  return calculateVRFromWeight(w);
};

const calcArrow3VRFlaps25 = (w: number) => {
  const speedsDomain = [2000, 2200, 2400, 2600, 2750];
  const vRRange = [51, 53, 55, 57, 59];
  const calculateVRFromWeight = (weight: number) => {
    // Simple linear interpolation
    for (let i = 0; i < speedsDomain.length - 1; i++) {
      if (weight >= speedsDomain[i] && weight <= speedsDomain[i + 1]) {
        const ratio =
          (weight - speedsDomain[i]) / (speedsDomain[i + 1] - speedsDomain[i]);
        return Math.round(vRRange[i] + ratio * (vRRange[i + 1] - vRRange[i]));
      }
    }
    return weight <= speedsDomain[0] ? vRRange[0] : vRRange[vRRange.length - 1];
  };
  return calculateVRFromWeight(w);
};

const calcArrow3VRef = (w: number) => {
  const speedsDomain = [2000, 2200, 2400, 2600, 2750];
  const vRefRange = [61, 64, 67, 70, 72];
  const calculateVRefFromWeight = (weight: number) => {
    // Simple linear interpolation
    for (let i = 0; i < speedsDomain.length - 1; i++) {
      if (weight >= speedsDomain[i] && weight <= speedsDomain[i + 1]) {
        const ratio =
          (weight - speedsDomain[i]) / (speedsDomain[i + 1] - speedsDomain[i]);
        return Math.round(
          vRefRange[i] + ratio * (vRefRange[i + 1] - vRefRange[i]),
        );
      }
    }
    return weight <= speedsDomain[0]
      ? vRefRange[0]
      : vRefRange[vRefRange.length - 1];
  };
  return calculateVRefFromWeight(w);
};

export function SpeedTable({ toW, lW }: Props) {
  const { model } = useAircraftModel();

  const va = model === "warrior3" ? warrior3Va : arrow3Va;
  const mtoW = model === "warrior3" ? warrior3MtoW : arrow3MtoW;

  const tova = Math.ceil(Math.sqrt(toW / mtoW) * va);
  const lva = Math.ceil(Math.sqrt(lW / mtoW) * va);

  const vrTowFlaps0 =
    model === "warrior3" ? calcWarrior3VR(toW) : calcArrow3VRFlaps0(toW);
  const vrLwFlaps0 =
    model === "warrior3" ? calcWarrior3VR(lW) : calcArrow3VRFlaps0(lW);
  const vrTowFlaps25 = model === "warrior3" ? null : calcArrow3VRFlaps25(toW);
  const vrLwFlaps25 = model === "warrior3" ? null : calcArrow3VRFlaps25(lW);
  const vRefTow =
    model === "warrior3" ? calcWarrior3VRef(toW) : calcArrow3VRef(toW);
  const vRefLw =
    model === "warrior3" ? calcWarrior3VRef(lW) : calcArrow3VRef(lW);
  const vTossTow = model === "warrior3" ? calcWarrior3VToss(toW) : null;
  const vTossLw = model === "warrior3" ? calcWarrior3VToss(lW) : null;

  return (
    <div>
      <Table className="max-w-72 font-mono">
        <TableHeader>
          <TableRow className="bg-accent">
            <TableHead className="font-bold">Speed</TableHead>
            <TableHead className="font-bold">Take-off</TableHead>
            <TableHead className="font-bold">Landing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              V<sub>R</sub>
              {(vrTowFlaps25 || vrLwFlaps25) && " (0˚)"}
            </TableCell>
            <TableCell>{vrTowFlaps0}</TableCell>
            <TableCell>{vrLwFlaps0}</TableCell>
          </TableRow>
          {(vrTowFlaps25 || vrLwFlaps25) && (
            <TableRow>
              <TableCell>
                V<sub>R</sub> (25˚)
              </TableCell>
              <TableCell>{vrTowFlaps25}</TableCell>
              <TableCell>{vrLwFlaps25}</TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell>
              V<sub>REF</sub>
            </TableCell>
            <TableCell>{vRefTow}</TableCell>
            <TableCell>{vRefLw}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              V<sub>A</sub>
            </TableCell>
            <TableCell>{tova}</TableCell>
            <TableCell>{lva}</TableCell>
          </TableRow>
          {(vTossTow || vTossLw) && (
            <TableRow>
              <TableCell>
                V<sub>TOSS</sub>
              </TableCell>
              <TableCell>{vTossTow}</TableCell>
              <TableCell>{vTossLw}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
