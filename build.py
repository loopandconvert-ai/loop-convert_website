"""Assembles the static pages from shared header/footer partials.

The generated .html files in the project root are plain static pages: you do
not need to run this script to use the site. It keeps the header and footer
identical across pages and fills in the contact details below.
Edit partials/ or pages/ (or the details below), then run:  python build.py
"""
from pathlib import Path

# Contact details used on every page. Change them here, then rebuild.
SITE = {
    "email": "loopandconvert@gmail.com",
    "phone": "+31 6 25500911",
    "phone_link": "+31625500911",
}

ROOT = Path(__file__).parent
PARTIALS = ROOT / "partials"
PAGES = ROOT / "pages"
CURRENT_KEYS = ("product", "about", "contact", "call")
ENC = "utf-8"

header = (PARTIALS / "header.html").read_text(encoding=ENC)
footer = (PARTIALS / "footer.html").read_text(encoding=ENC)

# The recovery script forwards Supabase password-reset links, which land on the
# site root, to the app's reset page. Keep it as the first script on every page.
HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>
  if (window.location.hash.indexOf("type=recovery") !== -1) {{
    window.location.replace("reset-password.html" + window.location.hash);
  }}
</script>
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="icon" type="image/png" href="assets/img/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Geist:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
"""
TAIL = """<script>window.LC_SITE = {{ email: "{email}", phone: "{phone}" }};</script>
<script src="assets/country-codes.js"></script>
<script src="assets/main.js"></script>
</body>
</html>
"""


def fill(text: str) -> str:
    for key, value in SITE.items():
        text = text.replace("{{%s}}" % key, value)
    return text


for src in sorted(PAGES.glob("*.html")):
    raw = src.read_text(encoding=ENC)
    meta, body = raw.split("\n---\n", 1)
    fields = dict(line.split(": ", 1) for line in meta.strip().splitlines())
    nav = header
    for key in CURRENT_KEYS:
        nav = nav.replace("{{current_%s}}" % key, ' aria-current="page"' if fields.get("current") == key else "")
    out = HEAD.format(title=fields["title"], description=fields["description"]) + nav + body + footer + TAIL.format(**SITE)
    (ROOT / src.name).write_text(fill(out), encoding=ENC, newline="\n")
    print("built", src.name)
