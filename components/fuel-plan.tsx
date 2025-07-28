import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useAircraftModel } from "@/hooks/use-aircraft-model";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  FormField,
  Form,
  FormItem,
  FormControl,
  FormLabel,
} from "@/components/ui/form";
import { NumberInput } from "@/components/number-input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";

const cruiseRate = 35; // L/hr
const holdingRate = 30; // L/hr

const formSchema = z.object({
  isSolo: z.boolean(),
  climbMin: z.coerce.number<number>().int(),
  climbL: z.coerce.number<number>().int(),
  cruiseMin: z.coerce.number<number>().int(),
  alternateMin: z.coerce.number<number>().int(),
  holdingMin: z.coerce.number<number>().int(),
  additionalMin: z.coerce.number<number>().int(),
  enduranceL: z.coerce.number<number>().int(),
  contingencyType: z.enum(["private", "piston"]),
  finalReserveMin: z.enum(["30", "45"]),
});

export function FuelPlan() {
  const { model } = useAircraftModel();
  const { theme } = useTheme();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isSolo: false,
      climbMin: 0,
      climbL: 0,
      cruiseMin: 0,
      alternateMin: 0,
      holdingMin: 0,
      additionalMin: 0,
      enduranceL: 0,
      contingencyType: "private",
      finalReserveMin: "30",
    },
    mode: "onChange",
  });

  const {
    isSolo,
    climbMin,
    climbL,
    cruiseMin,
    alternateMin,
    holdingMin,
    additionalMin,
    enduranceL,
    contingencyType,
    finalReserveMin: finalReserveMinStr,
  } = form.watch();

  const finalReserveMin = Number(finalReserveMinStr);

  const taxiL = model === "warrior3" ? 5 : 6;
  const cruiseL = Math.ceil((cruiseMin / 60) * cruiseRate);
  const alternateL = Math.ceil((alternateMin / 60) * cruiseRate);
  const holdingL = Math.ceil((holdingMin / 60) * holdingRate);
  const tripFuelMin = climbMin + cruiseMin;
  const tripFuelL = climbL + cruiseL;

  let contingencyMin = 0;
  let contingencyL = 0;

  if (contingencyType === "private") {
    contingencyMin = 0;
    contingencyL = 0;
  } else if (contingencyType === "piston") {
    contingencyMin = Math.floor(tripFuelMin * 0.1);
    contingencyL = Math.ceil(tripFuelL * 0.1);
  }

  if (contingencyMin < 5 && contingencyMin > 0) {
    contingencyMin = 5;
    contingencyL = Math.ceil((contingencyMin / 60) * cruiseRate);
  }

  const finalReserveL = Math.ceil((finalReserveMin / 60) * holdingRate);
  const additionalL = Math.ceil((additionalMin / 60) * cruiseRate);
  const requiredMin =
    climbMin +
    cruiseMin +
    alternateMin +
    holdingMin +
    contingencyMin +
    finalReserveMin +
    additionalMin;
  const requiredL =
    taxiL +
    climbL +
    cruiseL +
    alternateL +
    holdingL +
    contingencyL +
    finalReserveL +
    additionalL;
  const discretionaryL =
    Math.ceil(requiredL * 0.1) +
    (isSolo ? Math.ceil((15 / 60) * cruiseRate) : 0);
  const discretionaryMin = Math.floor((discretionaryL / cruiseRate) * 60);
  const marginL = enduranceL - requiredL - discretionaryL;
  const marginMin = Math.floor((marginL / cruiseRate) * 60);
  const enduranceMin = requiredMin + discretionaryMin + marginMin;

  return (
    <Form {...form}>
      <div className="flex flex-col space-y-4">
        <Table className="max-w-80 font-mono">
          <TableHeader>
            <TableRow className="bg-accent">
              <TableHead className="font-bold">Fuel plan</TableHead>
              <TableHead className="font-bold text-right">Min</TableHead>
              <TableHead className="font-bold text-right">L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Taxi</TableCell>
              <TableCell className="text-right">--</TableCell>
              <TableCell className="text-right">{taxiL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Climb</TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="climbMin"
                  render={({ field }) => (
                    <NumberInput className="w-16 h-6 text-right" {...field} />
                  )}
                />
              </TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="climbL"
                  render={({ field }) => (
                    <NumberInput className="w-16 h-6 text-right" {...field} />
                  )}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Cruise</TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="cruiseMin"
                  render={({ field }) => (
                    <NumberInput className="w-16 h-6 text-right" {...field} />
                  )}
                />
              </TableCell>
              <TableCell className="text-right">{cruiseL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Alternate</TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="alternateMin"
                  render={({ field }) => (
                    <NumberInput className="w-16 h-6 text-right" {...field} />
                  )}
                />
              </TableCell>
              <TableCell className="text-right">{alternateL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Holding</TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="holdingMin"
                  render={({ field }) => (
                    <NumberInput className="w-16 h-6 text-right" {...field} />
                  )}
                />
              </TableCell>
              <TableCell className="text-right">{holdingL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Contingency</TableCell>
              <TableCell className="text-right">{contingencyMin}</TableCell>
              <TableCell className="text-right">{contingencyL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Final reserve</TableCell>
              <TableCell className="text-right">{finalReserveMin}</TableCell>
              <TableCell className="text-right">{finalReserveL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Additional</TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="additionalMin"
                  render={({ field }) => (
                    <NumberInput className="w-16 h-6 text-right" {...field} />
                  )}
                />
              </TableCell>
              <TableCell className="text-right">{additionalL}</TableCell>
            </TableRow>
            <TableRow className="font-bold bg-primary-foreground">
              <TableCell>Required</TableCell>
              <TableCell className="text-right">{requiredMin}</TableCell>
              <TableCell className="text-right">{requiredL}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Discretionary</TableCell>
              <TableCell className="text-right">{discretionaryMin}</TableCell>
              <TableCell className="text-right">{discretionaryL}</TableCell>
            </TableRow>
            <TableRow
              className={cn(
                { "bg-green-900": theme === "dark" && marginL >= 0 },
                { "bg-red-900": theme === "dark" && marginL < 0 },
                { "bg-green-100": theme === "light" && marginL >= 0 },
                { "bg-red-100": theme === "light" && marginL < 0 },
              )}
            >
              <TableCell>Margin</TableCell>
              <TableCell className="text-right">{marginMin}</TableCell>
              <TableCell className="text-right">{marginL}</TableCell>
            </TableRow>
            <TableRow className="font-bold bg-primary-foreground">
              <TableCell>Endurance</TableCell>
              <TableCell className="text-right">{enduranceMin}</TableCell>
              <TableCell className="text-right">
                <FormField
                  control={form.control}
                  name="enduranceL"
                  render={({ field }) => (
                    <NumberInput
                      className="w-16 h-6 text-right font-bold"
                      {...field}
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="grid grid-cols-2">
          <div>
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Contingency Fuel</Label>
                <FormField
                  control={form.control}
                  name="contingencyType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="private" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Private (0%)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="piston" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Piston (10%)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-col space-y-2">
              <Label>Final Reserve</Label>
              <FormField
                control={form.control}
                name="finalReserveMin"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="30" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            30 minutes
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="45" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            45 minutes
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="isSolo"
                  render={({ field }) => (
                    <Checkbox
                      id="solo"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="solo">Solo</Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Form>
  );
}
