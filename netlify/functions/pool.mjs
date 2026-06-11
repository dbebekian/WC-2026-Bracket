// /api/pool — pool storage on Netlify Blobs.
// GET            → { players:[{name,picks,updatedAt}], overrides }
// POST save      → { action:"save", name, picks }
// POST rename    → { action:"rename", code, from, to }       (commissioner)
// POST override  → { action:"override", code, overrides }    (commissioner)
//
// Optional: set a COMMISH_CODE env var in Netlify to require a passcode for overrides.

import { getStore } from "@netlify/blobs";

const slug = (s) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player";

export default async (req) => {
  const store = getStore("wc26-pool");

  if (req.method === "GET") {
    const players = [];
    const list = await store.list({ prefix: "picks/" });
    for (const b of list.blobs || []) {
      const v = await store.get(b.key, { type: "json" });
      if (v && v.name) players.push(v);
    }
    const overrides = (await store.get("overrides", { type: "json" })) || {};
    return json({ players, overrides });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

    if (body.action === "save") {
      const name = String(body.name || "").trim().slice(0, 40);
      if (!name) return json({ error: "name required" }, 400);
      const picks = body.picks && typeof body.picks === "object" ? body.picks : {};
      await store.setJSON("picks/" + slug(name), {
        name, picks, updatedAt: new Date().toISOString()
      });
      return json({ ok: true });
    }

    if (body.action === "rename") {
      const code = process.env.COMMISH_CODE;
      if (code && String(body.code || "") !== code) return json({ error: "wrong passcode" }, 403);
      const from = String(body.from || "").trim();
      const to = String(body.to || "").trim().slice(0, 40);
      if (!from || !to) return json({ error: "from and to required" }, 400);
      const fromKey = "picks/" + slug(from);
      const toKey = "picks/" + slug(to);
      const cur = await store.get(fromKey, { type: "json" });
      if (!cur) return json({ error: "player not found" }, 404);
      if (fromKey !== toKey) {
        const existing = await store.get(toKey, { type: "json" });
        if (existing && existing.name) return json({ error: "name already taken" }, 409);
      }
      await store.setJSON(toKey, { ...cur, name: to }); // keep picks + original updatedAt
      if (fromKey !== toKey) await store.delete(fromKey);
      return json({ ok: true });
    }

    if (body.action === "override") {
      const code = process.env.COMMISH_CODE;
      if (code && String(body.code || "") !== code) return json({ error: "wrong passcode" }, 403);
      const overrides = body.overrides && typeof body.overrides === "object" ? body.overrides : {};
      await store.setJSON("overrides", overrides);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  }

  return json({ error: "method not allowed" }, 405);
};

function json(o, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
