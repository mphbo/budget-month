"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Radio,
} from "@mui/material";
import { AccountBalance, Sync, TrendingUp } from "@mui/icons-material";

type Plan = "monthly" | "annual";

const listItems = [
  {
    primary: "Connect your financial institutions",
    secondary:
      "Securely link your bank accounts and bring your financial information to Budget Month",
    icon: <AccountBalance sx={{ mr: 3 }} />,
  },
  {
    primary: "Keep your finances up to date",
    secondary:
      "Refresh connected account information without manually entering every transaction",
    icon: <Sync sx={{ mr: 3 }} />,
  },
  {
    primary: "See the bigger picture",
    secondary:
      "Bring your financial accounts together to better understand your spending and budget",
    icon: <TrendingUp sx={{ mr: 3 }} />,
  },
];

export const UpgradeDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [plan, setPlan] = useState<Plan>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleCheckout = async (plan: Plan) => {
    setLoadingPlan(plan);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      if (!data.url) {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" onClose={onClose} open={open}>
      <Paper
        sx={{
          p: { xs: "10px 0", sm: "20px", md: "30px 20px" },
        }}
      >
        <DialogTitle>Upgrade to Budget Month Pro</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexWrap: { xs: "wrap", sm: "nowrap" },
            flexDirection: { xs: "column-reverse", md: "row" },
          }}
        >
          <List
            sx={{
              width: { xs: "100%", md: "40%" },
              display: { xs: "flex", md: "block" },
              justifyContent: "flex-end",
            }}
          >
            <ListItem
              sx={{
                display: "flex",
                alignItems: "center",
                width: "unset",
              }}
              onClick={() => setPlan("monthly")}
            >
              <Radio checked={plan === "monthly"} />
              <ListItemText primary="Monthly" secondary="$4.99 CAD/month" />
            </ListItem>
            <ListItem
              sx={{
                display: "flex",
                alignItems: "center",
                width: "unset",
              }}
              onClick={() => setPlan("annual")}
            >
              <Radio checked={plan === "annual"} />
              <ListItemText primary="Yearly" secondary="$39.99 CAD/month" />
            </ListItem>
          </List>
          <List>
            {listItems.map((listItem) => (
              <ListItem>
                <ListItemIcon>{listItem.icon}</ListItemIcon>
                <ListItemText
                  primary={listItem.primary}
                  secondary={listItem.secondary}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => handleCheckout(plan)} variant="contained">
            Upgrade
          </Button>
        </DialogActions>
      </Paper>
    </Dialog>
  );
};
