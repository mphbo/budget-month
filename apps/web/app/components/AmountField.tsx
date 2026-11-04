"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { NumericFormat } from "react-number-format";

type AmountFieldProps = Omit<
  TextFieldProps,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  allowNegative?: boolean;
  onAmountChange: (value: string) => void;
  value: string;
};

export const AmountField = ({
  allowNegative = false,
  onAmountChange,
  value,
  ...textFieldProps
}: AmountFieldProps) => (
  <NumericFormat
    allowNegative={allowNegative}
    customInput={TextField}
    decimalScale={2}
    isAllowed={({ value: numericValue }) => {
      const unsignedValue = numericValue.replace(/^-/, "");
      const [integerPart, fractionalPart] = unsignedValue.split(".");
      return integerPart.length <= 12 && (fractionalPart?.length ?? 0) <= 2;
    }}
    inputMode="decimal"
    onValueChange={({ value: numericValue }) => onAmountChange(numericValue)}
    thousandSeparator
    value={value}
    valueIsNumericString
    {...textFieldProps}
  />
);
