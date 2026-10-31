"use client";

import AddIcon from "@mui/icons-material/Add";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MonthOption = {
  slug: string;
  name: string;
};

type NextMonthOption = MonthOption & {
  copyFrom: MonthOption;
};

type MonthListResponse = {
  months: MonthOption[];
  nextMonth: NextMonthOption | null;
};

type CreateMonthResponse = {
  month: MonthOption;
  nextMonth: NextMonthOption | null;
};

export const AddMonthDialog = ({
  nextMonth,
  setNextMonth,
  months,
  setMonths,
  setError,
  open,
  setOpen,
}: {
  nextMonth: NextMonthOption | null;
  setNextMonth: React.Dispatch<React.SetStateAction<NextMonthOption | null>>;
  months: MonthOption[];
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
          ? `Choose whether to copy the budget from ${nextMonth.copyFrom.name} or start with empty sections.`
          : "There is no next month available to add."}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", p: 2 }}>
        <Button
          disabled={isCreating || !nextMonth}
          onClick={() => void handleCreateMonth("copy")}
          variant="contained"
        >
          {isCreating ? "Adding..." : `Copy ${nextMonth?.copyFrom.name}`}
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
