import { Badge } from "@mantine/core";

// Every status → colour mapping in the app lives here (docs/DESIGN.md §2.1).
const statuses = {
  attendance: {
    present: ["tile", "Present"],
    late: ["saffron", "Late"],
    absent: ["clay", "Absent"],
    excused: ["gray", "Excused"],
  },
  fee: {
    paid: ["tile", "Paid"],
    part_paid: ["saffron", "Part paid"],
    unpaid: ["clay", "Unpaid"],
    waived: ["gray", "Waived"],
  },
  application: {
    applied: ["saffron", "Applied"],
    active: ["tile", "Active"],
    declined: ["clay", "Declined"],
    inactive: ["gray", "Inactive"],
  },
  // Anything that can be switched off: subjects, teachers, sessions.
  record: {
    active: ["tile", "Active"],
    inactive: ["gray", "Inactive"],
  },
  register: {
    taken: ["tile", "Taken"],
    missing: ["saffron", "Not taken"],
  },
  account: {
    active: ["tile", "Active"],
    invited: ["saffron", "Invited"],
    disabled: ["gray", "Disabled"],
  },
  homework: {
    due_later: ["gray", "Due later"],
    due_soon: ["saffron", "Due soon"],
    overdue: ["clay", "Overdue"],
  },
  // Homework and events: a draft is the teacher's alone until published.
  publication: {
    draft: ["saffron", "Draft"],
    published: ["tile", "Published"],
  },
} as const satisfies Record<string, Record<string, readonly [string, string]>>;

type Statuses = typeof statuses;

type Props<D extends keyof Statuses> = {
  domain: D;
  value: keyof Statuses[D];
  size?: "xs" | "sm" | "md";
};

export function StatusBadge<D extends keyof Statuses>({ domain, value, size = "sm" }: Props<D>) {
  const [color, label] = statuses[domain][value] as readonly [string, string];
  return (
    <Badge color={color} size={size}>
      {label}
    </Badge>
  );
}
