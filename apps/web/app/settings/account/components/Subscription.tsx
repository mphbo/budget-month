"use client";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import { Edit, Email } from "@mui/icons-material";
import { useUpgradeDialog } from "@/app/components/Billing/useUpgradeDialog";
import { UserSubscription } from "@/app/lib/billing/subscription";

export const Subscription = ({
  subscription,
}: {
  subscription: UserSubscription | null;
}) => {
  const { openUpgradeDialog } = useUpgradeDialog();
  return (
    <Paper sx={{ width: "100%", padding: 2 }} square={false} elevation={4}>
      <Typography variant="h5" sx={{ my: "20px" }}>
        Plan
      </Typography>
      <Divider sx={{ my: "20px" }} />
      <Typography variant="h4" sx={{ mb: "15px", fontSize: "30px" }}>
        {subscription?.status === "active"
          ? "Budget Month Pro"
          : "BudgetMonth Free"}
      </Typography>
      <Typography sx={{ mb: "10px" }}>
        Want access to all of Budget Months features?
      </Typography>
      <Button
        variant="contained"
        sx={{ mb: "30px" }}
        onClick={openUpgradeDialog}
      >
        Upgrade
      </Button>

      <Box sx={{ display: "flex", gap: "20px" }}>
        <Card sx={{ width: "100%" }}>
          <CardContent>
            <Typography variant="h5" component="div">
              Payment Method
            </Typography>
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              Please add a payment method to start your subscription
            </Typography>
            <Typography variant="body2">
              well meaning and kindly.
              <br />
              {'"a benevolent smile"'}
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small">Learn More</Button>
          </CardActions>
        </Card>
        <Card sx={{ width: "100%" }}>
          <CardContent>
            <Typography variant="h5" component="div">
              Billing Details
            </Typography>
            <Typography sx={{ color: "text.secondary", mb: 1.5 }}>
              adjective
            </Typography>
            <Typography variant="body2">
              well meaning and kindly.
              <br />
              {'"a benevolent smile"'}
            </Typography>
          </CardContent>
          <CardActions>
            <Button size="small">Learn More</Button>
          </CardActions>
        </Card>
      </Box>
    </Paper>
  );
};
