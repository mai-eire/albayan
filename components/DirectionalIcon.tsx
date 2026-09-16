import type { Icon, IconProps } from "@tabler/icons-react";
import classes from "./DirectionalIcon.module.css";

// Chevrons and arrows mirror in RTL; every directional icon goes through here.
export function DirectionalIcon({ icon: IconComponent, ...props }: { icon: Icon } & IconProps) {
  return <IconComponent className={classes.icon} stroke={1.75} {...props} />;
}
