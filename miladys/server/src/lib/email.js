import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Milady's <onboarding@resend.dev>";
const siteUrl = process.env.CLIENT_URL || 'http://localhost:5173';

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

// ---------------------------------------------------------------------
// Shared layout — a table-based wrapper (safest across email clients,
// including Outlook) with the Milady's header/footer. Every email below
// just supplies the middle "content" block.
// ---------------------------------------------------------------------

const COLORS = {
  maroon900: '#48181e',
  maroon950: '#2c0a10',
  gold500: '#c9973f',
  ivory: '#fdf8f2',
  stone100: '#f6f0ea',
  stone200: '#ece2dc',
  ink900: '#241a17',
  ink600: '#6b5c56',
  ink400: '#9c8d87',
};

function layout({ preheader = '', content, ctaLabel, ctaUrl }) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Milady's</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.stone100};font-family:Georgia,'Times New Roman',serif;">
    <!-- preheader (hidden preview text) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.stone100};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;">

            <!-- header -->
            <tr>
              <td style="background:${COLORS.maroon950};padding:28px 32px;text-align:center;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.08em;color:${COLORS.ivory};">
                  MILADY&rsquo;S
                </span>
                <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.gold500};margin-top:6px;">
                  Handwoven Sarees
                </div>
              </td>
            </tr>

            <!-- content -->
            <tr>
              <td style="padding:36px 36px 8px;font-family:Helvetica,Arial,sans-serif;color:${COLORS.ink900};">
                ${content}
              </td>
            </tr>

            ${
              ctaLabel && ctaUrl
                ? `
            <tr>
              <td style="padding:8px 36px 32px;font-family:Helvetica,Arial,sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background:${COLORS.maroon900};">
                      <a href="${ctaUrl}" style="display:inline-block;padding:13px 28px;font-size:13px;font-weight:600;color:${COLORS.ivory};text-decoration:none;border-radius:999px;letter-spacing:0.02em;">
                        ${escapeHtml(ctaLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ''
            }

            <!-- footer -->
            <tr>
              <td style="padding:24px 36px 30px;border-top:1px solid ${COLORS.stone200};font-family:Helvetica,Arial,sans-serif;">
                <p style="margin:0 0 4px;font-size:12px;color:${COLORS.ink400};">
                  Milady&rsquo;s &middot; Flat No. 402, JM&rsquo;s CNR Tower, Srinagar, Kakinada, A.P. 533003
                </p>
                <p style="margin:0;font-size:12px;color:${COLORS.ink400};">
                  Questions? Reply to this email or write to
                  <a href="mailto:themiladysofficial@gmail.com" style="color:${COLORS.ink400};">themiladysofficial@gmail.com</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---------------------------------------------------------------------

export function sendLoginEmail(user) {
  const content = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:${COLORS.maroon900};margin:0 0 16px;">
      Hi ${escapeHtml(user.name)},
    </h1>
    <p style="font-size:14px;line-height:1.7;color:${COLORS.ink600};margin:0 0 8px;">
      We noticed a new login to your Milady&rsquo;s account just now.
    </p>
    <p style="font-size:13px;line-height:1.7;color:${COLORS.ink400};margin:16px 0 0;">
      If this wasn&rsquo;t you, please secure your account by resetting your password right away.
    </p>
  `;

  return send({
    to: user.email,
    subject: "New login to your Milady's account",
    html: layout({
      preheader: `New login to your Milady's account`,
      content,
      ctaLabel: 'View your account',
      ctaUrl: `${siteUrl}/profile`,
    }),
  });
}

export function sendOrderConfirmationEmail(user, order, items) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.stone200};font-size:13px;color:${COLORS.ink900};">${escapeHtml(i.product_name)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.stone200};font-size:13px;color:${COLORS.ink600};text-align:center;">${i.qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.stone200};font-size:13px;color:${COLORS.maroon900};font-weight:600;text-align:right;">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('');

  const content = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:${COLORS.maroon900};margin:0 0 6px;">
      Thank you, ${escapeHtml(user.name)}!
    </h1>
    <p style="font-size:14px;line-height:1.7;color:${COLORS.ink600};margin:0 0 22px;">
      Your order <strong style="color:${COLORS.ink900};">#MLD${order.id}</strong> is confirmed and payment has been received.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      <thead>
        <tr>
          <th align="left" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${COLORS.ink400};padding-bottom:8px;font-weight:600;">Item</th>
          <th align="center" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${COLORS.ink400};padding-bottom:8px;font-weight:600;">Qty</th>
          <th align="right" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${COLORS.ink400};padding-bottom:8px;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td align="right" style="font-size:16px;font-weight:700;color:${COLORS.maroon900};padding-top:4px;">
          Grand total &nbsp;₹${order.subtotal.toLocaleString('en-IN')}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.stone100};border-radius:10px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${COLORS.ink400};font-weight:600;">Shipping to</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.ink900};">
            ${escapeHtml(order.address_name || user.name)}<br/>
            ${escapeHtml(order.address_line1)}, ${escapeHtml(order.address_city)}, ${escapeHtml(order.address_state || '')} &mdash; ${escapeHtml(order.address_pincode)}
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size:12px;color:${COLORS.ink400};margin:20px 0 0;">
      We&rsquo;ll send another update once your order ships.
    </p>
  `;

  return send({
    to: user.email,
    subject: `Order confirmed — #MLD${order.id} · Milady's`,
    html: layout({
      preheader: `Your order #MLD${order.id} is confirmed — total ₹${order.subtotal.toLocaleString('en-IN')}`,
      content,
      ctaLabel: 'View your order',
      ctaUrl: `${siteUrl}/orders`,
    }),
  });
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
