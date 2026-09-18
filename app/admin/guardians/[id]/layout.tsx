import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { baseTab, LinkTabs } from "@/components/LinkTabs";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentYear, listClasses, listSessions } from "@/lib/db/queries/academics";
import { feeAccountsForStudents, type FeeAccountRow } from "@/lib/db/queries/fees";
import {
  getGuardianForAdmin,
  listCoGuardians,
  listGuardiansForAdmin,
} from "@/lib/db/queries/students";
import type { Relationship } from "@/lib/db/schema";
import { combinedFeeStatus, feeTabMark } from "@/lib/fees";
import { AddGuardianButton } from "../AddGuardianButton";
import { AddChildButton } from "./AddChildButton";

export default async function GuardianLayout({
  params,
  children,
}: LayoutProps<"/admin/guardians/[id]">) {
  const id = Number((await params).id);
  const [guardian, year, everyone, coGuardians] = await Promise.all([
    getGuardianForAdmin(id),
    getCurrentYear(),
    listGuardiansForAdmin(),
    listCoGuardians(id),
  ]);
  if (!guardian) notFound();
  const [sessions, classes] = year
    ? await Promise.all([listSessions(year.id), listClasses(year.id)])
    : [[], []];
  const kids = guardian.children.map((c) => ({ id: c.id, firstName: c.firstName }));
  const accounts = year
    ? await feeAccountsForStudents(
        year.id,
        kids.map((k) => k.id),
      )
    : new Map<number, FeeAccountRow>();
  const tabs = [
    { value: baseTab, label: "Details" },
    { value: "sensitive", label: "Sensitive" },
    {
      value: "payments",
      label: "Payments",
      mark: feeTabMark(combinedFeeStatus([...accounts.values()].map((a) => a.status))),
    },
  ];
  // Someone who already shares every child with this guardian has nothing to be added to.
  const others = everyone
    .filter((g) => g.id !== id && kids.some((k) => !g.children.some((c) => c.id === k.id)))
    .map(({ id, name, email, phone }) => ({ id, name, email, phone }));
  return (
    <Stack gap="lg" maw={860}>
      <PageHeader
        breadcrumbs={[{ label: "Families", href: "/admin/guardians" }]}
        eyebrow={guardian.emailVerified ? undefined : "Email not confirmed"}
        title={guardian.name}
        actions={
          <>
            {kids.length > 0 && (
              <AddGuardianButton
                kids={kids}
                guardians={others}
                label="Add a parent"
                title={`Add a parent for ${kids.map((k) => k.firstName).join(", ")}`}
              />
            )}
            <AddChildButton
              guardian={{ id: guardian.id, name: guardian.name, gender: guardian.gender }}
              sessions={sessions
                .filter((s) => s.isActive)
                .map((s) => ({
                  id: s.id,
                  name: s.name,
                  classes: classes
                    .filter((c) => c.sessionId === s.id)
                    .map((c) => ({ id: c.id, name: c.name })),
                }))}
              coGuardians={coGuardians.map((g) => ({
                id: g.id,
                name: g.name,
                relationship: g.relationship as Relationship,
              }))}
            />
          </>
        }
      />
      <LinkTabs base={`/admin/guardians/${id}`} tabs={tabs} />
      {children}
    </Stack>
  );
}
