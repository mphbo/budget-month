"use client";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { NumericFormat } from "react-number-format";

type AmountFieldProps = Omit<
  TextFieldProps,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  onAmountChange: (value: string) => void;
  value: string;
};

export const AmountField = ({
  onAmountChange,
  value,
  ...textFieldProps
}: AmountFieldProps) => (
  <NumericFormat
    allowNegative={false}
    customInput={TextField}
    decimalScale={2}
    isAllowed={({ value: numericValue }) => {
      if (numericValue.startsWith("-")) {
        return false;
      }

      const [integerPart, fractionalPart] = numericValue.split(".");
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
