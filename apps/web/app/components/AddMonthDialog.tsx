"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiErrorMessage, readApiJson } from "../lib/api-response";
import type {
  MonthDirection,
  MonthOption,
  NextMonthOption,
  PreviousMonthOption,
} from "../lib/month-types";

type CreateMonthResponse = {
  month: MonthOption;
  months: MonthOption[];
  nextMonth: NextMonthOption;
  previousMonth: PreviousMonthOption | null;
  deletableMonths: string[];
};

export const AddMonthDialog = ({
  direction,
  month,
  setNextMonth,
  setPreviousMonth,
  setDeletableMonths,
  setMonths,
  setError,
  open,
  onClose,
}: {
  direction: MonthDirection;
  month: NextMonthOption | PreviousMonthOption | null;
  setNextMonth: React.Dispatch<React.SetStateAction<NextMonthOption | null>>;
  setPreviousMonth: React.Dispatch<
    React.SetStateAction<PreviousMonthOption | null>
  >;
  setDeletableMonths: React.Dispatch<React.SetStateAction<string[]>>;
  setMonths: React.Dispatch<React.SetStateAction<MonthOption[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  open: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const directionLabel = direction === "previous" ? "previous" : "next";

  const handleCreateMonth = async (mode: "copy" | "fresh") => {
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, direction }),
      });
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Could not create the ${directionLabel} month`,
          ),
        );
      }

      const result = await readApiJson<CreateMonthResponse>(
        response,
        `Could not read the response while creating the ${directionLabel} month`,
      );

      if (
        !result ||
        typeof result !== "object" ||
        !result.month ||
        !Array.isArray(result.months) ||
        !Array.isArray(result.deletableMonths)
      ) {
        throw new Error(
          `The server returned incomplete data while creating the ${directionLabel} month.`,
        );
      }
      setMonths(result.months);
      setNextMonth(result.nextMonth);
      setPreviousMonth(result.previousMonth);
      setDeletableMonths(result.deletableMonths);
      onClose();
      router.push(`/month/${result.month.slug}`);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : `Could not create the ${directionLabel} month.`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !isCreating && onClose()}>
      <DialogTitle>Add {month?.name ?? `${directionLabel} month`}</DialogTitle>
      <DialogContent>
        {month
          ? month.copyFrom
            ? `Choose whether to copy the budget from ${month.copyFrom.name} or start with empty sections.`
            : "This will be your first budget month. You can start with empty sections."
          : `Could not determine which ${directionLabel} month comes next.`}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", p: 2 }}>
        <Button
          disabled={isCreating || !month?.copyFrom}
          onClick={() => void handleCreateMonth("copy")}
          variant="contained"
        >
          {isCreating
            ? "Adding..."
            : `Copy ${month?.copyFrom?.name ?? "month"}`}
        </Button>
        <Button
          disabled={isCreating || !month}
          onClick={() => void handleCreateMonth("fresh")}
          variant="outlined"
        >
          Start fresh
        </Button>
        <Button disabled={isCreating} onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
