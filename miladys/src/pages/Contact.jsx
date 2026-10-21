import { useState } from 'react';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { api } from '../data/api';
import { addressInline, instagramHandle, lines, mapEmbedUrl, telHref, useStoreInfo, waHref } from '../data/storeInfo';

export default function Contact() {
  const info = useStoreInfo();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Messages are saved to Admin → Messages and emailed to the store.
  // (This form used to show "Message received" without sending anything.)
  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSending(true);
    setError('');
    try {
      await api.submitContact({
        name: form.get('name'),
        contact: form.get('contact'),
        message: form.get('message'),
        website: form.get('website'),
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contact-page">
      <Seo
        title="Contact Us"
        path="/contact"
        description="Get in touch with Milady's for order queries, custom requests, or anything about our handloom sarees."
      />
      <div className="container contact-grid">
        <div className="contact-info">
          <p className="eyebrow">Get in touch</p>
          <h1>Contact Us</h1>
          <p className="contact-lead">
            Questions about a saree, a bulk order, or a custom request — reach us directly
            or drop a message and we&apos;ll get back within a day.
          </p>

          <dl className="info-list">
            {info.phone && (
            <div>
              <dt>Phone</dt>
              <dd><a href={telHref(info.phone)}>{info.phone}</a></dd>
            </div>
            )}
            {info.whatsapp && (
            <div>
              <dt>WhatsApp</dt>
              <dd>
                <a href={waHref(info.whatsapp)} target="_blank" rel="noreferrer" className="whatsapp-link">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8.5 8.7c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.4.2.5.7 1.6.7 1.7.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4.1.5-.1 1.4-.6 1.8-.6.5-1.6.8-2.6.5-1.8-.5-3.7-1.6-5.1-3.1-1.3-1.3-2.1-2.7-2.4-3.4-.3-.7-.4-1.7.2-2.4z" fill="currentColor" />
                  </svg>
                  {info.whatsapp.length > 10 ? `+${info.whatsapp.slice(0, info.whatsapp.length - 10)} ${info.whatsapp.slice(-10, -5)} ${info.whatsapp.slice(-5)}` : info.whatsapp}
                </a>
              </dd>
            </div>
            )}
            {info.email && (
            <div>
              <dt>Email</dt>
              <dd><a href={`mailto:${info.email}`}>{info.email}</a></dd>
            </div>
            )}
            {info.address && (
            <div>
              <dt>Store</dt>
              <dd>
                {addressInline(info.address)}
                {info.mapsLink && (
                  <>
                    <br />
                    <a href={info.mapsLink} target="_blank" rel="noreferrer" className="directions-link">Get Directions →</a>
                  </>
                )}
              </dd>
            </div>
            )}
            {info.hours && (
            <div>
              <dt>Hours</dt>
              <dd>{lines(info.hours).join(' · ')}</dd>
            </div>
            )}
            {info.instagram && (
            <div>
              <dt>Instagram</dt>
              <dd><a href={info.instagram} target="_blank" rel="noreferrer">{instagramHandle(info.instagram)}</a></dd>
            </div>
            )}
          </dl>

          <div className="map-embed">
            <iframe
              title="Milady's store location"
              src={mapEmbedUrl(info.address)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          {sent ? (
            <div className="form-sent">
              <h3>Message sent</h3>
              <p>Thank you — someone from Milady&apos;s will get back to you shortly.</p>
            </div>
          ) : (
            <>
              <label>
                Name
                <input type="text" name="name" required placeholder="Your name" />
              </label>
              <label>
                Phone or Email
                <input type="text" name="contact" required placeholder="How should we reach you?" />
              </label>
              <label>
                Message
                <textarea name="message" rows="5" required maxLength={4000} placeholder="Tell us what you're looking for" />
              </label>
              {/* Spam trap: hidden from people, filled in by bots. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send Message'}</button>
            </>
          )}
        </form>
      </div>

      <RecommendedProducts />

      <style>{`
        .contact-page { padding: 70px 0 0; }
        .hp-field { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
        .form-error { font-size: 13px; color: #a13a3a; margin: 0; }
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 70px;
          margin-bottom: 60px;
        }
        .contact-page h1 { font-size: 34px; margin: 8px 0 18px; }
        .contact-lead { font-size: 14.5px; line-height: 1.8; color: var(--ink-600); max-width: 420px; margin-bottom: 34px; }
        .info-list { display: flex; flex-direction: column; gap: 18px; }
        .info-list dt {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold-600);
          margin-bottom: 4px;
        }
        .info-list dd { margin: 0; font-size: 14.5px; color: var(--ink-900); line-height: 1.6; }
        .whatsapp-link { display: inline-flex; align-items: center; gap: 8px; }
        .whatsapp-link svg { width: 17px; height: 17px; color: #25D366; flex: 0 0 auto; }
        .directions-link { font-size: 12.5px; color: var(--gold-600); }

        .map-embed {
          margin-top: 28px;
          border-radius: var(--radius-md);
          overflow: hidden;
          aspect-ratio: 16 / 10;
          border: 1px solid var(--stone-200);
        }
        .map-embed iframe { width: 100%; height: 100%; border: 0; }

        .contact-form {
          background: var(--stone-100);
          border-radius: var(--radius-md);
          padding: 36px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .contact-form label {
          font-size: 12.5px;
          color: var(--ink-600);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .contact-form input, .contact-form textarea {
          font-family: var(--font-body);
          font-size: 14px;
          padding: 13px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          background: var(--paper);
          resize: vertical;
        }
        .contact-form .btn { margin-top: 8px; align-self: flex-start; }
        .form-sent { text-align: center; padding: 40px 10px; }
        .form-sent h3 { margin-bottom: 10px; }
        .form-sent p { font-size: 13.5px; color: var(--ink-600); }
        @media (max-width: 860px) {
          .contact-grid { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
    </div>
  );
}
