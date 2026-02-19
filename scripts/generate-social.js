#!/usr/bin/env node
/**
 * HerPicks Social Content Generator
 * ====================================
 * Reads product data and generates TikTok/Instagram captions,
 * hashtags, and content plans. Saves to social-content/ directory.
 *
 * Usage:
 *   node scripts/generate-social.js
 *     → Generate content for all products (added in last 7 days)
 *
 *   node scripts/generate-social.js --category "Skincare"
 *     → Generate content for a specific category
 *
 *   node scripts/generate-social.js --id 1
 *     → Generate content for a specific product by ID
 *
 *   node scripts/generate-social.js --count 10 --sort trending
 *     → Generate for top 10 trending products
 *
 *   node scripts/generate-social.js --format tiktok
 *     → TikTok-specific captions only
 *
 *   node scripts/generate-social.js --format instagram
 *     → Instagram-specific captions only
 *
 *   node scripts/generate-social.js --theme budget --max-price 25
 *     → Budget beauty theme
 *
 *   node scripts/generate-social.js --bundle 5
 *     → Create a "5 products" bundle post
 *
 * Options:
 *   --category    Filter by category
 *   --id          Specific product ID
 *   --count       Max products to generate (default: 10)
 *   --sort        Sort by: trending, top-rated, budget, new (default: new)
 *   --format      Output format: all, tiktok, instagram (default: all)
 *   --theme       Content theme: standard, budget, luxury, viral, routine (default: standard)
 *   --max-price   Maximum price filter
 *   --min-rating  Minimum rating filter (default: 4.0)
 *   --bundle      Create a bundle/roundup post with N products
 *   --days        Only include products added in last N days (default: 7)
 *   --output-dir  Output directory (default: social-content/)
 *
 * Output:
 *   social-content/YYYY-MM-DD/[slug]-tiktok.txt
 *   social-content/YYYY-MM-DD/[slug]-instagram.txt
 *   social-content/YYYY-MM-DD/bundle-[theme].txt
 *   social-content/YYYY-MM-DD/_index.md   ← Summary of all generated content
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const AFFILIATE_TAG = 'sentientstudi-22';
const BASE_DIR = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(BASE_DIR, 'data', 'products.json');
const SITE_URL = 'https://herpicks.co';
const HANDLE = '@herpicks';
const TODAY = new Date().toISOString().split('T')[0];

// ─── Hashtag Libraries ────────────────────────────────────────────────────────

const BASE_HASHTAGS = [
  '#beauty', '#beautyfinds', '#beautyreview',
  '#amazonfinds', '#amazonbeauty', '#amazonfavorites',
  '#beautytips', '#beautyproducts', '#beautyhacks',
  '#herpicks', '#beautycommunity',
];

const CATEGORY_HASHTAGS = {
  'Skincare': [
    '#skincare', '#skincareroutine', '#skincareproducts',
    '#skincaretips', '#glowup', '#glowskin',
    '#clearskin', '#healthyskin', '#antiaging',
    '#hydratedskin', '#serums', '#moisturizer',
    '#skincareaddict', '#kbeauty',
  ],
  'Makeup': [
    '#makeup', '#makeupartist', '#makeuptutorial',
    '#makeuplook', '#makeupoftheday', '#makeuplife',
    '#makeupobsessed', '#makeupinspo', '#glam',
    '#lipstick', '#foundation', '#mascara',
    '#drugstoremakeup', '#luxurymakeup',
  ],
  'Haircare': [
    '#haircare', '#hairroutine', '#hairproducts',
    '#hairtips', '#hairgoals', '#healthyhair',
    '#haircare2025', '#goodhairdayz', '#haircare101',
    '#hairstyle', '#shampoo', '#hairtreatment',
    '#hairgrowth',
  ],
  'Fragrance': [
    '#fragrance', '#perfume', '#fragrancecommunity',
    '#perfumeaddict', '#scentoftheday', '#perfumelover',
    '#fragranceblog', '#perfumereview', '#scents',
    '#perfumecollection', '#luxuryFragrance', '#oud',
  ],
  'Luxury Beauty': [
    '#luxurybeauty', '#luxuryskincare', '#highendbeauty',
    '#luxurylifestyle', '#treatyourself', '#skincaregoals',
    '#glowskin', '#luxurymakeup', '#premiumbeauty',
    '#investinyourskin',
  ],
  'Tools & Accessories': [
    '#beautytools', '#beautydevice', '#hairstyling',
    '#blowout', '#beautygadgets', '#gua sha',
    '#microcurrent', '#skincaretool', '#hairtools',
    '#stylingtool',
  ],
};

const THEME_HASHTAGS = {
  budget: ['#budgetbeauty', '#affordablebeauty', '#drugstorebeauty', '#dupes', '#savemoney', '#beautyonabudget'],
  luxury: ['#luxurybeauty', '#splurgeworthy', '#treatyourself', '#highendbeauty', '#worthit'],
  viral: ['#viral', '#trending', '#tiktokmademebuyit', '#amazonfinds', '#foryoupage', '#fyp', '#viralproduct'],
  routine: ['#morningroutine', '#nightroutine', '#skincareroutine', '#beautyroutine', '#selfcare', '#selfcaresunday'],
  standard: [],
};

// ─── Content Templates ────────────────────────────────────────────────────────

// TikTok hooks (attention-grabbers for first 3 seconds)
const TIKTOK_HOOKS = {
  bestseller: [
    'This has {reviews}+ 5-star reviews and I finally tried it 👀',
    'POV: you spent 30 minutes reading Amazon reviews and bought this',
    'Stop scrolling — this {category} product is EVERYWHERE for a reason',
    'I was today years old when I discovered this {subcategory} 😭',
    '{reviews}k people can\'t be wrong about this {category} product',
  ],
  new: [
    'NEW drop alert 🚨 This just hit Amazon and it\'s already selling out',
    'I found the next viral {category} product before it blows up 👀',
    'First look at this new {subcategory} that everyone\'s about to be obsessed with',
    'This new beauty drop literally changed my {category} routine',
  ],
  sale: [
    'This {price} deal won\'t last — add to cart NOW 🔥',
    'Run, don\'t walk — this {category} fave is on sale',
    'I paid full price for this and I\'m telling you to buy it on sale',
  ],
  budget: [
    'Under ${price} and it performs like a luxury product 💸',
    'POV: the drugstore version that actually works',
    'Saving money never looked this good — {price} for this??',
  ],
  default: [
    'Your {category} routine is missing this one product 👇',
    'Adding this {subcategory} to my rotation immediately',
    'Rating {rating}⭐ with {reviews}k reviews — need I say more?',
    'The {category} product I keep coming back to',
    'Real talk: this {subcategory} hit different',
  ],
};

// Instagram caption styles
const INSTAGRAM_STYLES = {
  minimal: (product, benefits, hashtags) => `✨ ${product.title}

${product.description}

${benefits.length > 0 ? '🌿 Key benefits:\n' + benefits.slice(0, 3).map(b => `• ${b}`).join('\n') + '\n\n' : ''}💰 ${formatPrice(product.price)} on Amazon${product.originalPrice ? ` (was ${formatPrice(product.originalPrice)})` : ''}
🔗 Link in bio → ${SITE_URL}

${hashtags.join(' ')}`,

  storytelling: (product, benefits, hashtags, hook) => `${hook}

Let me introduce you to ${product.title} — the ${product.subcategory?.toLowerCase() || product.category.toLowerCase()} that's been all over my FYP lately.

${product.description}

${benefits.length > 0 ? 'What I love about it:\n' + benefits.slice(0, 4).map(b => `✅ ${b}`).join('\n') + '\n' : ''}
Rated ${product.rating}⭐ by ${product.reviewCount.toLocaleString()}+ happy customers, and at ${formatPrice(product.price)} it's an absolute steal.

👇 Shop link in bio or visit ${SITE_URL}

${hashtags.join(' ')}`,

  list: (product, benefits, hashtags) => `💄 HerPicks Find of the Day

📦 ${product.title}
💰 ${formatPrice(product.price)}${product.originalPrice ? ` ~~${formatPrice(product.originalPrice)}~~` : ''}
⭐ ${product.rating}/5.0 (${product.reviewCount.toLocaleString()} reviews)
🏷️ ${product.category} › ${product.subcategory}

${benefits.length > 0 ? '✨ Why we love it:\n' + benefits.map(b => `→ ${b}`).join('\n') + '\n' : ''}
${product.badge === 'bestseller' ? '🏆 Amazon Bestseller\n' : ''}
🔗 Link in bio for the full review + buy link

${hashtags.join(' ')}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template, product) {
  return template
    .replace('{category}', product.category)
    .replace('{subcategory}', product.subcategory || product.category)
    .replace('{price}', formatPrice(product.price))
    .replace('{rating}', product.rating)
    .replace('{reviews}', Math.round(product.reviewCount / 1000) + 'k')
    .replace('{title}', product.title);
}

function selectHashtags(product, theme, count = 25) {
  const catTags = CATEGORY_HASHTAGS[product.category] || [];
  const themeTags = THEME_HASHTAGS[theme] || [];
  const combined = [...BASE_HASHTAGS, ...catTags, ...themeTags];
  // Deduplicate
  const unique = [...new Set(combined)];
  // Shuffle and pick
  const shuffled = unique.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getBestHook(product, theme) {
  const hookPool = theme === 'budget'
    ? TIKTOK_HOOKS.budget
    : product.badge === 'bestseller'
    ? TIKTOK_HOOKS.bestseller
    : product.badge === 'new'
    ? TIKTOK_HOOKS.new
    : product.badge === 'sale'
    ? TIKTOK_HOOKS.sale
    : TIKTOK_HOOKS.default;

  return fillTemplate(pickRandom(hookPool), product);
}

function generateTikTokCaption(product, theme) {
  const hook = getBestHook(product, theme);
  const hashtags = selectHashtags(product, theme, 20);
  const benefits = product.benefits || [];
  const productUrl = `${SITE_URL}/products/${slugify(product.title)}.html`;
  const affiliateUrl = product.affiliateUrl;

  const parts = [];

  // Hook
  parts.push(hook);
  parts.push('');

  // Product highlight
  parts.push(`✨ ${product.title}`);
  parts.push('');

  // Key benefit or description snippet
  if (benefits.length > 0) {
    parts.push(`Why it's worth it:`);
    benefits.slice(0, 3).forEach(b => parts.push(`✅ ${b}`));
    parts.push('');
  } else {
    // Use first sentence of description
    const firstSentence = product.description.split('.')[0] + '.';
    parts.push(firstSentence);
    parts.push('');
  }

  // Price
  parts.push(`💰 ${formatPrice(product.price)}${product.originalPrice ? ` (was ${formatPrice(product.originalPrice)})` : ''} on Amazon`);
  parts.push('');

  // Rating social proof
  parts.push(`⭐ ${product.rating}/5 — ${product.reviewCount.toLocaleString()} reviews`);
  parts.push('');

  // CTA
  parts.push(`🔗 Full review + buy link at ${SITE_URL}`);
  parts.push(`👆 Link in bio`);
  parts.push('');

  // Hashtags
  parts.push(hashtags.join(' '));

  return parts.join('\n');
}

function generateInstagramCaption(product, theme, style = 'storytelling') {
  const hook = getBestHook(product, theme);
  const hashtags = selectHashtags(product, theme, 28);
  const benefits = product.benefits || [];
  const styleFn = INSTAGRAM_STYLES[style] || INSTAGRAM_STYLES.storytelling;

  return styleFn(product, benefits, hashtags, hook);
}

function generateBundleCaption(products, theme, format) {
  const count = products.length;
  const totalSavings = products
    .filter(p => p.originalPrice)
    .reduce((sum, p) => sum + (p.originalPrice - p.price), 0);

  const themeHooks = {
    standard: `${count} beauty products that are actually worth your money 💄`,
    budget: `${count} beauty products under ${formatPrice(Math.max(...products.map(p => p.price)))} that go HARD 💸`,
    luxury: `${count} luxury beauty investments that are 100% worth the splurge 👑`,
    viral: `${count} Amazon beauty products that went viral for a reason 🔥`,
    routine: `My complete ${products[0]?.category || 'beauty'} routine (all products linked!) ✨`,
  };

  const hook = themeHooks[theme] || themeHooks.standard;

  const productList = products.map((p, i) => {
    const savings = p.originalPrice ? ` (save ${Math.round((1 - p.price / p.originalPrice) * 100)}%)` : '';
    return `${i + 1}. ${p.title}\n   💰 ${formatPrice(p.price)}${savings} | ⭐ ${p.rating}`;
  }).join('\n\n');

  const allHashtags = [
    ...new Set([
      ...BASE_HASHTAGS,
      ...(CATEGORY_HASHTAGS[products[0]?.category] || []),
      ...(THEME_HASHTAGS[theme] || []),
    ])
  ].slice(0, 25);

  if (format === 'instagram') {
    return `${hook}

Swipe through for all the details! 👆

${productList}

${totalSavings > 0 ? `💡 Total potential savings: ${formatPrice(totalSavings)}\n\n` : ''}🔗 All links at ${SITE_URL}
👆 Save this post to come back later!

${allHashtags.join(' ')}`;
  }

  // TikTok bundle
  return `${hook}

Drop a 💄 if you want more finds like these!

${productList}

🔗 All buy links at ${SITE_URL}
💌 Follow ${HANDLE} for daily beauty deals

${allHashtags.join(' ')}`;
}

// ─── Load Products ────────────────────────────────────────────────────────────

function loadProducts() {
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8')).products;
  } catch (e) {
    console.error(`❌ Could not read ${PRODUCTS_FILE}`);
    console.error('   Run this from the herpicks/ directory.');
    process.exit(1);
  }
}

// ─── CLI Parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    if (args[i + 1] && !args[i + 1].startsWith('--')) i++;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const category = flags.category;
  const productId = flags.id ? parseInt(flags.id) : null;
  const count = parseInt(flags.count) || 10;
  const sort = flags.sort || 'new';
  const format = flags.format || 'all'; // all, tiktok, instagram
  const theme = flags.theme || 'standard';
  const maxPrice = flags['max-price'] ? parseFloat(flags['max-price']) : Infinity;
  const minRating = parseFloat(flags['min-rating']) || 4.0;
  const bundleCount = flags.bundle ? parseInt(flags.bundle) : null;
  const days = parseInt(flags.days) || 7;
  const outputDirBase = flags['output-dir'] || path.join(BASE_DIR, 'social-content');

  console.log(`\n🌸 HerPicks Social Content Generator`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📱 Format: ${format === 'all' ? 'TikTok + Instagram' : format}`);
  console.log(`🎨 Theme:  ${theme}`);
  console.log(`📊 Sort:   ${sort}`);
  if (category) console.log(`📂 Category: ${category}`);
  if (productId) console.log(`🔍 Product ID: ${productId}`);
  if (bundleCount) console.log(`📦 Bundle: ${bundleCount} products`);
  console.log();

  // Load all products
  let products = loadProducts();

  // Filter by product ID
  if (productId) {
    products = products.filter(p => p.id === productId);
    if (products.length === 0) {
      console.error(`❌ No product found with ID ${productId}`);
      process.exit(1);
    }
  } else {
    // Filter by category
    if (category) {
      products = products.filter(p =>
        p.category.toLowerCase() === category.toLowerCase()
      );
      if (products.length === 0) {
        console.error(`❌ No products found for category "${category}"`);
        process.exit(1);
      }
    }

    // Filter by price
    if (maxPrice < Infinity) {
      products = products.filter(p => p.price <= maxPrice);
    }

    // Filter by rating
    products = products.filter(p => p.rating >= minRating);

    // Filter by recency (only if not targeting a specific ID or filtering by 'all days')
    if (!productId && days < 999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const recent = products.filter(p => p.dateAdded && p.dateAdded >= cutoffStr);
      // Only apply recency filter if we have results; otherwise fall back to all
      if (recent.length > 0) {
        products = recent;
      }
    }

    // Sort
    switch (sort) {
      case 'top-rated':
        products.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case 'budget':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'trending':
        products.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'new':
      default:
        products.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '') || b.rating - a.rating);
        break;
    }

    // Limit
    products = products.slice(0, count);
  }

  if (products.length === 0) {
    console.log(`ℹ️  No products matched your filters.\n`);
    console.log(`   Try: --days 30  or  --count 20  or remove --min-rating\n`);
    return;
  }

  console.log(`📦 Found ${products.length} product${products.length > 1 ? 's' : ''} to generate content for\n`);

  // Create output directory
  const dateDir = path.join(outputDirBase, TODAY);
  fs.mkdirSync(dateDir, { recursive: true });

  const generated = [];

  // ── Bundle mode ──
  if (bundleCount) {
    const bundleProducts = products.slice(0, bundleCount);
    const filename = `bundle-${theme}-${format === 'all' ? 'social' : format}`;

    let content = '';
    if (format === 'all') {
      content = `# Bundle Post: ${bundleProducts.length} ${bundleProducts[0]?.category || 'Beauty'} Picks\n`;
      content += `Generated: ${TODAY}\n`;
      content += `Theme: ${theme}\n\n`;
      content += `${'═'.repeat(60)}\n`;
      content += `TIKTOK CAPTION\n`;
      content += `${'═'.repeat(60)}\n\n`;
      content += generateBundleCaption(bundleProducts, theme, 'tiktok');
      content += `\n\n${'═'.repeat(60)}\n`;
      content += `INSTAGRAM CAPTION\n`;
      content += `${'═'.repeat(60)}\n\n`;
      content += generateBundleCaption(bundleProducts, theme, 'instagram');
    } else {
      content = `# Bundle Post (${format}): ${bundleProducts.length} ${bundleProducts[0]?.category || 'Beauty'} Picks\n`;
      content += `Generated: ${TODAY}\n\n`;
      content += generateBundleCaption(bundleProducts, theme, format);
    }

    const outPath = path.join(dateDir, `${filename}.txt`);
    fs.writeFileSync(outPath, content);
    console.log(`  📝 Bundle post: social-content/${TODAY}/${filename}.txt`);
    generated.push({ type: 'bundle', file: `${filename}.txt`, products: bundleProducts.length });
  }

  // ── Individual product posts ──
  products.forEach((product, i) => {
    const slug = slugify(product.title);
    const productGenerated = [];

    if (format === 'all' || format === 'tiktok') {
      const tiktokCaption = generateTikTokCaption(product, theme);
      const ttFile = `${slug}-tiktok.txt`;
      const ttPath = path.join(dateDir, ttFile);

      let tiktokContent = `# TikTok Caption: ${product.title}\n`;
      tiktokContent += `Generated: ${TODAY} | Category: ${product.category} | Price: ${formatPrice(product.price)}\n`;
      tiktokContent += `Amazon: ${product.affiliateUrl || '#'}\n`;
      tiktokContent += `HerPicks: ${SITE_URL}/products/${slug}.html\n\n`;
      tiktokContent += `${'─'.repeat(50)}\n\n`;
      tiktokContent += tiktokCaption;
      tiktokContent += `\n\n${'─'.repeat(50)}\n`;
      tiktokContent += `\n📊 CONTENT NOTES\n`;
      tiktokContent += `• Best posting time: 6-9 PM your timezone\n`;
      tiktokContent += `• Video hook: Show product, unbox, or before/after\n`;
      tiktokContent += `• Duration: 30-60 seconds ideal\n`;
      tiktokContent += `• CTA: "Link in bio" at end\n`;
      tiktokContent += `• Trending audio: Check TikTok Creative Center\n`;

      fs.writeFileSync(ttPath, tiktokContent);
      productGenerated.push(`tiktok: ${ttFile}`);
    }

    if (format === 'all' || format === 'instagram') {
      // Generate 2 Instagram styles
      const igCaption1 = generateInstagramCaption(product, theme, 'storytelling');
      const igCaption2 = generateInstagramCaption(product, theme, 'minimal');
      const igFile = `${slug}-instagram.txt`;
      const igPath = path.join(dateDir, igFile);

      let igContent = `# Instagram Captions: ${product.title}\n`;
      igContent += `Generated: ${TODAY} | Category: ${product.category} | Price: ${formatPrice(product.price)}\n`;
      igContent += `Amazon: ${product.affiliateUrl || '#'}\n`;
      igContent += `HerPicks: ${SITE_URL}/products/${slug}.html\n\n`;
      igContent += `${'═'.repeat(60)}\n`;
      igContent += `OPTION 1 — STORYTELLING STYLE\n`;
      igContent += `${'═'.repeat(60)}\n\n`;
      igContent += igCaption1;
      igContent += `\n\n${'═'.repeat(60)}\n`;
      igContent += `OPTION 2 — MINIMAL STYLE\n`;
      igContent += `${'═'.repeat(60)}\n\n`;
      igContent += igCaption2;
      igContent += `\n\n${'─'.repeat(50)}\n`;
      igContent += `\n📸 CONTENT NOTES\n`;
      igContent += `• Image: High-quality product flat lay or lifestyle shot\n`;
      igContent += `• Carousel: Product + benefits + price slide\n`;
      igContent += `• Story: Poll "Would you try this?" drives engagement\n`;
      igContent += `• First comment: Add remaining hashtags here\n`;
      igContent += `• Best posting time: 11 AM or 7 PM\n`;

      fs.writeFileSync(igPath, igContent);
      productGenerated.push(`instagram: ${igFile}`);
    }

    const genStr = productGenerated.map(s => s.split(': ')[1]).join(', ');
    console.log(`  ✅ ${i + 1}. ${product.title}`);
    console.log(`       📁 ${genStr}`);
    generated.push({ product: product.title, files: productGenerated });
  });

  // ── Generate Index File ──
  const indexContent = generateIndex(products, generated, format, theme, dateDir, bundleCount);
  const indexPath = path.join(dateDir, '_index.md');
  fs.writeFileSync(indexPath, indexContent);

  // ── Summary ──
  const fileCount = (bundleCount ? 1 : 0) + products.length * (format === 'all' ? 2 : 1);
  console.log(`\n🎉 Done! Generated ${fileCount} content file${fileCount > 1 ? 's' : ''}`);
  console.log(`   📁 Output: social-content/${TODAY}/`);
  console.log(`   📋 Index:  social-content/${TODAY}/_index.md\n`);
  console.log(`💡 Next steps:`);
  console.log(`   1. Review files in social-content/${TODAY}/`);
  console.log(`   2. Customize hooks and captions to your voice`);
  console.log(`   3. Create visuals (product photos/videos)`);
  console.log(`   4. Schedule with Buffer, Later, or native apps`);
  console.log();
}

function generateIndex(products, generated, format, theme, dateDir, bundleCount) {
  const lines = [];
  lines.push(`# HerPicks Social Content — ${TODAY}`);
  lines.push('');
  lines.push(`Generated by: generate-social.js`);
  lines.push(`Format: ${format === 'all' ? 'TikTok + Instagram' : format}`);
  lines.push(`Theme: ${theme}`);
  lines.push(`Products: ${products.length}`);
  lines.push('');
  lines.push('## Files Generated');
  lines.push('');

  if (bundleCount) {
    lines.push(`### Bundle Post`);
    lines.push(`- \`bundle-${theme}-${format === 'all' ? 'social' : format}.txt\``);
    lines.push('');
  }

  products.forEach((p, i) => {
    const slug = slugify(p.title);
    lines.push(`### ${i + 1}. ${p.title}`);
    lines.push(`- **Price:** ${formatPrice(p.price)}${p.originalPrice ? ` (was ${formatPrice(p.originalPrice)})` : ''}`);
    lines.push(`- **Category:** ${p.category} › ${p.subcategory || ''}`);
    lines.push(`- **Rating:** ${p.rating}⭐ (${p.reviewCount.toLocaleString()} reviews)`);
    if (p.badge) lines.push(`- **Badge:** ${p.badge}`);
    lines.push(`- **Amazon:** ${p.affiliateUrl || '#'}`);
    lines.push(`- **HerPicks:** ${SITE_URL}/products/${slug}.html`);
    lines.push('');
    if (format === 'all' || format === 'tiktok') {
      lines.push(`  📱 TikTok: \`${slug}-tiktok.txt\``);
    }
    if (format === 'all' || format === 'instagram') {
      lines.push(`  📸 Instagram: \`${slug}-instagram.txt\``);
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('## Content Schedule Template');
  lines.push('');
  lines.push('| Day | Product | Platform | Time |');
  lines.push('|-----|---------|----------|------|');
  const platforms = format === 'tiktok' ? ['TikTok'] : format === 'instagram' ? ['Instagram'] : ['TikTok', 'Instagram'];
  products.slice(0, 7).forEach((p, i) => {
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7];
    const platform = platforms[i % platforms.length];
    lines.push(`| ${day} | ${p.title.substring(0, 40)}... | ${platform} | 7 PM |`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Quick Stats');
  lines.push('');
  const categories = {};
  products.forEach(p => { categories[p.category] = (categories[p.category] || 0) + 1; });
  Object.entries(categories).forEach(([cat, n]) => {
    lines.push(`- **${cat}:** ${n} product${n > 1 ? 's' : ''}`);
  });
  const avgRating = (products.reduce((s, p) => s + p.rating, 0) / products.length).toFixed(1);
  const avgPrice = (products.reduce((s, p) => s + p.price, 0) / products.length).toFixed(2);
  lines.push(`- **Avg Rating:** ${avgRating}⭐`);
  lines.push(`- **Avg Price:** $${avgPrice}`);
  lines.push(`- **Bestsellers:** ${products.filter(p => p.badge === 'bestseller').length}`);

  return lines.join('\n');
}

main();
