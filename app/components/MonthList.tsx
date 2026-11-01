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
import { useState } from "react";
import type { MonthOption, NextMonthOption } from "../lib/month-types";
import { AddMonthDialog } from "./AddMonthDialog";

export const MonthList = ({
  initialMonths,
  initialNextMonth,
}: {
  initialMonths: MonthOption[];
  initialNextMonth: NextMonthOption;
}) => {
  const router = useRouter();
  const [months, setMonths] = useState(initialMonths);
  const [nextMonth, setNextMonth] = useState<NextMonthOption | null>(
    initialNextMonth,
  );
  const [isAddMonthDialogOpen, setIsAddMonthDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {months.map((month, index) => (
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
          ))}
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
        </List>
      </nav>
      <AddMonthDialog
        open={isAddMonthDialogOpen}
        setOpen={setIsAddMonthDialogOpen}
        setMonths={setMonths}
        setError={setError}
        nextMonth={nextMonth}
        setNextMonth={setNextMonth}
      />
    </Box>
  );
};
