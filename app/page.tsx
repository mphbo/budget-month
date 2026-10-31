import styles from "./page.module.css";
import { Container, Grid, Typography } from "@mui/material";
import Providers from "./providers";
import { AccountList } from "./components/AccountList";

export default function Home() {
  const accounts = [
    { account: "Checking", amount: 300, type: "asset" },
    { account: "Rainy Day", amount: 400, type: "asset" },
    { account: "Credit", amount: -1200, type: "liability" },
    { account: "Student Loan", amount: -1500, type: "liability" },
  ];

  return (
    <Providers>
      <div className={styles.page}>
        <Container sx={{ backgroundColor: "#23272f", height: "100vh" }}>
          <main className={styles.main}>
            <Typography variant="h1">Budget Month</Typography>
            <AccountList accounts={accounts} />
          </main>
        </Container>
      </div>
    </Providers>
  );
}
