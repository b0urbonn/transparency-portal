# Transparency Portal

A small, forkable website that shows citizens **every FY 2027 budget project** for one
LGU (province, city or municipality) or one DPWH district engineering office: what the
NEP gave it, what the House bill (House Bill 10858) gives it, what was added or dropped,
and the page of the source document each figure is on. Beside it, the **enacted budgets
of 2020 to 2026** for the same area: each DPWH office's budget year by year, and every
program or project in any department whose name names the place.

<p align="center">
  <img src="docs/poster/create-your-own-transparency-portal-1080x1080.png" alt="Create your own transparency portal: for your LGU or DPWH district office. A sample portal for the Province of Bohol, and three steps: fork, run npm run setup, deploy." width="540">
</p>

**See a sample:** [transparency-portal.bettergov.workers.dev](https://transparency-portal.bettergov.workers.dev),
the Province of Bohol, built from this repository as it is.

It has no backend and no database. Everything comes from the public
[BetterGov.ph Budget API](https://budget.bettergov.ph/docs), the same data behind
[budget.bettergov.ph](https://budget.bettergov.ph/hgab/2027/overview). Build it once and
host the static files anywhere: Cloudflare, Vercel, Netlify, GitHub Pages or a plain web
server.

## Five minutes to your own portal

```bash
git clone https://github.com/bettergovph/transparency-portal my-portal
cd my-portal
npm install
npm run setup     # pick your province, city, municipality or DPWH office
npm run check     # counts every query against the live API
npm run dev       # http://localhost:5132
```

`npm run setup` asks a few questions, looks up exact names and ids in the API, and
writes `portal.config.ts`. That file is the only one a fork needs to change.

## What the portal shows

| Page | What is on it |
| --- | --- |
| **Projects** (`/`) | The headline figures; the DPWH offices in scope (`#offices`), each with its 2027 figures, tier and status counts, and under it the legislative districts it serves with their representatives (a shared office's money is shown once, never split); the six statuses; and every project with search, filters (program, status, DPWH office, reason), sorting and a CSV download. An office's line count or status opens the list filtered to it. Filters live in the URL, so a filtered list can be shared. |
| **Budgets 2020–2026** (`/gaa`) | The enacted budgets (GAA) for the same area: each DPWH office's whole budget by year, grouped by Congress, with the 2027 NEP and House bill beside it but apart; the yearly totals of the programs that name the place (click a year to filter); and every such program or project, in any department, with its amount in each year, search, department and year filters, and a CSV download. |
| **A project** (`/projects/:program/:id`) | The amount in every version with a link to the exact PDF page, how the two versions were matched, notes on the line, and why it is in this portal. |
| **About the data** (`/about`) | Every question the portal asks the API, for 2027 and for 2020–2026, with counts and a link to check each one, every line removed by hand and why, the source documents, plain-language rules and terms, and the notices. |

## How a portal decides which projects are its own

The scope in `portal.config.ts` has three parts. A project is in the portal for one or
more stated reasons, and every row shows them.

```ts
scope: {
  // Every DPWH line the documents list under these offices.
  offices: ['Bohol 1st District Engineering Office'],
  // Every line in the four programs whose title names the place.
  places: [{ label: 'Bohol', region: 'VII' }],
  // District cards to show (representative, offices, tiers).
  districts: ['leg:bohol:1st'],
  // Optional: towns within the LGU. A line counts under a town when its title
  // names it, giving the projects list a By-municipality view.
  municipalities: ['Carmen', 'Dagohoy', 'Pilar'],
  // Lines removed by hand. Each needs a reason; the About page publishes them.
  exclude: [],
}
```

- **A DPWH office** brings in its whole ledger. Use this for a DEO portal, and for a
  province or city with its own district engineering offices.
- **A place name** searches the titles of all four programs: DPWH, farm-to-market roads,
  health facilities and irrigation. That catches projects under the DPWH Central Office
  and the programs that have no office. `q` is the search: every word must appear
  (`'Carmen Bohol'` needs both). `region` keeps a common name to one region; lines that
  give no region at all (the irrigation list) are kept, since they cannot be ruled out.
- **The same place names** search the enacted budgets, 2020–2026: every department's
  programs, activities and projects whose name contains `q`. The GAA has no region, so
  `region` cannot narrow these; make `q` specific instead. DPWH offices' yearly totals
  come with the offices.
- **Exclusions** are for namesakes: `<program>:<id>` for a 2027 line, `gaa:<family key>`
  for a 2020–2026 program (the key is in the CSV). `npm run check -- --verbose` lists the
  2027 lines found only by name under another office, which are the ones to review.

Examples for each kind are in [`examples/`](examples): a DEO, a highly urbanised city
(Quezon City, whose offices are shared), and a municipality (Carmen, Bohol, a name used
in several provinces). Check any of them with `npm run check -- --config=examples/deo.config.ts`.

### What it cannot do yet

The API places DPWH money by **office**, and finds other lines by **name**. It does not
yet say which city or municipality a project is in. A municipality portal therefore
relies on titles that spell the town out. The source workbench's location lens, which
places lines by the place their title names, is being brought into budget.bettergov.ph;
once the API serves it, a municipality scope can use it directly. See
[docs/api.md](docs/api.md#gaps).

## Rules this portal keeps

These come from the API and the comparison behind it. A fork should keep them.

- Amounts are integer pesos as published. A dash means "this document has no such
  line", never zero.
- The NEP and the House bill are two versions of one budget: they are **compared, never
  added**.
- "In the House bill only" and "In the NEP only" are **candidates**: leads to check,
  not confirmed insertions or deletions. Unconfirmed matches are flagged on every row.
- A DPWH office that serves several districts (Tier B) is shown whole; its money is
  never split between them.
- The disclaimers are printed from the API response itself, so their wording cannot
  drift from budget.bettergov.ph. Keep them on every page that shows figures.
- Nothing is hidden silently: hand exclusions are listed, with reasons, on the About
  page.
- Enacted amounts (2020–2026) are appropriations: the authority to spend, not spending.
  A year counts only where its amount is above zero. Years are shown side by side, and
  the 2027 versions are never added to them.
- `npm run check` reconciles every 2020–2026 search, department by department and year
  by year, against the API's own totals, so a lost page cannot go unnoticed.

## Citizen reports

Reports about a project will go to one central service on budget.bettergov.ph for every
portal (not built yet). A portal does not collect reports itself; it links to the central
form with the project's reference. Until the service opens, `reporting.enabled` stays
`false` and the project page says reporting is coming. The link contract is in
[docs/reporting.md](docs/reporting.md).

## Deploying

`npm run build` writes static files to `dist/`. Each host needs one rule: unknown paths
serve `index.html`, because the routes are client-side. That rule is already in the repo
for each:

| Host | How |
| --- | --- |
| Cloudflare Workers | `npm run deploy:cloudflare` (uses `wrangler.jsonc`; rename `name` first) |
| Vercel | Import the repo; `vercel.json` has the build and the rewrite |
| Netlify | Import the repo; `netlify.toml` has the build and the redirect |
| Anything else | Serve `dist/` and send unknown paths to `/index.html` |

Set `siteUrl` in the config for link previews. Set `VITE_API_BASE` only to point at a
different API host (a staging copy, for example). More in [docs/deploy.md](docs/deploy.md).

## Poster

"Create your own transparency portal", for sharing: a
[feed post (1080×1350)](https://budget-assets.bettergov.ph/hgab/2027/campaign/create-your-own-transparency-portal-1080x1350.png?v=222d351a)
and a [square post (1080×1080)](https://budget-assets.bettergov.ph/hgab/2027/campaign/create-your-own-transparency-portal-1080x1080.png?v=9689903f),
also in [`docs/poster/`](docs/poster) and the
[BetterGov campaign gallery](https://budget-assets.bettergov.ph/hgab/2027/campaign/index.html).

The sample image is the real portal, screenshotted when the poster is built, and the background lists every DPWH
district engineering office. To rebuild it after a design change, run the portal (`npm run dev`) and then
`npm run build:poster`. It needs Playwright's Chromium (`npx playwright-core install chromium`).

## Stack

React 19, TypeScript, Vite and React Router: the same as budget.bettergov.ph, with its
type (Figtree, Inter, JetBrains Mono) and colours (`src/styles/theme.css`). Three runtime
dependencies, about 95 KB gzipped. (`playwright-core`, a development dependency, is used only to
build the poster.)

```text
portal.config.ts      the one file a fork edits
src/config.ts         what the config means, and its checks
src/api/              the API client and the response types it reads
src/lib/scope.ts      config → the portal's 2027 projects, each with its reasons
src/lib/gaa.ts        config → the 2020–2026 programs that name the places
src/pages/            Projects (with offices and their districts), Enacted (2020–2026), Project, About
src/styles/           theme tokens and layout
scripts/setup.ts      npm run setup
scripts/check.ts      npm run check (exits non-zero on a broken config; use it in CI)
scripts/build-poster.ts  npm run build:poster → docs/poster/
examples/             a DEO, a city, a municipality
```

## Licence

MIT. The budget documents are works of the Philippine government; the comparison data
carries the notices printed on every page.
