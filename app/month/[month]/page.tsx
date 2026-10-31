import { Container, Grid, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DataTable } from "../../components/DataTable";
import { getAvailableMonths, getMonthBudget } from "../../lib/monthData";
import styles from "./page.module.css";

export function generateStaticParams() {
  return getAvailableMonths().map((month) => ({ month }));
}

export default function MonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  return (
    <Suspense fallback={<p>Loading budget...</p>}>
      <MonthBudget params={params} />
    </Suspense>
  );
}

async function MonthBudget({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const budget = await getMonthBudget(month);

  if (!budget) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Container sx={{ backgroundColor: "#23272f", minHeight: "100vh" }}>
        <main className={styles.main}>
          <Typography variant="h1">{budget.name} Budget</Typography>
          <Grid container columnSpacing={10} rowSpacing={5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <DataTable title="Income" items={budget.income} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DataTable title="Expenses" items={budget.expenses} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DataTable title="Equity Change" items={budget.equityChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DataTable title="Total Equity" items={budget.totalEquity} />
            </Grid>
          </Grid>
        </main>
      </Container>
    </div>
  );
}
