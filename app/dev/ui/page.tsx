import { Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconInbox, IconPlus } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { EntityList } from "@/components/EntityList";
import { MoneyText } from "@/components/MoneyText";
import { SensitiveSection } from "@/components/SensitiveSection";
import { PageHeader } from "@/components/PageHeader";
import { Shell } from "@/components/Shell";
import { StatTile } from "@/components/StatTile";
import { StatusBadge } from "@/components/StatusBadge";
import { SubjectBadge } from "@/components/SubjectBadge";

export const metadata = { title: "UI gallery" };

// Every shared component in one place, to check both colour schemes. Dev only.
export default function UiGallery() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Shell
      area="admin"
      schoolName="Al-Bayan"
      user={{ name: "Amina Khan" }}
      roles={["admin", "teach"]}
    >
      <Stack gap="xl" maw={960} mx="auto">
        <PageHeader
          eyebrow="Eyebrow · context line"
          title="UI gallery"
          actions={
            <>
              <Button leftSection={<IconPlus size={16} stroke={1.75} />}>Primary action</Button>
              <Button variant="light">Secondary</Button>
            </>
          }
        />

        <Section title="Buttons">
          <Group>
            <Button>Filled</Button>
            <Button variant="light">Light</Button>
            <Button variant="default">Default</Button>
            <Button variant="subtle">Subtle</Button>
            <Button color="clay">Delete payment</Button>
            <Button loading>Saving</Button>
          </Group>
        </Section>

        <Section title="Status badges">
          <Group>
            <StatusBadge domain="attendance" value="present" />
            <StatusBadge domain="attendance" value="late" />
            <StatusBadge domain="attendance" value="absent" />
            <StatusBadge domain="attendance" value="excused" />
          </Group>
          <Group>
            <StatusBadge domain="fee" value="paid" />
            <StatusBadge domain="fee" value="part_paid" />
            <StatusBadge domain="fee" value="unpaid" />
            <StatusBadge domain="fee" value="waived" />
          </Group>
          <Group>
            <StatusBadge domain="application" value="applied" />
            <StatusBadge domain="application" value="active" />
            <StatusBadge domain="application" value="declined" />
            <StatusBadge domain="application" value="inactive" />
          </Group>
          <Group>
            <StatusBadge domain="homework" value="due_later" />
            <StatusBadge domain="homework" value="due_soon" />
            <StatusBadge domain="homework" value="overdue" />
          </Group>
        </Section>

        <Section title="Subject badges">
          <Group>
            <SubjectBadge subjectId="quran" name="Quran" />
            <SubjectBadge subjectId="arabic" name="Arabic" />
            <SubjectBadge subjectId="islamic_studies" name="Islamic Studies" />
            <SubjectBadge subjectId="tajweed" name="Tajweed (fallback)" />
            <SubjectBadge subjectId="quran" name="Quran" variant="filled" />
          </Group>
        </Section>

        <Section title="Stat tiles">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatTile label="Registers missing" value={3} hint="Saturday session" color="saffron" />
            <StatTile label="Applications pending" value={12} hint="Oldest 6 days" />
            <StatTile label="Fees overdue" value="€1,250" hint="9 families" color="clay" />
          </SimpleGrid>
        </Section>

        <Section title="Card and type scale">
          <Card>
            <Title order={3}>Card title (h3)</Title>
            <Title order={4} mt="sm">
              Sub-group (h4)
            </Title>
            <Text mt="xs">Body text at md. Figtree, calm and readable.</Text>
            <Text size="sm" c="dimmed">
              Secondary text at sm, dimmed.
            </Text>
          </Card>
        </Section>

        <Section title="Entity list (family & student)">
          <Card>
            <CardTitle context={<StatusBadge domain="fee" value="part_paid" />}>Yusuf</CardTitle>
            <EntityList
              items={[
                {
                  key: 1,
                  title: "Quran",
                  detail: "Saturday · 10:00",
                  badge: <SubjectBadge subjectId="quran" name="Quran" />,
                  href: "#",
                },
                {
                  key: 2,
                  title: "Surah Al-Fil, verses 1–5",
                  detail: "Due tomorrow",
                  badge: <StatusBadge domain="homework" value="due_soon" />,
                  href: "#",
                },
                { key: 3, title: "Fee for 2026–27", detail: "€150 of €250 paid" },
              ]}
            />
          </Card>
        </Section>

        <Section title="Child switcher, money">
          <ChildSwitcher
            kids={[
              { id: 1, firstName: "Yusuf" },
              { id: 2, firstName: "Amira" },
              { id: 3, firstName: "Zayd" },
            ]}
          />
          <Text>
            Balance: <MoneyText cents={25050} fw={600} /> · Paid:{" "}
            <MoneyText cents={10000} c="tile" />
          </Text>
        </Section>

        <Section title="Sensitive section (admin only)">
          <SensitiveSection>
            <Text size="sm">Ethnicity: Prefer not to say · Languages: Arabic, English</Text>
          </SensitiveSection>
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon={<IconInbox size={20} stroke={1.75} />}
            message="No applications waiting. New ones will appear here."
            action={<Button variant="light">Invite a family</Button>}
          />
        </Section>
      </Stack>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="sm">
      <Title order={2}>{title}</Title>
      {children}
    </Stack>
  );
}
