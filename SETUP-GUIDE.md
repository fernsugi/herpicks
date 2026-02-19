# 🚀 HerPicks.co — Setup Guide

**Everything is built. Follow these steps to go live. No code needed.**

---

## Step 1: Create GitHub Repo (2 minutes)

1. Go to https://github.com/new
2. Repo name: `herpicks`
3. Make it **Public** (required for free GitHub Pages)
4. Do NOT add README (we already have one)
5. Click **Create repository**
6. Tell Sen the repo URL — he'll push the code for you

## Step 2: Point Domain to GitHub Pages (5 minutes)

On **Namecheap**:
1. Go to Domain List → `herpicks.co` → **Advanced DNS**
2. Delete any existing records
3. Add these **A Records**:

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | fernsugi.github.io |

*(Replace `fernsugi` with your actual GitHub username)*

4. TTL: Automatic

## Step 3: Enable GitHub Pages (1 minute)

1. Go to your repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. That's it — the deploy workflow is already configured

## Step 4: Wait for DNS (5-30 minutes)

- DNS takes a few minutes to propagate
- Visit https://herpicks.co — should show your site
- GitHub auto-provisions free SSL (HTTPS)

## Step 5: Verify

- ✅ Homepage loads with products
- ✅ Category pages work
- ✅ Search works
- ✅ Product detail pages load
- ✅ "Shop on Amazon" buttons go to Amazon with your affiliate tag
- ✅ Mobile looks good

---

## 🎉 You're Live!

**What happens next:**
- Sen adds new products daily (automated)
- Sen generates TikTok/IG slideshow content (automated)
- You warm up TikTok/IG accounts (2 weeks)
- You add music to TikTok drafts + hit publish (~60 sec/day)
- Money comes in through Amazon Associates

**Still needed from you:**
- [ ] Postiz account (for TikTok posting API)
- [ ] TikTok account (warming up)
- [ ] Instagram account (warming up)
