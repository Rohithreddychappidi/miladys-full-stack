// Default text of the three policy pages, in the simple format the
// admin editor uses (Admin → Policy Pages). This is exactly the wording
// the pages had before they became editable.
//
// Format:  "## Heading" starts a section · "- item" is a bullet ·
// **bold** · *italic* · [link text](/orders) · {phone} {email} {address}
// are filled in from Admin → Footer & Contact · [box] … [/box] is a
// contact box · [callout] … [/callout] a highlighted box · "[note] text"
// a small note · [refund table] the automatic refund tiers table.

export const POLICY_PAGES = {
  policy_privacy: {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    seo: "Learn how Milady's collects, uses, and safeguards your personal data and transaction information.",
    eyebrow: 'Trust & Transparency',
    title: 'Privacy Policy',
    lastUpdated: 'October 2026',
    body: `## 1. Introduction
Welcome to **Milady's** (“we”, “our”, or “us”). We cherish the trust you place in us when shopping for our handpicked sarees. This Privacy Policy describes how we collect, store, use, and protect your personal information when you visit or make a purchase from our website (**themiladys.com**).

## 2. Information We Collect
When you browse, register, or make a purchase on our website, we may collect the following information:
- **Contact Information:** Name, email address, phone/mobile number, and shipping/billing address.
- **Account Credentials:** Securely hashed passwords, and if you choose Google Sign-In, your basic Google profile identity (name, email).
- **Order Details:** Items purchased, order value, payment status, coupon redemptions, and order history.
- **Device & Browsing Data:** IP address, browser type, device information, and interaction data to enhance website performance and security.

## 3. Payment Security (Razorpay)
All online payments are securely processed through our certified payment partner, **Razorpay**.

**Milady's does not store or process your credit/debit card numbers, CVVs, net-banking passwords, or UPI PINs** on our servers. All sensitive financial transactions occur through Razorpay's PCI-DSS compliant, encrypted gateway.

## 4. How We Use Your Information
We use your information exclusively for legitimate business purposes, including:
- Processing, fulfilling, and delivering your saree orders.
- Sending transactional communications such as order confirmations, shipping updates, and invoice receipts via email (Resend) or SMS.
- Managing customer accounts, order history, and self-service cancellations.
- Providing timely customer support and responding to inquiries.
- Detecting and preventing fraudulent transactions and ensuring website security.

## 5. Sharing of Information
We do not sell, rent, or trade your personal information to third parties. We share data solely with trusted third-party service providers essential for running our store:
- **Payment Gateway:** Razorpay Software Private Limited for secure transaction authorization.
- **Logistics Partners:** Reputed courier services (e.g., Blue Dart, Delhivery) to deliver packages to your doorstep.
- **Communication Services:** Email service providers (Resend) for transactional updates.
- **Legal Compliance:** If required by applicable Indian laws, court orders, or law enforcement authorities.

## 6. Data Retention & Security
We maintain industry-standard physical, electronic, and procedural safeguards to protect your personal information against unauthorized access, alteration, or disclosure. We retain your order data as required by Indian accounting, taxation, and consumer protection laws.

## 7. Your Rights
You have the right to access and update your contact information and saved addresses directly through your Milady's account profile. If you wish to delete your account or have questions about stored data, please contact our support team.

## 8. Contact & Grievance Officer
For any privacy-related queries, concerns, or grievances, please reach out to us at:
[box]
**Milady's**
{address}, India
Email: {email}
Phone: {phone}
[/box]`,
  },

  policy_terms: {
    path: '/terms-and-conditions',
    label: 'Terms & Conditions',
    seo: "Review the terms and conditions governing purchases and browsing on Milady's online saree store.",
    eyebrow: 'Legal Agreement',
    title: 'Terms & Conditions',
    lastUpdated: 'October 2026',
    body: `## 1. Agreement to Terms
By visiting, browsing, or purchasing from **Milady's** (themiladys.com), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any part of these terms, please do not use our website.

## 2. Handloom Authenticity & Product Representation
Milady's is dedicated to presenting authentic handwoven and curated designer sarees. Due to the handcrafted nature of weaving:
- **Color Variations:** Saree colors, zari sheen, and motifs displayed on digital screens may vary slightly from the physical drape due to device color calibration, screen brightness, and photographic studio lighting.
- **Handloom Characteristics:** Minor irregularities in weave texture, zari knots, or yarn slubs are natural hallmarks of authentic handloom weaving and are not considered manufacturing defects.

## 3. Orders & Pricing
- All prices listed on the website are in **Indian Rupees (INR)** and inclusive of applicable GST unless explicitly stated otherwise.
- We reserve the right to revise product prices and promotional discounts at any time without prior notice.
- An order is confirmed only after successful payment authorization via our payment gateway (Razorpay). You will receive an automated order confirmation email and SMS with your order number.

## 4. Payments
We support credit cards, debit cards, UPI, net banking, and supported wallets via **Razorpay**. Orders will only be processed for packing and shipping upon verified confirmation of full payment.

## 5. Shipping & Delivery
We ship sarees across India using trusted national courier partners. Standard delivery typically takes **3 to 7 business days** depending on your delivery pincode. Tracking details are updated upon dispatch. Milady's is not liable for transit delays caused by courier logistics, natural conditions, or public holidays.

## 6. Cancellations & Refunds
Orders can be cancelled prior to dispatch according to our [Return, Refund & Cancellation Policy](/return-policy). Applicable refund percentages are determined by the time elapsed between order payment and cancellation.

## 7. Intellectual Property
All content on this site — including photographs, logos, brand names, product descriptions, website graphics, and code — is the exclusive intellectual property of Milady's and protected under Indian copyright and trademark laws. Unauthorized reproduction or commercial use is strictly prohibited.

## 8. Governing Law & Jurisdiction
These Terms and Conditions shall be governed by and construed in accordance with the laws of **India**. Any disputes arising out of or related to website usage or purchases shall be subject to the exclusive jurisdiction of the competent courts in **Kakinada, Andhra Pradesh**.

## 9. Contact Us
[box]
**Milady's**
{address}, India
Email: {email}
Phone: {phone}
[/box]`,
  },

  policy_returns: {
    path: '/return-policy',
    label: 'Return & Refund Policy',
    seo: "Learn about order cancellations, refund windows, and return guidelines for Milady's sarees.",
    eyebrow: 'Customer Care',
    title: 'Return, Refund & Cancellation Policy',
    lastUpdated: 'October 2026',
    body: `## 1. Order Cancellation Policy
We understand plans can change. You can easily cancel an order directly from your [My Orders](/orders) page as long as the cancellation window has not passed.

Refund amounts for cancellations are determined based on the time elapsed between order payment and cancellation request:
[refund table]
[note] *Note:* Shipping fees incurred are non-refundable once the order has been dispatched.

## 2. Returns & Exchanges
Every Milady's saree is carefully inspected by our handloom curators before packaging. Because sarees are delicate, luxury items:
- **Eligibility:** Returns are accepted within **48 hours of delivery** only in the rare event of transit damage, manufacturing defects, or if an incorrect product was delivered.
- **Unboxing Video:** To claim transit damage or defects, customers must provide an uncut, clear unboxing video recorded from the moment the sealed parcel is opened.
- **Condition:** The saree must be unwashed, unworn, unscented, in its original pristine fold, and accompanied by all original tags, accessories, and packaging.

## 3. Non-Returnable Items
The following items are not eligible for return or exchange:
- Sarees with customized blouse stitching, pico, or fall work requested by the customer.
- Sarees showing signs of use, wear, fragrance, or altered folds.
- Items purchased during promotional flash clearance sales labeled as “Final Sale”.

## 4. Refund Processing & Timelines
Once your cancellation is submitted or returned merchandise is received and verified at our quality inspection facility:
- The approved refund will be initiated back to your original payment method via **Razorpay**.
- Refunds typically reflect in your bank account, card, or UPI app within **5 to 7 working days**, depending on your banking partner.
- You will receive an automated email confirmation once the refund has been initiated from our system.

## 5. How to Initiate a Return
If your delivered saree qualifies for a return, please reach out to our team within 48 hours:
[box]
**Milady's Support Team**
WhatsApp / Call: {phone}
Email: {email}
Address: {address}
Please mention your **Order ID (e.g. #MLD123)** and attach the unboxing photos/video.
[/box]`,
  },
};
