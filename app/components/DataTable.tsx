"use client";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

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
  const total = items.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const updateItem = (index: number, patch: Partial<EditableBudgetItem>) => {
    onChange(
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
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
            <TableRow key={entry.id}>
              <TableCell>
                <TextField
                  aria-label={`${title} item ${index + 1}`}
                  disabled={disabled}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                  onChange={(event) =>
                    updateItem(index, { item: event.target.value })
                  }
                  size="small"
                  value={entry.item}
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  aria-label={`${title} amount ${index + 1}`}
                  disabled={disabled}
                  fullWidth
                  slotProps={{
                    htmlInput: { inputMode: "decimal", maxLength: 16 },
                  }}
                  onChange={(event) =>
                    updateItem(index, { amount: event.target.value })
                  }
                  size="small"
                  value={entry.amount}
                />
              </TableCell>
              <TableCell padding="checkbox">
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
        onClick={() =>
          onChange([
            ...items,
            { id: crypto.randomUUID(), item: "", amount: "" },
          ])
        }
        startIcon={<AddIcon />}
        sx={{ mt: 1 }}
      >
        Add item
      </Button>
    </>
  );
};
