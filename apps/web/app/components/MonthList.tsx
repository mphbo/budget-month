"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import TodayIcon from "@mui/icons-material/Today";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiErrorMessage } from "../lib/api-response";
import type {
  MonthDirection,
  MonthOption,
  NextMonthOption,
  PreviousMonthOption,
} from "../lib/month-types";
import { AddMonthDialog } from "./AddMonthDialog";

type MonthNavigationResponse = {
  months: MonthOption[];
  nextMonth: NextMonthOption;
  previousMonth: PreviousMonthOption | null;
  deletableMonths: string[];
};

export const MonthList = ({
  initialMonths,
  currentMonthSlug,
  initialNextMonth,
  initialPreviousMonth,
  initialDeletableMonths,
}: {
  initialMonths: MonthOption[];
  currentMonthSlug: string;
  initialNextMonth: NextMonthOption;
  initialPreviousMonth: PreviousMonthOption | null;
  initialDeletableMonths: string[];
}) => {
  const router = useRouter();
  const [months, setMonths] = useState(initialMonths);
  const [nextMonth, setNextMonth] = useState<NextMonthOption | null>(
    initialNextMonth,
  );
  const [previousMonth, setPreviousMonth] =
    useState<PreviousMonthOption | null>(initialPreviousMonth);
  const [deletableMonths, setDeletableMonths] = useState(
    initialDeletableMonths,
  );
  const [monthDirection, setMonthDirection] = useState<MonthDirection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [monthToDelete, setMonthToDelete] = useState<MonthOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentMonthTooltipOpen, setCurrentMonthTooltipOpen] = useState(false);

  const handleMonthClick = (month: string) => {
    router.push(`/month/${month}`);
  };

  const handleDeleteMonth = async () => {
    if (!monthToDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/months/${encodeURIComponent(monthToDelete.slug)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Could not delete this month"),
        );
      }

      const refreshResponse = await fetch("/api/months");
      if (!refreshResponse.ok) {
        throw new Error("Month deleted, but the month list could not refresh.");
      }

      const result: MonthNavigationResponse = await refreshResponse.json();
      setMonths(result.months);
      setNextMonth(result.nextMonth);
      setPreviousMonth(result.previousMonth);
      setDeletableMonths(result.deletableMonths);
      setMonthToDelete(null);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this month.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "background.paper", width: { xs: "100%", lg: "40%" } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <nav aria-label="Months">
        <List disablePadding>
          <Box>
            <ListItem
              sx={{
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemButton
                disabled={!previousMonth}
                onClick={() => setMonthDirection("previous")}
                sx={{
                  "&:hover": { bgcolor: "transparent" },
                }}
              >
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Add previous month" />
              </ListItemButton>
            </ListItem>
          </Box>
          <Divider />
          {months.map((month, index) => (
            <Box key={month.slug}>
              <ListItem
                sx={{
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemButton
                  onClick={() => handleMonthClick(month.slug)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    color: "inherit",
                    "&:hover": { bgcolor: "transparent" },
                  }}
                >
                  <ListItemIcon>
                    <EditCalendarIcon />
                  </ListItemIcon>
                  <ListItemText primary={month.name} />
                </ListItemButton>
                <Box
                  sx={{
                    width: 48,
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {month.slug === currentMonthSlug && (
                    <Tooltip
                      disableFocusListener
                      disableHoverListener
                      disableTouchListener
                      open={currentMonthTooltipOpen}
                      title="Current calendar month"
                    >
                      <IconButton
                        aria-label="Current calendar month"
                        onBlur={() => setCurrentMonthTooltipOpen(false)}
                        onClick={() =>
                          setCurrentMonthTooltipOpen((isOpen) => !isOpen)
                        }
                        size="small"
                      >
                        <TodayIcon
                          fontSize="small"
                          sx={{ color: "text.secondary" }}
                        />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Box
                  sx={{
                    width: 48,
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {deletableMonths.includes(month.slug) && (
                    <IconButton
                      aria-label={`Delete ${month.name}`}
                      color="error"
                      disabled={isDeleting}
                      onClick={() => setMonthToDelete(month)}
                      sx={{ width: 48, height: 48 }}
                    >
                      <DeleteForeverOutlinedIcon />
                    </IconButton>
                  )}
                </Box>
              </ListItem>
              {index < months.length - 1 && <Divider />}
            </Box>
          ))}
          {months.length > 0 && <Divider />}
          <ListItem
            sx={{
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemButton
              disabled={!nextMonth}
              onClick={() => setMonthDirection("next")}
              sx={{
                "&:hover": { bgcolor: "transparent" },
              }}
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
        open={monthDirection !== null}
        direction={monthDirection ?? "next"}
        month={monthDirection === "previous" ? previousMonth : nextMonth}
        onClose={() => setMonthDirection(null)}
        setMonths={setMonths}
        setError={setError}
        setNextMonth={setNextMonth}
        setPreviousMonth={setPreviousMonth}
        setDeletableMonths={setDeletableMonths}
      />
      <Dialog
        open={monthToDelete !== null}
        onClose={() => !isDeleting && setMonthToDelete(null)}
      >
        <DialogTitle>Delete {monthToDelete?.name}?</DialogTitle>
        <DialogContent>
          Only the oldest past month or newest future month can be deleted. This
          permanently deletes its budget and cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button disabled={isDeleting} onClick={() => setMonthToDelete(null)}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={isDeleting}
            onClick={() => void handleDeleteMonth()}
            variant="contained"
          >
            {isDeleting ? "Deleting..." : "Delete month"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
