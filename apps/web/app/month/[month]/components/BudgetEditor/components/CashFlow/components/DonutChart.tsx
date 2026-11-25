import { PieChart } from "@mui/x-charts";
import { EditableBudgetItem } from "../../DataTable";
import { EXPENSE_CATEGORIES } from "@/app/lib/account-types";

const settings = {
  margin: { right: 5 },
  width: 200,
  height: 200,
  hideLegend: true,
};

const data = [
  { label: "Group A", value: 400, color: "#0088FE" },
  { label: "Group B", value: 300, color: "#00C49F" },
  { label: "Group C", value: 300, color: "#FFBB28" },
  { label: "Group D", value: 200, color: "#FF8042" },
];

export const DonutChart = ({ data }: { data: EditableBudgetItem[] }) => {
  console.log({ data });
  const dataData = data
    .map((item: EditableBudgetItem) => ({
      ...item,
      category: EXPENSE_CATEGORIES.other,
    }))
    .map((item: EditableBudgetItem) => ({
      label: item.category,
      value: +item.amount,
    }));
  return (
    <PieChart
      series={[
        {
          innerRadius: 50,
          outerRadius: 100,
          data: dataData,
          arcLabel: "value",
        },
      ]}
      {...settings}
    />
  );
};
