"use client";

import { useContext } from "react";
import { UpgradeDialogContext } from "./UpgradeDialogContext";

export const useUpgradeDialog = () => {
  const context = useContext(UpgradeDialogContext);

  if (!context) {
    throw new Error(
      "useUpgradeDialog must be used within an UpgradeDialogProvider",
    );
  }

  return context;
};
