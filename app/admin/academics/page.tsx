import { redirect } from "next/navigation";

// The page the office opens most.
export default function AcademicsPage() {
  redirect("/admin/academics/classes");
}
