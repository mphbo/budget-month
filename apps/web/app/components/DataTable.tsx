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
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { AccountCategory, AccountType } from "../lib/account-types";
import { formatCurrency } from "../lib/formatting";
import { AmountField } from "./AmountField";
import { TotalEquityItemDialog } from "./TotalEquityItemDialog";
import { UnsavedChangesIndicator } from "./UnsavedChangesIndicator";

export type EditableBudgetItem = {
  id: string;
  item: string;
  amount: string;
  accountId?: string;
  accountType?: AccountType;
  category?: AccountCategory;
  date?: string;
};

type SortColumn = "item" | "amount";
type SortDirection = "asc" | "desc";

export const DataTable = ({
  title,
  items,
  onChange,
  disabled,
  accountSynced = false,
  readOnly = false,
  titleTooltip,
  onAddItem,
  addDisabled = false,
  showDate = false,
  showAccountClassification = false,
  hasUnsavedChanges = false,
}: {
  title: string;
  items: EditableBudgetItem[];
  onChange: (items: EditableBudgetItem[]) => void;
  disabled: boolean;
  accountSynced?: boolean;
  readOnly?: boolean;
  titleTooltip?: string;
  onAddItem?: () => void;
  addDisabled?: boolean;
  showDate?: boolean;
  showAccountClassification?: boolean;
  hasUnsavedChanges?: boolean;
}) => {
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set());
  const [equityDialogItem, setEquityDialogItem] =
    useState<EditableBudgetItem | null>(null);
  const [isAddingEquityItem, setIsAddingEquityItem] = useState(false);
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
          : (Number(left.entry.amount) || 0) -
            (Number(right.entry.amount) || 0);

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

  useEffect(() => {
    if (editingIds.size === 0) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[role='listbox']")) {
        return;
      }

      const editingRow =
        target instanceof Element
          ? target
              .closest("input, [role='combobox']")
              ?.closest("[data-budget-row]")
          : null;
      const rowId = editingRow?.getAttribute("data-budget-row");

      if (rowId && editingIds.has(rowId)) {
        setEditingIds(new Set([rowId]));
      } else {
        setEditingIds(new Set());
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
  }, [editingIds]);

  const updateItem = (index: number, patch: Partial<EditableBudgetItem>) => {
    onChange(
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const startEditing = (entry: EditableBudgetItem) => {
    setEditingIds((current) => new Set(current).add(entry.id));
  };

  const handleRowBlur = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    entry: EditableBudgetItem,
  ) => {
    const row = event.currentTarget.closest("tr");
    if (
      row &&
      event.relatedTarget instanceof Node &&
      row.contains(event.relatedTarget)
    ) {
      return;
    }

    setEditingIds((current) => {
      const next = new Set(current);
      next.delete(entry.id);
      return next;
    });
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
          <Tooltip arrow placement="top" title={titleTooltip}>
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
            {showAccountClassification && (
              <>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
              </>
            )}
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
            {showDate && <TableCell>Date (optional)</TableCell>}
            <TableCell padding="checkbox" />
          </TableRow>
        </TableHead>
        <TableBody>
          {displayItems.map(({ entry, index }) => (
            <TableRow data-budget-row={entry.id} key={entry.id}>
              <TableCell>
                {editingIds.has(entry.id) && !showAccountClassification ? (
                  accountSynced || readOnly ? (
                    entry.item
                  ) : (
                    <TextField
                      aria-label={`${title} item ${index + 1}`}
                      disabled={disabled}
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                      onBlur={(event) => handleRowBlur(event, entry)}
                      onChange={(event) =>
                        updateItem(index, { item: event.target.value })
                      }
                      size="small"
                      value={entry.item}
                    />
                  )
                ) : (
                  entry.item
                )}
              </TableCell>
              {showAccountClassification && (
                <>
                  <TableCell>
                    {entry.accountType === "asset"
                      ? "Asset"
                      : entry.accountType === "liability"
                        ? "Liability"
                        : "—"}
                  </TableCell>
                  <TableCell>{entry.category ?? "—"}</TableCell>
                </>
              )}
              <TableCell align="right">
                {editingIds.has(entry.id) && !showAccountClassification ? (
                  <AmountField
                    allowNegative
                    aria-label={`${title} amount ${index + 1}`}
                    disabled={disabled}
                    fullWidth
                    onBlur={(event) => handleRowBlur(event, entry)}
                    onAmountChange={(amount) => updateItem(index, { amount })}
                    size="small"
                    value={entry.amount}
                  />
                ) : (
                  formatCurrency(Number(entry.amount) || 0)
                )}
              </TableCell>
              {showDate && (
                <TableCell>
                  {editingIds.has(entry.id) ? (
                    <TextField
                      aria-label={`${title} date ${index + 1}`}
                      disabled={disabled}
                      fullWidth
                      onBlur={(event) => handleRowBlur(event, entry)}
                      onChange={(event) =>
                        updateItem(index, {
                          date: event.target.value || undefined,
                        })
                      }
                      size="small"
                      type="date"
                      value={entry.date ?? ""}
                    />
                  ) : entry.date ? (
                    <time dateTime={entry.date}>{entry.date}</time>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              <TableCell padding="checkbox">
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!readOnly &&
                    (showAccountClassification ||
                      !editingIds.has(entry.id)) && (
                      <IconButton
                        aria-label={`Edit ${entry.item || `row ${index + 1}`}`}
                        disabled={disabled}
                        onClick={() => {
                          if (showAccountClassification) {
                            setEquityDialogItem(entry);
                          } else {
                            startEditing(entry);
                          }
                        }}
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
            {showAccountClassification && (
              <>
                <TableCell />
                <TableCell />
              </>
            )}
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
      {!readOnly && (onAddItem || !accountSynced) && (
        <Button
          disabled={disabled || addDisabled || items.length >= 100}
          onClick={
            onAddItem ??
            (showAccountClassification
              ? () => setIsAddingEquityItem(true)
              : () => {
                  const id = crypto.randomUUID();
                  const newItem = { id, item: "", amount: "" };
                  onChange([...items, newItem]);
                  startEditing(newItem);
                })
          }
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
        >
          Add item
        </Button>
      )}
      {showAccountClassification && (
        <TotalEquityItemDialog
          accountSynced={accountSynced}
          disabled={disabled}
          existingNames={items
            .filter((item) => item.id !== equityDialogItem?.id)
            .map((item) => item.item)}
          item={equityDialogItem}
          onClose={() => {
            setEquityDialogItem(null);
            setIsAddingEquityItem(false);
          }}
          onSave={(updatedItem) => {
            if (equityDialogItem) {
              onChange(
                items.map((item) =>
                  item.id === updatedItem.id ? updatedItem : item,
                ),
              );
            } else {
              onChange([...items, updatedItem]);
            }
          }}
          open={Boolean(equityDialogItem) || isAddingEquityItem}
        />
      )}
    </>
  );
};
