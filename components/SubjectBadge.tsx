import { Badge } from "@mantine/core";
import { subjectColor } from "@/lib/subjects";

type Props = {
  subjectId: string;
  name: string;
  size?: "xs" | "sm" | "md";
  // "filled" only on dark backgrounds (§4.2).
  variant?: "light" | "filled";
};

export function SubjectBadge({ subjectId, name, size = "sm", variant = "light" }: Props) {
  return (
    <Badge color={subjectColor(subjectId)} size={size} variant={variant}>
      {name}
    </Badge>
  );
}
