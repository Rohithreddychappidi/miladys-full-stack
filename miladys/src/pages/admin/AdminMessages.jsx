import { useEffect, useMemo, useState } from 'react';
import { api } from '../../data/api';
import { telHref, waHref } from '../../data/storeInfo';

// Admin → Messages. Everything sent through the website's Contact form.
// A copy of each message is also emailed to the store's email address.
const FILTERS = [
  { key: 'open', label: 'Inbox' },
  { key: 'new', label: 'Unread' },
  { key: 'replied', label: 'Replied' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
];
const STATUS_LABEL = { new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived' };

function formatDate(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// The contact form stores the email or the phone number the customer typed.
function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api.getMessages()
      .then(({ messages: m }) => setMessages(m))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    open: messages.filter((m) => m.status !== 'archived').length,
    new: messages.filter((m) => m.status === 'new').length,
    replied: messages.filter((m) => m.status === 'replied').length,
    archived: messages.filter((m) => m.status === 'archived').length,
    all: messages.length,
  }), [messages]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === 'open' && m.status === 'archived') return false;
      if (!['open', 'all'].includes(filter) && m.status !== filter) return false;
      if (!q) return true;
      return [m.name, m.email, m.phone, m.message].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [messages, filter, search]);

  async function setStatus(m, status) {
    setError('');
    try {
      const { message } = await api.updateMessage(m.id, status);
      setMessages((list) => list.map((x) => (x.id === m.id ? message : x)));
      window.dispatchEvent(new Event('admin-messages-changed'));
    } catch (err) {
      setError(err.message);
    }
  }

  function toggle(m) {
    setOpenId((id) => (id === m.id ? null : m.id));
    if (m.status === 'new') setStatus(m, 'read');
  }

  async function handleDelete(m) {
    if (!window.confirm(`Delete the message from ${m.name}? This can't be undone.`)) return;
    try {
      await api.deleteMessage(m.id);
      setMessages((list) => list.filter((x) => x.id !== m.id));
      window.dispatchEvent(new Event('admin-messages-changed'));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Messages</h1>
        <p>Messages sent from the Contact page. Each one is also emailed to your store email. Click a message to read it and reply.</p>
      </div>

      <div className="msg-toolbar">
        <div className="msg-filters" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={'msg-filter' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>
              {f.label} <span className="count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <input type="search" className="msg-search" placeholder="Search name, email, phone or text…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search messages" />
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {loading ? (
        <p className="msg-empty">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="msg-empty">{messages.length === 0 ? 'No messages yet. When a customer uses the Contact form, it shows up here.' : 'No messages match.'}</p>
      ) : (
        <ul className="msg-list">
          {visible.map((m) => {
            const open = openId === m.id;
            const subject = encodeURIComponent("Re: your message to Milady's");
            const quoted = encodeURIComponent(`Hi ${m.name},\n\n\n\n— Milady's\n\n> ${m.message.split('\n').join('\n> ')}`);
            return (
              <li key={m.id} className={'msg-item' + (m.status === 'new' ? ' unread' : '') + (open ? ' open' : '')}>
                <button type="button" className="msg-row" onClick={() => toggle(m)} aria-expanded={open}>
                  <span className="msg-who">
                    {m.status === 'new' && <span className="dot" aria-label="Unread" />}
                    <strong>{m.name}</strong>
                    <span className="msg-contact">{m.email || m.phone}</span>
                  </span>
                  <span className="msg-preview">{m.message}</span>
                  <span className="msg-meta">
                    <span className={`msg-status s-${m.status}`}>{STATUS_LABEL[m.status] || m.status}</span>
                    <span className="msg-date">{formatDate(m.created_at)}</span>
                  </span>
                </button>
                {open && (
                  <div className="msg-body">
                    <p className="msg-text">{m.message}</p>
                    <div className="msg-actions">
                      {m.email && (
                        <a className="btn btn-primary" href={`mailto:${m.email}?subject=${subject}&body=${quoted}`} onClick={() => setStatus(m, 'replied')}>Reply by email</a>
                      )}
                      {m.phone && (
                        <>
                          <a className="btn btn-primary" href={waHref(waNumber(m.phone), `Hi ${m.name}, this is Milady's replying to your message.`)} target="_blank" rel="noreferrer" onClick={() => setStatus(m, 'replied')}>Reply on WhatsApp</a>
                          <a className="btn btn-outline" href={telHref(m.phone)}>Call {m.phone}</a>
                        </>
                      )}
                      {m.status !== 'replied' && <button type="button" className="btn btn-outline" onClick={() => setStatus(m, 'replied')}>Mark as replied</button>}
                      {m.status !== 'new' && <button type="button" className="btn btn-outline" onClick={() => setStatus(m, 'new')}>Mark unread</button>}
                      {m.status === 'archived'
                        ? <button type="button" className="btn btn-outline" onClick={() => setStatus(m, 'read')}>Move to inbox</button>
                        : <button type="button" className="btn btn-outline" onClick={() => setStatus(m, 'archived')}>Archive</button>}
                      <button type="button" className="msg-delete" onClick={() => handleDelete(m)}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        .admin-page-head { margin-bottom: 26px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 640px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .msg-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .msg-filters { display: flex; flex-wrap: wrap; gap: 6px; }
        .msg-filter { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--stone-200); background: var(--paper); font-size: 12.5px; color: var(--ink-600); cursor: pointer; }
        .msg-filter.active { background: var(--maroon-900); border-color: var(--maroon-900); color: var(--ivory); }
        .msg-filter .count { opacity: 0.7; margin-left: 4px; }
        .msg-search { flex: 0 1 300px; padding: 9px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13px; background: var(--paper); }
        .msg-empty { font-size: 13px; color: var(--ink-400); background: var(--paper); padding: 28px; border-radius: var(--radius-md); }
        .msg-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .msg-item { background: var(--paper); border-radius: var(--radius-md); border: 1px solid transparent; }
        .msg-item.open { border-color: var(--stone-200); }
        .msg-row { width: 100%; display: grid; grid-template-columns: 220px minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 14px 18px; background: none; border: none; text-align: left; cursor: pointer; font: inherit; color: var(--ink-700); }
        .msg-who { display: flex; flex-direction: column; gap: 2px; position: relative; padding-left: 14px; min-width: 0; }
        .msg-who strong { font-size: 13.5px; font-weight: 500; color: var(--ink-800); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .msg-item.unread .msg-who strong { font-weight: 700; }
        .msg-contact { font-size: 11.5px; color: var(--ink-400); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dot { position: absolute; left: 0; top: 6px; width: 7px; height: 7px; border-radius: 50%; background: var(--maroon-800); }
        .msg-preview { font-size: 13px; color: var(--ink-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .msg-meta { display: flex; align-items: center; gap: 12px; }
        .msg-date { font-size: 11.5px; color: var(--ink-400); white-space: nowrap; }
        .msg-status { font-size: 10.5px; padding: 3px 8px; border-radius: 999px; background: var(--stone-100); color: var(--ink-600); white-space: nowrap; }
        .msg-status.s-new { background: #f6e3e3; color: var(--maroon-900); }
        .msg-status.s-replied { background: #e2f1e6; color: #1e7039; }
        .msg-body { padding: 4px 18px 18px 32px; }
        .msg-text { white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: var(--ink-700); margin: 0 0 16px; }
        .msg-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .msg-actions .btn { padding: 9px 14px; font-size: 12.5px; }
        .msg-delete { margin-left: auto; background: none; border: none; color: #a13a3a; font-size: 12.5px; cursor: pointer; }
        @media (max-width: 760px) {
          .msg-row { grid-template-columns: 1fr; gap: 6px; }
          .msg-search { flex: 1 1 100%; }
          .msg-body { padding-left: 18px; }
        }
      `}</style>
    </div>
  );
}
