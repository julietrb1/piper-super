import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import * as React from "react";

interface Props extends React.ComponentProps<"input"> {
  id: string;
  labelText: string;
}

export function InputWithLabel({ id, labelText, ...inputProps }: Props) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{labelText}</Label>
      <Input id={id} {...inputProps} />
    </div>
  );
}
