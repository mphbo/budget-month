"use client";
import { useUpgradeDialog } from "@/app/components/Billing/useUpgradeDialog";
import { Box, Typography } from "@mui/material";
import AddLinkIcon from "@mui/icons-material/AddLink";
import RefreshIcon from "@mui/icons-material/Refresh";
import Button from "@mui/material/Button";
import type {
  LinkedAccountBalance,
  LinkedInstitution,
} from "@/app/lib/linked-institution-types";

import { Dispatch, SetStateAction, useState } from "react";

export const ConnectInstitutionButtons = ({
  institutions,
  refreshInstitution,
  canLinkInstitutions,
  setMessage,
  isBusy,
  startLink,
  isConnecting,
}: {
  institutions: LinkedInstitution[];
  refreshInstitution: (insitutionId: string) => Promise<boolean>;
  canLinkInstitutions: boolean;
  setMessage: Dispatch<SetStateAction<string | null>>;
  isBusy: boolean;
  startLink: (institutionId?: string | undefined) => Promise<void>;
  isConnecting: boolean;
}) => {
  const { openUpgradeDialog } = useUpgradeDialog();

  const refreshAll = async () => {
    for (const institution of institutions) {
      if (!(await refreshInstitution(institution.id))) {
        return;
      }
    }
    if (institutions.length > 1) {
      setMessage("All balances updated.");
    }
  };

  return (
    <div>
      <Box
        sx={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5">Connected institutions</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {canLinkInstitutions && institutions.length > 0 && (
            <Button
              disabled={isBusy}
              onClick={() => void refreshAll()}
              startIcon={<RefreshIcon />}
              variant="outlined"
            >
              Refresh balances
            </Button>
          )}
          <Button
            disabled={isBusy}
            onClick={() => void startLink()}
            startIcon={<AddLinkIcon />}
            variant="contained"
          >
            {isConnecting ? "Connecting..." : "Connect institution"}
          </Button>
        </Box>
        <Button variant="contained" color="primary" onClick={openUpgradeDialog}>
          Upgrade to Pro
        </Button>
      </Box>
    </div>
  );
};
