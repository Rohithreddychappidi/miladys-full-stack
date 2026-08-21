import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export const razorpayEnabled = Boolean(keyId && keySecret && !keyId.includes('xxxx'));

export const razorpay = razorpayEnabled
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : null;

if (!razorpayEnabled) {
  console.warn(
    '[razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payment endpoints will return an error until you add real keys to .env'
  );
}

// Verifies the signature Razorpay sends back after a successful checkout.
// This is the step that actually proves the payment is genuine — never mark
// an order paid without it.
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

// Verifies Razorpay webhook signatures (X-Razorpay-Signature header), for
// the optional /api/orders/webhook route — useful as a backstop in case the
// client never calls /verify (closed tab, network drop, etc).
export function verifyWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expected === signatureHeader;
}
