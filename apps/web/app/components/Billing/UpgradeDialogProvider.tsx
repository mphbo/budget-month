// UpgradeDialogProvider.tsx

"use client";

import { useState } from "react";
import { UpgradeDialog } from "./UpgradeDialog";
import { UpgradeDialogContext } from "./UpgradeDialogContext";

export function UpgradeDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <UpgradeDialogContext.Provider
      value={{
        openUpgradeDialog: () => setOpen(true),
        closeUpgradeDialog: () => setOpen(false),
      }}
    >
      {children}
      <UpgradeDialog open={open} onClose={() => setOpen(false)} />
    </UpgradeDialogContext.Provider>
  );
}
