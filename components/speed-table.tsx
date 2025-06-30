import {
  calcWarrior3VR,
  calcWarrior3VRef,
  calcWarrior3VToss,
} from "@/lib/performance-calc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface Props {
  toW: number;
  lW: number;
}

const va = 111;
const mtow = 2440;

export function SpeedTable({ toW, lW }: Props) {
  const tova = Math.ceil(Math.sqrt(toW / mtow) * va);
  const lva = Math.ceil(Math.sqrt(lW / mtow) * va);
  const vrTow = calcWarrior3VR(toW);
  const vrLw = calcWarrior3VR(lW);
  const vRefTow = calcWarrior3VRef(toW);
  const vRefLw = calcWarrior3VRef(lW);
  const vTossTow = calcWarrior3VToss(toW);
  const vTossLw = calcWarrior3VToss(lW);

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
          <TableRow className="bg-primary-foreground">
            <TableCell>
              V<sub>REF</sub>
            </TableCell>
            <TableCell>{vRefTow}</TableCell>
            <TableCell>{vRefLw}</TableCell>
          </TableRow>
          <TableRow className="bg-primary-foreground">
            <TableCell>
              V<sub>A</sub>
            </TableCell>
            <TableCell>{tova}</TableCell>
            <TableCell>{lva}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              V<sub>R</sub>
            </TableCell>
            <TableCell>{vrTow}</TableCell>
            <TableCell>{vrLw}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              V<sub>TOSS</sub>
            </TableCell>
            <TableCell>{vTossTow}</TableCell>
            <TableCell>{vTossLw}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
