import { Container, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BudgetEditor } from "../../components/BudgetEditor";
import {
  getMonthBudget,
  isCurrentMonth,
  isFutureMonth,
} from "../../lib/budgets";
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
      <Container sx={{ backgroundColor: "#23272f" }}>
        <main className={styles.main}>
          <Typography variant="h2" sx={{ mb: 2 }}>
            {budget.name}
          </Typography>
          <Typography sx={{ mb: 5 }}>
            Fill out and edit your budget for {budget.name}.
          </Typography>
          <BudgetEditor
            key={month}
            monthSlug={month}
            budget={budget}
            isCurrentMonth={isCurrentMonth(month)}
            isFutureMonth={isFutureMonth(month)}
          />
        </main>
      </Container>
    </div>
  );
};

export default MonthPage;
