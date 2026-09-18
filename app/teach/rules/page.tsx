import { SchoolRules } from "@/components/SchoolRules";
import { requireArea } from "@/lib/access";
import { getSchoolSettings } from "@/lib/db/queries/settings";

export const metadata = { title: "School rules" };

export default async function RulesPage() {
  const [, { rules }] = await Promise.all([requireArea("teach"), getSchoolSettings()]);
  return <SchoolRules rules={rules} />;
}
