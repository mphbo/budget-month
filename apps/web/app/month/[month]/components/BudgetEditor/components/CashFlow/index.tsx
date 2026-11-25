import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { formatCurrency } from "../../../../../../lib/formatting";
import { EditableBudget } from "../../types";
import { Box } from "@mui/material";
import { DonutChart } from "./components/DonutChart";
import { SummaryChart } from "./components/SummaryChart";

export const CashFlow = ({ draft }: { draft: EditableBudget }) => {
  const incomeTotal = draft.income.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const expensesTotal = draft.expenses.reduce((sum, entry) => {
    const amount = Number(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const monthlyDifference = incomeTotal - expensesTotal;
  const differenceLabel =
    monthlyDifference > 0
      ? "Surplus"
      : monthlyDifference < 0
        ? "Deficit"
        : "Balance";
  const differenceColor =
    monthlyDifference > 0
      ? "success.main"
      : monthlyDifference < 0
        ? "error.main"
        : "text.primary";

  return (
    <Paper
      aria-label="Monthly income and expense summary"
      component="section"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box>
        <Typography sx={{ mb: 2 }} variant="h6">
          Cash Flow
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          {draft.income.length > 0 && (
            <DonutChart type="income" data={draft.income} />
          )}
          <Typography color="text.secondary" variant="body2">
            Income
          </Typography>
          <Typography variant="h6">{formatCurrency(incomeTotal)}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          {draft.expenses.length > 0 && (
            <DonutChart type="expenses" data={draft.expenses} />
          )}
          <Typography color="text.secondary" variant="body2">
            Expenses
          </Typography>
          <Typography variant="h6">{formatCurrency(expensesTotal)}</Typography>
        </Grid>
        <Grid size={{ xs: 12 }}>
          {draft.income.length === 0 && draft.expenses.length === 0 ? null : (
            <SummaryChart
              incomeTotal={incomeTotal}
              expenseTotal={expensesTotal}
              isSmall={false}
            />
          )}
          <Typography color="text.secondary" variant="body2">
            {differenceLabel}
          </Typography>
          <Typography color={differenceColor} variant="h6">
            {formatCurrency(Math.abs(monthlyDifference))}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};
