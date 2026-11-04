import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    fontFamily: "var(--font-science-gothic), Arial, sans-serif",
    allVariants: {
      color: "white",
    },
  },
  components: {
    // Name of the component
    MuiButtonBase: {
      defaultProps: {
        // The props to change the default for.
      },
    },
  },
});
