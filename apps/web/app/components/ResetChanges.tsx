import RestartAltIcon from "@mui/icons-material/RestartAlt";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export const ResetChanges = ({
  onReset,
  disabled,
}: {
  onReset: () => void;
  disabled: boolean;
}) => (
  <Tooltip title="Reset unsaved changes">
    <span>
      <IconButton
        aria-label="Reset unsaved changes"
        disabled={disabled}
        onClick={onReset}
      >
        <RestartAltIcon />
      </IconButton>
    </span>
  </Tooltip>
);
