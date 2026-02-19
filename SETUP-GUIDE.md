# HerPicks.co — Setup Guide 🚀

Everything is built. Follow these steps to go live.

## Step 1: Create GitHub Repository (2 minutes)

1. Go to https://github.com/new
2. Repository name: `herpicks`
3. Set to **Public** (required for free GitHub Pages)
4. DON'T add README (we already have one)
5. Click "Create repository"

Then tell Sen — he'll push the code for you.

## Step 2: Point Domain to GitHub Pages (5 minutes)

Go to Namecheap → Domain List → herpicks.co → Advanced DNS

Delete any existing records, then add these:

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | fernsugi.github.io. |

(Replace `fernsugi` with your actual GitHub username if different)

DNS takes 5-30 minutes to propagate.

## Step 3: Enable GitHub Pages (1 minute)

1. Go to your repo → Settings → Pages
2. Source: **GitHub Actions**
3. That's it — the workflow file is already included

## Step 4: Wait for SSL (automatic)

GitHub will auto-provision a free SSL certificate. Takes up to 1 hour.
Check "Enforce HTTPS" in Settings → Pages once available.

## Done! 🎉

Your site will be live at **https://herpicks.co**

---

## Later: Social Media Setup

When ready to start posting:

1. **TikTok** — Create account, warm up 2 weeks scrolling beauty content
2. **Instagram** — Same thing
3. **Postiz** — Sign up, connect TikTok/IG, get API key
4. Tell Sen the API key — automation takes over from there

## Adding New Products

Tell Sen "add more products to HerPicks" — he'll scrape trending Amazon beauty products and update the site automatically. Or run:

```bash
cd herpicks
node scripts/update-products.js add --title "Product Name" --price 29.99 --category Skincare --asin B0XXXXXXXX
```

## Generating TikTok Slideshows

```bash
node scripts/generate-slideshow.js
```

This picks top products and generates slideshow prompts for image generation.
