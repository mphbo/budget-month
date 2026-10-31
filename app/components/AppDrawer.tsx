"use client";

import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import styles from "./AppDrawer.module.css";
import MenuIcon from "@mui/icons-material/Menu";

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
              href="/month/november"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="November" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/december"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="December" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/january"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="January" />
            </ListItemButton>
            <ListItemButton
              component={Link}
              href="/month/february"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="February" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
