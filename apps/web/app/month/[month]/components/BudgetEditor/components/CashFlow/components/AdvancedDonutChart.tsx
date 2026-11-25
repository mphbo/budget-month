import { PieChart, pieClasses } from "@mui/x-charts/PieChart";
import type { EditableBudgetItem } from "../../DataTable";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/app/lib/account-types";

const settings = {
  margin: { right: 5, left: 5, top: 5, bottom: 5 },
  width: 300,
  height: 300,
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

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const AdvancedDonutChart = ({
  data,
  type,
}: {
  data: EditableBudgetItem[];
  type: "income" | "expenses";
}) => {
  const categoryColors = type === "income" ? incomeColors : expenseColors;

  const defaultCategory =
    type === "income" ? INCOME_CATEGORIES.other : EXPENSE_CATEGORIES.other;

  // Group budget items by category.
  const groupedData = data.reduce<Record<string, EditableBudgetItem[]>>(
    (groups, item) => {
      const category = item.category ?? defaultCategory;

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(item);

      return groups;
    },
    {},
  );

  // Calculate total for each category.
  const categoryData = Object.entries(groupedData).map(([category, items]) => ({
    id: category,
    label: category,
    value: items.reduce((total, item) => total + (Number(item.amount) || 0), 0),
    color: categoryColors[category] ?? "#8B8F9C",
  }));

  // Individual items, using their category colour with varying opacity.
  const hasMultipleItems = Object.values(groupedData).some(
    (items) => items.length > 1,
  );

  const itemData = hasMultipleItems
    ? Object.entries(groupedData).flatMap(([category, items]) => {
        const baseColor = categoryColors[category] ?? "#8B8F9C";

        return items.map((item, index) => ({
          id: `${category}-${index}`,
          label: item.item,
          value: Number(item.amount) || 0,
          color: hexToRgba(baseColor, 0.45 + (index % 3) * 0.2),
        }));
      })
    : [];

  return (
    <PieChart
      {...settings}
      series={[
        {
          innerRadius: 45,
          outerRadius: 90,
          data: categoryData,
          highlightScope: {
            fade: "global",
            highlight: "item",
          },
          highlighted: {
            additionalRadius: 3,
          },
          cornerRadius: 3,
          paddingAngle: 1,
        },
        {
          innerRadius: 94,
          outerRadius: 135,
          data: itemData,
          highlightScope: {
            fade: "global",
            highlight: "item",
          },
          highlighted: {
            additionalRadius: 3,
          },
          cornerRadius: 3,
          paddingAngle: 1,
          valueFormatter: ({ value }) => `${value.toLocaleString()}`,
        },
      ]}
      sx={{
        [`& .${pieClasses.arcLabel}`]: {
          fontSize: 11,
        },
      }}
    />
  );
};
