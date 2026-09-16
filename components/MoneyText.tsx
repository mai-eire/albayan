import { Text, type TextProps } from "@mantine/core";
import { formatEuros } from "@/lib/money";
import classes from "./tabular.module.css";

export function MoneyText({ cents, ...props }: { cents: number } & TextProps) {
  return (
    <Text component="span" className={classes.tabular} {...props}>
      {formatEuros(cents)}
    </Text>
  );
}
