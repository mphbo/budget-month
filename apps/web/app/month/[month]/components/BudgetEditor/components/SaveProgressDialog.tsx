import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { SaveStep } from "../types";

export const SaveProgressDialog = ({
  open,
  onClose,
  isSaving,
  saveSteps,
}: {
  open: boolean;
  onClose: () => void;
  isSaving: boolean;
  saveSteps: SaveStep[];
}) => (
  <Dialog
    aria-labelledby="save-progress-title"
    onClose={() => !isSaving && onClose()}
    open={open}
  >
    <DialogTitle id="save-progress-title">Saving month changes</DialogTitle>
    <DialogContent>
      <List>
        {saveSteps.map((step) => (
          <ListItem key={step.id}>
            <ListItemIcon>
              {step.status === "active" ? (
                <CircularProgress size={22} />
              ) : step.status === "complete" ? (
                <CheckCircleIcon color="success" />
              ) : step.status === "error" ? (
                <ErrorIcon color="error" />
              ) : null}
            </ListItemIcon>
            <ListItemText
              primary={step.label}
              secondary={
                step.error ??
                (step.status === "pending"
                  ? "Waiting"
                  : step.status === "active"
                    ? "In progress"
                    : step.status === "complete"
                      ? "Complete"
                      : undefined)
              }
            />
          </ListItem>
        ))}
      </List>
    </DialogContent>
    {!isSaving && (
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    )}
  </Dialog>
);
