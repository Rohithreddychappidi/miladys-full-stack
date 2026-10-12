import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { api } from '../data/api';

export default function ReturnRefundPolicy() {
  const [policyTiers, setPolicyTiers] = useState([]);

  useEffect(() => {
    api
      .getCancellationPolicy()
      .then(({ policy }) => {
        if (Array.isArray(policy) && policy.length) setPolicyTiers(policy);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="policy-page">
      <Seo
        title="Return & Refund Policy"
        path="/return-policy"
        description="Learn about order cancellations, refund windows, and return guidelines for Milady's sarees."
      />
      <div className="container policy-container">
        <div className="policy-breadcrumbs">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <span>Return, Refund &amp; Cancellation Policy</span>
        </div>

        <header className="policy-header">
          <p className="eyebrow">Customer Care</p>
          <h1>Return, Refund &amp; Cancellation Policy</h1>
          <p className="last-updated">Last updated: October 2026</p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Order Cancellation Policy</h2>
            <p>
              We understand plans can change. You can easily cancel an order directly from your <Link to="/orders">My Orders</Link> page as long as the cancellation window has not passed.
            </p>
            <p>
              Refund amounts for cancellations are determined based on the time elapsed between order payment and cancellation request:
            </p>

            {policyTiers.length > 0 ? (
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
                    {policyTiers.map((t) => (
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
            )}
            <p className="policy-note">
              <em>Note:</em> Shipping fees incurred are non-refundable once the order has been dispatched.
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Returns &amp; Exchanges</h2>
            <p>
              Every Milady&apos;s saree is carefully inspected by our handloom curators before packaging. Because sarees are delicate, luxury items:
            </p>
            <ul>
              <li>
                <strong>Eligibility:</strong> Returns are accepted within <strong>48 hours of delivery</strong> only in the rare event of transit damage, manufacturing defects, or if an incorrect product was delivered.
              </li>
              <li>
                <strong>Unboxing Video:</strong> To claim transit damage or defects, customers must provide an uncut, clear unboxing video recorded from the moment the sealed parcel is opened.
              </li>
              <li>
                <strong>Condition:</strong> The saree must be unwashed, unworn, unscented, in its original pristine fold, and accompanied by all original tags, accessories, and packaging.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Non-Returnable Items</h2>
            <p>The following items are not eligible for return or exchange:</p>
            <ul>
              <li>Sarees with customized blouse stitching, pico, or fall work requested by the customer.</li>
              <li>Sarees showing signs of use, wear, fragrance, or altered folds.</li>
              <li>Items purchased during promotional flash clearance sales labeled as &ldquo;Final Sale&rdquo;.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. Refund Processing &amp; Timelines</h2>
            <p>
              Once your cancellation is submitted or returned merchandise is received and verified at our quality inspection facility:
            </p>
            <ul>
              <li>The approved refund will be initiated back to your original payment method via <strong>Razorpay</strong>.</li>
              <li>Refunds typically reflect in your bank account, card, or UPI app within <strong>5 to 7 working days</strong>, depending on your banking partner.</li>
              <li>You will receive an automated email confirmation once the refund has been initiated from our system.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>5. How to Initiate a Return</h2>
            <p>
              If your delivered saree qualifies for a return, please reach out to our team within 48 hours:
            </p>
            <div className="contact-box">
              <p><strong>Milady&apos;s Support Team</strong></p>
              <p>WhatsApp / Call: <a href="tel:+917842225444">+91 78422 25444</a></p>
              <p>Email: <a href="mailto:themiladysofficial@gmail.com">themiladysofficial@gmail.com</a></p>
              <p>Address: Flat No. 402, JM&apos;s CNR Tower, Srinagar, Kakinada, A.P. 533003</p>
              <p>Please mention your <strong>Order ID (e.g. #MLD123)</strong> and attach the unboxing photos/video.</p>
            </div>
          </section>
        </div>
      </div>

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
    </div>
  );
}
