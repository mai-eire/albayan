import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette { lapis: Palette["primary"]; plum: Palette["primary"]; saffron: Palette["primary"]; clay: Palette["primary"] }
  interface PaletteOptions { lapis?: PaletteOptions["primary"]; plum?: PaletteOptions["primary"]; saffron?: PaletteOptions["primary"]; clay?: PaletteOptions["primary"] }
}
declare module "@mui/material/Chip" { interface ChipPropsColorOverrides { lapis: true; plum: true; saffron: true; clay: true } }
declare module "@mui/material/Button" { interface ButtonPropsColorOverrides { lapis: true; plum: true; saffron: true; clay: true } }
declare module "@mui/material/ToggleButton" { interface ToggleButtonPropsColorOverrides { saffron: true; clay: true } }
declare module "@mui/material/ToggleButtonGroup" { interface ToggleButtonGroupPropsColorOverrides { saffron: true; clay: true } }
declare module "@mui/material/Badge" { interface BadgePropsColorOverrides { saffron: true } }

const display = "'Bricolage Grotesque', Figtree, sans-serif";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#146c60", light: "#dcefe9", dark: "#0b4940", contrastText: "#fff" },
    lapis: { main: "#2b4fb4", light: "#e9eefb", dark: "#1a337d", contrastText: "#fff" },
    plum: { main: "#7b4b94", light: "#f2ebf6", dark: "#532d69", contrastText: "#fff" },
    saffron: { main: "#d99a2b", light: "#fdf5e3", dark: "#906416", contrastText: "#14282c" },
    clay: { main: "#c44536", light: "#fbeae7", dark: "#832b20", contrastText: "#fff" },
    background: { default: "#f4f8f6", paper: "#ffffff" },
    text: { primary: "#14282c", secondary: "#5d6b66" },
    divider: "#dfe8e4",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Figtree, system-ui, sans-serif",
    h1: { fontFamily: display, fontWeight: 800, fontSize: "2rem", letterSpacing: "-0.02em" },
    h2: { fontFamily: display, fontWeight: 800, fontSize: "2.25rem", lineHeight: 1.1 },
    h3: { fontFamily: display, fontWeight: 700, fontSize: "1.2rem" },
    h4: { fontFamily: display, fontWeight: 800, fontSize: "1.1rem" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #dfe8e4", borderRadius: 16 } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: "none", padding: "2px 10px", fontSize: 12, fontWeight: 600 } } },
  },
});
