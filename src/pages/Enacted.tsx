/**
 * /gaa — the enacted budgets, 2020–2026, for the portal's area:
 * - each DPWH office's whole budget by year, from its district page, with the
 *   2027 NEP and House bill beside it but apart (they are not law);
 * - every program, activity or project in any department whose name names one
 *   of the portal's places, with its appropriation in each year.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { DistrictCard, DistrictOffice, Envelope } from '../api/types';
import { GAA_YEARS } from '../api/types';
import { shortNameOf } from '../config';
import { Await, Disclaimers, External } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import { downloadText } from '../lib/csv';
import { count, php, phpFull, plural } from '../lib/format';
import { departmentShort, gaaCsv, gaaYearTotals, hasYear, loadGaa, type GaaResult, type GaaRow } from '../lib/gaa';
import { municipalitiesOf } from '../lib/municipalities';
import { usePortal, type Async } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

const PAGE = 100;
const FIRST = GAA_YEARS[0];
const LAST = GAA_YEARS[GAA_YEARS.length - 1];

export default function Enacted() {
  const { config, client, districts } = usePortal();
  const name = shortNameOf(config);
  useTitle(`Enacted budgets ${FIRST}–${LAST} · ${name}`);
  // The names actually searched in the GAA: `gaaSearch: false` places are not.
  const places = (config.scope.places ?? []).filter((p) => p.gaaSearch !== false);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [state, setState] = useState<Async<GaaResult>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!places.length) return;
    let live = true;
    loadGaa(client, config, (done, total) => live && setProgress({ done, total })).then(
      (value) => live && setState({ status: 'ready', value }),
      (error) => live && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      live = false;
    };
  }, [client, config, places.length, attempt]);

  // #office-… links from the main page land on the office once it has rendered.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash, districts.status]);

  const placeList = places.map((p) => p.label).join(', ');
  return (
    <main className="page main">
      <PageHead
        eyebrow={<>GAA<span className="sep">·</span>FY {FIRST}–{LAST}<span className="sep">·</span>{name}</>}
        title={
          state.status === 'ready'
            ? `${plural(state.value.rows.length, 'program and project', 'programs and projects')} in the ${FIRST}–${LAST} budgets name ${placeList}`
            : `${name} in the enacted budgets, ${FIRST}–${LAST}`
        }
      >
        <p>
          The General Appropriations Act (GAA) is the budget Congress passes and the President signs each year: the authority to
          spend, not the money spent. These are the budgets for {FIRST} to {LAST}; the 2027 budget is still a bill.
        </p>
      </PageHead>

      <OfficeHistories />

      {places.length === 0 ? (
        <p className="fine section-gap">
          This portal follows DPWH offices only. The enacted budgets list projects by name, not by office, so only each office’s
          yearly total is shown here.
        </p>
      ) : state.status === 'loading' ? (
        <div className="state" role="status">
          <span className="spinner" aria-hidden="true" /> Searching every department’s programs for {placeList}
          {progress && progress.total > 0 && <> · {count(progress.done)} of {count(progress.total)}</>}…
        </div>
      ) : state.status === 'error' ? (
        <div className="state state-error" role="alert">
          <p><strong>Could not load the enacted budgets.</strong> {state.error.message}</p>
          <button type="button" className="button" onClick={() => { setState({ status: 'loading' }); setAttempt((n) => n + 1); }}>Try again</button>
        </div>
      ) : (
        <Programs result={state.value} placeList={placeList} municipalities={config.scope.municipalities ?? []} />
      )}

      <section className="section" aria-labelledby="gaa-notes-h">
        <h2 id="gaa-notes-h" className="section-h">Reading these figures</h2>
        <ul className="plain-list fine-list">
          <li>Amounts are the appropriations in each year’s GAA, in pesos. The GAA publishes them in thousands.</li>
          {places.length > 0 && (
            <>
              <li>A program is listed when its name includes {placeList}. Names are matched, not places surveyed; a project whose name does not say where it is will not be here.</li>
              <li>One row is one name in one agency across the years. A renamed or re-scoped project shows as a new row. A dash means no appropriation under that name that year.</li>
            </>
          )}
          <li>A DPWH office’s yearly figure is its whole budget, as the GAA lists it under that office. An office that serves several districts is shown whole, never split.</li>
          <li>The 2027 figures are the NEP and the House bill, not law. They are shown beside the enacted years, never added to them.</li>
        </ul>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// DPWH offices, year by year
// ---------------------------------------------------------------------------

function OfficeHistories() {
  const { districts, config } = usePortal();
  if (!config.scope.offices?.length && !config.scope.districts?.length) return null;
  return (
    <Await state={districts} what="DPWH office budgets">
      {(list) => <OfficeHistoryList list={list} />}
    </Await>
  );
}

function OfficeHistoryList({ list }: { list: Envelope<DistrictCard>[] }) {
  const offices = useMemo(() => {
    const byId = new Map<string, DistrictOffice>();
    for (const env of list) for (const o of env.data.offices) if (!byId.has(o.id)) byId.set(o.id, o);
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  }, [list]);
  const officeDisclaimer = list.flatMap((e) => e.disclaimers).filter((d) => d.id === 'disclaimer-offices').slice(0, 1);
  if (!offices.length) return null;
  return (
    <section className="section" aria-labelledby="office-years-h">
      <h2 id="office-years-h" className="section-h">
        {offices.length === 1 ? 'The DPWH office’s budget, year by year' : `${count(offices.length)} DPWH offices’ budgets, year by year`}
      </h2>
      <p className="legend">
        <span><i className="sw sw-gaa" /> Enacted (GAA), whole office</span>
        <span><i className="sw sw-nep" /> 2027 NEP, whole office</span>
        <span><i className="sw sw-house" /> 2027 House bill, named projects only</span>
      </p>
      <div className="hgrid">
        {offices.map((o) => <OfficeHistory key={o.id} office={o} />)}
      </div>
      <Disclaimers items={officeDisclaimer} compact />
    </section>
  );
}

/** Three bars each: 2020–22, 2023–25, and 2026 with the two 2027 versions. */
const CONGRESSES = [{ label: '18th Congress' }, { label: '19th Congress' }, { label: '20th Congress' }];

function OfficeHistory({ office }: { office: DistrictOffice }) {
  const years = office.years ?? [];
  const slot = (fy: number, stage: string) => years.find((y) => y.fy === fy && y.stage === stage);
  const bars = [
    ...GAA_YEARS.map((fy) => ({ key: `${fy}`, label: String(fy), kind: 'gaa', v: slot(fy, 'gaa') })),
    { key: '2027-nep', label: 'NEP', kind: 'nep', v: slot(2027, 'nep') },
    { key: '2027-house', label: 'House', kind: 'house', v: slot(2027, 'hgab3') },
  ];
  const max = Math.max(1, ...bars.map((b) => b.v?.php ?? 0));
  return (
    <article className="hcard" id={office.id}>
      <header>
        <h3>DPWH {office.name}</h3>
        <span className={`tag tier tier-${office.tier}`}>{office.tier_text}</span>
      </header>
      <div className="bars" role="img" aria-label={`Budget by year: ${bars.map((b) => `${b.label} ${b.v?.php != null ? phpFull(b.v.php) : 'not found'}`).join('; ')}`}>
        {bars.map((b) => (
          <div key={b.key} className={`bar-col k-${b.kind}`} title={b.v?.php != null ? `${b.v.stage_label} ${b.key.slice(0, 4)}: ${phpFull(b.v.php)} (${b.v.scope})` : 'The office was not found that year'}>
            <span className="bar-v num">{b.v?.php != null ? php(b.v.php).replace('₱', '') : '—'}</span>
            <span className="bar-track"><span className="bar-fill" style={{ height: `${((b.v?.php ?? 0) / max) * 100}%` }} /></span>
            <span className="bar-x">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="congresses" aria-hidden="true">
        {CONGRESSES.map((c) => <span key={c.label}>{c.label}</span>)}
      </div>
      {office.co_served_districts.length > 0 && (
        <p className="fine">Whole office, shared with {office.co_served_districts.map((d) => d.label).join('; ')}; not split.</p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Programs and projects that name the place
// ---------------------------------------------------------------------------

const NO_TOWN = '_none';

function Programs({ result, placeList, municipalities }: { result: GaaResult; placeList: string; municipalities: string[] }) {
  const { config } = usePortal();
  const all = result.rows;
  const totals = useMemo(() => gaaYearTotals(all), [all]);
  const maxTotal = Math.max(1, ...totals.map((t) => t.amount));

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const dept = params.get('dept') ?? '';
  const mun = params.get('mun') ?? '';
  const yearParam = Number(params.get('year'));
  const year = (GAA_YEARS as readonly number[]).includes(yearParam) ? yearParam : null;
  const [shown, setShown] = useState(PAGE);
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  const departments = useMemo(() => {
    const n = new Map<string, { label: string; rows: number }>();
    for (const r of all) {
      const d = n.get(r.department_id) ?? { label: departmentShort(r.department), rows: 0 };
      d.rows++;
      n.set(r.department_id, d);
    }
    return [...n.entries()].sort((a, b) => b[1].rows - a[1].rows);
  }, [all]);

  // Per municipality: the programs whose name mentions the town.
  const munCounts = useMemo(() => {
    const n = new Map<string, number>(municipalities.map((m) => [m, 0]));
    let untagged = 0;
    for (const r of all) {
      const towns = municipalitiesOf(r.name, municipalities);
      if (!towns.length) untagged++;
      for (const t of towns) n.set(t, (n.get(t) ?? 0) + 1);
    }
    return { n, untagged };
  }, [all, municipalities]);

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const y = year ? String(year) : null;
    const rows = all.filter((r) => {
      if (dept && r.department_id !== dept) return false;
      if (y && !hasYear(r, y)) return false;
      if (mun) {
        const towns = municipalitiesOf(r.name, municipalities);
        if (mun === NO_TOWN ? towns.length > 0 : !towns.includes(mun)) return false;
      }
      if (words.length) {
        const hay = `${r.name} ${r.department}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    return y ? [...rows].sort((a, b) => (b.years[y]?.amount ?? 0) - (a.years[y]?.amount ?? 0)) : rows;
  }, [all, q, dept, year, mun, municipalities]);
  const narrowed = filtered.length !== all.length;

  return (
    <>
      <section className="section" aria-labelledby="gaa-years-h">
        <h2 id="gaa-years-h" className="section-h">By year: the programs that name {placeList}</h2>
        <div className="ystrip" role="group" aria-label="Pick a year">
          {totals.map((t) => (
            <button
              key={t.year}
              type="button"
              className={`ycell${year === t.year ? ' active' : ''}`}
              aria-pressed={year === t.year}
              onClick={() => setParam('year', year === t.year ? '' : String(t.year))}
            >
              <span className="label">{t.year}</span>
              <span className="ybar"><span style={{ height: `${(t.amount / maxTotal) * 100}%` }} /></span>
              <span className="yv num">{php(t.amount)}</span>
              <span className="ysub">{plural(t.programs, 'program')} funded</span>
            </button>
          ))}
        </div>
        <p className="fine">Each year’s total covers only that year’s programs that name {placeList}. Years are shown side by side, not added up.</p>
      </section>

      <section className="section" id="programs" aria-labelledby="gaa-list-h">
        <div className="list-head">
          <h2 id="gaa-list-h" className="section-h">
            {narrowed ? `${count(filtered.length)} of ${plural(all.length, 'program')}` : `Every program and project (${count(all.length)})`}
          </h2>
          <button type="button" className="button button-quiet" onClick={() => downloadText(`${config.id}-gaa-${FIRST}-${LAST}.csv`, gaaCsv(filtered))}>
            Download CSV{narrowed ? ` (${count(filtered.length)})` : ''}
          </button>
        </div>
        <div className="toolbar">
          <label className="field field-grow">
            <span className="label">Search</span>
            <input type="search" value={q} placeholder="Road, school, barangay, agency…" onChange={(e) => setParam('q', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Department</span>
            <select value={dept} onChange={(e) => setParam('dept', e.target.value)}>
              <option value="">All departments</option>
              {departments.map(([id, d]) => <option key={id} value={id}>{d.label} ({count(d.rows)})</option>)}
            </select>
          </label>
          {municipalities.length > 0 && (
            <label className="field">
              <span className="label">Municipality</span>
              <select value={mun} onChange={(e) => setParam('mun', e.target.value)}>
                <option value="">Everywhere</option>
                {municipalities.map((m) => (
                  <option key={m} value={m}>{m} ({count(munCounts.n.get(m) ?? 0)})</option>
                ))}
                {munCounts.untagged > 0 && <option value={NO_TOWN}>No town named ({count(munCounts.untagged)})</option>}
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Year</span>
            <select value={year ?? ''} onChange={(e) => setParam('year', e.target.value)}>
              <option value="">All years</option>
              {totals.map((t) => <option key={t.year} value={t.year}>{t.year} ({count(t.programs)})</option>)}
            </select>
          </label>
        </div>
        {narrowed && (
          <p className="filter-sums">
            {year ? <>{year}: {php(filtered.reduce((a, r) => a + (r.years[String(year)]?.amount ?? 0), 0))} across these {count(filtered.length)}</> : <>{count(filtered.length)} shown</>}
            <span className="sep">·</span>
            <button type="button" className="link-button" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setShown(PAGE); }}>Clear filters</button>
          </p>
        )}

        {filtered.length > 0 && (
          <div className="table gtable" role="table" aria-label="Programs and projects, by year">
            <div className="tr th" role="row">
              <span role="columnheader">Program or project</span>
              {GAA_YEARS.map((y) => <span role="columnheader" key={y} className={`r${year === y ? ' ycol' : ''}`}>{y}</span>)}
            </div>
            {filtered.slice(0, shown).map((r) => <ProgramRow key={r.key} r={r} year={year} many={(config.scope.places?.length ?? 0) > 1} />)}
          </div>
        )}
        {filtered.length === 0 && <p className="state">No program matches. Try fewer words or clear the filters.</p>}
        {filtered.length > shown && (
          <div className="more">
            <span className="muted">Showing {count(shown)} of {count(filtered.length)}</span>
            <button type="button" className="button" onClick={() => setShown((n) => n + PAGE)}>Show {count(Math.min(PAGE, filtered.length - shown))} more</button>
            <button type="button" className="button button-quiet" onClick={() => setShown(filtered.length)}>Show all</button>
          </div>
        )}
        {result.queries.some((x) => x.truncated) && (
          <p className="fine">Some searches matched more programs than this page loads; see About the data.</p>
        )}
      </section>
    </>
  );
}

function ProgramRow({ r, year, many }: { r: GaaRow; year: number | null; many: boolean }) {
  return (
    <div className="tr" role="row">
      <span role="cell" className="td-project">
        <span className="gname">{r.name}</span>
        <span className="project-meta">
          <span className="label">{departmentShort(r.department)}</span>
          <External href={`https://budget.bettergov.ph/d/${r.department_id}`}>department</External>
          {many && r.reasons.map((p) => <span key={p} className="tag tag-place">names {p}</span>)}
        </span>
      </span>
      {GAA_YEARS.map((y) => {
        const has = hasYear(r, y);
        const amount = r.years[String(y)]?.amount ?? 0;
        return (
          <span role="cell" key={y} data-label={String(y)} className={`r num gcell${has ? '' : ' none'}${year === y ? ' ycol' : ''}`} title={has ? phpFull(amount) : `No appropriation under this name in ${y}`}>
            {has ? php(amount) : '—'}
          </span>
        );
      })}
    </div>
  );
}
