"use client";

import { Box, Divider, Paper, Typography } from "@mui/material";
import { UpdatePasswordForm } from "./components/PasswordForm";
import { NameEmailForm } from "./components/NameEmailForm";

type ProfileProps = {
  fullName: string;
  email: string;
};

export const Profile = ({ fullName, email }: ProfileProps) => {
  const nameLength = fullName.trim().length;

  const tileWidth = nameLength <= 9 ? 100 : nameLength <= 15 ? 130 : 160;

  const tileFontSize =
    nameLength <= 9 ? "1.25rem" : nameLength <= 15 ? "1.1rem" : "1rem";

  return (
    <Paper
      sx={{ width: "100%", padding: 2, mb: "20px" }}
      square={false}
      elevation={4}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <Paper
          sx={{
            width: `${tileWidth}px`,
            minWidth: "100px",
            height: "100px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 1,
            boxSizing: "border-box",
            borderRadius: "8px",
            border: "0.1px solid #6d6d6d",
            mt: "4px",
            fontSize: tileFontSize,
            lineHeight: 1.2,
            overflowWrap: "anywhere",
            transition: "width 180ms ease, font-size 180ms ease",
          }}
          elevation={10}
          variant="outlined"
        >
          {fullName || "Add name"}
        </Paper>
      </Box>

      <Divider sx={{ my: "20px" }} />

      <NameEmailForm fullName={fullName} email={email} />

      <Divider sx={{ my: "20px" }} />
      <UpdatePasswordForm />
    </Paper>
  );
};
