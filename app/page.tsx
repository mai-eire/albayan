import { redirect } from "next/navigation";

// Task 8 replaces this with a redirect to the signed-in user's area.
export default function Home() {
  redirect("/admin");
}
