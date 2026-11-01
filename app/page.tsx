import { Box, Container, Typography } from "@mui/material";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountList } from "./components/AccountList";
import { MonthList } from "./components/MonthList";
import { getAccounts, getMonthNavigationData } from "./lib/budgets";
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

  const [{ months, nextMonth }, accounts] = await Promise.all([
    getMonthNavigationData(),
    getAccounts(),
  ]);

  return (
    <div className={styles.page}>
      <Container sx={{ backgroundColor: "#23272f", height: "100vh" }}>
        <main className={styles.main}>
          <Typography variant="h2">Budget Month</Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "40px",
              flexWrap: "wrap",
            }}
          >
            <AccountList accounts={accounts} />
            <MonthList initialMonths={months} initialNextMonth={nextMonth} />
          </Box>
        </main>
      </Container>
    </div>
  );
};

export default Home;
