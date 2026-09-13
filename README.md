# Shaofei Cai · Academic Homepage

Personal academic homepage of **Shaofei Cai (蔡少斐)** — Researcher at DeepSeek AI, Ph.D. from Peking University.

**Live site:** <https://phython96.github.io/>

Bilingual (Chinese / English), built with Jekyll and deployed to GitHub Pages.

## Features

- **Bilingual** — Chinese is the default language at `/`, English at `/en/`, powered by
  [jekyll-polyglot](https://github.com/untra/polyglot). Every page, including news and publication
  abstracts, has a `_zh` counterpart.
- **Dark mode** + four switchable accent themes (purple / red / blue / minecraft), persisted in
  `localStorage` and applied before first paint to avoid a flash of unstyled content.
- **Live Google Scholar badge** — citation count, h-index and i10 are fetched at runtime from a
  `google-scholar-stats` data branch, refreshed daily by a GitHub Actions crawler.
- **Collapsible news timeline**, selected-publication highlights, scroll-reveal animations, and a
  visitor counter.
- **Business card modal** — clicking the portrait opens a contact card with positions, research
  interests and contact links, built from the active language's profile data.

## Project structure

```
_config.yml                  # Jekyll config: languages, plugins, analytics
index.html                   # Homepage (profile + experience + news + selected publications)
publications.html            # Full publication list, grouped by year
showcase.html                # Showcase grid
404.html

_data/
  profile.yml                # English profile: positions, bio, education, experience, awards, photo
  profile_zh.yml             # Chinese profile (used when active_lang == "zh")
  display.yml                # Homepage section toggles and footer text
  navigation.yml             # Navbar entries (name / name_zh / url)
  strings.yml                # UI string dictionary, per language
  authors.yml                # Co-author list, used to bold/highlight names

_news/                       # One file per news item (title, title_zh, date)
_publications/<year>/        # One file per paper
_showcase/                   # Showcase cards

_includes/widgets/           # profile_card, experience_card, news_card, publication_card, ...
_includes/head.html          # All <head> metadata: SEO, Open Graph, hreflang, JSON-LD
_layouts/default.html        # Main layout: navbar, footer, scripts
assets/css/global.css        # All styling
assets/js/common.js          # Theme switching, reveal animations, Scholar badge fetch
assets/images/og/            # Generated 1200x630 social preview cards
tools/make_og_image.py       # Regenerates the cards above (excluded from the build)
robots.txt, sitemap.xml      # Crawler directives and the bilingual sitemap
```

## Local development

> **Important — use Homebrew's Ruby 3.4, not the system Ruby.**
>
> macOS ships Ruby 2.6 at `/usr/bin/ruby`. Running the project with it fails immediately:
>
> ```
> Could not find 'bundler' (2.7.2) required by your Gemfile.lock. (Gem::GemNotFoundException)
> ```
>
> The `bundle` on `PATH` resolves to `/usr/bin/bundle` (Ruby 2.6), which does not have the bundler
> version this project is locked to. Put Homebrew's Ruby first on `PATH` before building:
>
> ```bash
> export PATH="/opt/homebrew/opt/ruby@3.4/bin:$PATH"
> ```
>
> Install it once with `brew install ruby@3.4` if missing. This is a local-only concern —
> CI uses `ruby/setup-ruby` and is unaffected.

```bash
# 1. Use Homebrew Ruby 3.4 (see note above)
export PATH="/opt/homebrew/opt/ruby@3.4/bin:$PATH"

# 2. Install dependencies (gems are vendored into vendor/bundle per .bundle/config)
bundle install

# 3. Serve locally with live rebuild
bundle exec jekyll serve          # → http://127.0.0.1:4000

# Or just build into _site/
bundle exec jekyll build          # add JEKYLL_ENV=production for a production build
```

Notes:

- Chinese pages are served at `/`, English at `/en/`.
- `_config.yml` is **not** reloaded automatically. Restart the server after editing it.
- `_site/` is generated output and is not tracked in git.
- `Gemfile.lock` is not tracked either; `bundle install` regenerates it.

## Adding content

**A news item** — create `_news/YYYY-newsN.md`:

```yaml
---
title: >-
    Some news in English. 🎉
title_zh: >-
    对应的中文动态。🎉
date: 2026-09-13 10:00:00 +0800
---
```

Ordering is driven by `date`, newest first. The most recent entry is also surfaced as the
"Latest" line on the homepage profile card.

**A publication** — add a file under `_publications/<year>/` with:

- `title`, `date`, `selected` (show on the homepage), `pub` (venue string, e.g. `"arxiv"` or
  `"International Conference on Learning Representations (ICLR'24)"`), `pub_date` (display year)
- `authors` (one per line; `*` marks equal contribution — `_data/authors.yml` controls which names
  are highlighted), `cover` (thumbnail URL), `links` (`Paper:` / `Code:` / `Page:` / `Video:` …)
- `abstract` and `abstract_zh`, plus optional `pub_last` for badge markup
  (e.g. `Spotlight`, `Oral`, `Top 6.2%`)

See any existing file for the exact shape.

**Switching profile text** — edit both `_data/profile.yml` (English) and `_data/profile_zh.yml`
(Chinese). They are independent files, so a wording or photo change usually needs to be made twice.

## SEO, social preview and language alternates

Everything `<head>`-related lives in `_includes/head.html`, shared by `default.html` and
`prompt.html`, so the 404 page is covered too. It emits:

- `<title>`, `<meta name="description">`, `<meta name="author">`, `<link rel="canonical">`
- **hreflang** alternates (`zh-CN`, `en`, `x-default`). These matter here: GitHub Pages serves both
  `/publications` and `/publications.html` with HTTP 200 and **no redirect**, so without canonical
  and hreflang tags each page competes with its own duplicates and with its other-language twin.
- **Open Graph + Twitter Card**, with a per-language 1200×630 preview image
  (`assets/images/og/og-zh.png` and `og-en.png`).
- **JSON-LD `Person`** structured data on the homepage, built from `_data/profile*.yml`.

Descriptions come from `_data/strings.yml` (`site_description`, `desc_publications`,
`desc_showcase`); add a `description:` to a page's front matter to override it. Add `noindex: true`
to exclude a page from search (this is how `404.html` is handled).

### Regenerating the preview cards

The cards are generated, not hand-drawn. After changing the name, title or portrait:

```bash
python3 tools/make_og_image.py     # needs Pillow; writes assets/images/og/og-{en,zh}.png
```

### Gotcha: jekyll-polyglot rewrites URLs in the output

Polyglot post-processes rendered HTML and prefixes internal `href="..."` values with the active
language on non-default pages. Its negative lookbehind only exempts `hreflang="zh"` — **not**
`hreflang="zh-CN"` or `x-default` — so cross-language links silently get pointed at `/en/…`. Wrap
any URL that must stay language-neutral in `{% raw %}{% static_href %}href="…"{% endstatic_href %}{% endraw %}`
(see `_includes/head.html` and the language switcher in `_includes/navbar.html`). Paths under
`exclude_from_localization` in `_config.yml` — `assets`, `images`, … — are exempt automatically,
which is why asset URLs work unguarded.

### Gotcha: `.reveal` breaks `position: fixed` children

`.reveal` (the scroll animation wrapper used throughout `index.html`) sets
`will-change: transform`, which makes it the containing block for `position: fixed` descendants.
A Bootstrap modal nested inside it would be positioned against that element instead of the viewport.
That is why `widgets/namecard_modal.html` is included from `index.html` **outside** the `.reveal`
div rather than from inside `profile_card.html`. Keep modal markup out of `.reveal`.

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which builds the site on Ruby 3.3 and
publishes it to GitHub Pages. No manual step is required.

`.github/workflows/google-scholar-stats.yml` runs separately on a daily schedule: it crawls Google
Scholar and commits the result to the `google-scholar-stats` branch. It never touches the deployed
site; the homepage badge reads that branch's JSON at runtime.

Analytics are configured under `analytics:` in `_config.yml` (visitor counter enabled by default;
GoatCounter and Flag Counter can be enabled by filling in their codes).

## Credits

Built on the [academic-homepage](https://github.com/luost26/academic-homepage) template by
Shitong Luo, released under the MIT License. See [LICENSE](LICENSE).
