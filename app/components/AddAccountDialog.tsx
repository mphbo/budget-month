"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type {
  Account,
  AccountCategory,
  AccountInput,
  AccountType,
} from "../lib/account-types";
import {
  getAccountCategories,
  getDefaultAccountCategory,
  parseAccountCategory,
} from "../lib/account-types";
import { getApiErrorMessage, readApiJson } from "../lib/api-response";

export const AddAccountDialog = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (account: Account) => void;
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [category, setCategory] = useState<AccountCategory>(
    getDefaultAccountCategory("asset"),
  );
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const categories = getAccountCategories(type, category);

  const closeDialog = () => {
    if (isCreating) {
      return;
    }

    setName("");
    setType("asset");
    setCategory(getDefaultAccountCategory("asset"));
    setAmount("");
    setError(null);
    onClose();
  };

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const account: AccountInput = {
      name: name.trim(),
      type,
      category: parseAccountCategory(category.trim()),
      amount,
    };

    if (
      !account.name ||
      account.name.length > 120 ||
      !account.category ||
      account.category.length > 100 ||
      !/^\d{1,12}(?:\.\d{1,2})?$/.test(account.amount)
    ) {
      setError("Enter a name, category, and valid non-negative amount.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Could not add this account"),
        );
      }

      const result = await readApiJson<{ account: Account }>(
        response,
        "Could not read the response after adding this account",
      );
      onCreated(result.account);
      setName("");
      setType("asset");
      setCategory(getDefaultAccountCategory("asset"));
      setAmount("");
      onClose();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not add this account.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" onClose={closeDialog} open={open}>
      <DialogTitle>Add account</DialogTitle>
      <Stack component="form" onSubmit={(event) => void createAccount(event)}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              fullWidth
              label="Name"
              onChange={(event) => setName(event.target.value)}
              required
              slotProps={{ htmlInput: { maxLength: 120 } }}
              value={name}
            />
            <TextField
              fullWidth
              label="Type"
              onChange={(event) => {
                if (
                  event.target.value === "asset" ||
                  event.target.value === "liability"
                ) {
                  const nextType = event.target.value;
                  setType(nextType);
                  setCategory(getDefaultAccountCategory(nextType));
                }
              }}
              select
              value={type}
            >
              <MenuItem value="asset">Asset</MenuItem>
              <MenuItem value="liability">Liability</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Category"
              onChange={(event) =>
                setCategory(parseAccountCategory(event.target.value))
              }
              required
              select
              value={category}
            >
              {categories.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Amount"
              onChange={(event) => setAmount(event.target.value)}
              required
              slotProps={{
                htmlInput: {
                  inputMode: "decimal",
                  max: 999999999999.99,
                  min: 0,
                  step: "0.01",
                },
              }}
              type="number"
              value={amount}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button disabled={isCreating} onClick={closeDialog}>
            Cancel
          </Button>
          <Button disabled={isCreating} type="submit" variant="contained">
            {isCreating ? "Adding..." : "Add account"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};
