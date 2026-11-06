"use client";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TotalEquityItemDialog } from "./TotalEquityItemDialog";
import { UnsavedChangesIndicator } from "@/app/components/UnsavedChangesIndicator";
import {
  isFixedAssetCategory,
  LIABILITY_CATEGORIES,
} from "@/app/lib/account-types";
import { formatCurrency } from "@/app/lib/formatting";
import type { EditableBudgetItem } from "./DataTable";

type SortColumn = "item" | "amount";
type SortDirection = "asc" | "desc";

export const TotalEquityTable = ({
  title,
  items,
  onChange,
  disabled,
  accountSynced,
  titleTooltip,
  onAddItem,
  addDisabled = false,
  hasUnsavedChanges = false,
}: {
  title: string;
  items: EditableBudgetItem[];
  onChange: (items: EditableBudgetItem[]) => void;
  disabled: boolean;
  accountSynced: boolean;
  titleTooltip?: string;
  onAddItem?: () => void;
  addDisabled?: boolean;
  hasUnsavedChanges?: boolean;
}) => {
  const [equityDialogItem, setEquityDialogItem] =
    useState<EditableBudgetItem | null>(null);
  const [isAddingEquityItem, setIsAddingEquityItem] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const total = items.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    const type = entry.accountType ?? (amount < 0 ? "liability" : "asset");
    const balance = Number.isFinite(amount) ? Math.abs(amount) : 0;
    return sum + (type === "liability" ? -balance : balance);
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
  const assetItems = displayItems.filter(
    ({ entry }) =>
      entry.accountType === "asset" ||
      (!entry.accountType && Number(entry.amount) >= 0),
  );
  const liabilityItems = displayItems.filter(
    ({ entry }) =>
      entry.accountType === "liability" ||
      (!entry.accountType && Number(entry.amount) < 0),
  );
  const getGroupTotal = (groupItems: typeof displayItems) =>
    groupItems.reduce((sum, { entry }) => {
      const amount = Number(entry.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  const totalWithoutFixedAssets =
    assetItems
      .filter(
        ({ entry }) => !entry.category || !isFixedAssetCategory(entry.category),
      )
      .reduce((sum, { entry }) => sum + (Number(entry.amount) || 0), 0) -
    liabilityItems
      .filter(({ entry }) => entry.category !== LIABILITY_CATEGORIES.mortgage)
      .reduce((sum, { entry }) => sum + Math.abs(Number(entry.amount) || 0), 0);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  };

  const renderBudgetItem = ({
    entry,
    index,
  }: (typeof displayItems)[number]) => {
    const accountType =
      entry.accountType ?? (Number(entry.amount) < 0 ? "liability" : "asset");
    const amount = Number(entry.amount) || 0;

    return (
      <TableRow key={entry.id}>
        <TableCell>
          <ListItemText
            primary={entry.item}
            secondary={entry.category ?? "—"}
            sx={{ my: 0 }}
          />
        </TableCell>
        <TableCell align="right">
          {formatCurrency(
            accountType === "liability" ? Math.abs(amount) : amount,
          )}
        </TableCell>
        <TableCell padding="checkbox">
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              aria-label={`Edit ${entry.item || `row ${index + 1}`}`}
              disabled={disabled}
              onClick={() => setEquityDialogItem(entry)}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
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
    );
  };

  const renderGroupTotal = (label: string, value: number) => (
    <TableRow key={label}>
      <TableCell>
        <Typography sx={{ fontWeight: "bold" }}>{label}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography sx={{ fontWeight: "bold" }}>
          {formatCurrency(value)}
        </Typography>
      </TableCell>
      <TableCell />
    </TableRow>
  );

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
            <TableCell padding="checkbox" />
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3}>
              <Typography variant="h6">Assets</Typography>
            </TableCell>
          </TableRow>
          {assetItems.map(renderBudgetItem)}
          {renderGroupTotal("Total assets", getGroupTotal(assetItems))}
          <TableRow>
            <TableCell colSpan={3}>
              <Typography variant="h6">Liabilities</Typography>
            </TableCell>
          </TableRow>
          {liabilityItems.map(renderBudgetItem)}
          {renderGroupTotal(
            "Total liabilities",
            Math.abs(getGroupTotal(liabilityItems)),
          )}
          <TableRow>
            <TableCell>
              <Typography sx={{ fontWeight: "bold" }}>Net total</Typography>
              <Typography color="text.secondary" variant="body2">
                Excludes house, car &amp; mortgage
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography sx={{ fontWeight: "bold" }}>
                {formatCurrency(totalWithoutFixedAssets)}
              </Typography>
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography sx={{ fontWeight: "bold" }}>Net total</Typography>
              <Typography color="text.secondary" variant="body2">
                Includes house, car &amp; mortgage
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography sx={{ fontWeight: "bold" }}>
                {formatCurrency(total)}
              </Typography>
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
      {!accountSynced && (
        <Button
          disabled={disabled || addDisabled || items.length >= 100}
          onClick={() => setIsAddingEquityItem(true)}
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
        >
          Add item
        </Button>
      )}
      {accountSynced && onAddItem && (
        <Button
          disabled={disabled || addDisabled || items.length >= 100}
          onClick={onAddItem}
          startIcon={<AddIcon />}
          sx={{ mt: 1 }}
        >
          Add item
        </Button>
      )}
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
    </>
  );
};
