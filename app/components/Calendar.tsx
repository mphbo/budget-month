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
            <TableCell>Item</TableCell>
            <TableCell>Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items?.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.item}</TableCell>
              <TableCell>${item.amount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell></TableCell>
            <TableCell>
              ${items?.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
};
