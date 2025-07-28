import * as React from "react";
import { Input } from "@/components/ui/input";

export function NumberInput({
  onChange,
  ...props
}: React.ComponentProps<"input"> & {
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Input
      {...props}
      type="number"
      onChange={(e) =>
        onChange(e.target.value === "" ? undefined : +e.target.value)
      }
    />
  );
}
