import { LinkedInstitution } from "@/app/lib/linked-institution-types";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

export const DisconnectInstitutionDialog = ({
  unlinkTarget,
  setUnlinkTarget,
  busyId,
  setBusyId,
  setError,
  setMessage,
  getApiErrorMessage,
  onInstitutionsChange,
  onUnlinked,
}: {
  unlinkTarget: LinkedInstitution | null;
  setUnlinkTarget: (institution: LinkedInstitution | null) => void;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
  setError: (error: string | null) => void;
  setMessage: (message: string | null) => void;
  getApiErrorMessage: (
    response: Response,
    defaultMessage: string,
  ) => Promise<string>;
  onInstitutionsChange: (
    updater: (current: LinkedInstitution[]) => LinkedInstitution[],
  ) => void;
  onUnlinked: (id: string) => void;
}) => {
  const unlinkInstitution = async (institution: LinkedInstitution) => {
    setBusyId(institution.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/plaid/institutions/${institution.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Could not disconnect"),
        );
      }

      onInstitutionsChange((current) =>
        current.filter((entry) => entry.id !== institution.id),
      );
      onUnlinked(institution.id);
      setMessage(
        `Disconnected ${institution.institutionName}. Its accounts were kept as manual accounts.`,
      );
    } catch (unlinkError) {
      setError(
        unlinkError instanceof Error
          ? unlinkError.message
          : "Could not disconnect.",
      );
    } finally {
      setBusyId(null);
      setUnlinkTarget(null);
    }
  };

  return (
    <Dialog
      onClose={() => busyId === null && setUnlinkTarget(null)}
      open={unlinkTarget !== null}
    >
      <DialogTitle>Disconnect {unlinkTarget?.institutionName}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Balances will stop updating automatically. The accounts stay on your
          dashboard as manual accounts that you can edit or remove.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={busyId !== null}
          onClick={() => setUnlinkTarget(null)}
        >
          Cancel
        </Button>
        <Button
          color="error"
          disabled={busyId !== null}
          onClick={() => unlinkTarget && void unlinkInstitution(unlinkTarget)}
        >
          {busyId !== null ? "Disconnecting..." : "Disconnect"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
