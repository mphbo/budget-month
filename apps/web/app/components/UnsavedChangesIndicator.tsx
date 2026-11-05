"use client";

import CircleIcon from "@mui/icons-material/Circle";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

export const UnsavedChangesIndicator = ({ label }: { label: string }) => (
  <Tooltip enterTouchDelay={0} leaveTouchDelay={3000} title={label}>
    <Box
      aria-label={label}
      component="span"
      role="status"
      sx={{
        alignItems: "center",
        color: "warning.main",
        display: "inline-flex",
      }}
    >
      <CircleIcon fontSize="small" />
    </Box>
  </Tooltip>
);
