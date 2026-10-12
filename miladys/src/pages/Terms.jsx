import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function Terms() {
  return (
    <div className="policy-page">
      <Seo
        title="Terms & Conditions"
        path="/terms-and-conditions"
        description="Review the terms and conditions governing purchases and browsing on Milady's online saree store."
      />
      <div className="container policy-container">
        <div className="policy-breadcrumbs">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <span>Terms &amp; Conditions</span>
        </div>

        <header className="policy-header">
          <p className="eyebrow">Legal Agreement</p>
          <h1>Terms &amp; Conditions</h1>
          <p className="last-updated">Last updated: October 2026</p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              By visiting, browsing, or purchasing from <strong>Milady&apos;s</strong> (themiladys.com), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any part of these terms, please do not use our website.
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Handloom Authenticity &amp; Product Representation</h2>
            <p>
              Milady&apos;s is dedicated to presenting authentic handwoven and curated designer sarees. Due to the handcrafted nature of weaving:
            </p>
            <ul>
              <li>
                <strong>Color Variations:</strong> Saree colors, zari sheen, and motifs displayed on digital screens may vary slightly from the physical drape due to device color calibration, screen brightness, and photographic studio lighting.
              </li>
              <li>
                <strong>Handloom Characteristics:</strong> Minor irregularities in weave texture, zari knots, or yarn slubs are natural hallmarks of authentic handloom weaving and are not considered manufacturing defects.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Orders &amp; Pricing</h2>
            <ul>
              <li>All prices listed on the website are in <strong>Indian Rupees (INR)</strong> and inclusive of applicable GST unless explicitly stated otherwise.</li>
              <li>We reserve the right to revise product prices and promotional discounts at any time without prior notice.</li>
              <li>An order is confirmed only after successful payment authorization via our payment gateway (Razorpay). You will receive an automated order confirmation email and SMS with your order number.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>4. Payments</h2>
            <p>
              We support credit cards, debit cards, UPI, net banking, and supported wallets via <strong>Razorpay</strong>. Orders will only be processed for packing and shipping upon verified confirmation of full payment.
            </p>
          </section>

          <section className="policy-section">
            <h2>5. Shipping &amp; Delivery</h2>
            <p>
              We ship sarees across India using trusted national courier partners. Standard delivery typically takes <strong>3 to 7 business days</strong> depending on your delivery pincode. Tracking details are updated upon dispatch. Milady&apos;s is not liable for transit delays caused by courier logistics, natural conditions, or public holidays.
            </p>
          </section>

          <section className="policy-section">
            <h2>6. Cancellations &amp; Refunds</h2>
            <p>
              Orders can be cancelled prior to dispatch according to our <Link to="/return-policy">Return, Refund &amp; Cancellation Policy</Link>. Applicable refund percentages are determined by the time elapsed between order payment and cancellation.
            </p>
          </section>

          <section className="policy-section">
            <h2>7. Intellectual Property</h2>
            <p>
              All content on this site &mdash; including photographs, logos, brand names, product descriptions, website graphics, and code &mdash; is the exclusive intellectual property of Milady&apos;s and protected under Indian copyright and trademark laws. Unauthorized reproduction or commercial use is strictly prohibited.
            </p>
          </section>

          <section className="policy-section">
            <h2>8. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of <strong>India</strong>. Any disputes arising out of or related to website usage or purchases shall be subject to the exclusive jurisdiction of the competent courts in <strong>Kakinada, Andhra Pradesh</strong>.
            </p>
          </section>

          <section className="policy-section">
            <h2>9. Contact Us</h2>
            <div className="contact-box">
              <p><strong>Milady&apos;s</strong></p>
              <p>Flat No. 402, JM&apos;s CNR Tower, Srinagar, Kakinada, Andhra Pradesh &ndash; 533003, India</p>
              <p>Email: <a href="mailto:themiladysofficial@gmail.com">themiladysofficial@gmail.com</a></p>
              <p>Phone: <a href="tel:+917842225444">+91 78422 25444</a></p>
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
