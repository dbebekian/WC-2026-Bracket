// /api/espn — cached proxy for ESPN's unofficial World Cup API (no key required).
// type=standings            → group tables
// type=scoreboard&dates=... → fixtures/results for a YYYYMMDD or YYYYMMDD-YYYYMMDD range

const BASE = "https://site.api.espn.com/apis";

export default async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  let target;

  if (type === "standings") {
    target = `${BASE}/v2/sports/soccer/fifa.world/standings?season=2026`;
  } else if (type === "scoreboard") {
    const d = url.searchParams.get("dates") || "";
    if (!/^\d{8}(-\d{8})?$/.test(d)) {
      return json({ error: "dates must be YYYYMMDD or YYYYMMDD-YYYYMMDD" }, 400);
    }
    target = `${BASE}/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}&limit=200`;
  } else {
    return json({ error: "type must be standings or scoreboard" }, 400);
  }

  try {
    const r = await fetch(target, { headers: { accept: "application/json" } });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        "content-type": "application/json",
        // CDN caches 60s so a whole pool refreshing only hits ESPN ~once a minute
        "cache-control": "public, max-age=30, s-maxage=60",
        "access-control-allow-origin": "*"
      }
    });
  } catch (e) {
    return json({ error: "espn fetch failed", detail: String(e) }, 502);
  }
};

function json(o, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json" }
  });
}
