import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Milady's <onboarding@resend.dev>";

export const emailEnabled = Boolean(apiKey && !apiKey.includes('xxxx'));

const resend = emailEnabled ? new Resend(apiKey) : null;

if (!emailEnabled) {
  console.warn(
    '[email] RESEND_API_KEY not set — emails will be skipped (logged to console instead) until you add a real key to .env'
  );
}

async function send({ to, subject, html }) {
  if (!emailEnabled) {
    console.log(`[email:skipped] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }
  try {
    return await resend.emails.send({ from: fromEmail, to, subject, html });
  } catch (err) {
    // Email failures should never break the order/login flow — log and move on.
    console.error('[email:error]', err.message);
    return { error: err.message };
  }
}

export function sendLoginEmail(user) {
  return send({
    to: user.email,
    subject: "New login to your Milady's account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#241a17">
        <h2 style="color:#48181e">Hi ${escapeHtml(user.name)},</h2>
        <p>We noticed a new login to your Milady's account just now.</p>
        <p style="color:#6b5c56;font-size:13px">If this wasn't you, please reset your password immediately.</p>
      </div>
    `,
  });
}

export function sendOrderConfirmationEmail(user, order, items) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #ece2dc">${escapeHtml(i.product_name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #ece2dc;text-align:center">${i.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #ece2dc;text-align:right">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('');

  return send({
    to: user.email,
    subject: `Order confirmed — #MLD${order.id} · Milady's`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#241a17">
        <h2 style="color:#48181e">Thank you, ${escapeHtml(user.name)}!</h2>
        <p>Your order <strong>#MLD${order.id}</strong> has been confirmed and payment received.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead>
            <tr style="text-align:left;font-size:12px;color:#9c8d87;text-transform:uppercase">
              <th style="padding-bottom:8px">Item</th><th style="padding-bottom:8px;text-align:center">Qty</th><th style="padding-bottom:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:16px;font-weight:600;text-align:right">Grand total: ₹${order.subtotal.toLocaleString('en-IN')}</p>
        <p style="color:#6b5c56;font-size:13px">Shipping to: ${escapeHtml(order.address_line1)}, ${escapeHtml(order.address_city)}, ${escapeHtml(order.address_state || '')} — ${escapeHtml(order.address_pincode)}</p>
        <p style="color:#9c8d87;font-size:12px;margin-top:24px">We'll notify you again once your order ships.</p>
      </div>
    `,
  });
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
