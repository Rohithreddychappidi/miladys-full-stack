import { useEffect, useState } from 'react';
import { api } from '../../data/api';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';

// Admin → Account & Security: change the admin password (the security
// questions pop up to confirm it), and set the security questions that
// also let the admin reset a forgotten password from the admin sign-in.
export const PRESET_QUESTIONS = [
  'What was the name of your first school?',
  'In which town or city were you born?',
  'What is your mother’s maiden name?',
  'What was the name of your first pet?',
  'What was the make of your first vehicle?',
  'What is the name of the street you grew up on?',
  'What is your favourite childhood food?',
  'Who was your favourite teacher?',
  'What is the first name of your oldest cousin?',
];
const CUSTOM = '__custom__';
const blankItem = (i) => ({ choice: PRESET_QUESTIONS[i], custom: '', answer: '' });

export function passwordProblem(pw) {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use both letters and numbers.';
  return null;
}

export default function AdminAccount() {
  const { user, adoptSession, logout } = useAuth();
  const [security, setSecurity] = useState(null); // { configured, questions, updatedAt }
  const [loadError, setLoadError] = useState('');

  const loadSecurity = () => api.adminSecurity().then(setSecurity).catch((err) => setLoadError(err.message));
  useEffect(() => { loadSecurity(); }, []);

  // --- Change password ---
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState('');
  const [asking, setAsking] = useState(false); // questions pop-up open
  const [answers, setAnswers] = useState([]);
  const [askError, setAskError] = useState('');
  const [busy, setBusy] = useState(false);

  function startChange(e) {
    e.preventDefault();
    setPwError(''); setPwDone('');
    if (!security?.configured) { setPwError('Set up your security questions below first — they are asked every time the password changes.'); return; }
    const problem = passwordProblem(pw.next);
    if (problem) { setPwError(`New password: ${problem}`); return; }
    if (pw.next !== pw.confirm) { setPwError('The new passwords don’t match.'); return; }
    if (pw.next === pw.current) { setPwError('The new password must be different from the current one.'); return; }
    setAnswers(security.questions.map(() => ''));
    setAskError('');
    setAsking(true);
  }

  async function confirmChange(e) {
    e.preventDefault();
    setAskError('');
    if (answers.some((a) => !a.trim())) { setAskError('Please answer every question.'); return; }
    setBusy(true);
    try {
      const { token, user: u } = await api.adminChangePassword({ currentPassword: pw.current, newPassword: pw.next, answers });
      adoptSession(token, u);
      setAsking(false);
      setPw({ current: '', next: '', confirm: '' });
      setPwDone('Password changed. Any other device signed in to the admin panel has been signed out.');
    } catch (err) {
      if (err.data?.code === 'WRONG_ANSWERS' || err.status === 429) setAskError(err.message);
      else { setAsking(false); setPwError(err.message); }
    } finally {
      setBusy(false);
    }
  }

  // --- Security questions ---
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState([0, 1, 2].map(blankItem));
  const [qPassword, setQPassword] = useState('');
  const [qError, setQError] = useState('');
  const [qDone, setQDone] = useState('');
  const [qBusy, setQBusy] = useState(false);

  useEffect(() => { if (security && !security.configured) setEditing(true); }, [security]);

  const setItem = (i, patch) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const questionText = (it) => (it.choice === CUSTOM ? it.custom.trim() : it.choice);

  async function saveQuestions(e) {
    e.preventDefault();
    setQError(''); setQDone('');
    const texts = items.map(questionText);
    if (texts.some((t) => t.length < 5)) { setQError('Write each of your own questions in full.'); return; }
    if (new Set(texts.map((t) => t.toLowerCase())).size !== texts.length) { setQError('Pick three different questions.'); return; }
    if (items.some((it) => it.answer.trim().length < 2)) { setQError('Each answer needs at least 2 characters.'); return; }
    if (!qPassword) { setQError('Enter your current password to save.'); return; }
    setQBusy(true);
    try {
      await api.saveAdminSecurity({ currentPassword: qPassword, items: items.map((it) => ({ question: questionText(it), answer: it.answer })) });
      setItems([0, 1, 2].map(blankItem));
      setQPassword('');
      setEditing(false);
      setQDone('Security questions saved. Keep the answers somewhere safe — they reset the password if it’s ever forgotten.');
      loadSecurity();
    } catch (err) {
      setQError(err.message);
    } finally {
      setQBusy(false);
    }
  }

  return (
    <div className="acct">
      <div className="admin-page-head">
        <h1>Account &amp; Security</h1>
        <p>
          Signed in as <strong>{user?.name}</strong> ({user?.email}). For safety, the admin panel signs you out when the browser is closed,
          and after 8 hours in any case.
        </p>
      </div>

      {loadError && <p className="admin-error" role="alert">{loadError}</p>}

      <section className="acct-card">
        <h3>Change password</h3>
        <p className="hint">Your security questions pop up to confirm the change. Use at least 8 characters with letters and numbers.</p>
        <form onSubmit={startChange} className="acct-form">
          <label>
            Current password
            <PasswordInput autoComplete="current-password" required value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
          </label>
          <label>
            New password
            <PasswordInput autoComplete="new-password" required minLength={8} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
            {pw.next && <PasswordChecks pw={pw.next} />}
          </label>
          <label>
            Confirm new password
            <PasswordInput autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
            {pw.confirm && pw.confirm !== pw.next && <span className="field-warn">Doesn’t match the new password yet.</span>}
          </label>
          {pwError && <p className="admin-error" role="alert">{pwError}</p>}
          {pwDone && <p className="acct-ok" role="status">{pwDone}</p>}
          <div><button type="submit" className="btn btn-primary" disabled={!security}>Change password</button></div>
        </form>
      </section>

      <section className="acct-card">
        <h3>Security questions</h3>
        {security?.configured && !editing && (
          <>
            <p className="hint">Asked whenever the password changes, and on “Forgot password?” at the admin sign-in. Answers are stored scrambled — nobody can read them, not even here.</p>
            <ol className="q-list">
              {security.questions.map((q) => <li key={q}>{q}</li>)}
            </ol>
            {qDone && <p className="acct-ok" role="status">{qDone}</p>}
            <div><button type="button" className="btn btn-outline" onClick={() => { setEditing(true); setQDone(''); }}>Change questions</button></div>
          </>
        )}
        {security && editing && (
          <form onSubmit={saveQuestions} className="acct-form">
            <p className="hint">
              {security.configured ? 'Choose new questions and answers. ' : 'Not set up yet — set them now. '}
              Answers aren’t case-sensitive. Pick answers you’ll remember exactly but others can’t guess.
            </p>
            {items.map((it, i) => (
              <fieldset key={i} className="q-row">
                <legend>Question {i + 1}</legend>
                <select value={it.choice} onChange={(e) => setItem(i, { choice: e.target.value })} aria-label={`Question ${i + 1}`}>
                  {PRESET_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                  <option value={CUSTOM}>Write my own question…</option>
                </select>
                {it.choice === CUSTOM && (
                  <input type="text" maxLength={200} placeholder="Type your question" value={it.custom} onChange={(e) => setItem(i, { custom: e.target.value })} aria-label={`Your question ${i + 1}`} />
                )}
                <PasswordInput autoComplete="off" maxLength={100} placeholder="Answer" value={it.answer} onChange={(e) => setItem(i, { answer: e.target.value })} aria-label={`Answer ${i + 1}`} />
              </fieldset>
            ))}
            <label>
              Current password
              <PasswordInput autoComplete="current-password" value={qPassword} onChange={(e) => setQPassword(e.target.value)} />
            </label>
            {qError && <p className="admin-error" role="alert">{qError}</p>}
            <div className="acct-actions">
              <button type="submit" className="btn btn-primary" disabled={qBusy}>{qBusy ? 'Saving…' : 'Save questions'}</button>
              {security.configured && <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setQError(''); }}>Cancel</button>}
            </div>
          </form>
        )}
      </section>

      <section className="acct-card">
        <h3>Sign out</h3>
        <p className="hint">Signs this browser out of the admin panel.</p>
        <div><button type="button" className="btn btn-outline" onClick={logout}>Log out</button></div>
      </section>

      {asking && (
        <QuestionsDialog
          title="Confirm it’s you"
          intro="Answer your security questions to change the password."
          questions={security.questions}
          answers={answers}
          setAnswers={setAnswers}
          error={askError}
          busy={busy}
          submitLabel="Change password"
          onSubmit={confirmChange}
          onClose={() => !busy && setAsking(false)}
        />
      )}

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 620px; line-height: 1.6; }
        .acct { max-width: 640px; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
        .acct-ok { font-size: 12.5px; color: #2f6b3a; background: #eaf4ec; padding: 10px 12px; border-radius: var(--radius-sm); margin: 0; }
        .acct-card { background: var(--paper); border-radius: var(--radius-md); padding: 22px 24px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
        .acct-card h3 { font-family: var(--font-display); font-size: 16px; color: var(--maroon-900); margin: 0; }
        .acct-card .hint { font-size: 12px; color: var(--ink-400); line-height: 1.55; margin: 0; }
        .acct-form { display: flex; flex-direction: column; gap: 14px; }
        .acct-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .acct-form input, .acct-form select { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-family: var(--font-body); font-size: 13.5px; background: var(--paper); width: 100%; box-sizing: border-box; }
        .field-warn { font-size: 11.5px; color: #a13a3a; }
        .q-list { margin: 0; padding-left: 20px; font-size: 13.5px; color: var(--ink-900); line-height: 1.9; }
        .q-row { border: 1px solid var(--stone-200); border-radius: var(--radius-sm); padding: 12px 14px 14px; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .q-row legend { font-size: 11.5px; color: var(--ink-400); padding: 0 6px; letter-spacing: 0.04em; text-transform: uppercase; }
        .acct-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}

// Live ticks for the password rules.
export function PasswordChecks({ pw }) {
  const rules = [
    ['8+ characters', pw.length >= 8],
    ['a letter', /[A-Za-z]/.test(pw)],
    ['a number', /[0-9]/.test(pw)],
  ];
  return (
    <span className="pw-checks">
      {rules.map(([label, ok]) => <span key={label} className={ok ? 'ok' : ''}>{ok ? '✓' : '○'} {label}</span>)}
      <style>{`
        .pw-checks { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11.5px; color: var(--ink-400); }
        .pw-checks .ok { color: #2f6b3a; }
      `}</style>
    </span>
  );
}

// The pop-up that asks the security questions (password change, and the
// forgot-password flow on the admin sign-in).
export function QuestionsDialog({ title, intro, questions, answers, setAnswers, error, busy, submitLabel, onSubmit, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="qd-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="qd" role="dialog" aria-modal="true" aria-labelledby="qd-title" onSubmit={onSubmit}>
        <h2 id="qd-title">{title}</h2>
        {intro && <p className="qd-intro">{intro}</p>}
        {questions.map((q, i) => (
          <label key={q}>
            {q}
            <PasswordInput
              autoComplete="off"
              autoFocus={i === 0}
              value={answers[i] || ''}
              onChange={(e) => setAnswers((list) => list.map((a, j) => (j === i ? e.target.value : a)))}
              aria-label={q}
            />
          </label>
        ))}
        {children}
        {error && <p className="qd-error" role="alert">{error}</p>}
        <div className="qd-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : submitLabel}</button>
        </div>
      </form>
      <style>{`
        .qd-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(36, 26, 23, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .qd { width: 100%; max-width: 440px; max-height: calc(100vh - 32px); overflow-y: auto; background: var(--paper); border-radius: var(--radius-md); padding: 26px 26px 22px; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; }
        .qd h2 { font-family: var(--font-display); font-size: 20px; color: var(--maroon-900); margin: 0; }
        .qd-intro { font-size: 12.5px; color: var(--ink-400); margin: 0; line-height: 1.5; }
        .qd label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ink-900); }
        .qd input { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-family: var(--font-body); font-size: 13.5px; background: var(--paper); width: 100%; box-sizing: border-box; }
        .qd-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
        .qd-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
      `}</style>
    </div>
  );
}
