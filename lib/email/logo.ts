import { appUrl } from "@/lib/app-url";
import { getSchoolSettings } from "@/lib/db/queries/settings";
import { logoUrl } from "@/lib/logo";

// An email is read outside the app, so the logo needs an absolute URL. Optional, like
// everywhere else: a school without one gets the name on its own, as it always has.
// Emails go out after the response, so the origin may not be derivable from a request —
// in that case the email simply carries no image rather than failing to send.
export async function emailLogo(): Promise<string | null> {
  try {
    const { logoKey } = await getSchoolSettings();
    const path = logoUrl(logoKey);
    return path ? await appUrl(path) : null;
  } catch {
    return null;
  }
}
