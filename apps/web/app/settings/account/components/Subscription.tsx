"use client";

import { useState } from "react";
import { Alert, Button, Divider, Paper, Typography } from "@mui/material";
import { useUpgradeDialog } from "@/app/components/Billing/useUpgradeDialog";
import type { UserSubscription } from "@/app/lib/billing/subscription";

type SubscriptionProps = {
  subscription: UserSubscription | null;
};

const manageableStatuses = ["active", "trialing", "past_due", "unpaid"];

export const Subscription = ({ subscription }: SubscriptionProps) => {
  const { openUpgradeDialog } = useUpgradeDialog();

  const [isManaging, setIsManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageSubscription =
    subscription !== null && manageableStatuses.includes(subscription.status);

  const hasPremiumAccess =
    subscription?.status === "active" || subscription?.status === "trialing";

  const handleManageSubscription = async () => {
    setIsManaging(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(
          data.error || "Could not open subscription management.",
        );
      }

      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");

      setIsManaging(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;

    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const periodEnd = formatDate(subscription?.currentPeriodEnd ?? null);

  const isCancellationScheduled =
    subscription !== null &&
    (subscription.cancelAtPeriodEnd || subscription.cancelAt !== null);

  const cancellationDate = formatDate(
    subscription?.cancelAt ?? subscription?.currentPeriodEnd ?? null,
  );

  return (
    <Paper sx={{ width: "100%", padding: 2 }} square={false} elevation={4}>
      <Typography variant="h5" sx={{ my: "20px" }}>
        Plan
      </Typography>

      <Divider sx={{ my: "20px" }} />

      <Typography variant="h4" sx={{ mb: "15px", fontSize: "30px" }}>
        {hasPremiumAccess
          ? "Budget Month Pro"
          : subscription?.status === "past_due" ||
              subscription?.status === "unpaid"
            ? "Payment Issue"
            : "Budget Month Free"}
      </Typography>

      {hasPremiumAccess ? (
        <>
          <Typography sx={{ mb: 1 }}>
            You have access to all of Budget Month's premium features.
          </Typography>

          {isCancellationScheduled && cancellationDate && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your subscription is scheduled to end on {cancellationDate}. You
              retain access until then.
            </Alert>
          )}

          {!isCancellationScheduled && periodEnd && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Next billing date: {periodEnd}
            </Typography>
          )}
        </>
      ) : canManageSubscription ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          There is an issue with your subscription. Visit billing management to
          review your payment details.
        </Alert>
      ) : (
        <Typography sx={{ mb: 2 }}>
          Upgrade to access all of Budget Month's premium features.
        </Typography>
      )}

      {canManageSubscription ? (
        <Button
          variant="contained"
          onClick={handleManageSubscription}
          disabled={isManaging}
          sx={{ mb: "30px" }}
        >
          {isManaging ? "Opening..." : "Manage Subscription"}
        </Button>
      ) : (
        <Button
          variant="contained"
          onClick={openUpgradeDialog}
          sx={{ mb: "30px" }}
        >
          Upgrade
        </Button>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};
