import { connection } from "next/server";
import { Shell } from "@/components/Shell";

// Placeholder identity until task 8 derives it from the session. connection() keeps
// every page in the area request-time rendered, as reading the session will later.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <Shell area="family" user={{ name: "Maryam Ahmed" }} roles={["teach", "family"]}>
      {children}
    </Shell>
  );
}
