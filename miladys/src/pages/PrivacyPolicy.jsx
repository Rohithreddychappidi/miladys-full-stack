import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <Seo
        title="Privacy Policy"
        path="/privacy-policy"
        description="Learn how Milady's collects, uses, and safeguards your personal data and transaction information."
      />
      <div className="container policy-container">
        <div className="policy-breadcrumbs">
          <Link to="/">Home</Link>
          <span className="sep">/</span>
          <span>Privacy Policy</span>
        </div>

        <header className="policy-header">
          <p className="eyebrow">Trust & Transparency</p>
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: October 2026</p>
        </header>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Introduction</h2>
            <p>
              Welcome to <strong>Milady&apos;s</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We cherish the trust you place in us when shopping for our handpicked sarees. This Privacy Policy describes how we collect, store, use, and protect your personal information when you visit or make a purchase from our website (<strong>themiladys.com</strong>).
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Information We Collect</h2>
            <p>When you browse, register, or make a purchase on our website, we may collect the following information:</p>
            <ul>
              <li><strong>Contact Information:</strong> Name, email address, phone/mobile number, and shipping/billing address.</li>
              <li><strong>Account Credentials:</strong> Securely hashed passwords, and if you choose Google Sign-In, your basic Google profile identity (name, email).</li>
              <li><strong>Order Details:</strong> Items purchased, order value, payment status, coupon redemptions, and order history.</li>
              <li><strong>Device & Browsing Data:</strong> IP address, browser type, device information, and interaction data to enhance website performance and security.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Payment Security (Razorpay)</h2>
            <p>
              All online payments are securely processed through our certified payment partner, <strong>Razorpay</strong>.
            </p>
            <p>
              <strong>Milady&apos;s does not store or process your credit/debit card numbers, CVVs, net-banking passwords, or UPI PINs</strong> on our servers. All sensitive financial transactions occur through Razorpay&apos;s PCI-DSS compliant, encrypted gateway.
            </p>
          </section>

          <section className="policy-section">
            <h2>4. How We Use Your Information</h2>
            <p>We use your information exclusively for legitimate business purposes, including:</p>
            <ul>
              <li>Processing, fulfilling, and delivering your saree orders.</li>
              <li>Sending transactional communications such as order confirmations, shipping updates, and invoice receipts via email (Resend) or SMS.</li>
              <li>Managing customer accounts, order history, and self-service cancellations.</li>
              <li>Providing timely customer support and responding to inquiries.</li>
              <li>Detecting and preventing fraudulent transactions and ensuring website security.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>5. Sharing of Information</h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. We share data solely with trusted third-party service providers essential for running our store:
            </p>
            <ul>
              <li><strong>Payment Gateway:</strong> Razorpay Software Private Limited for secure transaction authorization.</li>
              <li><strong>Logistics Partners:</strong> Reputed courier services (e.g., Blue Dart, Delhivery) to deliver packages to your doorstep.</li>
              <li><strong>Communication Services:</strong> Email service providers (Resend) for transactional updates.</li>
              <li><strong>Legal Compliance:</strong> If required by applicable Indian laws, court orders, or law enforcement authorities.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>6. Data Retention & Security</h2>
            <p>
              We maintain industry-standard physical, electronic, and procedural safeguards to protect your personal information against unauthorized access, alteration, or disclosure. We retain your order data as required by Indian accounting, taxation, and consumer protection laws.
            </p>
          </section>

          <section className="policy-section">
            <h2>7. Your Rights</h2>
            <p>
              You have the right to access and update your contact information and saved addresses directly through your Milady&apos;s account profile. If you wish to delete your account or have questions about stored data, please contact our support team.
            </p>
          </section>

          <section className="policy-section">
            <h2>8. Contact & Grievance Officer</h2>
            <p>For any privacy-related queries, concerns, or grievances, please reach out to us at:</p>
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
