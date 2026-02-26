// ──────────────────────────────────────────────────────────────────
// EmailOctopus Integration
//
// Setup (takes 2 minutes):
//  1. Log into EmailOctopus → Settings → API Keys → create a key
//  2. Go to your list → Settings → copy the List ID
//  3. Create a .env file in the project root with:
//       VITE_EMAILOCTOPUS_API_KEY=your_api_key_here
//       VITE_EMAILOCTOPUS_LIST_ID=your_list_id_here
// ──────────────────────────────────────────────────────────────────

const API_KEY  = import.meta.env.VITE_EMAILOCTOPUS_API_KEY  as string | undefined;
const LIST_ID  = import.meta.env.VITE_EMAILOCTOPUS_LIST_ID  as string | undefined;
const BASE_URL = "https://emailoctopus.com/api/1.6";

export type SubscribeResult =
  | { ok: true }
  | { ok: false; alreadySubscribed: boolean; message: string };

/**
 * Add a contact to the EmailOctopus list.
 * Returns { ok: true } on success or { ok: false, ... } with details on failure.
 */
export async function subscribeToList(
  email: string,
  firstName?: string
): Promise<SubscribeResult> {
  if (!API_KEY || !LIST_ID) {
    // .env not configured yet — log a dev warning and pretend success
    // so the UI still works during development
    console.warn(
      "[EmailOctopus] VITE_EMAILOCTOPUS_API_KEY / VITE_EMAILOCTOPUS_LIST_ID not set.\n" +
      "Create a .env file in the project root with those values."
    );
    return { ok: true };
  }

  try {
    const body: Record<string, unknown> = {
      api_key: API_KEY,
      email_address: email,
      status: "SUBSCRIBED",
    };
    if (firstName?.trim()) {
      body.fields = { FirstName: firstName.trim() };
    }

    const res = await fetch(`${BASE_URL}/lists/${LIST_ID}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) return { ok: true };

    const json = await res.json().catch(() => ({}));
    const code: string = json?.error?.code ?? "";

    if (code === "MEMBER_EXISTS_WITH_EMAIL_ADDRESS") {
      return { ok: false, alreadySubscribed: true, message: "You're already subscribed!" };
    }
    return {
      ok: false,
      alreadySubscribed: false,
      message: json?.error?.message || "Something went wrong. Please try again.",
    };
  } catch {
    return { ok: false, alreadySubscribed: false, message: "Network error. Please try again." };
  }
}
