import { ThemeIcon } from "@mantine/core";
import { IconSchool } from "@tabler/icons-react";
import classes from "./SchoolMark.module.css";

// The school's mark: their own logo once they upload one (§2.4), the app's school icon
// until then. Decorative — the school's name is always beside it — so the alt is empty.
export function SchoolMark({
  logo,
  size = 36,
  maxWidth = 180,
}: {
  logo: string | null;
  size?: number;
  // A wordmark is wider than it is tall; this stops one pushing the header about. The
  // sign-in page, where the mark stands on its own line, allows more.
  maxWidth?: number;
}) {
  if (logo) {
    // Not next/image: the source is an API route whose bytes change when the school
    // replaces the file, and there is nothing for the optimiser to do with one small logo.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" height={size} className={classes.logo} style={{ maxWidth }} />;
  }
  return (
    <ThemeIcon size={size} radius="md">
      <IconSchool size={Math.round(size * 0.55)} stroke={1.75} />
    </ThemeIcon>
  );
}
