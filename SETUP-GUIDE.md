# 🌸 HerPicks.co — Setup Guide for Sugi

Everything is built. You just need to connect the wires. ~10 minutes total.

## Step 1: Create GitHub Repo (2 min)

1. Go to github.com → New Repository
2. Name: `herpicks`
3. Public (required for free GitHub Pages)
4. DON'T add README (we already have one)
5. Click Create

Then tell me and I'll push the code.

## Step 2: Point Domain to GitHub Pages (3 min)

On Namecheap:
1. Go to Domain List → `herpicks.co` → Manage
2. Click **Advanced DNS**
3. Delete any existing records
4. Add these records:

| Type  | Host | Value              |
|-------|------|--------------------|
| A     | @    | 185.199.108.153    |
| A     | @    | 185.199.109.153    |
| A     | @    | 185.199.110.153    |
| A     | @    | 185.199.111.153    |
| CNAME | www  | fernsugi.github.io |

(Replace `fernsugi` with your actual GitHub username if different)

DNS takes 5-30 minutes to propagate.

## Step 3: Enable GitHub Pages (1 min)

1. Go to your repo on GitHub → Settings → Pages
2. Source: **GitHub Actions** (not "Deploy from a branch")
3. Custom domain: `herpicks.co`
4. Check "Enforce HTTPS"

## Step 4: Done! 🎉

Site will be live at https://herpicks.co once DNS propagates.

## Daily Operations

### Adding new products
I'll handle this automatically. The script at `scripts/update-products.js` adds products to the JSON file.

### TikTok/IG Content
Once you set up Postiz, I'll generate slideshow content daily using `scripts/generate-slideshow.js`.

## What's Included

- 55 real beauty products across 6 categories
- All affiliate links tagged with `sentientstudi-22`
- Mobile-responsive design
- Search, filters, sorting
- Full SEO (sitemap, meta tags, structured data)
- Affiliate disclosure on every page
- Auto-deploy via GitHub Actions

## Future Improvements (I'll handle these)
- Real Amazon product images via PA-API
- More products (scaling to 200+)
- Blog section for SEO content
- Email newsletter integration
- Analytics tracking
