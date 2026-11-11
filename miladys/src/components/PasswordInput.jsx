import { useState } from 'react';

// Password box with a show/hide (eye) button. Any extra props go to the
// <input>, so it works anywhere a normal password input does.
export default function PasswordInput({ className = '', ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <span className={`pw-field ${className}`}>
      <input {...props} type={shown ? 'text' : 'password'} />
      <button
        type="button"
        className="pw-eye"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        title={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 4.4-1.1" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
      <style>{`
        .pw-field { position: relative; display: block; width: 100%; }
        .pw-field input { width: 100%; padding-right: 44px !important; box-sizing: border-box; }
        .pw-eye { position: absolute; top: 50%; right: 4px; transform: translateY(-50%); width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border: none; background: none; color: var(--ink-400); cursor: pointer; border-radius: var(--radius-sm); }
        .pw-eye:hover, .pw-eye[aria-pressed="true"] { color: var(--maroon-900); }
        .pw-eye:focus-visible { outline: 2px solid var(--gold-500); outline-offset: 1px; }
      `}</style>
    </span>
  );
}
