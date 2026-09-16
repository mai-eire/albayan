import { Card, Stack } from "@mantine/core";
import { notFound } from "next/navigation";
import { CardTitle } from "@/components/CardTitle";
import { PageHeader } from "@/components/PageHeader";
import { getYear } from "@/lib/db/queries/academics";
import { YearForm } from "../YearForm";
import { TermsCard } from "./TermsCard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: (await params).id };
}

export default async function YearPage({ params }: Props) {
  const year = await getYear((await params).id);
  if (!year) notFound();
  return (
    <Stack gap="lg" maw={720}>
      <PageHeader eyebrow="Academic year" title={year.id} />
      <Card>
        <CardTitle>Dates and fee</CardTitle>
        <YearForm existing={year} />
      </Card>
      <TermsCard yearId={year.id} terms={year.terms} />
    </Stack>
  );
}
