"use client";

import { ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { theme } from "./muiTheme";
import { UpgradeDialogProvider } from "./components/Billing/UpgradeDialogProvider";

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <ThemeProvider theme={theme}>
        <UpgradeDialogProvider>{children}</UpgradeDialogProvider>
      </ThemeProvider>
    </>
  );
};

export default Providers;
