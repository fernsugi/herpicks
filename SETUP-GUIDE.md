# HerPicks.co — Setup Guide 🚀

Everything is built, pushed to GitHub, and deployed!

- ✅ GitHub repo: https://github.com/fernsugi/herpicks
- ✅ GitHub Pages: enabled & deployed
- ✅ Code: pushed and live

## ONLY STEP LEFT: Point Domain to GitHub Pages (5 minutes)

Go to Namecheap → Domain List → herpicks.co → Advanced DNS

Delete any existing records, then add these:

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | fernsugi.github.io. |

DNS takes 5-30 minutes to propagate.

After DNS propagates, GitHub will auto-provision a free SSL certificate (up to 1 hour).
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
