# SPEC: rubysriseandshine.com

Build and deploy the production website for Ruby's Rise & Shine, a sourdough focaccia pre-order site run by a 10 year old in Poway, CA. A working clickable prototype already exists. Your job is to turn it into a maintainable static site in this repo, wire up real order delivery, and get it live on the custom domain.

Read this whole file before writing code. Do not invent menu items, prices, people, or copy. Everything you need is in `/prototype` and `/assets`. Where this spec says "config," the value must live in `site.config.json`, never hardcoded in markup.

## 1. Goal and constraints

- One-page static site. No framework required. Plain HTML, CSS, and vanilla JS are preferred. If you choose a static generator, it must be Astro or Eleventy, output must be pure static files, and the dependency count must stay small.
- Must run with zero monthly cost on the free tiers of GitHub, Vercel, and the form provider.
- Mobile first. Most customers will scan a QR code at a softball field and order on a phone.
- The owner is a child. The site must not collect anything beyond what is needed to fulfill an order, must not run ad tracking, and must not expose her last name, address, school, or team schedule.
- Keep the prototype's look. Brand tokens are defined in section 4 and must not drift.

## 2. Inputs already in the repo

```
/prototype/index.html      clickable prototype (source of truth for layout, copy, and behavior)
/assets/logo.png           772x772 logo with transparency
/assets/logo-400.webp      web-size logo
/assets/logo-800.webp      retina logo
/assets/qr-square.png      QR code pointing to https://rubysriseandshine.com
/assets/qr-card.png        printable card
/assets/qr-sticker.png     printable sticker
SPEC.md                    this file
```

The prototype embeds the logo as a base64 data URI. The production site must reference image files instead.

## 3. Repo structure (target)

```
/
  index.html
  site.config.json
  /css/site.css
  /js/site.js
  /img/logo.webp, logo@2x.webp, logo.png, og-image.png, favicon.ico, apple-touch-icon.png
  /print/qr-card.png, qr-sticker.png
  /prototype/            (leave as is, not deployed)
  vercel.json
  README.md
  SPEC.md
```

Exclude `/prototype` and `/assets` from the deploy output (use `.vercelignore`).

## 4. Brand

Fonts (Google Fonts, with real fallbacks):
- Display: Bebas Neue
- Script accent: Dancing Script 600/700
- Body: Nunito 400/600/800

Color tokens. Define on `:root`, with a dark theme via `prefers-color-scheme` as in the prototype.

| token | light | use |
|---|---|---|
| cream | #F6EDD8 | page background |
| cream-deep | #EDE0C3 | menu band, pills |
| paper | #FFF9EC | cards, form |
| olive | #4F5F30 | primary buttons, order band |
| olive-deep | #3B4722 | headings |
| gold | #F2B233 | CTA buttons, accents |
| crust | #C8863C | prices, script accents |
| ink | #2E3519 | body text |
| ink-soft | #5F6748 | secondary text |
| line | #D8CBA8 | borders |

Tagline, exact: "A little rise, a lot of love."

## 5. Content and sections

Match the prototype section for section. Copy may be lightly tightened but not rewritten.

1. **Header**: logo mark, wordmark, nav (Menu, How it works, About Ruby, Order a pan). Sticky.
2. **Hero**: eyebrow "Baked in Poway", headline, one paragraph, two buttons, three pills. Pills read from config (bake frequency, fulfillment, price).
3. **Menu**: cards generated from `config.flavors`. Each has name, price, description, "8x8 pan", "Serves 4 to 6". Include a dimmed "Keychains, coming soon" card only if `config.comingSoon` has entries. Below the cards, an **ingredients strip** generated from `config.ingredients` with the heading "Four ingredients. All good ones." and the closing note from `config.ingredientsNote`. The ingredient quality is a core selling point and must appear above the fold on the menu section, not buried in a footer.
4. **How it works**: three steps as in prototype.
5. **Order**: the form (section 6) with the side panel (Venmo, bake days, softball families).
6. **About Ruby**: quote, two paragraphs, team list (Ruby owner, Mom head of oven, Dad website and deliveries). First names only.
7. **Footer**: tagline, "Poway, CA", domain.

## 6. Order form (the core feature)

Fields, in this order:
- Flavor: radio, options from `config.flavors`
- Quantity: stepper, 1 to `config.maxPansPerOrder`
- Bake day: select. Generate the next `config.bakeDaysToShow` dates whose weekday is in `config.bakeDays`, starting tomorrow. Label format "Wednesday, Oct 29". First option gets "(next bake)". Dates are computed in `America/Los_Angeles`, not UTC.
- Get it by: radio, Pickup or Dropoff. Dropoff reveals a select: "Softball field" or "My house (address in notes)".
- Name (required), Phone (required, basic format check), Notes/address (optional)
- Total line: quantity x price, shown live
- Submit button: "Place my order"

Behavior:
- Client-side validation with inline messages. No `alert()`.
- On submit, POST the order to the form provider (section 7). Show a spinner state on the button. Disable double submit.
- On success, replace the form with a confirmation panel containing an order ticket (plain text block, same format as the prototype), a "Copy order ticket" button, a "Text it to Ruby" `sms:` link whose body is the ticket, and "Order another".
- On failure, keep the form filled in, show the error, and still offer the "Text it to Ruby" link with the ticket so no order is lost.
- Generate an order id `RRS-` plus 5 digits client-side and include it in the POST and the ticket.
- Include a honeypot field and a time-on-page check (reject submits under 3 seconds) for spam.

The `sms:` link must have no phone number in the page source unless `config.orderPhone` is set. Default is empty.

## 7. Order delivery

Use a hosted form endpoint so there is no server code to maintain. Pick one, in this order of preference, and document the choice in README:
1. Web3Forms (free, email delivery, access key is public by design)
2. Formspree free tier

Requirements:
- Orders arrive as an email to the address in the provider's dashboard (the owner's parent). The email subject must be `Ruby's order RRS-xxxxx: 2 x Garlic for Wed Oct 29`.
- Email body is the order ticket text plus the raw fields.
- The provider key lives in `site.config.json` under `orderEndpoint`. No `.env` is needed for a public key, but never commit a private key.
- Add a `redirect: false` / JSON mode so the page handles the response itself (no provider thank-you page).

Phase 2, not now: inventory counting per bake day, SMS to Ruby via Twilio, Google Sheet log. Leave a clearly marked extension point in `site.js` (`onOrderSubmitted(order)`).

## 8. site.config.json

Create exactly this shape and read it at build or at runtime via fetch. All copy that changes often lives here.

```json
{
  "businessName": "Ruby's Rise & Shine",
  "tagline": "A little rise, a lot of love.",
  "city": "Poway, CA",
  "domain": "rubysriseandshine.com",
  "price": 10,
  "panSize": "8x8",
  "serves": "4 to 6",
  "flavors": [
    { "id": "plain", "name": "Plain", "desc": "The original. Organic unbleached flour, reverse osmosis water, unrefined mineral salt, cold-pressed extra virgin olive oil, and a long sourdough rise. Finished with Maldon flakes. Crisp bottom, pillowy middle." },
    { "id": "garlic", "name": "Garlic", "desc": "Same dough and the same good ingredients, plus roasted garlic and fresh rosemary pressed into the dimples. The one people ask for twice." }
  ],
  "comingSoon": [ { "name": "Keychains", "note": "Handmade by Ruby for teammates. Phase 2." } ],
  "ingredients": [
    { "name": "Organic unbleached flour", "note": "No bleach, no bromate. Just wheat." },
    { "name": "Filtered reverse osmosis water", "note": "Clean water makes a cleaner rise." },
    { "name": "Two sea salts", "note": "Redmond unrefined mineral salt in the dough, Maldon flakes on top." },
    { "name": "Premium cold-pressed extra virgin olive oil", "note": "Generous on the pan and on the crust." }
  ],
  "ingredientsNote": "Plus a sourdough starter we've kept alive for a long time, and for the garlic pan, roasted garlic and fresh rosemary. No yeast packets, no preservatives.",
  "bakeDays": [3, 5],
  "bakeDaysToShow": 6,
  "maxPansPerOrder": 4,
  "pansPerBake": 4,
  "venmoHandle": "@rubys-rise-and-shine",
  "orderPhone": "",
  "orderEndpoint": "https://api.web3forms.com/submit",
  "orderAccessKey": "PLACEHOLDER",
  "dropoffOptions": ["Softball field (before or after the game)", "My house (I'll add my address in notes)"]
}
```

`bakeDays` uses 0 = Sunday through 6 = Saturday. Current bake days are Wednesday and Friday. Ruby will change these; a non-developer must be able to edit this file on GitHub.com and have the site redeploy.

## 9. SEO, sharing, icons

- `<title>`: "Ruby's Rise & Shine | Sourdough focaccia in Poway"
- Meta description, one sentence.
- Open Graph and Twitter card tags. Build `og-image.png` (1200x630) from the logo on the cream background with the tagline. No photos of Ruby.
- Favicon set from the logo: favicon.ico, 32px png, 180px apple-touch-icon.
- `robots.txt` allow all. No sitemap needed for one page.
- JSON-LD `LocalBusiness` is optional; if added, include only name, URL, and city.

## 10. Accessibility and performance

- All controls keyboard reachable with visible focus. Radios use real inputs with labels.
- Color contrast AA on both themes.
- Respect `prefers-reduced-motion`.
- Lighthouse mobile: Performance 90+, Accessibility 95+, Best Practices 95+. Fonts loaded with `display=swap`. Images sized and lazy where below the fold. Total page weight under 400 KB.
- Works at 360px wide with no horizontal scroll.

## 11. Deployment

- Hosting: Vercel, connected to this GitHub repo. Production branch `main`. Preview deploys on PRs.
- `vercel.json`: clean URLs, security headers (X-Content-Type-Options, Referrer-Policy, a basic CSP that allows Google Fonts and the form endpoint), and a redirect from `www.` to the apex.
- Domain: `rubysriseandshine.com` is registered at Cloudflare. In Vercel, add both `rubysriseandshine.com` and `www.rubysriseandshine.com`. In Cloudflare DNS, add the A record for the apex and the CNAME for www exactly as Vercel shows them, with the proxy toggled off (DNS only) so Vercel can issue the certificate. Document the exact records in README.
- The QR codes in `/print` already point to `https://rubysriseandshine.com`. Do not change the QR targets. The apex must serve the site; www must redirect to apex.

## 12. README

Write it for a parent, not a developer. Cover:
- How to change bake days, price, flavors, and the Venmo handle by editing `site.config.json` on GitHub.com.
- Where orders arrive and how to change the destination email.
- How to reprint the QR card and sticker (files in `/print`).
- How to add the Formspree or Web3Forms key the first time.

## 13. Acceptance checklist

Do not consider the work done until every line is true.

- [ ] Site deploys from `main` on Vercel and loads at the production URL
- [ ] A test order submitted on a phone arrives as an email within a minute, with the subject format in section 7
- [ ] Bake day list shows the correct next six dates for the configured weekdays in Pacific time
- [ ] Changing `bakeDays` in `site.config.json` and pushing changes the dropdown with no code edits
- [ ] Quantity cannot exceed `maxPansPerOrder`
- [ ] Dropoff choice reveals the location select; pickup hides it
- [ ] Confirmation panel shows the ticket, copy works, sms link carries the ticket text
- [ ] Failed submission keeps the form filled and still offers the sms fallback
- [ ] Both light and dark themes render with no unreadable text
- [ ] 360px width: no horizontal scroll, all text wraps
- [ ] Lighthouse mobile scores meet section 10
- [ ] No last names, addresses, or schedules anywhere in the deployed output
- [ ] `/prototype` and `/assets` are not in the deployed output
- [ ] README is written for a non-developer

## 14. Working agreement for the agent

- Small commits with clear messages. One PR per section if working in PRs.
- Do not add analytics, cookie banners, chat widgets, or third-party scripts beyond fonts and the form endpoint.
- Do not change prices, flavors, names, ingredient names, or the tagline. Brand names in the ingredients (Maldon, Redmond, Terra Delyssa) are the owner's real choices; keep them exactly as configured. If something in the prototype seems wrong, leave a `TODO(owner):` comment and keep going.
- If a decision is not covered here, pick the simplest option that a parent can maintain, and note it in README under "Decisions."
