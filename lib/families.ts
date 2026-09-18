// A family is not a table: it is the guardians who share a child, found by walking
// student_guardians. Split and blended families fall out naturally — a child with a parent
// in each of two households joins those households into one family for the office's
// purposes (one fee conversation, one row in the list).

export type FamilyGuardian<C extends { id: number }> = {
  id: number;
  name: string;
  gender: "male" | "female" | null;
  // Whoever registered first is listed first; the name rule uses that when gender can't.
  isPrimary?: boolean;
  children: C[];
};

export type Family<G extends FamilyGuardian<C>, C extends { id: number }> = {
  // The smallest guardian id in the family: stable across reloads, unique per family.
  key: number;
  // Derived, never stored (decision 2026-09-18): two guardians → "Khan-Ali" (his surname,
  // then hers; the primary contact's first when genders aren't known; "Zayd-Khan" when
  // both surnames match); one guardian → "Layla-Khan"; more than two → the first two.
  name: string;
  guardians: G[];
  children: C[];
};

export function familyName(
  guardians: { name: string; gender: string | null; isPrimary?: boolean }[],
): string {
  const [first, second] = [...guardians].sort(
    (a, b) => rank(a) - rank(b) || Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)),
  );
  if (!first) return "";
  if (!second || surname(first.name) === surname(second.name)) return firstLast(first.name);
  return `${surname(first.name)}-${surname(second.name)}`;
}

const rank = (g: { gender: string | null }) =>
  g.gender === "male" ? 0 : g.gender === "female" ? 2 : 1;

function firstLast(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]}-${parts.at(-1)}` : name;
}

export function groupFamilies<C extends { id: number }, G extends FamilyGuardian<C>>(
  guardians: G[],
): Family<G, C>[] {
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    const p = parent.get(id) ?? id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(Math.max(ra, rb), Math.min(ra, rb));
  };
  const byChild = new Map<number, number>();
  for (const g of guardians) {
    for (const c of g.children) {
      const other = byChild.get(c.id);
      if (other === undefined) byChild.set(c.id, g.id);
      else union(other, g.id);
    }
  }
  const groups = new Map<number, G[]>();
  for (const g of guardians) {
    const root = find(g.id);
    groups.set(root, [...(groups.get(root) ?? []), g]);
  }
  return [...groups.entries()]
    .map(([key, members]) => {
      const children = members
        .flatMap((g) => g.children)
        .filter((c, i, all) => all.findIndex((o) => o.id === c.id) === i);
      return { key, name: familyName(members), guardians: members, children };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.key - b.key);
}

function surname(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}
