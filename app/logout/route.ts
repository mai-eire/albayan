import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Signing out clears the session cookie and lands on the sign-in page.
export async function GET(request: Request) {
  const response = await (await auth()).api.signOut({ headers: request.headers, asResponse: true });
  const redirectTo = NextResponse.redirect(new URL("/login", request.url));
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") redirectTo.headers.append("set-cookie", value);
  });
  return redirectTo;
}
