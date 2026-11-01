import { Container, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BudgetEditor } from "../../components/BudgetEditor";
import { getMonthBudget } from "../../lib/budgets";
import styles from "./page.module.css";

const MonthPage = ({ params }: { params: Promise<{ month: string }> }) => {
  return (
    <Suspense fallback={<p>Loading budget...</p>}>
      <MonthBudget params={params} />
    </Suspense>
  );
};

const MonthBudget = async ({
  params,
}: {
  params: Promise<{ month: string }>;
}) => {
  await connection();

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
          <BudgetEditor key={month} monthSlug={month} budget={budget} />
        </main>
      </Container>
    </div>
  );
};

export default MonthPage;
