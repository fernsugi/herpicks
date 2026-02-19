# 🌸 HerPicks.co — Setup Guide for Sugi

**Everything is built. You just need to connect the wires.**

## Step 1: Create GitHub Repository (2 minutes)

1. Go to https://github.com/new
2. Repository name: `herpicks`
3. Set to **Public** (required for free GitHub Pages)
4. Do NOT add README (we already have one)
5. Click "Create repository"

Then I'll push the code for you (or you can run):
```bash
cd ~/.openclaw/workspace/herpicks
git remote add origin https://github.com/fernsugi/herpicks.git
git push -u origin main
```

## Step 2: Enable GitHub Pages (1 minute)

1. Go to your repo → **Settings** → **Pages**
2. Source: **GitHub Actions** (it will use our deploy workflow)
3. That's it — the site will auto-deploy on every push

## Step 3: Point Domain to GitHub Pages (5 minutes)

Go to Namecheap → Domain List → **herpicks.co** → **Advanced DNS**

Delete any existing records, then add:

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | fernsugi.github.io |

Wait 5-30 minutes for DNS to propagate.

Then in GitHub → Settings → Pages → Custom domain: enter `herpicks.co` and check "Enforce HTTPS".

## Step 4: Done! 🎉

Your site is live at **https://herpicks.co**

## Later (Not Urgent):

- **Amazon PA-API**: Apply at https://affiliate-program.amazon.com — once approved, we can fetch real product images automatically
- **Postiz**: For TikTok/IG auto-posting
- **TikTok/IG warmup**: Keep scrolling beauty content daily

## How to Add Products

Just tell me! I'll update `data/products.json` and push. Or you can run:
```bash
cd ~/.openclaw/workspace/herpicks
node scripts/update-products.js add --title "Product Name" --price 29.99 --category Skincare --asin B00XXXXX
```

## How Daily Updates Work

Every night I can:
1. Research trending beauty products on Amazon
2. Add them to the site
3. Push to GitHub (auto-deploys)
4. Generate TikTok slideshow content

Zero effort from you.

---

**Total setup time: ~10 minutes**
**Your ongoing effort: ~0 minutes/day** (I handle everything)
