"use client";

import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useRouter } from "next/navigation";

export const MonthList = () => {
  const router = useRouter();
  const months = ["November", "December", "January", "February", "March"];

  const handleMonthClick = (month: string) => {
    router.push(`/month/${month.toLowerCase()}`);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      <nav aria-label="assets">
        <List>
          {months.map((month, index) => (
            <Box key={month}>
              <ListItem>
                <ListItemButton onClick={() => handleMonthClick(month)}>
                  <ListItemIcon>
                    <EditCalendarIcon />
                  </ListItemIcon>
                  <ListItemText primary={month} />
                </ListItemButton>
              </ListItem>
              {index < months.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </nav>
    </Box>
  );
};
