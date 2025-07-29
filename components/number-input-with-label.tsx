import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as React from "react";

export function NumberInputWithLabel({
  id,
  labelText,
  onChange,
  ...inputProps
}: React.ComponentProps<"input"> & {
  id: string;
  labelText: string;
  onChange?: (value: number | undefined) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value === "" ? undefined : +e.target.value);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{labelText}</Label>
      <Input
        id={id}
        type="number"
        onChange={onChange ? handleChange : undefined}
        {...inputProps}
      />
    </div>
  );
}
