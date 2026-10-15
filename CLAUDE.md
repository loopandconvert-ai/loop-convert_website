# Loop&Convert website

This repository holds two things that deploy together on Vercel:

1. **The marketing site**: plain HTML, CSS and JavaScript. Loop&Convert is a studio that builds platforms, automations, AI agents and campaigns for businesses, plus its own product, Contract Analysis.
2. **The Contract Analysis app**: the pages customers log into, the `api/` serverless functions and the Supabase setup.

## Marketing site

Seven pages, all sharing one header and footer:

- `index.html`: home. Hero with a "what takes up your team's time" box (hands the text to Book a call as booking notes), the example converter, a photo, What we build, who we build for, How a project runs, Contract Analysis teaser, closing call to action.
- `contract-analysis.html`: product page, reached from the Products dropdown. Sample report, use cases, security, pricing (`#pricing`), a demo request form (`#demo`) with the email address next to it, and an FAQ.
- `book-a-call.html`: the Cal.com booking calendar for a free 30-minute call.
- `about.html`: story, how we work, who you'll work with.
- `contact.html`: general questions form plus email, phone and location.
- `privacy.html` and `terms.html`: privacy policy and terms of service. Both are linked in the footer, and the privacy policy is linked under every form and the calendar.
- `assets/styles.css`: all styles and design tokens. `assets/main.js`: dropdown, mobile menu, converter, Cal.com calendar and the two forms. Settings are in `LC_CONFIG` at the top.
- `assets/img/`: the logo, the browser tab icon and photos generated with Higgsfield. `get_images.py` downloads the photos again if needed (needs `pip install pillow`).
- `partials/`, `pages/` and `build.py`: edit the header, footer or a page source, then run `python build.py` to regenerate the root `.html` files. Never edit the generated marketing `.html` files directly. The email address and phone number are set once at the top of `build.py`.

### Pricing and booking (keep consistent everywhere)

- Contract Analysis costs EUR 500 per month, excl. VAT, for up to 10 lawyers. The first 30 days are a free trial. For more than 10 lawyers the price is agreed on a call.
- There is no online checkout. People request a demo or email their interest and when they're free for a 15-minute call.
- Calls are booked through Cal.com (`LC_CONFIG.calLink`, currently `iulian-bostan/30min`).

### Forms

The demo and contact forms post JSON to `LC_CONFIG.formEndpoint`, the Formspree form `https://formspree.io/f/xzedkvdn`, which delivers to loopandconvert@gmail.com. Every submission includes a `form` field (`demo` or `contact`). While `formEndpoint` is empty, submitting opens a pre-filled email to the site's address instead, so nothing is lost.

## Contract Analysis app (do not restyle with the marketing design)

- Pages: `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`, `invite-accept.html`, `dashboard.html`, `upload.html`, `upload-pro.html`, `analysis.html`, `analysis-report.html`, `contract-chat.html`, `account.html`, `team.html`, `agent.html`, `admin.html`, `admin-dashboard.html`, `lawyer-dashboard.html`, `superadmin.html`.
- Styles and scripts: `css/style.css`, `css/dashboard.css`, `js/main.js`, `js/auth.js`, `js/config.js`. Logo for the dark app: `images/logo-white.png`.
- `api/`: Vercel serverless functions. `supabase/`: database migrations.
- Supabase password-reset links land on the site root. Every marketing page starts with a small script (in `build.py`) that forwards them to `reset-password.html`. Keep it.

## Deployment

- `vercel.json` holds the function settings and redirects from retired addresses (`book.html`, `how-it-works.html`, `roi.html`).
- `.vercelignore` keeps `partials/`, `pages/`, `build.py`, `get_images.py` and these notes out of the published site.

## Design system (marketing site, keep to it)

- Light and white. Background #FFFFFF, light grey panels #F5F5F7, text #0A0A0A. There is deliberately no dark mode.
- One accent only: the signal blue `--signal`, used for focus rings and small highlights.
- Headings: Bricolage Grotesque. Body: Geist. Both from Google Fonts.
- Logo: `assets/img/logo.png`, the two-line Loop & Convert wordmark.
- Left-aligned, editorial layout, generous whitespace. Not a SaaS template: no rows of identical rounded cards with shadows.
- Photography: bright, airy, natural daylight, no faces, no fake team photos.
- Motion is limited to the home converter and small hover states. Respect `prefers-reduced-motion`.

## Writing rules

- Never use em dashes anywhere in copy.
- Never invent social proof: no fake testimonials, client logos, user counts, review scores, certifications or results. Only add a case study or logo when there is a real client and permission to name them.
- Plain, specific language. Buttons say exactly what happens.

## Before going live

Done: real email address, photos downloaded, co-founder card removed, Cal.com calendar connected, forms connected to Formspree (`https://formspree.io/f/xzedkvdn`, delivers to loopandconvert@gmail.com), privacy policy added and linked, KvK line removed.

Still open:

1. Confirm the Contract Analysis claims on the product page: English and Dutch contracts, and a GDPR data processing agreement with every subscription.
2. Confirm the retention period for website messages in `pages/privacy.html` (currently 12 months).
3. If the security headers in `vercel.json` are enabled, allow Cal.com (`app.cal.com`, `cal.com`), Formspree (`formspree.io`) and Google Fonts in the Content Security Policy, or the calendar and forms will stop working.
