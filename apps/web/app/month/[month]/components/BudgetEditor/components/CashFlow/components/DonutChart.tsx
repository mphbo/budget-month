import { PieChart } from "@mui/x-charts";
import type { EditableBudgetItem } from "../../DataTable";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/app/lib/account-types";

const settings = {
  margin: { right: 5 },
  width: 200,
  height: 200,
  hideLegend: true,
};

const expenseColors: Record<string, string> = {
  [EXPENSE_CATEGORIES.savings]: "#269B83",
  [EXPENSE_CATEGORIES.investments]: "#478F9D",
  [EXPENSE_CATEGORIES.housing]: "#D97757",
  [EXPENSE_CATEGORIES.utilities]: "#E5A04B",
  [EXPENSE_CATEGORIES.groceries]: "#A6A64C",
  [EXPENSE_CATEGORIES.transportation]: "#D18B45",
  [EXPENSE_CATEGORIES.insurance]: "#8B83B5",
  [EXPENSE_CATEGORIES.personalCare]: "#C77991",
  [EXPENSE_CATEGORIES.debtPayments]: "#C45D62",
  [EXPENSE_CATEGORIES.shopping]: "#D49A78",
  [EXPENSE_CATEGORIES.entertainment]: "#A878A8",
  [EXPENSE_CATEGORIES.subscriptions]: "#7D91A8",
  [EXPENSE_CATEGORIES.education]: "#6C9B79",
  [EXPENSE_CATEGORIES.other]: "#8B8F9C",
};

const incomeColors: Record<string, string> = {
  [INCOME_CATEGORIES.salary]: "#258A72",
  [INCOME_CATEGORIES.selfEmployment]: "#36A58C",
  [INCOME_CATEGORIES.business]: "#4A9D91",
  [INCOME_CATEGORIES.investments]: "#547FA5",
  [INCOME_CATEGORIES.property]: "#668FBD",
  [INCOME_CATEGORIES.benefits]: "#78A66B",
  [INCOME_CATEGORIES.gifts]: "#A18AB8",
  [INCOME_CATEGORIES.other]: "#8B8F9C",
};

export const DonutChart = ({
  data,
  type,
}: {
  data: EditableBudgetItem[];
  type: "income" | "expenses";
}) => {
  const categoryColors = type === "income" ? incomeColors : expenseColors;
  const defaultCategory =
    type === "income" ? INCOME_CATEGORIES.other : EXPENSE_CATEGORIES.other;

  const chartData = data.map((item) => {
    const category = item.category ?? defaultCategory;
    const amount = Number(item.amount);

    return {
      label: category,
      value: Number.isFinite(amount) ? amount : 0,
      color: categoryColors[category] ?? "#8B8F9C",
    };
  });

  return (
    <PieChart
      series={[
        {
          innerRadius: 50,
          outerRadius: 100,
          data: chartData,
        },
      ]}
      slots={{
        pieArcLabel: () => null,
      }}
      {...settings}
    />
  );
};
