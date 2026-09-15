import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Ten-shade tuples; index 6 is the "primary shade" Mantine uses for filled variants.
const tile: MantineColorsTuple = ["#e6f3ef","#cfe8e0","#a9d5c9","#7fc0b0","#59ab98","#3b9683","#146c60","#0f5a50","#0b4940","#073a33"];
const lapis: MantineColorsTuple = ["#e9eefb","#d0dbf6","#a9bdee","#7f9ce4","#5c7fdb","#4467cd","#2b4fb4","#22409a","#1a337d","#132862"];
const plum: MantineColorsTuple = ["#f2ebf6","#e2d4ea","#c9b0d8","#ae8ac5","#966ab3","#865aa5","#7b4b94","#66397f","#532d69","#412154"];
const saffron: MantineColorsTuple = ["#fdf5e3","#fae8c2","#f5d58f","#efc05a","#e9ae36","#e0a02c","#d99a2b","#b57f1e","#906416","#6f4c0f"];
const clay: MantineColorsTuple = ["#fbeae7","#f5cfc8","#eba99d","#df8272","#d3624e","#ca4f3d","#c44536","#a33729","#832b20","#661f17"];

export const theme = createTheme({
  primaryColor: "tile",
  colors: { tile, lapis, plum, saffron, clay },
  fontFamily: "Figtree, system-ui, sans-serif",
  headings: { fontFamily: "'Bricolage Grotesque', Figtree, sans-serif", fontWeight: "700" },
  defaultRadius: "md",
  black: "#14282c",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg", padding: "lg" } },
    Badge: { defaultProps: { radius: "sm" } },
  },
});
