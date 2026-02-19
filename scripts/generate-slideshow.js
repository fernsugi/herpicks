#!/usr/bin/env node
/**
 * HerPicks Slideshow Generator
 * 
 * Picks top products and generates slideshow data for TikTok/IG content.
 * 
 * Usage:
 *   node scripts/generate-slideshow.js
 *   node scripts/generate-slideshow.js --category "Skincare" --count 5
 *   node scripts/generate-slideshow.js --theme "budget" --max-price 20
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8')).products;
}

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

const products = loadProducts();
const category = flags.category;
const count = parseInt(flags.count) || 5;
const theme = flags.theme || 'top-rated';
const maxPrice = flags['max-price'] ? parseFloat(flags['max-price']) : Infinity;

// Filter products
let filtered = [...products];
if (category) filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
if (maxPrice < Infinity) filtered = filtered.filter(p => p.price <= maxPrice);

// Sort by theme
switch (theme) {
  case 'budget':
    filtered.sort((a, b) => a.price - b.price);
    break;
  case 'trending':
    filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    break;
  case 'new':
    filtered.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
    break;
  default: // top-rated
    filtered.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
}

const selected = filtered.slice(0, count);

// Generate hook text based on theme
const hooks = {
  'top-rated': `${count} beauty products with THOUSANDS of 5-star reviews 🌟`,
  'budget': `${count} amazing beauty finds under $${maxPrice < Infinity ? maxPrice : 20} 💸`,
  'trending': `The ${count} most popular beauty products on Amazon right now 🔥`,
  'new': `${count} NEW beauty products you need to try ${new Date().toLocaleDateString('en-US', { month: 'long' })} ✨`,
};

const slideshow = {
  theme,
  category: category || 'All Beauty',
  generatedAt: new Date().toISOString(),
  slides: [
    {
      type: 'hook',
      text: hooks[theme] || hooks['top-rated'],
      prompt: `Create an eye-catching title slide with text "${hooks[theme] || hooks['top-rated']}" on a soft pink/rose gold gradient background. Modern, feminine aesthetic. Bold text. Beauty/cosmetics vibes.`
    },
    ...selected.map((p, i) => ({
      type: 'product',
      position: i + 1,
      title: p.title,
      price: `$${p.price.toFixed(2)}`,
      rating: `${p.rating}★ (${p.reviewCount.toLocaleString()} reviews)`,
      image: p.image,
      affiliateUrl: p.affiliateUrl,
      prompt: `Product showcase slide #${i + 1}: "${p.title}" — $${p.price.toFixed(2)}, ${p.rating}★ rating. Clean product photo on soft pink background. Price tag overlay. Modern beauty editorial style.`
    })),
    {
      type: 'cta',
      text: 'Link in bio for all products! 🔗\nFollow @herpicks for daily beauty finds',
      prompt: 'Call-to-action slide: "Link in bio for all products!" with "Follow @herpicks for daily beauty finds". Soft pink/rose gold gradient. Modern, clean typography. Beauty/feminine aesthetic.'
    }
  ],
  caption: `${hooks[theme] || hooks['top-rated']}\n\n${selected.map((p, i) => `${i + 1}. ${p.title} — $${p.price.toFixed(2)}`).join('\n')}\n\n🔗 All links at herpicks.co\n\n#beauty #skincare #makeup #amazonfinds #beautytips #beautydeals #amazonbeauty`,
};

console.log(JSON.stringify(slideshow, null, 2));

// Also save to file
const outDir = path.join(__dirname, '..', 'data');
const outFile = path.join(outDir, `slideshow-${Date.now()}.json`);
fs.writeFileSync(outFile, JSON.stringify(slideshow, null, 2));
console.error(`\n✅ Slideshow saved to ${outFile}`);
console.error(`📱 ${slideshow.slides.length} slides (1 hook + ${selected.length} products + 1 CTA)`);
