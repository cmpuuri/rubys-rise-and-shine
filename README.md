# Ruby's Rise & Shine

The website for Ruby's sourdough focaccia: **https://rubysriseandshine.com**

This page is for the grown-ups who look after the site. You do not need to be a programmer. Most changes are one edit to one file on GitHub.com. The site updates itself about a minute after you save.

---

## Change bake days, price, flavors, or the Venmo handle

Everything that changes often lives in one file: **`site.config.json`**.

1. Go to https://github.com/cmpuuri/rubys-rise-and-shine and sign in.
2. Click **`site.config.json`**.
3. Click the **pencil icon** (top right of the file) to edit.
4. Change the value you need (see the table below).
5. Click **Commit changes...**, then click **Commit changes** again.
6. Wait about one minute, then reload https://rubysriseandshine.com.

| To change... | Edit this line | Example |
|---|---|---|
| Bake days | `"bakeDays": [3, 5]` | Numbers are days of the week: 0 Sunday, 1 Monday, 2 Tuesday, 3 Wednesday, 4 Thursday, 5 Friday, 6 Saturday. For Tuesday and Saturday, write `[2, 6]`. |
| How many dates the form shows | `"bakeDaysToShow": 6` | |
| Price of a pan | `"price": 10` | Just the number, no `$`. |
| Most pans in one order | `"maxPansPerOrder": 4` | |
| Pans per bake (shown in the "Bake days" box) | `"pansPerBake": 4` | |
| Venmo handle | `"venmoHandle": "@rubys-rise-and-shine"` | Keep the quote marks. |
| A flavor's description | the `"desc"` text inside `"flavors"` | |
| Add a flavor | copy one `{ "id": ..., "name": ..., "desc": ... }` block inside `"flavors"` | Put a comma between blocks. The `id` is a short lowercase word, like `"cheese"`. |
| The "Coming soon" card | `"comingSoon"` | To hide the card, change it to `"comingSoon": []`. |
| Dropoff choices | `"dropoffOptions"` | |
| A phone number for the "Text it to Ruby" button | `"orderPhone": ""` | Empty by default, so no number appears on the site. If you add one, it is public. |

**Be careful with punctuation.** Every value needs its quote marks and the commas between lines. If the site shows "The order form could not load" after an edit, there is a typo. Open the file on GitHub, click **History**, and compare with the last version that worked. You can also paste the file into https://jsonlint.com to find the mistake.

**Words that are not in the config.** The "Softball families" box names Friday and Thursday. If you change the bake days, edit that sentence in `index.html` too (search the file for `TODO(owner)`).

---

## Where orders go

When a customer presses **Place my order**, the website sends the order to a free service called **Web3Forms**. Web3Forms emails it to the address that was used to create the access key.

- The subject looks like: `Ruby's order RRS-12345: 2 x Garlic for Wed Oct 29`
- The email has the order ticket and each field (name, phone, flavor, bake day, pickup or dropoff, notes, total).
- The customer also sees the ticket on screen, with buttons to copy it or text it to Ruby.
- If sending fails (bad signal at the field, for example), the form keeps everything filled in and offers the **Text it to Ruby** button, so no order is lost.

**To change the email address that gets orders:**

1. Go to https://web3forms.com and sign in with the email that created the key.
2. Open the form and change the email, **or** create a new access key for the new email.
3. If you made a new key, put it in `site.config.json` on the `"orderAccessKey"` line (see the next section).

Check the spam folder the first time.

---

## Add or replace the Web3Forms access key

The access key is public by design. It only lets people send email *to* you, so it is safe in this file.

1. Go to https://web3forms.com, type the email that should get orders, and click **Create Access Key**.
2. Copy the key from the email Web3Forms sends you. It looks like `dc5a3744-....`
3. On GitHub, edit `site.config.json` (steps are at the top of this page).
4. Replace the value on this line, keeping the quote marks: `"orderAccessKey": "your-key-here"`
5. Commit, wait one minute, then place a test order from your phone.

If the key is missing or says `PLACEHOLDER`, the form says online ordering is not switched on and offers the text-message option instead.

The free Web3Forms plan allows 250 orders a month.

---

## Reprint the QR card and sticker

The print files are in the **`print`** folder:

- `print/qr-card.png`: business card, 3.5 x 2 inches
- `print/qr-sticker.png`: round sticker, 3 x 3 inches
- `print/qr-square.png`: plain square code

To download one: open the file on GitHub, then click the **Download raw file** button (the arrow icon). Print at 300 dpi at the sizes above. All three codes point to `https://rubysriseandshine.com`. Do not replace them with codes that point anywhere else.

---

## How the site is hosted

- **GitHub** keeps the files: https://github.com/cmpuuri/rubys-rise-and-shine
- **Vercel** (free plan) publishes the site each time something is saved on the `main` branch.
- **Cloudflare** owns the domain name `rubysriseandshine.com` and points it at Vercel.
- **Web3Forms** (free plan) emails the orders.

There is no monthly cost, no database, and no server to look after.

### Go-live setup (one time)

**Vercel**

1. Sign in at https://vercel.com with GitHub.
2. Click **Add New... > Project**, then **Import** `cmpuuri/rubys-rise-and-shine`.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty. Click **Deploy**.
4. Open the project, then **Settings > Domains**.
5. Add `rubysriseandshine.com`. Accept Vercel's suggestion to also add `www.rubysriseandshine.com` and redirect it to `rubysriseandshine.com`.
6. Vercel then shows the DNS records it wants. Keep that page open.

**Cloudflare**

1. Sign in at https://dash.cloudflare.com and open `rubysriseandshine.com`.
2. Go to **DNS > Records**.
3. Delete any existing `A`, `AAAA`, or `CNAME` record for `rubysriseandshine.com` (shown as `@`) or `www`. Do not touch `MX` or `TXT` records (those are for email).
4. Add the two records below. Use the values that Vercel shows if they differ from these.
5. For each record, click the orange cloud so it turns **grey (DNS only)**. Vercel needs this to issue the security certificate.

| Type | Name | Content (value) | Proxy status | TTL |
|---|---|---|---|---|
| A | `@` | `76.76.21.21` (or the IP Vercel shows, for example `216.198.79.1`) | DNS only (grey cloud) | Auto |
| CNAME | `www` | `cname.vercel-dns.com` (or the `...vercel-dns-0xx.com` value Vercel shows) | DNS only (grey cloud) | Auto |

6. Back in Vercel, **Settings > Domains** turns green within a few minutes (sometimes up to an hour).
7. Test: open https://rubysriseandshine.com and https://www.rubysriseandshine.com. The second one must jump to the first.

If Cloudflare has a **CAA** record, it must allow `letsencrypt.org`, or Vercel cannot issue the certificate.

### Preview links

When someone opens a pull request on GitHub, Vercel builds a private preview link and posts it on the pull request. Nothing goes live until the change is merged into `main`.

---

## Privacy rules for this site

Ruby is 10. Keep it this way:

- First names only. No last names, home address, school, or team schedule anywhere on the site.
- The order form only asks for what is needed: name, phone, and optional notes.
- No analytics, no ad trackers, no cookie banners, no chat widgets.
- The pickup address is never on the site. Ruby texts it to the customer.

---

## For whoever edits the code

| File | What it does |
|---|---|
| `index.html` | The page. Words that rarely change. |
| `site.config.json` | Words and numbers that change often. Read by the page when it opens. |
| `css/site.css` | Colours, fonts, layout. Brand colours are at the top. |
| `js/site.js` | Builds the menu and form from the config, sends orders, shows the ticket. Phase 2 hook: `onOrderSubmitted(order)`. |
| `img/` | Logo, share image, icons. |
| `print/` | QR card and sticker for printing. |
| `vercel.json` | Security headers, clean URLs, `www` to apex redirect. |
| `.vercelignore` | Keeps `prototype/`, `assets/`, and the docs off the live site. |
| `prototype/` | The original clickable prototype. Not deployed. Do not edit. |

To look at the site on your own computer, run `python3 -m http.server 8000` in this folder and open http://localhost:8000. (Opening `index.html` directly does not work, because the page loads `site.config.json`.)

---

## Decisions

The spec left these choices open, or two parts of it disagreed. Each choice is the simplest one for a parent to maintain.

1. **No build step.** The page reads `site.config.json` when it opens. Editing the file on GitHub is the whole update process. There is nothing to install.
2. **Web3Forms** for order email. It is free, needs no server, and the key is public by design. Formspree was the second choice.
3. **Three hero pills, not four.** The spec asks for three pills from the config (bake days, pickup or dropoff, price). The prototype also had "Organic flour". It was dropped, because the ingredients strip says it with more detail.
4. **Flavor subtitles in the order form** ("Olive oil and flaky salt", "Roasted garlic and rosemary") are kept from the prototype in `js/site.js`, because the config has no field for them. A new flavor shows the pan size there instead.
5. **"Coming soon" card** shows the name and note from the config. The prototype's "Spring 2027" label was dropped, because the config has no field for it.
6. **"Bake days" box** used to say "If a day is full, the form will tell you." The form cannot count pans yet (that is phase 2), so it now says "If a day is full, Ruby will text you." It also reads "up to 4 pans per bake" from `pansPerBake`, where the prototype said "3 to 4".
7. **"Softball families" box** keeps the prototype words (Friday, Thursday) in `index.html`, with a `TODO(owner)` note.
8. **Notes field placeholder** no longer shows a sample street address. It says "Or your address for a dropoff."
9. **Confirmation panel** no longer has the prototype's "Nothing was sent yet" note, because orders are now sent.
10. **Colour contrast.** The brand colour values are unchanged. In the light theme, text in the crust colour uses a slightly deeper shade (`#B07030`), and the "Order received" badge is a deeper green. The plain crust colour on cream is too light for the accessibility standard. In the dark theme, the order band uses a deeper olive (`#34401F`) because the dark-theme olive is light and the prototype's cream text on it was unreadable. The "Coming soon" card is dimmed with an outline instead of transparency, for the same reason.
11. **Prototype bugs fixed:** the dropoff list showed even with Pickup selected; hidden radio buttons caused sideways scrolling; links to `#order` landed in the wrong place.
12. **Ingredients strip** is directly below the menu cards, as the spec says. On a phone it comes after the cards, still inside the Menu section.
13. **Order IDs** are `RRS-` plus 5 random digits. If a send fails and the customer tries again, the second try gets a new ID.
14. **Spam protection:** a hidden field that bots fill in, and the form refuses a press within 3 seconds of the page opening.
15. **Fonts** load without blocking the first paint, so text shows at once in a fallback font and then switches.
16. **The submit button starts disabled** and turns on when the form is ready. This stops a very early press from putting the name and phone in the web address.
17. **No JSON-LD.** It was optional.
18. **Olive oil brand.** The spec mentions "Terra Delyssa", but `site.config.json` does not. The config was not changed. TODO(owner): to name the brand, add it to the olive oil `"name"` or `"note"` in `site.config.json`.
19. **Changing the form provider** also needs an edit to the `Content-Security-Policy` line in `vercel.json`, which only allows `api.web3forms.com`.
