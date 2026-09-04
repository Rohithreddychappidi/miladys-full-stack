import { useEffect } from 'react';

const SITE_NAME = "Milady's";
const SITE_URL = 'https://www.themiladys.com';
const DEFAULT_IMAGE = `${SITE_URL}/images/model-saree.png`;
const DEFAULT_DESCRIPTION =
  "Handwoven silks and everyday weaves, sourced directly from India's weaving clusters. Shop Kanjivaram, Banarasi, bridal and organza sarees at Milady's.";
const DEFAULT_KEYWORDS =
  "Milady's sarees, Milady's Hyderabad, pure silk sarees online India, Kanjivaram silk saree online, Banarasi silk saree online, pattu sarees online, South Indian bridal sarees, wedding sarees online India, organza sarees online, handloom sarees direct from weavers, sarees Hyderabad, sarees Tirupati";

const JSONLD_ID = 'seo-jsonld';

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Updates the page's <title>/<meta>/<link> tags in place, rather than
 * rendering new ones. index.html ships static baseline versions of every
 * one of these tags (so link-preview bots that don't run JavaScript — 
 * WhatsApp, Facebook, Twitter/X, iMessage — still see a real title, 
 * description and image). React doesn't know those static tags exist, so 
 * rendering fresh <title>/<meta> elements through JSX would create 
 * DUPLICATES sitting alongside the originals instead of replacing them — 
 * confirmed by actually testing this in a real browser, not assumed. 
 * Updating the existing nodes' attributes directly avoids that entirely: 
 * there is always exactly one of each tag, its content just changes 
 * between pages.
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  jsonLd,
  noindex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Sarees`;
  const url = `${SITE_URL}${path}`;

  useEffect(() => {
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[name="keywords"]', 'content', keywords);
    setMeta('link[rel="canonical"]', 'href', url);
    setMeta('meta[property="og:type"]', 'content', type);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);

    // robots is only ever present when a page needs noindex — it's not in
    // the static baseline, so this one genuinely does need to be created
    // and removed rather than just updated.
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.setAttribute('name', 'robots');
        document.head.appendChild(robotsTag);
      }
      robotsTag.setAttribute('content', 'noindex, nofollow');
    } else if (robotsTag) {
      robotsTag.remove();
    }

    // Structured data is fully page-specific (Product schema differs per
    // product), so it's created/updated/removed here rather than ever
    // existing as a static default.
    let script = document.getElementById(JSONLD_ID);
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = JSONLD_ID;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    // Reset to sitewide defaults on unmount so a page that doesn't render
    // its own <Seo> (there shouldn't be one, but just in case) never
    // inherits a stale title/description from whatever page came before.
    return () => {
      if (jsonLd) {
        const el = document.getElementById(JSONLD_ID);
        if (el) el.remove();
      }
    };
  }, [fullTitle, description, keywords, url, image, type, noindex, jsonLd]);

  return null;
}

export { SITE_NAME, SITE_URL, DEFAULT_IMAGE, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS };
