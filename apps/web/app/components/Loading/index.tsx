import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import styles from "./Loading.module.css";

export const Loading = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        gap: 2.2,
      }}
    >
      <CircularProgress
        aria-label="Loading…"
        color="secondary"
        size="380px"
        thickness={1.5}
        sx={{ position: "absolute" }}
      />
      <CircularProgress
        aria-label="Loading…"
        color="secondary"
        size="315px"
        thickness={1}
        sx={{ position: "absolute" }}
      />
      <CircularProgress
        aria-label="Loading…"
        color="secondary"
        size="250px"
        thickness={0.5}
        sx={{ position: "absolute" }}
      />
      <p className={styles.logo} style={{ fontSize: "25px", color: "white" }}>
        Budget Month
      </p>
    </Box>
  );
};
