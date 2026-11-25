import { BarChart } from "@mui/x-charts/BarChart";

export const SummaryChart = ({
  incomeTotal,
  expenseTotal,
  isSmall,
}: {
  incomeTotal: number;
  expenseTotal: number;
  isSmall: boolean;
}) => {
  const isSurplus = incomeTotal > expenseTotal;
  const isDeficit = incomeTotal < expenseTotal;

  return (
    <BarChart
      desc="Income and expenses summary"
      layout={isSmall ? "vertical" : "horizontal"}
      xAxis={[{ min: 0, max: isSurplus ? incomeTotal : expenseTotal }]}
      yAxis={[{ scaleType: "band", data: [""] }]}
      series={[
        {
          data: [isSurplus ? expenseTotal : incomeTotal],
          stack: "total",
          label: "Expenses",
          color: "#64748B",
        },
        {
          data: [Math.abs(incomeTotal - expenseTotal)],
          stack: "total",
          label: isSurplus ? "Surplus" : isDeficit ? "Deficit" : "Balance",
          color: isSurplus ? "#269B83" : isDeficit ? "#C45D62" : "#E5A04B",
        },
      ]}
      height={120}
      hideLegend={false}
    />
  );
};
