"use client";

import { ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { theme } from "./muiTheme";

export default function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
