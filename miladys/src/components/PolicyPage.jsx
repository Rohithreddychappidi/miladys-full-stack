import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from './Seo';
import { api } from '../data/api';
import { POLICY_PAGES } from '../data/policyDefaults';
import { addressInline, telHref, useStoreInfo } from '../data/storeInfo';

// One policy page (Privacy / Terms / Return & Refund). The wording is
// edited in Admin → Policy Pages and saved as the CMS section `sectionKey`;
// until then the defaults in data/policyDefaults.js are shown. The layout
// and styles are exactly those the three pages had as separate components.
export default function PolicyPage({ sectionKey }) {
  const defaults = POLICY_PAGES[sectionKey];
  const [page, setPage] = useState(defaults);
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    let active = true;
    api.getHomeSection(sectionKey)
      .then(({ section }) => {
        if (!active || !section?.content) return;
        const c = section.content;
        setPage({ ...defaults, ...Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'string' && v.trim())) });
      })
      .catch(() => {});
    return () => { active = false; };
  }, [sectionKey, defaults]);

  const needsTiers = /\[refund table\]/i.test(page.body);
  useEffect(() => {
    if (!needsTiers) return undefined;
    let active = true;
    api.getCancellationPolicy()
      .then(({ policy }) => active && Array.isArray(policy) && setTiers(policy))
      .catch(() => {});
    return () => { active = false; };
  }, [needsTiers]);

  return (
    <div className="policy-page">
      <Seo title={page.label} path={page.path} description={page.seo} />
      <div className="container policy-container">
        <div className="policy-breadcrumbs">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <span>{page.title}</span>
        </div>

        <header className="policy-header">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          {page.lastUpdated && <p className="last-updated">Last updated: {page.lastUpdated}</p>}
        </header>

        <PolicyContent body={page.body} tiers={tiers} />
      </div>
      <PolicyStyles />
    </div>
  );
}

// Renders the simple text format (see data/policyDefaults.js). Also used for
// the live preview in Admin → Policy Pages.
export function PolicyContent({ body, tiers = [], store: storeOverride }) {
  const storeLive = useStoreInfo();
  const store = storeOverride || storeLive;
  const sections = parse(body);
  return (
    <div className="policy-content">
      {sections.map((sec, i) => (
        <section className="policy-section" key={i}>
          {sec.heading && <h2>{inline(sec.heading, store)}</h2>}
          {sec.blocks.map((b, j) => <Block key={j} block={b} store={store} tiers={tiers} />)}
        </section>
      ))}
    </div>
  );
}

function Block({ block, store, tiers }) {
  switch (block.type) {
    case 'list':
      return <ul>{block.items.map((t, i) => <li key={i}>{inline(t, store)}</li>)}</ul>;
    case 'box':
      return <div className="contact-box">{block.lines.map((t, i) => <p key={i}>{inline(t, store)}</p>)}</div>;
    case 'callout':
      return <div className="policy-callout">{block.lines.map((t, i) => <p key={i}>{inline(t, store)}</p>)}</div>;
    case 'note':
      return <p className="policy-note">{inline(block.text, store)}</p>;
    case 'refund':
      return tiers.length > 0 ? (
        <div className="tiers-table-wrap">
          <table className="tiers-table">
            <thead>
              <tr>
                <th>Timeframe</th>
                <th>Cancellation Window</th>
                <th>Refund Amount</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.label}</strong></td>
                  <td>Up to {t.max_days} {t.max_days === 1 ? 'day' : 'days'} after payment</td>
                  <td className="refund-highlight">{t.refund_percent}% of merchandise value</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="policy-callout">
          <p>
            <strong>Standard Cancellation Window:</strong> Orders cancelled within 24 hours of placement receive a full 100% refund. Once packed and dispatched, orders cannot be self-cancelled.
          </p>
        </div>
      );
    default:
      return <p>{inline(block.text, store)}</p>;
  }
}

// Text → sections of blocks.
export function parse(body) {
  const sections = [];
  let sec = { heading: null, blocks: [] };
  let para = [];
  let list = null;
  let boxed = null; // { type: 'box'|'callout', lines: [] }
  const flushPara = () => { if (para.length) { sec.blocks.push({ type: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { sec.blocks.push({ type: 'list', items: list }); list = null; } };
  const flush = () => { flushPara(); flushList(); };

  for (const raw of String(body || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (boxed) {
      if (/^\[\/(box|callout)\]$/i.test(line)) { sec.blocks.push(boxed); boxed = null; }
      else if (line) boxed.lines.push(line);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      if (sec.heading || sec.blocks.length) sections.push(sec);
      sec = { heading: line.replace(/^##\s+/, ''), blocks: [] };
    } else if (/^\[(box|callout)\]$/i.test(line)) {
      flush(); boxed = { type: line.toLowerCase().includes('box') ? 'box' : 'callout', lines: [] };
    } else if (/^\[refund table\]$/i.test(line)) {
      flush(); sec.blocks.push({ type: 'refund' });
    } else if (/^\[note\]/i.test(line)) {
      flush(); sec.blocks.push({ type: 'note', text: line.replace(/^\[note\]\s*/i, '') });
    } else if (/^[-•]\s+/.test(line)) {
      flushPara(); (list ||= []).push(line.replace(/^[-•]\s+/, ''));
    } else if (!line) {
      flush();
    } else {
      flushList(); para.push(line);
    }
  }
  if (boxed) sec.blocks.push(boxed);
  flush();
  if (sec.heading || sec.blocks.length) sections.push(sec);
  return sections;
}

// **bold**, *italic*, [text](link), and {phone} {email} {address} tokens.
function inline(text, store) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\)|\{(?:phone|email|address)\})/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{inline(part.slice(2, -2), store)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{inline(part.slice(1, -1), store)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      return href.startsWith('/')
        ? <Link key={i} to={href}>{label}</Link>
        : <a key={i} href={href} target={/^https?:/i.test(href) ? '_blank' : undefined} rel="noreferrer">{label}</a>;
    }
    if (part === '{phone}') return store.phone ? <a key={i} href={telHref(store.phone)}>{store.phone}</a> : null;
    if (part === '{email}') return store.email ? <a key={i} href={`mailto:${store.email}`}>{store.email}</a> : null;
    if (part === '{address}') return <Fragment key={i}>{addressInline(store.address)}</Fragment>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function PolicyStyles() {
  return (
    <style>{`
      .policy-page { padding: 48px 0 80px; }
      .policy-container { max-width: 860px; margin: 0 auto; }
      .policy-breadcrumbs {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--ink-400);
        margin-bottom: 28px;
      }
      .policy-breadcrumbs a { color: var(--ink-400); text-decoration: none; transition: color 0.2s; }
      .policy-breadcrumbs a:hover { color: var(--maroon-900); }
      .policy-breadcrumbs .sep { color: var(--stone-300); }
      .policy-header { margin-bottom: 40px; border-bottom: 1px solid var(--stone-200); padding-bottom: 24px; }
      .policy-header .eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--maroon-900); font-weight: 600; margin-bottom: 6px; }
      .policy-header h1 { font-size: 36px; color: var(--maroon-950); margin-bottom: 8px; }
      .last-updated { font-size: 13px; color: var(--ink-400); }
      .policy-content { display: flex; flex-direction: column; gap: 32px; font-size: 15px; line-height: 1.8; color: var(--ink-700); }
      .policy-section h2 { font-size: 20px; color: var(--maroon-900); margin-bottom: 12px; font-weight: 600; }
      .policy-section p { margin-bottom: 12px; }
      .policy-section ul { padding-left: 22px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
      .tiers-table-wrap { overflow-x: auto; margin: 16px 0; border: 1px solid var(--stone-200); border-radius: var(--radius-sm); }
      .tiers-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
      .tiers-table th { background: #faf7f5; padding: 12px 16px; font-weight: 600; color: var(--maroon-900); border-bottom: 1px solid var(--stone-200); }
      .tiers-table td { padding: 12px 16px; border-bottom: 1px solid var(--stone-200); color: var(--ink-800); }
      .tiers-table tr:last-child td { border-bottom: none; }
      .refund-highlight { font-weight: 600; color: #1e7039; }
      .policy-callout { background: #faf7f5; border-left: 4px solid var(--maroon-900); padding: 14px 18px; border-radius: 4px; margin: 14px 0; }
      .policy-note { font-size: 13px; color: var(--ink-500); }
      .contact-box {
        background: #faf7f5;
        border: 1px solid var(--stone-200);
        border-left: 4px solid var(--maroon-900);
        border-radius: var(--radius-sm);
        padding: 18px 22px;
        margin-top: 14px;
      }
      .contact-box p { margin-bottom: 6px; }
      .contact-box a { color: var(--maroon-900); font-weight: 500; text-decoration: underline; }
    `}</style>
  );
}
