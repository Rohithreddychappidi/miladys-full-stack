import { useState } from 'react';
import RecommendedProducts from '../components/RecommendedProducts';

export default function Contact() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="contact-page">
      <div className="container contact-grid">
        <div className="contact-info">
          <p className="eyebrow">Get in touch</p>
          <h1>Contact Us</h1>
          <p className="contact-lead">
            Questions about a saree, a bulk order, or a custom request — reach us directly
            or drop a message and we&apos;ll get back within a day.
          </p>

          <dl className="info-list">
            <div>
              <dt>Phone</dt>
              <dd><a href="tel:+917842225444">+91 78422 25444</a></dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd><a href="mailto:themiladysofficial@gmail.com">themiladysofficial@gmail.com</a></dd>
            </div>
            <div>
              <dt>Store</dt>
              <dd>Flat No. 402, JM&apos;s CNR Tower, Srinagar, Kakinada, A.P. 533003</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>Mon – Sat, 10am – 9pm · Sunday, 10am – 7pm</dd>
            </div>
            <div>
              <dt>Instagram</dt>
              <dd><a href="https://www.instagram.com/themiladys_" target="_blank" rel="noreferrer">@themiladys_</a></dd>
            </div>
          </dl>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          {sent ? (
            <div className="form-sent">
              <h3>Message received</h3>
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
                <textarea name="message" rows="5" required placeholder="Tell us what you're looking for" />
              </label>
              <button type="submit" className="btn btn-primary">Send Message</button>
            </>
          )}
        </form>
      </div>

      <RecommendedProducts />

      <style>{`
        .contact-page { padding: 70px 0 0; }
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
