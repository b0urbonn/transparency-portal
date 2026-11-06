/**
 * Which of the scope's municipalities a line's title names.
 *
 * The budget documents have no municipality field; a town is read from the
 * title text ("…, Boac, Marinduque"). That is name-matching, not a survey:
 * a project whose title names no town is under none, and a line naming two
 * towns counts under each. The match is safe only because every row shown
 * is already in the portal's scope for this LGU — an unscoped list would
 * catch namesakes in other provinces.
 */

/** "Sta. Cruz" and "Sto. Niño" spellings are common in the documents. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\bsta\.?\b/g, 'santa')
    .replace(/\bsto\.?\b/g, 'santo');
}

const cache = new Map<string, RegExp>();

function pattern(name: string): RegExp {
  let re = cache.get(name);
  if (!re) {
    // Words may be split by any punctuation ("Santa-Cruz", "Santa  Cruz").
    const words = normalise(name).split(/[^a-z0-9]+/).filter(Boolean);
    re = new RegExp(`(^|[^a-z0-9])${words.join('[^a-z0-9]+')}([^a-z0-9]|$)`);
    cache.set(name, re);
  }
  return re;
}

/** The configured municipality names the title carries, in config order. */
export function municipalitiesOf(title: string, names: readonly string[]): string[] {
  if (!names.length) return [];
  const hay = normalise(title);
  return names.filter((n) => pattern(n).test(hay));
}
