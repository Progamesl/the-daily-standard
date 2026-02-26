export type SubscribeResult =
  | { ok: true; alreadySubscribed?: boolean }
  | { ok: false; alreadySubscribed: boolean; message: string };

/**
 * Subscribe an email address via the /api/subscribe serverless function.
 * The API key never leaves the server.
 */
export async function subscribeToList(
  email: string,
  firstName?: string
): Promise<SubscribeResult> {
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok !== false) {
      return { ok: true, alreadySubscribed: !!data.alreadySubscribed };
    }

    const message: string = data?.message || data?.error || "Something went wrong. Please try again.";

    if (data?.alreadySubscribed) {
      return { ok: false, alreadySubscribed: true, message };
    }

    return { ok: false, alreadySubscribed: false, message };
  } catch {
    return { ok: false, alreadySubscribed: false, message: "Network error. Please try again." };
  }
}
