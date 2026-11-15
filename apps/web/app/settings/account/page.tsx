import {
  Avatar,
  Box,
  Card,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { UpdatePasswordForm } from "../password/components/UpdatePasswordForm";
import { Edit, Email } from "@mui/icons-material";
import { Profile } from "./components/Profile";
import { Subscription } from "./components/Subscription";

const Account = () => (
  <Container sx={{ py: 8 }}>
    <Typography variant="h4" sx={{ my: "40px" }}>
      Account Settings
    </Typography>
    <Profile />
    <Subscription />
    {/* <Typography>
        Choose a new password with at least 8 characters, one uppercase letter,
        and one symbol.
      </Typography> */}
    {/* <UpdatePasswordForm /> */}
  </Container>
);

export default Account;
