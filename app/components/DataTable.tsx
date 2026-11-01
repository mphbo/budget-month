"use client";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

export type EditableBudgetItem = {
  id: string;
  item: string;
  amount: string;
};

export const DataTable = ({
  title,
  items,
  onChange,
  disabled,
}: {
  title: string;
  items: EditableBudgetItem[];
  onChange: (items: EditableBudgetItem[]) => void;
  disabled: boolean;
}) => {
  const [editingIds, setEditingIds] = useState<Set<string>>(() => new Set());
  const total = items.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  useEffect(() => {
    if (editingIds.size === 0) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const editingRow =
        target instanceof Element
          ? target.closest("input")?.closest("[data-budget-row]")
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
      <Typography variant="h4">{title}</Typography>
      <Table aria-label={`${title} budget table`}>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell padding="checkbox" />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((entry, index) => (
            <TableRow data-budget-row={entry.id} key={entry.id}>
              <TableCell>
                {editingIds.has(entry.id) ? (
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
                ) : (
                  entry.item
                )}
              </TableCell>
              <TableCell align="right">
                {editingIds.has(entry.id) ? (
                  <TextField
                    aria-label={`${title} amount ${index + 1}`}
                    disabled={disabled}
                    fullWidth
                    slotProps={{
                      htmlInput: { inputMode: "decimal", maxLength: 16 },
                    }}
                    onBlur={(event) => handleRowBlur(event, entry)}
                    onChange={(event) =>
                      updateItem(index, { amount: event.target.value })
                    }
                    size="small"
                    value={entry.amount}
                  />
                ) : (
                  `$${(Number(entry.amount) || 0).toFixed(2)}`
                )}
              </TableCell>
              <TableCell padding="checkbox">
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!editingIds.has(entry.id) && (
                    <IconButton
                      aria-label={`Edit ${entry.item || `row ${index + 1}`}`}
                      disabled={disabled}
                      onClick={() => startEditing(entry)}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
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
                ${total.toFixed(2)}
              </Typography>
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      <Button
        disabled={disabled || items.length >= 100}
        onClick={() => {
          const id = crypto.randomUUID();
          const newItem = { id, item: "", amount: "" };
          onChange([...items, newItem]);
          startEditing(newItem);
        }}
        startIcon={<AddIcon />}
        sx={{ mt: 1 }}
      >
        Add item
      </Button>
    </>
  );
};
