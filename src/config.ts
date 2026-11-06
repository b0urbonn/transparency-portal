/**
 * The portal's configuration contract. A fork edits `portal.config.ts` at the
 * repository root; nothing else needs to change to point the portal at a
 * different LGU or district engineering office.
 *
 * Pure: no browser or Vite APIs, so `scripts/` (tsx) and `vite.config.ts`
 * import it too.
 */

/** The four programs the FY2027 House bill lists project by project. */
export type DatasetKey = 'dpwh' | 'fmr' | 'hfep' | 'nia';
export const DATASET_KEYS: readonly DatasetKey[] = ['dpwh', 'fmr', 'hfep', 'nia'];

/** What the portal is for. Only changes wording; the scope decides the data. */
export type PortalKind = 'deo' | 'province' | 'city' | 'municipality';

export const KIND_LABELS: Record<PortalKind, string> = {
  deo: 'DPWH district engineering office',
  province: 'Province',
  city: 'City',
  municipality: 'Municipality',
};

/** A place whose name, in a project's title, brings the project into the portal. */
export interface PlaceQuery {
  /** What readers see: "Tagbilaran". */
  label: string;
  /**
   * The API search. Every word must appear in the project's title or listing
   * ("Tagbilaran Bohol" needs both). Defaults to `label`.
   */
  q?: string;
  /** A region key ("VII", "NCR", "IV-A") to keep a common name to one region. */
  region?: string;
  /** Programs to search. Defaults to all four. */
  datasets?: DatasetKey[];
  /**
   * Set false to keep this place out of the 2020–2026 (GAA) searches. The GAA
   * has no region, so `region` cannot narrow those searches; a name shared
   * with places elsewhere (a "Santa Cruz" or "Buenavista") would pull their
   * programs in. Defaults to true.
   */
  gaaSearch?: boolean;
}

/** A line the maintainer removed from the portal. Every exclusion is published on the About page. */
export interface Exclusion {
  /** `<dataset>:<id>` for a 2027 line ("dpwh:house-reading:848"), or `gaa:<family key>` for a 2020–2026 program. */
  key: string;
  /** Why, in a sentence a reader can check. */
  reason: string;
}

export interface PortalConfig {
  /** Stable id, lowercase with hyphens. Sent with citizen reports: "bohol-province". */
  id: string;
  kind: PortalKind;
  /** The LGU or office in full: "Province of Bohol". */
  name: string;
  /** Short form for headings: "Bohol". Defaults to `name`. */
  shortName?: string;
  /** Who runs this copy of the portal. Shown in the footer. */
  operator: { name: string; url?: string; email?: string };
  /** Optional logo: a path under public/ ("/brand/lgu-seal.png") or a URL. */
  logo?: string;
  /** Canonical URL of this deployment, for link previews. */
  siteUrl?: string;
  /**
   * The blue "Create your own transparency portal" strip above the masthead,
   * linking to the source on GitHub. On unless set to false.
   */
  buildYourOwnStrip?: boolean;
  /** Budget API host. Default https://budget.bettergov.ph. VITE_API_BASE overrides it. */
  api?: string;
  scope: {
    /**
     * DPWH offices, named exactly as the documents publish them
     * ("Bohol 1st District Engineering Office"). Every DPWH line listed under
     * each office is in the portal. `npm run setup` finds the names.
     */
    offices?: string[];
    /**
     * Places whose name in a project's title brings it in: the four 2027
     * programs, and every department's programs in the 2020–2026 budgets.
     */
    places?: PlaceQuery[];
    /** Legislative districts to show cards for: ids such as "leg:bohol:1st". */
    districts?: string[];
    /**
     * Towns within the LGU ("Boac", "Santa Cruz"). A line is counted under a
     * municipality when its title names it: name-matched, not surveyed, so a
     * project whose title names no town is under none. Gives the projects
     * list a By-municipality view; each town still needs a `places` entry if
     * its name alone should also bring lines into the portal.
     */
    municipalities?: string[];
    /** Lines removed by hand. Published, with reasons, on the About page. */
    exclude?: Exclusion[];
  };
  /**
   * Citizen reports go to one central service on budget.bettergov.ph (not
   * built yet). While `enabled` is false the portal says reporting is coming.
   * See docs/reporting.md for the link contract.
   */
  reporting?: { enabled: boolean; url?: string };
}

export const DEFAULT_API = 'https://budget.bettergov.ph';
export const DEFAULT_REPORT_URL = 'https://budget.bettergov.ph/report';

export function defineConfig(config: PortalConfig): PortalConfig {
  return config;
}

/** Problems a fork should fix before deploying. Empty when the config is usable. */
export function configProblems(config: PortalConfig): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.id)) {
    problems.push(`id "${config.id}" should be lowercase letters, digits and hyphens.`);
  }
  if (!config.name.trim()) problems.push('name is empty.');
  if (!config.operator?.name?.trim()) problems.push('operator.name is empty: say who runs this portal.');
  const { offices = [], places = [], districts = [], municipalities = [], exclude = [] } = config.scope;
  if (!offices.length && !places.length) {
    problems.push('scope needs at least one office or place, or the portal has no projects.');
  }
  for (const p of places) {
    if (!p.label.trim()) problems.push('a place has an empty label.');
    for (const d of p.datasets ?? []) {
      if (!DATASET_KEYS.includes(d)) problems.push(`place "${p.label}": unknown program "${d}".`);
    }
  }
  for (const d of districts) {
    if (!d.startsWith('leg:')) problems.push(`district "${d}" should be an id such as "leg:bohol:1st".`);
  }
  for (const m of municipalities) {
    if (!m.trim()) problems.push('a municipality has an empty name.');
  }
  for (const e of exclude) {
    if (!/^(dpwh|fmr|hfep|nia|gaa):.+/.test(e.key)) problems.push(`exclusion "${e.key}" should be "<program>:<id>" (2027) or "gaa:<family key>" (2020–2026).`);
    if (!e.reason.trim()) problems.push(`exclusion "${e.key}" needs a reason; readers see it.`);
  }
  return problems;
}

export function shortNameOf(config: PortalConfig): string {
  return config.shortName?.trim() || config.name;
}
