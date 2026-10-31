"use client";

import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import styles from "./AppDrawer.module.css";

export function AppDrawer() {
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
            <ListItemButton
              component={Link}
              href="/month/november-2025"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="November 2025" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/december-2025"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="December 2025" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/january-2026"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="January 2026" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/february-2026"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="February 2026" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/march-2026"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="March 2026" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
