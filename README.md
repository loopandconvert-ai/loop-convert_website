# Loop&Convert website

The marketing site is plain HTML, CSS and JavaScript. The Contract Analysis app lives in the same repository. See `CLAUDE.md` for the full structure.

## Preview

Install the "Live Server" extension in VS Code, right-click `index.html` and choose "Open with Live Server". Or open `index.html` directly in your browser.

## Editing the marketing pages

The header and footer are shared across pages. Edit files in `partials/` and `pages/`, then run:

```
python build.py
```

## Deploying

Push to the `main` branch on GitHub. Vercel publishes the site automatically. `.vercelignore` keeps the source files (`partials/`, `pages/`, `build.py`) out of the published site.
