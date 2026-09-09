import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load Google Sign-In.'));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

// Renders Google's own "Sign in with Google" button and hands back the ID
// token via onCredential(credential) once someone completes it — nothing
// is verified here, that happens server-side in POST /api/auth/google.
// Renders nothing if VITE_GOOGLE_CLIENT_ID isn't set, so the rest of the
// login page still works fine before Google sign-in is configured.
export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        });
        setReady(true);
      })
      .catch((err) => onError?.(err.message));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="google-signin-wrap">
      {!ready && <div className="google-signin-placeholder" aria-hidden="true" />}
      <div ref={buttonRef} />
    </div>
  );
}
