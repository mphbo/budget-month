import styles from "./page.module.css";
import { Container, Grid, Typography } from "@mui/material";
import Providers from "./providers";
import { DataTable } from "./components/DataTable";

export default function Home() {
  const itemData = {
    income: [
      { item: "Salary", amount: 5350 },
      { item: "Rent", amount: 2400 },
    ],
    expenses: [
      { item: "Rent", amount: 1850 },
      { item: "Groceries", amount: 425.68 },
      { item: "Utilities", amount: 164.23 },
      { item: "Transportation", amount: 120 },
    ],
    equityChange: [
      { item: "Credit", amount: 500 },
      { item: "Student Loan", amount: 300 },
      { item: "Rainy Day", amount: 500 },
    ],
    totalEquity: [
      { item: "Credit", amount: -1200 },
      { item: "Student Loan", amount: -800 },
      { item: "Rainy Day", amount: 1600 },
      { item: "House Value", amount: 350000 },
      { item: "Mortgage", amount: -206656.16 },
    ],
  };
  const getItemData = (section: keyof typeof itemData) => itemData[section];

  return (
    <Providers>
      <div className={styles.page}>
        <Container sx={{ backgroundColor: "#23272f", height: "100vh" }}>
          <main className={styles.main}>
            <Typography variant="h1">Monthly Budget</Typography>
            <Grid container columnSpacing={10} rowSpacing={5}>
              <Grid size={6}>
                <DataTable title="Income" items={getItemData("income")} />
              </Grid>
              <Grid size={6}>
                <DataTable title="Expenses" items={getItemData("expenses")} />
              </Grid>
              <Grid size={6}>
                <DataTable
                  title="Equity Change"
                  items={getItemData("equityChange")}
                />
              </Grid>
              <Grid size={6}>
                <DataTable
                  title="Total Equity"
                  items={getItemData("totalEquity")}
                />
              </Grid>
            </Grid>
          </main>
        </Container>
      </div>
    </Providers>
  );
}
