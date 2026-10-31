import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PaymentsIcon from "@mui/icons-material/Payments";

export const AccountList = ({
  accounts,
}: {
  accounts: { account: string; amount: number; type: string }[];
}) => {
  const assets = accounts.filter((account) => account.type === "asset");
  const liabilities = accounts.filter(
    (account) => account.type === "liability",
  );
  return (
    <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      <nav aria-label="assets">
        <List>
          {assets.map((account) => (
            <ListItem disablePadding key={account.account}>
              <ListItemButton>
                <ListItemIcon>
                  <AttachMoneyIcon />
                </ListItemIcon>
                <ListItemText primary={account.account} />
                <ListItemText
                  primary={`$${account.amount.toFixed(2)}`}
                  slotProps={{ primary: { align: "right" } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </nav>
      <Divider />
      <nav aria-label="liabilities">
        <List>
          {liabilities.map((account) => (
            <ListItem disablePadding key={account.account}>
              <ListItemButton>
                <ListItemIcon>
                  <PaymentsIcon />
                </ListItemIcon>
                <ListItemText primary={account.account} />
                <ListItemText
                  primary={`$${account.amount.toFixed(2)}`}
                  slotProps={{ primary: { align: "right" } }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </nav>
      <Divider />
      <ListItem disablePadding key="total">
        <ListItemButton>
          <ListItemIcon>
            <AccountBalanceIcon />
          </ListItemIcon>
          <ListItemText primary="Total" />
          <ListItemText
            primary={`$${accounts.reduce((sum, account) => sum + account.amount, 0).toFixed(2)}`}
            slotProps={{ primary: { align: "right" } }}
          />
        </ListItemButton>
      </ListItem>
    </Box>
  );
};
