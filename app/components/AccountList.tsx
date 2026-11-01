import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PaymentsIcon from "@mui/icons-material/Payments";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

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
    <Box
      sx={{
        width: "100%",
        maxWidth: 360,
        bgcolor: "background.paper",
        height: "100%",
        padding: 2,
      }}
    >
      <Box>
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
        <Divider />
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
        <Divider />
      </Box>
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
