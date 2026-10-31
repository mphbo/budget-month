import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export const DataTable = ({
  title,
  items,
}: {
  title: string;
  items?: { item: string; amount: number }[];
}) => {
  return (
    <>
      <Typography variant="h4">{title}</Typography>
      <Table aria-label="budget table">
        <TableHead>
          <TableRow>
            <TableCell align="left">Item</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items?.map((item, index) => (
            <TableRow key={index}>
              <TableCell align="left">{item.item}</TableCell>
              <TableCell align="right">${item.amount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell align="left"></TableCell>
            <TableCell align="right">
              ${items?.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
};
