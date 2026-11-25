"use client";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { AccountCategory, AccountType } from "@/app/lib/account-types";
import { formatCurrency } from "@/app/lib/formatting";
import { UnsavedChangesIndicator } from "@/app/components/UnsavedChangesIndicator";

export type EditableBudgetItem = {
  id: string;
  item: string;
  amount: string;
  accountId?: string;
  accountType?: AccountType;
  category?: AccountCategory;
  date?: string;
};

type SortColumn = "item" | "amount" | "date";
type SortDirection = "asc" | "desc";

export const DataTable = ({
  title,
  items,
  onChange,
  onAddItem,
  onEditItem,
  disabled,
  readOnly = false,
  titleTooltip,
  showDate = false,
  hasUnsavedChanges = false,
}: {
  title: string;
  items: EditableBudgetItem[];
  onChange: (items: EditableBudgetItem[]) => void;
  onAddItem: () => void;
  onEditItem: (item: EditableBudgetItem) => void;
  disabled: boolean;
  readOnly?: boolean;
  titleTooltip?: string;
  showDate?: boolean;
  hasUnsavedChanges?: boolean;
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const total = items.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const displayItems = items
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      if (!sortColumn) {
        return left.index - right.index;
      }

      const comparison =
        sortColumn === "item"
          ? left.entry.item.localeCompare(right.entry.item, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          : sortColumn === "amount"
            ? (Number(left.entry.amount) || 0) -
              (Number(right.entry.amount) || 0)
            : (left.entry.date ?? "").localeCompare(right.entry.date ?? "");

      return (
        (sortDirection === "asc" ? comparison : -comparison) ||
        left.index - right.index
      );
    });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  };

  return (
    <>
      <Box
        sx={{
          alignItems: "center",
          display: "inline-flex",
          gap: 0.75,
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {titleTooltip ? (
          <Tooltip
            arrow
            enterTouchDelay={0}
            leaveTouchDelay={3000}
            placement="top"
            title={titleTooltip}
          >
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
            >
              <Typography component="span" variant="h4">
                {title}
              </Typography>
              <InfoOutlinedIcon
                aria-label={`${title} information`}
                fontSize="small"
                sx={{ color: "text.secondary", cursor: "help" }}
              />
            </Box>
          </Tooltip>
        ) : (
          <Typography variant="h4">{title}</Typography>
        )}
        {hasUnsavedChanges && (
          <UnsavedChangesIndicator label={`Unsaved changes in ${title}`} />
        )}
      </Box>

      <Table aria-label={`${title} budget table`}>
        <TableHead>
          <TableRow>
            <TableCell
              sortDirection={sortColumn === "item" ? sortDirection : false}
            >
              <TableSortLabel
                active={sortColumn === "item"}
                direction={sortColumn === "item" ? sortDirection : "asc"}
                onClick={() => handleSort("item")}
              >
                Item
              </TableSortLabel>
            </TableCell>
            <TableCell
              align="right"
              sortDirection={sortColumn === "amount" ? sortDirection : false}
            >
              <TableSortLabel
                active={sortColumn === "amount"}
                direction={sortColumn === "amount" ? sortDirection : "asc"}
                onClick={() => handleSort("amount")}
              >
                Amount
              </TableSortLabel>
            </TableCell>
            {showDate && (
              <TableCell
                sortDirection={sortColumn === "date" ? sortDirection : false}
              >
                <TableSortLabel
                  active={sortColumn === "date"}
                  direction={sortColumn === "date" ? sortDirection : "asc"}
                  onClick={() => handleSort("date")}
                >
                  Date (optional)
                </TableSortLabel>
              </TableCell>
            )}
            <TableCell padding="checkbox" />
          </TableRow>
        </TableHead>

        <TableBody>
          {displayItems.map(({ entry, index }) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.item}</TableCell>
              <TableCell align="right">
                {formatCurrency(Number(entry.amount) || 0)}
              </TableCell>
              {showDate && (
                <TableCell>
                  {entry.date ? (
                    <time dateTime={entry.date}>{entry.date}</time>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              <TableCell padding="checkbox">
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!readOnly && (
                    <IconButton
                      aria-label={`Edit ${entry.item || `row ${index + 1}`}`}
                      disabled={disabled}
                      onClick={() => onEditItem(entry)}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  {!readOnly && (
                    <IconButton
                      aria-label={`Remove ${entry.item || `row ${index + 1}`}`}
                      disabled={disabled}
                      onClick={() =>
                        onChange(items.filter((item) => item.id !== entry.id))
                      }
                      size="small"
                    >
                      x
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell>
              <Typography sx={{ fontWeight: "bold" }}>Total</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography sx={{ fontWeight: "bold" }}>
                {formatCurrency(total)}
              </Typography>
            </TableCell>
            {showDate && <TableCell />}
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>

      {!readOnly && (
        <Button
          disabled={disabled || items.length >= 100}
          onClick={onAddItem}
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
        >
          Add item
        </Button>
      )}
    </>
  );
};
