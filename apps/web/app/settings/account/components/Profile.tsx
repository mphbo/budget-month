import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";

export const Profile = () => (
  <Paper
    sx={{ width: "100%", padding: 2, mb: "20px" }}
    square={false}
    elevation={4}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
      <Paper
        sx={{
          width: "100px",
          height: "100px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "8px",
          border: "0.1px solid #6d6d6d",
          mt: "4px",
        }}
        elevation={10}
        variant="outlined"
      >
        Logan
      </Paper>
    </Box>
    <Divider sx={{ my: "20px " }} />
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            mb: "30px",
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6">Name:</Typography>
          <Typography variant="h6">Logan</Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            mb: "15px",
          }}
        >
          <Typography variant="h6">Email:</Typography>
          <Typography variant="h6">me@loganthomas.ca</Typography>
        </Box>
      </Box>
      <IconButton
        sx={{
          border: "0.1px solid #6d6d6d",
          borderRadius: "5px",
          width: "40px",
          height: "40px",
          alignSelf: "flex-start",
        }}
      >
        <Edit fontSize="small" />
      </IconButton>
    </Box>
  </Paper>
);
