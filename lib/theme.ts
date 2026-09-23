import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

// The only file where raw colour values live. See docs/DESIGN.md §2.

// prettier-ignore
const tile: MantineColorsTuple = ["#e6f3ef", "#cfe8e0", "#a9d5c9", "#7fc0b0", "#59ab98", "#3b9683", "#146c60", "#0f5a50", "#0b4940", "#073a33"];
// prettier-ignore
const saffron: MantineColorsTuple = ["#fdf5e3", "#fae8c2", "#f5d58f", "#efc05a", "#e9ae36", "#e0a02c", "#d99a2b", "#b57f1e", "#906416", "#6f4c0f"];
// prettier-ignore
const clay: MantineColorsTuple = ["#fbeae7", "#f5cfc8", "#eba99d", "#df8272", "#d3624e", "#ca4f3d", "#c44536", "#a33729", "#832b20", "#661f17"];
// prettier-ignore
const lapis: MantineColorsTuple = ["#e9eefb", "#d0dbf6", "#a9bdee", "#7f9ce4", "#5c7fdb", "#4467cd", "#2b4fb4", "#22409a", "#1a337d", "#132862"];
// prettier-ignore
const plum: MantineColorsTuple = ["#f2ebf6", "#e2d4ea", "#c9b0d8", "#ae8ac5", "#966ab3", "#865aa5", "#7b4b94", "#66397f", "#532d69", "#412154"];

export const theme = createTheme({
  primaryColor: "tile",
  colors: { tile, saffron, clay, lapis, plum },
  black: "#14282c",
  fontFamily: "var(--font-figtree), system-ui, sans-serif",
  headings: {
    fontFamily: "var(--font-bricolage), var(--font-figtree), system-ui, sans-serif",
    fontWeight: "700",
    textWrap: "balance",
    sizes: {
      h1: { fontSize: "2rem", fontWeight: "800", lineHeight: "1.2" },
      h2: { fontSize: "1.5rem", fontWeight: "800", lineHeight: "1.25" },
      h3: { fontSize: "1.2rem", fontWeight: "700", lineHeight: "1.3" },
      h4: { fontSize: "1rem", fontWeight: "700", lineHeight: "1.4" },
    },
  },
  defaultRadius: "md",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg", padding: "lg" } },
    Badge: { defaultProps: { variant: "light", radius: "md", tt: "none" } },
    Modal: { defaultProps: { radius: "lg" } },
    SegmentedControl: { defaultProps: { radius: "xl" } },
    // Staff tables are dense (DESIGN §4.5): compact rows, small type, no stripes — the row
    // under the pointer is what should stand out, so the hover tint carries the emphasis.
    Table: {
      defaultProps: { verticalSpacing: "xs", fz: "sm", highlightOnHover: true },
    },
    // The description sits under the input so paired fields keep their inputs level.
    InputWrapper: {
      defaultProps: { inputWrapperOrder: ["label", "input", "description", "error"] },
    },
  },
});

const palette = { tile, saffron, clay, lapis, plum };

function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// In dark mode Mantine's `light` variant is the colour's darkest shade, darkened again —
// a near-black block that reads as disabled. Ours is the colour's shade 4 laid over the
// surface at 18% (28% on hover) with shade-2 text (DESIGN §4.1), for every palette colour.
const darkLightVariants = Object.fromEntries(
  Object.entries(palette).flatMap(([name, shades]) => [
    [`--mantine-color-${name}-light`, alpha(shades[4], 0.18)],
    [`--mantine-color-${name}-light-hover`, alpha(shades[4], 0.28)],
    [`--mantine-color-${name}-light-color`, shades[2]],
  ]),
);

// App-level variables Mantine has no token for: the page ground behind surfaces,
// and the stat-tile number size. Referenced from CSS modules as var(--app-*).
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: { "--app-font-size-stat": "2.25rem" },
  light: { "--app-ground": "#f4f8f6" },
  dark: { "--app-ground": "var(--mantine-color-dark-8)", ...darkLightVariants },
});
