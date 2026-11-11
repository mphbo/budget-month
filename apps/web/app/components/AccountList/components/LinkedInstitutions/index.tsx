"use client";

import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddLinkIcon from "@mui/icons-material/AddLink";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { Account } from "../../../../lib/account-types";
import { getApiErrorMessage, readApiJson } from "../../../../lib/api-response";
import type {
  LinkedAccountBalance,
  LinkedInstitution,
} from "../../../../lib/linked-institution-types";
import { DisconnectInstitutionDialog } from "./components/DisconnectInstitutionDialog";

type LinkSession =
  | { mode: "connect"; token: string }
  | { mode: "reconnect"; token: string; institutionId: string };

const lastSyncedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const describeInstitution = (institution: LinkedInstitution) => {
  if (institution.status === "login_required") {
    return "Login expired — reconnect to update balances";
  }
  if (institution.status === "error") {
    return "Last update failed — try refreshing";
  }
  return institution.lastSyncedAt
    ? `Updated ${lastSyncedFormatter.format(new Date(institution.lastSyncedAt))}`
    : "Not updated yet";
};

export const LinkedInstitutions = ({
  disabled,
  institutions,
  onInstitutionsChange,
  onAccountsLinked,
  onBalancesRefreshed,
  onUnlinked,
}: {
  disabled: boolean;
  institutions: LinkedInstitution[];
  onInstitutionsChange: (
    update: (current: LinkedInstitution[]) => LinkedInstitution[],
  ) => void;
  onAccountsLinked: (accounts: Account[]) => void;
  onBalancesRefreshed: (balances: LinkedAccountBalance[]) => void;
  onUnlinked: (institutionId: string) => void;
}) => {
  const [linkSession, setLinkSession] = useState<LinkSession | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedInstitution | null>(
    null,
  );
  const isBusy = disabled || isConnecting || busyId !== null;

  const upsertInstitution = (institution: LinkedInstitution) =>
    onInstitutionsChange((current) =>
      current.some((entry) => entry.id === institution.id)
        ? current.map((entry) =>
            entry.id === institution.id ? institution : entry,
          )
        : [...current, institution],
    );

  const setInstitutionStatus = (
    institutionId: string,
    status: LinkedInstitution["status"],
  ) =>
    onInstitutionsChange((current) =>
      current.map((entry) =>
        entry.id === institutionId ? { ...entry, status } : entry,
      ),
    );

  const startLink = async (institutionId?: string) => {
    setIsConnecting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/plaid/link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(institutionId ? { institutionId } : {}),
      });
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Could not start connecting"),
        );
      }

      const { linkToken } = await readApiJson<{ linkToken: string }>(
        response,
        "Could not start connecting",
      );
      setLinkSession(
        institutionId
          ? { mode: "reconnect", token: linkToken, institutionId }
          : { mode: "connect", token: linkToken },
      );
    } catch (linkError) {
      setError(
        linkError instanceof Error
          ? linkError.message
          : "Could not start connecting.",
      );
      setIsConnecting(false);
    }
  };

  const refreshInstitution = async (institutionId: string) => {
    setBusyId(institutionId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/plaid/institutions/${institutionId}/refresh`,
        { method: "POST" },
      );
      if (!response.ok) {
        const body = await response
          .clone()
          .json()
          .catch(() => null);
        if (body?.code === "LOGIN_REQUIRED") {
          setInstitutionStatus(institutionId, "login_required");
        }
        throw new Error(
          await getApiErrorMessage(response, "Could not refresh balances"),
        );
      }

      const result = await readApiJson<{
        institution: LinkedInstitution;
        balances: LinkedAccountBalance[];
      }>(response, "Could not refresh balances");
      upsertInstitution(result.institution);
      onBalancesRefreshed(result.balances);
      setMessage(`${result.institution.institutionName} balances updated.`);
      return true;
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh balances.",
      );
      return false;
    } finally {
      setBusyId(null);
    }
  };

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

  const completeLink = async (publicToken: string, session: LinkSession) => {
    if (session.mode === "reconnect") {
      await refreshInstitution(session.institutionId);
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch("/api/plaid/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
      });
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Could not connect"),
        );
      }

      const result = await readApiJson<{
        institution: LinkedInstitution;
        accounts: Account[];
      }>(response, "Could not connect");
      upsertInstitution(result.institution);
      onAccountsLinked(result.accounts);
      setMessage(
        `Connected ${result.institution.institutionName} (${result.accounts.length} account${result.accounts.length === 1 ? "" : "s"}).`,
      );
    } catch (linkError) {
      setError(
        linkError instanceof Error ? linkError.message : "Could not connect.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkSession?.token ?? null,
    onSuccess: (publicToken) => {
      const session = linkSession;
      setLinkSession(null);
      setIsConnecting(false);
      if (session && publicToken) {
        void completeLink(publicToken, session);
      }
    },
    onExit: (exitError) => {
      setLinkSession(null);
      setIsConnecting(false);
      if (exitError) {
        setError(
          exitError.display_message ||
            "The connection was not completed. Please try again.",
        );
      }
    },
  });

  useEffect(() => {
    if (linkSession && ready) {
      open();
    }
  }, [linkSession, ready, open]);

  return (
    <Stack spacing={2}>
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
          {institutions.length > 0 && (
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
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {institutions.length === 0 ? (
        <Typography color="text.secondary">
          Sign in to your bank or other financial institution to keep account
          balances up to date automatically.
        </Typography>
      ) : (
        <List disablePadding>
          {institutions.map((institution) => (
            <ListItem
              disablePadding
              key={institution.id}
              secondaryAction={
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {institution.status === "login_required" ? (
                    <Button
                      disabled={isBusy}
                      onClick={() => void startLink(institution.id)}
                      size="small"
                      variant="outlined"
                    >
                      Reconnect
                    </Button>
                  ) : (
                    <Tooltip title={`Refresh ${institution.institutionName}`}>
                      <span>
                        <IconButton
                          aria-label={`Refresh ${institution.institutionName}`}
                          disabled={isBusy}
                          onClick={() =>
                            void refreshInstitution(institution.id)
                          }
                        >
                          <RefreshIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip title={`Disconnect ${institution.institutionName}`}>
                    <span>
                      <IconButton
                        aria-label={`Disconnect ${institution.institutionName}`}
                        disabled={isBusy}
                        onClick={() => setUnlinkTarget(institution)}
                      >
                        <LinkOffIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              }
              sx={{ py: 1, pr: 12 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <AccountBalanceIcon />
              </ListItemIcon>
              <ListItemText
                primary={institution.institutionName}
                secondary={
                  <span suppressHydrationWarning>
                    {describeInstitution(institution)}
                  </span>
                }
                slotProps={{
                  secondary: {
                    color:
                      institution.status === "active"
                        ? "text.secondary"
                        : "warning.main",
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
      <DisconnectInstitutionDialog
        unlinkTarget={unlinkTarget}
        setUnlinkTarget={setUnlinkTarget}
        busyId={busyId}
        setBusyId={setBusyId}
        onInstitutionsChange={onInstitutionsChange}
        onUnlinked={onUnlinked}
        setError={setError}
        setMessage={setMessage}
        getApiErrorMessage={getApiErrorMessage}
      />
    </Stack>
  );
};
