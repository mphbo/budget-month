"use client";

import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import MenuIcon from "@mui/icons-material/Menu";
import TodayIcon from "@mui/icons-material/Today";
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "../actions/auth";
import type { MonthOption } from "../lib/month-types";
import styles from "./AppDrawer.module.css";

export const AppDrawer = ({
  months,
  currentMonthSlug,
}: {
  months: MonthOption[];
  currentMonthSlug: string;
}) => {
  const [open, setOpen] = useState(false);
  const [currentMonthTooltipOpen, setCurrentMonthTooltipOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:600px)");
  const pathname = usePathname();

  return (
    <>
      <Box sx={{ p: 2 }} className={styles.button}>
        <Button
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
          variant="text"
        >
          <MenuIcon />
        </Button>
      </Box>
      <Drawer
        anchor={isMobile ? "right" : "left"}
        onClose={() => setOpen(false)}
        open={open}
      >
        <Box role="presentation">
          <List disablePadding>
            <ListItemButton
              component={Link}
              href="/"
              onClick={() => setOpen(false)}
              sx={{ pt: 2, pb: 2, pl: 4 }}
            >
              <ListItemText
                primary="Budget Month"
                slotProps={{ primary: { sx: { fontSize: "25px" } } }}
              />
            </ListItemButton>
            <Divider />
            {months.length === 0 ? (
              <ListItem>
                <ListItemText primary="No months yet" />
              </ListItem>
            ) : (
              months.map((month) => (
                <Box key={month.slug}>
                  <ListItem
                    sx={{
                      bgcolor:
                        pathname === `/month/${month.slug}`
                          ? "action.selected"
                          : "transparent",
                      color:
                        pathname === `/month/${month.slug}`
                          ? "primary.main"
                          : "inherit",
                      "&:hover": {
                        bgcolor:
                          pathname === `/month/${month.slug}`
                            ? "action.selected"
                            : "action.hover",
                      },
                    }}
                  >
                    <ListItemButton
                      aria-current={
                        pathname === `/month/${month.slug}` ? "page" : undefined
                      }
                      component={Link}
                      href={`/month/${month.slug}`}
                      onClick={() => setOpen(false)}
                      selected={pathname === `/month/${month.slug}`}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        gap: 1.5,
                        color: "inherit",
                        "&:hover": { bgcolor: "transparent" },
                        "&.Mui-selected": { bgcolor: "transparent" },
                        "&.Mui-selected:hover": { bgcolor: "transparent" },
                      }}
                    >
                      <EditCalendarIcon />
                      <ListItemText primary={month.name} />
                    </ListItemButton>
                    <Box
                      sx={{
                        width: 48,
                        flexShrink: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {month.slug === currentMonthSlug && (
                        <Tooltip
                          disableFocusListener
                          disableHoverListener
                          disableTouchListener
                          open={currentMonthTooltipOpen}
                          title="Current calendar month"
                        >
                          <IconButton
                            aria-label="Current calendar month"
                            onBlur={() => setCurrentMonthTooltipOpen(false)}
                            onClick={() =>
                              setCurrentMonthTooltipOpen((isOpen) => !isOpen)
                            }
                            size="small"
                          >
                            <TodayIcon
                              fontSize="small"
                              sx={{ color: "text.secondary" }}
                            />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </ListItem>
                  <Divider />
                </Box>
              ))
            )}
            <Box component="form" action={signOut} sx={{ p: 2, mt: 2 }}>
              <Button fullWidth type="submit" variant="outlined">
                Sign out
              </Button>
            </Box>
            <Button
              fullWidth
              type="submit"
              variant="text"
              onClick={() => setOpen(false)}
              component={Link}
              href="/settings/password"
              sx={{ mt: 0 }}
            >
              Change Password
            </Button>
          </List>
        </Box>
      </Drawer>
    </>
  );
};
