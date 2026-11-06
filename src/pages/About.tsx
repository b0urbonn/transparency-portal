import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Disclaimer, Overview } from '../api/types';
import { shortNameOf } from '../config';
import { Await, Disclaimers, External } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import { count, date, plural } from '../lib/format';
import { SOURCE_CODE_URL } from '../lib/links';
import { usePortal } from '../lib/portal-context';
import type { ScopeResult } from '../lib/scope';
import { departmentShort, loadGaa, type GaaResult } from '../lib/gaa';
import type { Async } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

/** The API's `rules`, in words for readers rather than developers. */
const READING_RULES = [
  'These are amounts in the budget documents, not money spent.',
  'Amounts are pesos, as each document publishes them. A dash means that document has no such line; it does not mean zero.',
  'The NEP and the House bill are two versions of one budget. Compare them; never add them together.',
  '“In the House bill only” and “In the NEP only” are candidates: leads to check, not confirmed insertions or deletions. Some are lines that were renamed or re-scoped.',
  '“Unconfirmed match” marks a pairing made on a similar name rather than an exact one.',
  'A DPWH office that serves several districts (Tier B) is shown whole; its money is never split between them. Money under the DPWH Central Office or a regional office is on no district card.',
];

export default function About() {
  const { scope, overview, config } = usePortal();
  useTitle(`About the data · ${shortNameOf(config)}`);
  return (
    <main className="page main">
      <Await state={scope} what="the portal’s queries">
        {(s) => (
          <Await state={overview} what="the data notes">
            {(ov) => <AboutView scope={s} overview={ov.data} />}
          </Await>
        )}
      </Await>
    </main>
  );
}

function AboutView({ scope, overview }: { scope: ScopeResult; overview: Overview }) {
  const { config, districts } = usePortal();
  const municipalities = config.scope.municipalities ?? [];
  const label = (k: string) => overview.datasets.find((d) => d.key === k)?.short ?? k.toUpperCase();
  const disclaimers = new Map<string, Disclaimer>();
  for (const d of scope.disclaimers) disclaimers.set(d.id, d);
  if (districts.status === 'ready') for (const env of districts.value) for (const d of env.disclaimers) disclaimers.set(d.id, d);
  const meta = scope.meta;

  return (
    <>
      <PageHead
        eyebrow={<>About the data<span className="sep">·</span>{shortNameOf(config)}</>}
        title={`Where these ${plural(scope.projects.length, 'project')} come from`}
      >
        <p>
          Every figure comes from the BetterGov.ph Budget API, which sets the House bill against the NEP project by project.
          This portal asks the API the questions below and shows every line it gets back.
        </p>
      </PageHead>

      <section className="section" aria-labelledby="q-h">
        <h2 id="q-h" className="section-h">The questions this portal asks</h2>
        <div className="table queries" role="table" aria-label="Queries">
          <div className="tr th" role="row">
            <span role="columnheader">Lines that…</span>
            <span role="columnheader">Program</span>
            <span role="columnheader" className="r">Found</span>
            <span role="columnheader" className="r">Kept</span>
            <span role="columnheader" className="r">Check it</span>
          </div>
          {scope.queries.map((q, i) => (
            <div className="tr" role="row" key={i}>
              <span role="cell">
                {q.kind === 'office' ? <>are listed under <strong>{q.label}</strong></> : <>have a title naming <strong>{String(q.params.q)}</strong></>}
                {q.region && <span className="muted small"> · kept to region {q.region}, or giving no region</span>}
              </span>
              <span role="cell">{label(q.dataset)}</span>
              <span role="cell" className="r num">{count(q.total)}</span>
              <span role="cell" className="r num">{count(q.kept)}</span>
              <span role="cell" className="r"><External href={q.api}>API</External></span>
            </div>
          ))}
        </div>
        <p className="fine">
          A line found by more than one question is shown once, with every reason. Searching by name finds titles that spell
          the place out; a project whose title does not name it is found only through its DPWH office.
          {municipalities.length > 0 &&
            ` The By-municipality view reads the town from the title too: a line is counted under ${municipalities.join(', ')} when its title names it, and under none when it names no town.`}
        </p>
      </section>

      <GaaQuestions />

      <section className="section" aria-labelledby="x-h">
        <h2 id="x-h" className="section-h">2027 lines removed by hand: {count(scope.excluded.length)}</h2>
        {scope.excluded.length === 0 ? (
          <p>None. Every line the questions return is shown.</p>
        ) : (
          <ul className="plain-list">
            {scope.excluded.map(({ exclusion, project }) => (
              <li key={exclusion.key}>
                {project ? (
                  <External href={project.url}>{project.title}</External>
                ) : (
                  <code>{exclusion.key}</code>
                )}
                <span className="muted"> — {exclusion.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section two-col" aria-labelledby="r-h">
        <div>
          <h2 id="r-h" className="section-h">How to read the figures</h2>
          <ul className="plain-list">
            {READING_RULES.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="section-h">Words used here</h2>
          <dl className="terms">
            {Object.entries(overview.terms).map(([k, t]) => (
              <div key={k}>
                <dt>{t.term}</dt>
                <dd>{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="d-h">
        <h2 id="d-h" className="section-h">The documents</h2>
        <ul className="docs">
          {overview.documents.map((d) => (
            <li key={d.key}>
              <External href={d.pdf_url}>{d.title}</External>
              {d.source_url && <span className="muted small"> · <a href={d.source_url} target="_blank" rel="noopener">where it was published</a></span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="n-h">
        <h2 id="n-h" className="section-h">Notices</h2>
        <Disclaimers items={[...disclaimers.values()]} />
        <p className="fine">
          Data version: comparison <a href={`${meta.source_repo}/tree/${meta.source_commit}`} target="_blank" rel="noopener">{meta.source_commit.slice(0, 7)}</a>,
          built {date(meta.built_at)}. Every project nationwide: <External href={overview.url}>budget.bettergov.ph</External>.
        </p>
      </section>

      <section className="section build-own" aria-labelledby="b-h">
        <h2 id="b-h" className="section-h">Run a portal like this for your LGU or DPWH office</h2>
        <p>
          This portal is open source. Fork it, run <code>npm run setup</code> to pick your province, city, municipality or
          district engineering office, and deploy it to Cloudflare, Vercel or Netlify. It needs no database: the data comes
          from the same API. <External href={SOURCE_CODE_URL}>Source code</External> · <Link to="/">Back to the projects</Link>
        </p>
      </section>
    </>
  );
}

/** The 2020–2026 searches, published like the 2027 ones: every department with a match, and how to check it. */
function GaaQuestions() {
  const { client, config } = usePortal();
  const places = config.scope.places ?? [];
  const [state, setState] = useState<Async<GaaResult>>({ status: 'loading' });
  useEffect(() => {
    if (!places.length) return;
    let live = true;
    loadGaa(client, config).then(
      (value) => live && setState({ status: 'ready', value }),
      (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      live = false;
    };
  }, [client, config, places.length]);

  return (
    <section className="section" aria-labelledby="g-h">
      <h2 id="g-h" className="section-h">The questions for the 2020–2026 budgets</h2>
      {!places.length ? (
        <p>None: this portal names no place, and the enacted budgets list projects by name, not by office.</p>
      ) : state.status === 'loading' ? (
        <p className="state" role="status"><span className="spinner" aria-hidden="true" /> Loading the searches…</p>
      ) : state.status === 'error' ? (
        <p className="state state-error">Could not load the searches: {state.error.message}</p>
      ) : (
        <>
          <div className="table queries" role="table" aria-label="Searches of the enacted budgets">
            <div className="tr th" role="row">
              <span role="columnheader">Programs whose name has…</span>
              <span role="columnheader">Department</span>
              <span role="columnheader" className="r">Found</span>
              <span role="columnheader" className="r">Loaded</span>
              <span role="columnheader" className="r">Check it</span>
            </div>
            {state.value.queries.map((q) => (
              <div className="tr" role="row" key={q.place + q.department_id}>
                <span role="cell"><strong>{q.q}</strong></span>
                <span role="cell">{departmentShort(q.department)}</span>
                <span role="cell" className="r num">{count(q.matched)}</span>
                <span role="cell" className="r num">{count(q.fetched)}</span>
                <span role="cell" className="r"><External href={q.api}>API</External></span>
              </div>
            ))}
          </div>
          <p className="fine">
            Every one of the {count(state.value.searched)} departments in the GAA was searched for each place; those not listed
            matched nothing. A program found by two places is shown once.
            {state.value.excluded.length > 0 ? ` ${plural(state.value.excluded.length, 'program')} removed by hand:` : ' None removed by hand.'}
          </p>
          {state.value.excluded.length > 0 && (
            <ul className="plain-list">
              {state.value.excluded.map(({ exclusion, row }) => (
                <li key={exclusion.key}>
                  {row ? row.name : <code>{exclusion.key}</code>}
                  <span className="muted"> — {exclusion.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
