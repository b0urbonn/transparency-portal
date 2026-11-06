/**
 * This portal's configuration: the only file a fork needs to edit.
 * What each field means: src/config.ts. Generate one with `npm run setup`;
 * check it against the live API with `npm run check`.
 *
 * Province of Marinduque: one DPWH district engineering office (Tier A, serving
 * only the Lone District) brings in every DPWH line listed under it; the place
 * names bring in lines whose title names the province or one of its six towns
 * (a town name can catch lines that never spell "Marinduque" out, like
 * "Dr Damian Reyes Rd (Torrijos Side)"). "Santa Cruz" gets no query of its own:
 * the name is shared with towns elsewhere in MIMAROPA, its projects all carry
 * "Marinduque" in the title anyway, and the By-municipality view still counts
 * them. "Buenavista" is queried but kept out of the 2020–2026 searches, which
 * no region can narrow; its namesakes are excluded below.
 */
import { defineConfig } from './src/config';

export default defineConfig({
  id: 'marinduque-province',
  kind: 'province',
  name: 'Province of Marinduque',
  shortName: 'Marinduque',
  logo: '/bettermarinduque-mark.svg',
  operator: { name: 'BetterMarinduque', url: 'https://bettermarinduque.org' },
  // Canonical URL of this deployment, for link previews. When the
  // bettermarinduque.org domain is registered, move it to
  // budget.bettermarinduque.org, the Better LGU convention.
  siteUrl: 'https://budget-bettermarinduque.vercel.app',
  scope: {
    offices: ['Marinduque District Engineering Office'],
    places: [
      { label: 'Marinduque', region: 'MIMAROPA' },
      { label: 'Boac', region: 'MIMAROPA' },
      { label: 'Buenavista', region: 'MIMAROPA', gaaSearch: false },
      { label: 'Gasan', region: 'MIMAROPA' },
      { label: 'Mogpog', region: 'MIMAROPA' },
      { label: 'Torrijos', region: 'MIMAROPA' },
    ],
    districts: ['leg:marinduque:lone'],
    municipalities: ['Boac', 'Buenavista', 'Gasan', 'Mogpog', 'Santa Cruz', 'Torrijos'],
    exclude: [
      {
        key: 'dpwh:house-reading:10551',
        reason: 'Names Barangay Buenavista in Puerto Princesa City, Palawan, not the town of Buenavista in Marinduque.',
      },
      {
        key: 'dpwh:house-reading:10577',
        reason: 'Names Barangay Buenavista in Looc, Romblon, not the town of Buenavista in Marinduque.',
      },
      {
        key: 'nia:house_only:ib:p932:r2',
        reason: 'A "Buenavista CIS" that gives no province or region; it cannot be confirmed as the one in Marinduque.',
      },
    ],
  },
  reporting: { enabled: false },
});
