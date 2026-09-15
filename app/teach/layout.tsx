import { Shell } from "@/components/Shell";

// Placeholder identity until task 8 derives it from the session.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Shell area="teach" user={{ name: "Maryam Ahmed" }} roles={["teach", "family"]}>
      {children}
    </Shell>
  );
}
