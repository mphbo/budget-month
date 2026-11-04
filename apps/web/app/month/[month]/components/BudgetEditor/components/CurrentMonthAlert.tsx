import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

export const CurrentMonthAlert = ({
  isCurrentMonth,
  isFutureMonth,
}: {
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}) => (
  <Alert severity="info">
    {isCurrentMonth ? (
      <List
        disablePadding
        sx={{ display: "flex", flexDirection: "column", gap: 1, pl: 2 }}
      >
        <ListItem disablePadding>
          Total Equity balances sync with Accounts for this month. Add, edit, or
          delete accounts here, or manage accounts on the home page.
        </ListItem>
        <ListItem disablePadding>
          Liabilities are negative. Type and category changes update the account
          globally across all months when saved.
        </ListItem>
        <ListItem disablePadding>
          Equity Change compares this month with the previous month.
        </ListItem>
      </List>
    ) : isFutureMonth ? (
      "Total Equity is a planned estimate for this future month and does not sync with Accounts. Type and category changes update the account globally across all months when saved. Equity Change compares it with the previous month's Total Equity."
    ) : (
      "This month is a historical snapshot. Balance edits won't affect Accounts, but type and category changes update the account globally across all months when saved. Equity Change compares its Total Equity with the previous month's snapshot."
    )}
  </Alert>
);
