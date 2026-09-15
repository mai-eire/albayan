import { Shell } from "@/components/Shell";

// Placeholder identity until task 8 derives it from the session.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Shell area="student" user={{ name: "Yusuf Ahmed" }} roles={["student"]}>
      {children}
    </Shell>
  );
}
