"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MonthOption, NextMonthOption } from "../lib/month-types";

type CreateMonthResponse = {
  month: MonthOption;
  nextMonth: NextMonthOption | null;
};

export const AddMonthDialog = ({
  nextMonth,
  setNextMonth,
  setMonths,
  setError,
  open,
  setOpen,
}: {
  nextMonth: NextMonthOption | null;
  setNextMonth: React.Dispatch<React.SetStateAction<NextMonthOption | null>>;
  setMonths: React.Dispatch<React.SetStateAction<MonthOption[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateMonth = async (mode: "copy" | "fresh") => {
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        const result: { error?: string } = await response.json();
        throw new Error(result.error ?? "Could not create the next month.");
      }

      const result: CreateMonthResponse = await response.json();
      setMonths((currentMonths) => [...currentMonths, result.month]);
      setNextMonth(result.nextMonth);
      setOpen(false);
      router.push(`/month/${result.month.slug}`);
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the next month.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !isCreating && setOpen(false)}>
      <DialogTitle>Add {nextMonth?.name ?? "month"}</DialogTitle>
      <DialogContent>
        {nextMonth
          ? nextMonth.copyFrom
            ? `Choose whether to copy the budget from ${nextMonth.copyFrom.name} or start with empty sections.`
            : "This will be your first budget month. You can start with empty sections."
          : "Could not determine which month comes next."}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", p: 2 }}>
        <Button
          disabled={isCreating || !nextMonth?.copyFrom}
          onClick={() => void handleCreateMonth("copy")}
          variant="contained"
        >
          {isCreating
            ? "Adding..."
            : `Copy ${nextMonth?.copyFrom?.name ?? "previous month"}`}
        </Button>
        <Button
          disabled={isCreating || !nextMonth}
          onClick={() => void handleCreateMonth("fresh")}
          variant="outlined"
        >
          Start fresh
        </Button>
        <Button disabled={isCreating} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
