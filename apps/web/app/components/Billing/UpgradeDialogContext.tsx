"use client";

import { createContext } from "react";

interface UpgradeDialogContextValue {
  openUpgradeDialog: () => void;
  closeUpgradeDialog: () => void;
}

export const UpgradeDialogContext =
  createContext<UpgradeDialogContextValue | null>(null);
