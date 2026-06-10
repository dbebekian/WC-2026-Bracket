# World Cup Pool '26 — per-round prediction pool

Predict the World Cup one round at a time. No full bracket: group placings first
(1st/2nd/3rd, exact position), then pick winners round by round as the real
fixtures appear. Results, fixtures, and scores update automatically.

## Scoring

| Round          | Points per correct pick      |
|----------------|------------------------------|
| Group stage    | 1 per exact position (1st–3rd per group) |
| Round of 32    | 1                            |
| Round of 16    | 2                            |
| Quarter-finals | 3                            |
| Semi-finals    | 5                            |
| Final          | 8                            |

Tie-breakers: total points → latest round → earlier rounds → alphabetical.
The third-place playoff (Jul 18) does not score.

## How it stays automatic

- `/api/espn` (Netlify Function) proxies ESPN's public World Cup feed with 60s
  CDN caching — no API key needed.
- Group placings finalize when all 4 teams in a group have played 3 games.
- Knockout fixtures appear as soon as ESPN's schedule has real teams in them
  (no FIFA bracket math needed — ESPN publishes the actual matchups).
- Every knockout pick locks at that match's kickoff. Group picks lock at the
  opener (Jun 11, 3pm ET).
- Picks are stored in Netlify Blobs via `/api/pool`, with server timestamps.
- Commissioner tab = manual override only, in case the feed hiccups.
  Overrides always beat live data.

## Deploy (Netlify, ~2 minutes)

1. Push this repo to GitHub.
2. In Netlify: **Site configuration → Build & deploy → Continuous deployment →
   Manage repository → Link to a different repository**, choose this repo.
   (Or "Add new site → Import from Git".)
3. Build settings: no build command needed. Publish directory and functions are
   read from `netlify.toml`.
4. Optional but recommended: **Site configuration → Environment variables** →
   add `COMMISH_CODE` = a passcode. Without it, anyone who finds the Commish
   tab can save overrides.
5. Deploy. Done.

## Verify after first deploy

- `https://<your-site>/api/espn?type=standings` returns JSON with `children`
  containing `Group A`…`Group L`.
- `https://<your-site>/api/espn?type=scoreboard&dates=20260611` returns the
  opening-day fixtures.
- Save a pick, reload on another device — it should appear in the Table tab.

If ESPN ever renames a team in a way the app doesn't recognize, fix the alias
map in `site/index.html` (`CANON` object), or just use the Commish overrides.

## Honest limitations

- Identity is name-based (no logins). Fine for friends; not for stakes.
- Lock enforcement is client-side; the server records timestamps so late edits
  are at least visible/provable.
- ESPN's API is unofficial and could change. The proxy + overrides are the
  safety net.
