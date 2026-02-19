# HerPicks.co — Curated Beauty Finds on Amazon

A fully automated Amazon affiliate website for ladies beauty, skincare, and luxury products.

**Live:** [herpicks.co](https://herpicks.co)

## Stack

- Pure HTML, CSS, JavaScript — no frameworks, no build tools
- Hosted on GitHub Pages (free)
- Product data in `data/products.json`
- Amazon Associates affiliate tag: `sentientstudi-22`

## Structure

```
herpicks/
├── index.html              # Homepage
├── product.html            # Product detail (dynamic)
├── about.html              # About + affiliate disclosure
├── privacy.html            # Privacy policy
├── categories/
│   ├── skincare.html
│   ├── makeup.html
│   ├── haircare.html
│   ├── fragrance.html
│   ├── luxury-beauty.html
│   └── tools-accessories.html
├── css/style.css           # All styles
├── js/app.js               # All JavaScript
├── data/products.json      # Product database
├── scripts/
│   ├── update-products.js  # Add/manage products
│   └── generate-slideshow.js  # Generate social media content
├── sitemap.xml
├── robots.txt
├── CNAME                   # Custom domain
└── .github/workflows/deploy.yml
```

## How to Add Products

### Option 1: CLI Script
```bash
# Add a single product by ASIN
node scripts/update-products.js --add '{"title":"Product Name","price":29.99,"category":"Skincare","asin":"B00XXXXX","rating":4.5,"reviewCount":1234,"description":"Product description"}'

# Generate placeholder products
node scripts/update-products.js --category "Makeup" --count 5

# List product counts
node scripts/update-products.js --list true
```

### Option 2: Edit JSON directly
Edit `data/products.json` and add product entries. Required fields:
- `id` (unique number)
- `title`, `description`, `price`, `category`
- `affiliateUrl` (Amazon link with `?tag=sentientstudi-22`)
- `rating`, `reviewCount`
- `image` (URL or placeholder)

## How to Deploy

1. Push to `main` branch on GitHub
2. GitHub Actions automatically deploys to GitHub Pages
3. Custom domain `herpicks.co` configured via CNAME

### First-time setup:
1. Create GitHub repo
2. Go to Settings → Pages → Source: GitHub Actions
3. Point domain DNS (Namecheap) to GitHub Pages:
   - A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - CNAME: `www` → `<username>.github.io`

## Social Media Content

```bash
# Generate slideshow data for TikTok/IG
node scripts/generate-slideshow.js
node scripts/generate-slideshow.js --category "Skincare" --theme "budget" --max-price 20
```

Themes: `top-rated`, `budget`, `trending`, `new`

## Automation

The AI agent can run daily:
1. `node scripts/update-products.js --add '{...}'` to add new trending products
2. `node scripts/generate-slideshow.js` to create social media content
3. `git add . && git commit -m "Daily update" && git push` to deploy

## License

Content © 2026 HerPicks. All rights reserved.
