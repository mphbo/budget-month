"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Fade,
  TextField,
  Typography,
} from "@mui/material";
import { updateProfile, type ProfileFormState } from "@/app/actions/auth";

type ProfileProps = {
  fullName: string;
  email: string;
};

const timeout = 800;

export const NameEmailForm = ({ fullName, email }: ProfileProps) => {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ProfileFormState>({});

  const router = useRouter();

  const handleEdit = () => {
    setState({});
    setEditing(true);
  };

  const handleCancel = () => {
    setState({});
    setEditing(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending) return;

    setPending(true);
    setState({});

    try {
      const formData = new FormData(event.currentTarget);
      const result = await updateProfile(formData);

      setState(result);

      if (result.success) {
        setEditing(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Profile update failed:", error);

      setState({
        error: "Could not update your profile. Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: "grid", mb: "20px" }}>
        <Fade in={editing} timeout={timeout} mountOnEnter unmountOnExit>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ gridArea: "1 / 1" }}
          >
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  mb: "12px",
                  flexWrap: "wrap",
                  ml: "47px",
                }}
              >
                <Typography variant="h6">Name:</Typography>

                <TextField
                  name="fullName"
                  defaultValue={fullName}
                  required
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  mb: "15px",
                  ml: "51px",
                }}
              >
                <Typography variant="h6">Email:</Typography>

                <TextField
                  name="email"
                  type="email"
                  defaultValue={email}
                  required
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                />
              </Box>
            </Box>

            <ButtonGroup
              sx={{
                ml: "140px",
              }}
            >
              <Button type="submit" disabled={pending} variant="contained">
                {pending ? "Saving..." : "Save Changes"}
              </Button>

              <Button type="button" onClick={handleCancel} disabled={pending}>
                Cancel
              </Button>
            </ButtonGroup>
          </Box>
        </Fade>

        <Fade in={!editing} timeout={timeout} mountOnEnter unmountOnExit>
          <Box sx={{ gridArea: "1 / 1", mt: "3.8px" }}>
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  mb: "20px",
                  flexWrap: "wrap",
                  ml: "47px",
                }}
              >
                <Typography variant="h6">Name:</Typography>
                <Typography variant="h6">
                  {fullName || "Add your name"}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  mb: "20px",
                  ml: "50.8px",
                }}
              >
                <Typography variant="h6">Email:</Typography>
                <Typography variant="h6">{email}</Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                ml: "140px",
              }}
            >
              <Button type="button" onClick={handleEdit} variant="outlined">
                Update
              </Button>
            </Box>
          </Box>
        </Fade>
      </Box>

      <Box>
        {state.error && <Alert severity="error">{state.error}</Alert>}
        {state.success && <Alert severity="success">{state.success}</Alert>}
      </Box>
    </Box>
  );
};
