"use client";

import AddIcon from "@mui/icons-material/Add";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddMonthDialog } from "./AddMonthDialog";

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

export const MonthList = () => {
  const router = useRouter();
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [nextMonth, setNextMonth] = useState<NextMonthOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMonthDialogOpen, setIsAddMonthDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMonths() {
      try {
        const response = await fetch("/api/months", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load months.");
        }

        const result: MonthListResponse = await response.json();
        setMonths(result.months);
        setNextMonth(result.nextMonth);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load months.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadMonths();
    return () => controller.abort();
  }, []);

  const handleMonthClick = (month: string) => {
    router.push(`/month/${month}`);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <nav aria-label="Months">
        <List>
          {isLoading ? (
            <ListItem>
              <ListItemText primary="Loading months..." />
            </ListItem>
          ) : (
            months.map((month, index) => (
              <Box key={month.slug}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMonthClick(month.slug)}>
                    <ListItemIcon>
                      <EditCalendarIcon />
                    </ListItemIcon>
                    <ListItemText primary={month.name} />
                  </ListItemButton>
                </ListItem>
                {index < months.length - 1 && <Divider />}
              </Box>
            ))
          )}
          {!isLoading && (
            <>
              {months.length > 0 && <Divider />}
              <ListItem disablePadding>
                <ListItemButton
                  disabled={!nextMonth}
                  onClick={() => setIsAddMonthDialogOpen(true)}
                >
                  <ListItemIcon>
                    <AddIcon />
                  </ListItemIcon>
                  <ListItemText primary="Add month" />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </nav>
      <AddMonthDialog
        open={isAddMonthDialogOpen}
        setOpen={setIsAddMonthDialogOpen}
        months={months}
        setMonths={setMonths}
        setError={setError}
        nextMonth={nextMonth}
        setNextMonth={setNextMonth}
      />
    </Box>
  );
};
