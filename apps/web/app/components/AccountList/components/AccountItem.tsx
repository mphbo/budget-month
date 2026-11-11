import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EditIcon from "@mui/icons-material/Edit";
import LinkIcon from "@mui/icons-material/Link";
import PaymentsIcon from "@mui/icons-material/Payments";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { AccountType } from "../../../lib/account-types";
import {
  getAccountCategories,
  getDefaultAccountCategory,
  parseAccountCategory,
} from "../../../lib/account-types";
import { formatCurrency } from "../../../lib/formatting";
import { AmountField } from "../../AmountField";
import { EditableAccount } from "..";
import { LinkedInstitution } from "@/app/lib/linked-institution-types";

export const AccountItem = ({
  account,
  index,
  linkedInstitutions,
  editingIds,
  isSaving,
  setDraft,
  setEditingIds,
  setError,
  setSavedMessage,
}: {
  account: EditableAccount;
  index: number;
  linkedInstitutions: LinkedInstitution[];
  editingIds: Set<string>;
  isSaving: boolean;
  setDraft: (
    updater: (current: EditableAccount[]) => EditableAccount[],
  ) => void;
  setEditingIds: (updater: (current: Set<string>) => Set<string>) => void;
  setError: (error: string | null) => void;
  setSavedMessage: (message: string | null) => void;
}) => {
  const institutionNames = new Map(
    linkedInstitutions.map((institution) => [
      institution.id,
      institution.institutionName,
    ]),
  );
  const isEditing = editingIds.has(account.id);
  const institutionName = account.plaidItemId
    ? institutionNames.get(account.plaidItemId)
    : undefined;

  const updateAccount = (id: string, patch: Partial<EditableAccount>) => {
    setDraft((current) =>
      current.map((account) =>
        account.id === id ? { ...account, ...patch } : account,
      ),
    );
    setError(null);
    setSavedMessage(null);
  };

  return (
    <ListItem
      data-account-row={account.id}
      disablePadding
      key={account.id}
      sx={{ py: 1 }}
    >
      <Box sx={{ display: "flex", gap: 1.5, width: "100%", minWidth: 0 }}>
        <ListItemIcon sx={{ minWidth: 36, alignSelf: "center" }}>
          {account.type === "asset" ? <AttachMoneyIcon /> : <PaymentsIcon />}
        </ListItemIcon>
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <>
              <TextField
                aria-label={`Account name ${index + 1}`}
                disabled={isSaving}
                fullWidth
                label="Name"
                onChange={(event) =>
                  updateAccount(account.id, { name: event.target.value })
                }
                size="small"
                value={account.name}
              />
              <TextField
                aria-label={`Account type ${index + 1}`}
                disabled={isSaving}
                fullWidth
                label="Type"
                onChange={(event) => {
                  if (
                    event.target.value === "asset" ||
                    event.target.value === "liability"
                  ) {
                    updateAccount(account.id, {
                      type: event.target.value as AccountType,
                      category: getDefaultAccountCategory(event.target.value),
                    });
                  }
                }}
                select
                size="small"
                value={account.type}
              >
                <MenuItem value="asset">Asset</MenuItem>
                <MenuItem value="liability">Liability</MenuItem>
              </TextField>
              <TextField
                aria-label={`Account category ${index + 1}`}
                disabled={isSaving}
                fullWidth
                label="Category"
                onChange={(event) =>
                  updateAccount(account.id, {
                    category: parseAccountCategory(event.target.value),
                  })
                }
                size="small"
                select
                value={account.category}
              >
                {getAccountCategories(account.type, account.category).map(
                  (category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ),
                )}
              </TextField>
              <AmountField
                aria-label={`Account amount ${index + 1}`}
                disabled={isSaving || Boolean(institutionName)}
                fullWidth
                helperText={
                  institutionName ? `Synced from ${institutionName}` : undefined
                }
                label="Amount"
                onAmountChange={(amount) =>
                  updateAccount(account.id, { amount })
                }
                size="small"
                value={account.amount}
              />
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                paddingRight: "5%",
              }}
            >
              <ListItemText
                primary={account.name}
                secondary={
                  institutionName ? (
                    <Box
                      component="span"
                      sx={{ alignItems: "center", display: "flex", gap: 0.5 }}
                    >
                      {account.category}
                      <Tooltip title={`Synced from ${institutionName}`}>
                        <LinkIcon
                          aria-label={`Synced from ${institutionName}`}
                          fontSize="inherit"
                        />
                      </Tooltip>
                    </Box>
                  ) : (
                    account.category
                  )
                }
              />
              <Typography>{formatCurrency(Number(account.amount))}</Typography>
            </Box>
          )}
        </Stack>
        {!isEditing && (
          <IconButton
            aria-label={`Edit ${account.name}`}
            disabled={isSaving}
            onClick={() =>
              setEditingIds((current) => new Set(current).add(account.id))
            }
            size="small"
            sx={{ alignSelf: "center" }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton
          aria-label={`Remove ${account.name}`}
          disabled={isSaving}
          onClick={() => {
            setDraft((current) =>
              current.filter((entry) => entry.id !== account.id),
            );
            setEditingIds((current) => {
              const next = new Set(current);
              next.delete(account.id);
              return next;
            });
            setSavedMessage(null);
          }}
          size="small"
          sx={{ alignSelf: "center" }}
        >
          x
        </IconButton>
      </Box>
    </ListItem>
  );
};
