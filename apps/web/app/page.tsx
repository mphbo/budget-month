import { Box, Container, Typography } from "@mui/material";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountList } from "./components/AccountList";
import { Loading } from "./components/Loading";
import { MonthList } from "./components/MonthList";
import {
  getAccounts,
  getEquityHistory,
  getMonthNavigationData,
} from "./lib/budgets";
import { getLinkedInstitutionsAccess } from "./lib/linked-institutions";
import styles from "./page.module.css";
import { EquityChangeChart } from "./components/EquityChangeChart";
import { EquityHistoryPoint } from "./lib/month-types";

const allPoints: EquityHistoryPoint[] = [
  {
    month: "November 2025",
    assets: { Cash: 5000, Investments: 12000, Property: 220000 },
    liabilities: { Mortgage: -190000, Credit: -8000 },
  },
  {
    month: "December 2025",
    assets: { Cash: 5000, Investments: 12000, Property: 220000 },
    liabilities: { Mortgage: -190000, Credit: -8000 },
  },
  {
    month: "January 2026",
    assets: { Cash: 5000, Investments: 12000, Property: 220000 },
    liabilities: { Mortgage: -190000, Credit: -8000 },
  },
  {
    month: "February 2026",
    assets: { Cash: 5200, Investments: 12300, Property: 220000 },
    liabilities: { Mortgage: -189500, Credit: -7800 },
  },
  {
    month: "March 2026",
    assets: { Cash: 4800, Investments: 12500, Property: 221000 },
    liabilities: { Mortgage: -189000, Credit: -7500 },
  },
  {
    month: "April 2026",
    assets: { Cash: 5500, Investments: 12800, Property: 221000 },
    liabilities: { Mortgage: -188500, Credit: -7200 },
  },
  {
    month: "May 2026",
    assets: { Cash: 6000, Investments: 13000, Property: 222000 },
    liabilities: { Mortgage: -188000, Credit: -7000 },
  },
  {
    month: "June 2026",
    assets: { Cash: 6200, Investments: 13400, Property: 222000 },
    liabilities: { Mortgage: -187500, Credit: -6800 },
  },
  {
    month: "July 2026",
    assets: { Cash: 6500, Investments: 13800, Property: 223000 },
    liabilities: { Mortgage: -187000, Credit: -6500 },
  },
  {
    month: "August 2026",
    assets: { Cash: 7000, Investments: 14000, Property: 223000 },
    liabilities: { Mortgage: -186500, Credit: -6200 },
  },
  {
    month: "September 2026",
    assets: { Cash: 7200, Investments: 14500, Property: 224000 },
    liabilities: { Mortgage: -186000, Credit: -6000 },
  },
  {
    month: "October 2026",
    assets: { Cash: 7500, Investments: 14800, Property: 224000 },
    liabilities: { Mortgage: -185500, Credit: -5800 },
  },
  {
    month: "November 2026",
    assets: { Cash: 8000, Investments: 15200, Property: 225000 },
    liabilities: { Mortgage: -185000, Credit: -5500 },
  },
  {
    month: "December 2026",
    assets: { Cash: 8500, Investments: 15800, Property: 225000 },
    liabilities: { Mortgage: -184500, Credit: -5000 },
  },
];

const Home = () => {
  return (
    <Suspense fallback={<Loading />}>
      <HomeContent />
    </Suspense>
  );
};

const HomeContent = async () => {
  await connection();

  const [
    { months, currentMonthSlug, nextMonth, previousMonth, deletableMonths },
    accounts,
    equityHistory,
    linkedInstitutionsAccess,
  ] = await Promise.all([
    getMonthNavigationData(),
    getAccounts(),
    getEquityHistory(),
    getLinkedInstitutionsAccess(),
  ]);

  console.log({ equityHistory });

  return (
    <div className={styles.page}>
      <Container sx={{ backgroundColor: "#23272f", p: { xs: "0 0px" } }}>
        <main className={styles.main}>
          <Box sx={{ m: { xs: "0 16px" } }}>
            <Typography variant="h2" sx={{ mb: 3.5 }}>
              Budget Month
            </Typography>
            <Typography sx={{ mb: 8 }}>
              Here is an overview of your finances, add/review accounts here or
              jump into one of your monthly budgets.
            </Typography>
          </Box>
          <EquityChangeChart
            accounts={accounts}
            allPoints={allPoints}
            currentMonth={
              months.find((month) => month.slug === currentMonthSlug) || {
                slug: "",
                name: "",
              }
            }
          />
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              gap: "40px",
              marginTop: "40px",
              flexWrap: { xs: "wrap", lg: "nowrap" },
            }}
          >
            <AccountList
              accounts={accounts}
              canLinkInstitutions={linkedInstitutionsAccess.enabled}
              linkedInstitutions={linkedInstitutionsAccess.institutions}
            />
            <MonthList
              initialMonths={months}
              currentMonthSlug={currentMonthSlug}
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
