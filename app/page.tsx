import { Box, Container, Typography } from "@mui/material";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountList } from "./components/AccountList";
import { EquityHistoryChart } from "./components/EquityHistoryChart";
import { MonthList } from "./components/MonthList";
import {
  getAccounts,
  getEquityHistory,
  getMonthNavigationData,
} from "./lib/budgets";
import styles from "./page.module.css";

const Home = () => {
  return (
    <Suspense fallback={<p>Loading months...</p>}>
      <HomeContent />
    </Suspense>
  );
};

const HomeContent = async () => {
  await connection();

  const [
    { months, nextMonth, previousMonth, deletableMonths },
    accounts,
    equityHistory,
  ] = await Promise.all([
    getMonthNavigationData(),
    getAccounts(),
    getEquityHistory(),
  ]);

  return (
    <div className={styles.page}>
      <Container sx={{ backgroundColor: "#23272f" }}>
        <main className={styles.main}>
          <Typography variant="h2" sx={{ mb: 3.5 }}>
            Budget Month
          </Typography>
          <Typography sx={{ mb: 8 }}>
            Here is an overview of your finances, add/review accounts here or
            jump into one of your monthly budgets.
          </Typography>
          <EquityHistoryChart accounts={accounts} points={equityHistory} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "40px",
              marginTop: "40px",
              flexWrap: { xs: "wrap", lg: "nowrap" },
            }}
          >
            <AccountList accounts={accounts} />
            <MonthList
              initialMonths={months}
              initialNextMonth={nextMonth}
              initialPreviousMonth={previousMonth}
              initialDeletableMonths={deletableMonths}
            />
          </Box>
        </main>
      </Container>
    </div>
  );
};

export default Home;
