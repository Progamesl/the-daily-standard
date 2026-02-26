export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.EMAILOCTOPUS_API_KEY;
  const LIST_ID = process.env.EMAILOCTOPUS_LIST_ID;

  if (!API_KEY || !LIST_ID) {
    return res.status(500).json({ error: "Newsletter service not configured." });
  }

  const { email, firstName } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  const body = {
    api_key: API_KEY,
    email_address: email.trim().toLowerCase(),
    status: "SUBSCRIBED",
  };
  if (firstName?.trim()) {
    body.fields = { FirstName: firstName.trim() };
  }

  try {
    const upstream = await fetch(
      `https://emailoctopus.com/api/1.6/lists/${LIST_ID}/contacts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (upstream.ok) {
      return res.status(200).json({ ok: true });
    }

    const code = data?.error?.code ?? "";
    if (code === "MEMBER_EXISTS_WITH_EMAIL_ADDRESS") {
      return res.status(200).json({ ok: true, alreadySubscribed: true });
    }

    return res.status(400).json({
      ok: false,
      message: data?.error?.message || "Something went wrong. Please try again.",
    });
  } catch {
    return res.status(500).json({ ok: false, message: "Network error. Please try again." });
  }
}
