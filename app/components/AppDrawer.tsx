"use client";

import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "../actions/auth";
import type { MonthOption } from "../lib/month-types";
import styles from "./AppDrawer.module.css";

export const AppDrawer = ({ months }: { months: MonthOption[] }) => {
  const [open, setOpen] = useState(false);

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
      <Drawer anchor="left" onClose={() => setOpen(false)} open={open}>
        <Box sx={{ width: 280 }} role="presentation">
          <List>
            <ListItemButton
              component={Link}
              href="/"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="Home" />
            </ListItemButton>
            <Divider />
            {months.length === 0 ? (
              <ListItem>
                <ListItemText primary="No months yet" />
              </ListItem>
            ) : (
              months.map((month) => (
                <ListItemButton
                  component={Link}
                  href={`/month/${month.slug}`}
                  key={month.slug}
                  onClick={() => setOpen(false)}
                >
                  <ListItemText primary={month.name} />
                </ListItemButton>
              ))
            )}
            <Divider />
            <Box component="form" action={signOut} sx={{ p: 2 }}>
              <Button fullWidth type="submit" variant="outlined">
                Sign out
              </Button>
            </Box>
          </List>
        </Box>
      </Drawer>
    </>
  );
};
