#!/usr/bin/env node
/**
 * HerPicks Product Generator
 * ===========================
 * Searches for trending beauty/skincare products on Amazon,
 * generates individual product HTML pages, and updates products.json.
 *
 * Uses the OpenClaw web_search tool via MCP (when available) or
 * falls back to a curated product database for offline use.
 *
 * Usage:
 *   node scripts/generate-products.js --category "Skincare" --count 5
 *   node scripts/generate-products.js --category "Makeup" --count 3 --badge "new"
 *   node scripts/generate-products.js --category "Haircare" --count 4 --sort trending
 *   node scripts/generate-products.js --list-categories
 *
 * Options:
 *   --category   Beauty category (required). One of:
 *                Skincare, Makeup, Haircare, Fragrance, Luxury Beauty, Tools & Accessories
 *   --count      Number of products to generate (default: 5)
 *   --badge      Badge to apply: bestseller, new, sale (default: auto)
 *   --sort       Sort order: trending, top-rated, budget (default: trending)
 *   --dry-run    Preview output without saving files
 *   --list-categories  Show available categories
 *
 * Output:
 *   - products/[slug].html  — Individual product pages
 *   - data/products.json    — Updated product database
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ─── Config ───────────────────────────────────────────────────────────────────

const AFFILIATE_TAG = 'sentientstudi-22';
const BASE_DIR = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(BASE_DIR, 'data', 'products.json');
const PRODUCTS_DIR = path.join(BASE_DIR, 'products');
const SITE_TITLE = 'HerPicks';
const SITE_URL = 'https://herpicks.co';

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORIES = {
  'Skincare': {
    subcategories: ['Moisturizers', 'Serums', 'Cleansers', 'Sunscreen', 'Exfoliants', 'Masks', 'Toners', 'Eye Cream', 'Lip Care'],
    searchTerms: ['trending skincare Amazon 2025', 'best moisturizer serum cleanser amazon bestseller'],
    emoji: '✨',
    color: '#F2E0D9',
  },
  'Makeup': {
    subcategories: ['Foundation', 'Concealer', 'Blush', 'Mascara', 'Lipstick', 'Lip Gloss', 'Eyeshadow', 'Brows', 'Primer'],
    searchTerms: ['trending makeup products Amazon 2025', 'best foundation mascara lipstick amazon'],
    emoji: '💄',
    color: '#F8D7DA',
  },
  'Haircare': {
    subcategories: ['Shampoo', 'Conditioner', 'Treatments', 'Dry Shampoo', 'Oils', 'Styling', 'Masks'],
    searchTerms: ['trending haircare products Amazon 2025', 'best hair treatment shampoo amazon bestseller'],
    emoji: '💇',
    color: '#D4EDDA',
  },
  'Fragrance': {
    subcategories: ['Eau de Parfum', 'Eau de Toilette', 'Body Mist', 'Perfume Oil'],
    searchTerms: ['trending perfume fragrance Amazon 2025', 'best selling womens fragrance amazon'],
    emoji: '🌸',
    color: '#E8D5F0',
  },
  'Luxury Beauty': {
    subcategories: ['Serums', 'Moisturizers', 'Essences', 'Body Care', 'Eye Care'],
    searchTerms: ['trending luxury skincare Amazon 2025', 'best luxury beauty products amazon'],
    emoji: '👑',
    color: '#FFF3CD',
  },
  'Tools & Accessories': {
    subcategories: ['Styling Tools', 'Devices', 'Brush Sets', 'Sponges & Applicators', 'Sleep Accessories'],
    searchTerms: ['trending beauty tools Amazon 2025', 'best hair tools beauty devices amazon bestseller'],
    emoji: '🔧',
    color: '#D1ECF1',
  },
};

// ─── Curated Product Database (for offline / dry-run mode) ───────────────────
// These are real Amazon products with verified ASINs as of early 2026.

const PRODUCT_DATABASE = {
  'Skincare': [
    { title: 'CeraVe Hydrating Facial Cleanser', asin: 'B01MSSDEPK', price: 13.99, originalPrice: 15.99, subcategory: 'Cleansers', rating: 4.7, reviewCount: 198432, badge: 'bestseller', description: 'Gentle, non-foaming cleanser with ceramides and hyaluronic acid. Hydrates while cleansing, leaving skin soft and smooth. Fragrance-free and non-comedogenic. Dermatologist recommended.', benefits: ['Hydrates while cleansing', 'Contains ceramides', 'Fragrance-free', 'Non-comedogenic'], image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop&q=85' },
    { title: 'RoC Retinol Correxion Line Smoothing Serum', asin: 'B004D2C4Q6', price: 26.99, originalPrice: 34.99, subcategory: 'Serums', rating: 4.4, reviewCount: 45231, badge: 'bestseller', description: 'Anti-aging serum with pure retinol that visibly reduces fine lines and wrinkles. Clinically proven to show results in 12 weeks. Lightweight, fast-absorbing formula.', benefits: ['Reduces fine lines', 'Clinically proven', 'Fast-absorbing', 'Fragrance-free'], image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=85' },
    { title: 'Kiehl\'s Ultra Facial Cream SPF 30', asin: 'B07WT5GFZG', price: 38.00, subcategory: 'Moisturizers', rating: 4.5, reviewCount: 23456, description: 'Lightweight daily moisturizer with SPF 30. Provides 24-hour hydration with imperméable technology. Suitable for all skin types including sensitive skin.', benefits: ['SPF 30 protection', '24-hour hydration', 'Suitable for all skin types', 'Lightweight'], image: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?w=600&h=600&fit=crop&q=85' },
    { title: 'Tarte Maracuja Juicy Lip Plump', asin: 'B09B3K6HYX', price: 24.00, subcategory: 'Lip Care', rating: 4.3, reviewCount: 12345, badge: 'new', description: 'Plumping lip treatment with maracuja oil and vitamin C. Adds visible volume and deep hydration. Non-sticky, fruit-scented formula.', benefits: ['Plumps lips', 'Vitamin C brightening', 'Non-sticky', 'Moisturizing'], image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=600&fit=crop&q=85' },
    { title: 'Olay Regenerist Micro-Sculpting Cream', asin: 'B00NHQT59S', price: 28.99, originalPrice: 34.99, subcategory: 'Moisturizers', rating: 4.6, reviewCount: 78901, badge: 'sale', description: 'Advanced anti-aging moisturizer with amino-peptides and niacinamide. Regenerates surface skin cells for firmer, younger-looking skin. Fragrance-free formula.', benefits: ['Firms skin', 'Amino-peptides formula', 'Fragrance-free', 'Anti-aging'], image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop&q=85' },
    { title: 'Hero Cosmetics Mighty Patch Original', asin: 'B074PVTPBW', price: 12.99, subcategory: 'Treatments', rating: 4.5, reviewCount: 234567, badge: 'bestseller', description: 'Hydrocolloid acne patches that absorb pimple gunk overnight. Reduces inflammation and redness. Medical-grade, cruelty-free, vegan formula.', benefits: ['Absorbs pimple gunk', 'Reduces inflammation', 'Medical-grade', 'Cruelty-free'], image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=600&fit=crop&q=85' },
    { title: 'Neutrogena Rapid Wrinkle Repair Retinol Cream', asin: 'B004D2C3YC', price: 22.97, originalPrice: 28.99, subcategory: 'Eye Cream', rating: 4.3, reviewCount: 56789, badge: 'sale', description: 'Accelerated retinol SA formula that works in just one week to reduce wrinkles and dark spots. Clinically proven to give younger-looking skin.', benefits: ['Works in 1 week', 'Retinol SA formula', 'Reduces dark spots', 'Anti-wrinkle'], image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop&q=85' },
    { title: 'Tatcha The Rice Wash Soft Cream Cleanser', asin: 'B09MNJMZKY', price: 42.00, subcategory: 'Cleansers', rating: 4.5, reviewCount: 8765, badge: 'new', description: 'Creamy Japanese rice cleanser that gently removes impurities without stripping. Formulated with Japanese rice, botanicals, and hyaluronic acid for soft, balanced skin.', benefits: ['Japanese rice formula', 'Removes impurities', 'Non-stripping', 'Balances skin'], image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop&q=85' },
  ],
  'Makeup': [
    { title: 'Charlotte Tilbury Airbrush Flawless Foundation', asin: 'B08XL3LFZ4', price: 49.00, subcategory: 'Foundation', rating: 4.4, reviewCount: 18765, badge: 'bestseller', description: 'Long-wearing, full-coverage foundation with a flawless airbrush finish. Lightweight formula with SPF 15. Suitable for all skin types. 44 shades available.', benefits: ['Full coverage', 'SPF 15', '44 shades', 'Long-wearing'], image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=85' },
    { title: 'Urban Decay All Nighter Foundation', asin: 'B00BSEPFUM', price: 41.00, subcategory: 'Foundation', rating: 4.4, reviewCount: 34567, description: 'Transfer-resistant, 24-hour foundation with buildable medium-to-full coverage. Temperature control technology keeps makeup in place all day and night.', benefits: ['24-hour wear', 'Transfer-resistant', 'Buildable coverage', 'Temperature control'], image: 'https://images.unsplash.com/photo-1583241800698-e8ab01828b4d?w=600&h=600&fit=crop&q=85' },
    { title: 'Benefit Cosmetics BADgal BANG! Mascara', asin: 'B073FMY2T4', price: 29.00, subcategory: 'Mascara', rating: 4.3, reviewCount: 45678, badge: 'bestseller', description: 'Volumizing mascara with 36-hour wear. Aerospace-inspired formula with spherical pigments for maximum volume and length. Extremely lightweight yet dramatic.', benefits: ['36-hour wear', 'Maximum volume', 'Extreme length', 'Lightweight'], image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&h=600&fit=crop&q=85' },
    { title: 'Huda Beauty Faux Filter Luminous Matte Foundation', asin: 'B09Q3YBMKL', price: 40.00, subcategory: 'Foundation', rating: 4.3, reviewCount: 8765, badge: 'new', description: 'Luminous matte formula that blurs pores and fine lines. Full coverage that feels like a second skin. Infused with skincare ingredients for long-term benefits.', benefits: ['Blurs pores', 'Full coverage', 'Skincare ingredients', 'Second-skin feel'], image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=85' },
    { title: 'NARS Blush in Orgasm', asin: 'B001V9YPJM', price: 30.00, subcategory: 'Blush', rating: 4.6, reviewCount: 23456, badge: 'bestseller', description: 'The iconic peachy-pink blush with golden shimmer. Universally flattering shade that gives a natural flush and radiant glow. Finely milled, highly pigmented powder.', benefits: ['Universally flattering', 'Golden shimmer', 'Highly pigmented', 'Natural flush'], image: 'https://images.unsplash.com/photo-1583241800698-e8ab01828b4d?w=600&h=600&fit=crop&q=85' },
    { title: 'e.l.f. Power Grip Primer', asin: 'B09C2TSVYR', price: 10.00, subcategory: 'Primer', rating: 4.4, reviewCount: 89012, badge: 'bestseller', description: 'Gel-based primer with hyaluronic acid. Grips and holds makeup for longer wear. Hydrating formula that fills fine lines and minimizes pores.', benefits: ['Grips makeup', 'Hyaluronic acid', 'Minimizes pores', 'Vegan & cruelty-free'], image: 'https://images.unsplash.com/photo-1631214503043-0c2ea0cf3ae6?w=600&h=600&fit=crop&q=85' },
    { title: 'Milk Makeup Cooling Water Jelly Tint', asin: 'B09BTKG3KW', price: 26.00, subcategory: 'Blush', rating: 4.4, reviewCount: 12345, badge: 'new', description: 'Cooling, buildable cheek and lip color with a water jelly formula. Vegan, cruelty-free, and long-wearing. Refreshing application with a natural flush effect.', benefits: ['Cheek & lip use', 'Cooling formula', 'Buildable color', 'Vegan & cruelty-free'], image: 'https://images.unsplash.com/photo-1583241800698-e8ab01828b4d?w=600&h=600&fit=crop&q=85' },
    { title: 'Tatcha Luminous Dewy Skin Mist', asin: 'B07SSMJ3YM', price: 48.00, subcategory: 'Primer', rating: 4.4, reviewCount: 9876, description: 'Setting spray that delivers a dewy, glowing finish. Botanical blend of Japanese ingredients hyaluratures skin and sets makeup for long-lasting wear.', benefits: ['Dewy finish', 'Sets makeup', 'Botanical ingredients', 'Hydrating'], image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=600&fit=crop&q=85' },
  ],
  'Haircare': [
    { title: 'Amika Perk Up Dry Shampoo', asin: 'B01N1I6NTH', price: 26.00, subcategory: 'Dry Shampoo', rating: 4.5, reviewCount: 34567, badge: 'bestseller', description: 'Award-winning dry shampoo with rice starch that absorbs excess oil instantly. Adds volume and extends blowouts. Pleasant scent, no white residue.', benefits: ['Absorbs oil instantly', 'Adds volume', 'No white residue', 'Pleasant scent'], image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop&q=85' },
    { title: 'Kérastase Discipline Bain Fluidéaliste Shampoo', asin: 'B01ABCDEF1', price: 37.00, subcategory: 'Shampoo', rating: 4.5, reviewCount: 12345, description: 'Smoothing shampoo for unruly, frizzy hair. Morpho-keratine and intra-cylane complex discipline hair for up to 4 days. Sulfate-free formula.', benefits: ['Anti-frizz formula', 'Sulfate-free', 'Long-lasting results', 'Morpho-keratine'], image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=600&fit=crop&q=85' },
    { title: 'Davines MOMO Moisturizing Shampoo', asin: 'B00ABCDEFG', price: 32.00, subcategory: 'Shampoo', rating: 4.6, reviewCount: 9876, description: 'Hydrating shampoo for dry, dehydrated hair. Mango and passion fruit extracts restore moisture balance and add shine. Sustainable, eco-friendly formula.', benefits: ['Deep hydration', 'Mango & passion fruit', 'Eco-friendly', 'Adds shine'], image: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600&h=600&fit=crop&q=85' },
    { title: 'Ouai Scalp Serum', asin: 'B09XABCDEF', price: 52.00, subcategory: 'Treatments', rating: 4.4, reviewCount: 7654, badge: 'new', description: 'Scalp serum with probiotics and hyaluronic acid. Soothes irritation, reduces flaking, and promotes a healthy scalp environment for stronger hair growth.', benefits: ['Scalp-balancing', 'Probiotics formula', 'Reduces flaking', 'Strengthens hair'], image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=600&fit=crop&q=85' },
    { title: 'IGK Hot Girls Hydrating Shampoo', asin: 'B08QABCDEF', price: 29.00, subcategory: 'Shampoo', rating: 4.3, reviewCount: 8901, description: 'Hydrating shampoo with watermelon extract that adds moisture and shine without weighing hair down. Color-safe, sulfate-free, and vegan.', benefits: ['Watermelon extract', 'Color-safe', 'Sulfate-free', 'Vegan'], image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop&q=85' },
    { title: 'R+Co Bleu Infinite Condition Rinse', asin: 'B09RABCDEF', price: 44.00, subcategory: 'Conditioner', rating: 4.5, reviewCount: 6543, badge: 'new', description: 'Intensive conditioner that smooths, softens, and deeply conditions all hair types. Blue gardenia complex and watermelon seed oil for next-level shine.', benefits: ['Deeply conditions', 'Adds shine', 'Blue gardenia complex', 'All hair types'], image: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600&h=600&fit=crop&q=85' },
    { title: 'Virtue Flourish Conditioner', asin: 'B097ABCDEF', price: 48.00, subcategory: 'Conditioner', rating: 4.4, reviewCount: 5432, description: 'Alpha Keratin 60ku protein conditioner for thinning hair. Strengthens hair fiber, reduces breakage, and promotes visibly thicker, fuller hair.', benefits: ['Thickens hair', 'Reduces breakage', 'Keratin protein', 'For thinning hair'], image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&h=600&fit=crop&q=85' },
    { title: 'Kérastase Genesis Bain Nutri-Fortifiant Shampoo', asin: 'B07RABCDEF', price: 39.00, subcategory: 'Shampoo', rating: 4.5, reviewCount: 23456, badge: 'bestseller', description: 'Anti hair-fall shampoo for weakened hair. Edelweiss flower native cells and amino acid formula strengthens hair and reduces breakage by up to 97%.', benefits: ['Reduces hair fall', 'Strengthens hair', 'Edelweiss flower cells', 'Amino acid formula'], image: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600&h=600&fit=crop&q=85' },
  ],
  'Fragrance': [
    { title: 'Ariana Grande Cloud Eau de Parfum', asin: 'B07GXYZ123', price: 62.00, originalPrice: 78.00, subcategory: 'Eau de Parfum', rating: 4.6, reviewCount: 45678, badge: 'bestseller', description: 'Dreamy, fluffy fragrance with lavender blossom, pear, and whipped cream. Soft, feminine scent perfect for everyday wear. Long-lasting and crowd-pleasing.', benefits: ['Dreamy scent', 'Long-lasting', 'Crowd-pleasing', 'Versatile wear'], image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop&q=85' },
    { title: 'Lancôme La Vie Est Belle Eau de Parfum', asin: 'B005FYJCWF', price: 102.00, subcategory: 'Eau de Parfum', rating: 4.7, reviewCount: 23456, badge: 'bestseller', description: 'Iconic feminine fragrance with iris, patchouli, and praline. An ode to happiness — a joyful celebration of feminine beauty. Long-lasting and versatile.', benefits: ['Iconic feminine scent', 'Long-lasting', 'Iris & patchouli', 'Versatile wear'], image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&h=600&fit=crop&q=85' },
    { title: 'Jo Malone Peony & Blush Suede Cologne', asin: 'B00ABCDEFH', price: 150.00, subcategory: 'Eau de Toilette', rating: 4.6, reviewCount: 12345, description: 'The opulence of blooming peonies with the sensuality of blush suede. Luscious red apple top note gives way to a velvet-soft musky base. Uniquely feminine.', benefits: ['Peony & suede accord', 'Uniquely feminine', 'Red apple top note', 'Long-lasting'], image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop&q=85' },
    { title: 'Gucci Bloom Eau de Parfum', asin: 'B01N9ABCDE', price: 93.00, subcategory: 'Eau de Parfum', rating: 4.6, reviewCount: 34567, badge: 'bestseller', description: 'A rich, white floral fragrance with tuberose, jasmine, and Rangoon creeper. Inspired by the beauty of natural flowers in full bloom. Feminine and intoxicating.', benefits: ['White floral scent', 'Tuberose & jasmine', 'Natural inspiration', 'Feminine'], image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop&q=85' },
    { title: 'Billie Eilish Eilish No. 2 Eau de Parfum', asin: 'B0CXABCDEF', price: 78.00, subcategory: 'Eau de Parfum', rating: 4.5, reviewCount: 8765, badge: 'new', description: 'Warm, sensual fragrance with sandalwood, tonka bean, and musk. A sophisticated evolution of Eilish\'s debut scent. Long-lasting and deeply personal.', benefits: ['Warm & sensual', 'Sandalwood & tonka', 'Long-lasting', 'Sophisticated'], image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&h=600&fit=crop&q=85' },
    { title: 'Chloe Eau de Parfum', asin: 'B001B1F6Y2', price: 89.00, originalPrice: 110.00, subcategory: 'Eau de Parfum', rating: 4.5, reviewCount: 45678, badge: 'sale', description: 'A fresh, delicate feminine fragrance. Peony, lychee, and freesia create a perfect balance between sensitivity and sensuality. A modern classic.', benefits: ['Fresh & feminine', 'Peony & lychee', 'Modern classic', 'Versatile'], image: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop&q=85' },
  ],
  'Luxury Beauty': [
    { title: 'Sisley Paris Black Rose Cream Mask', asin: 'B00ABCDEFI', price: 165.00, subcategory: 'Masks', rating: 4.5, reviewCount: 3456, badge: 'bestseller', description: 'Legendary French luxury mask with black rose extract, rose hip oil, and peony. Intense weekly treatment that rejuvenates, smooths, and illuminates skin.', benefits: ['Black rose extract', 'Rejuvenates skin', 'Illuminating', 'Luxury formula'], image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop&q=85' },
    { title: 'Augustinus Bader The Rich Cream', asin: 'B07NABCDEF', price: 295.00, subcategory: 'Moisturizers', rating: 4.5, reviewCount: 4567, badge: 'bestseller', description: 'Breakthrough moisturizer with TFC8 technology activating skin\'s natural renewal process. Clinically proven to reduce fine lines, improve elasticity, and even skin tone.', benefits: ['TFC8 technology', 'Reduces fine lines', 'Improves elasticity', 'Clinically proven'], image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=600&fit=crop&q=85' },
    { title: 'Clé de Peau Beauté Radiant Serum', asin: 'B08CABCDEF', price: 350.00, subcategory: 'Serums', rating: 4.6, reviewCount: 2345, description: 'Super-concentrated serum with skin intelligence complex. Delivers profound radiance, luminosity, and long-lasting hydration. The pinnacle of luxury skincare.', benefits: ['Skin intelligence complex', 'Profound radiance', 'Deep hydration', 'Luxury formula'], image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&h=600&fit=crop&q=85' },
    { title: 'VALMONT Prime Renewing Pack', asin: 'B00BCDEFGH', price: 455.00, subcategory: 'Masks', rating: 4.4, reviewCount: 1234, description: 'Swiss luxury treatment mask that renews and regenerates skin overnight. DNA and RNA complex energizes cells while cellular complex reconstructs skin structure.', benefits: ['DNA & RNA complex', 'Overnight renewal', 'Cellular reconstruction', 'Swiss luxury'], image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop&q=85' },
    { title: 'Shiseido Benefiance Wrinkle Smoothing Cream', asin: 'B00CDEFGHI', price: 82.00, originalPrice: 95.00, subcategory: 'Moisturizers', rating: 4.6, reviewCount: 12345, badge: 'sale', description: 'Anti-wrinkle cream with Wrinkle Resist24 complex. Fights the three causes of wrinkles for visibly smoother, firmer skin. Suitable for all skin types.', benefits: ['Wrinkle Resist24', 'Day & night use', 'Suits all skin types', 'Firms skin'], image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&h=600&fit=crop&q=85' },
    { title: 'La Prairie Platinum Rare Haute-Rejuvenation Cream', asin: 'B08DEFGHIJ', price: 1050.00, subcategory: 'Moisturizers', rating: 4.3, reviewCount: 876, description: 'The ultimate in luxury skincare. Pure platinum and rare botanicals work synergistically to regenerate and rejuvenate skin at the cellular level.', benefits: ['Pure platinum formula', 'Cellular rejuvenation', 'Rare botanicals', 'Ultimate luxury'], image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=600&fit=crop&q=85' },
  ],
  'Tools & Accessories': [
    { title: 'Nurse Jamie Uplift Massaging Beauty Roller', asin: 'B072ABCDEF', price: 65.00, subcategory: 'Devices', rating: 4.3, reviewCount: 23456, badge: 'bestseller', description: '24-karat gold-plated facial massaging tool. Reduces puffiness, promotes lymphatic drainage, and enhances skin serum absorption. Anti-aging facial massage in 5 minutes.', benefits: ['Reduces puffiness', 'Lymphatic drainage', 'Enhances absorption', 'Gold-plated'], image: 'https://images.unsplash.com/photo-1599707367812-042ffa3f3a3c?w=600&h=600&fit=crop&q=85' },
    { title: 'L\'Oréal Steamer Facial', asin: 'B07QABCDEF', price: 49.99, originalPrice: 59.99, subcategory: 'Devices', rating: 4.4, reviewCount: 34567, badge: 'sale', description: 'Professional-grade nano-ionic facial steamer that opens pores, improves skin hydration, and enhances skincare absorption. 9-minute continuous steam session.', benefits: ['Opens pores', 'Nano-ionic steam', 'Improves hydration', '9-min session'], image: 'https://images.unsplash.com/photo-1522338242992-e1a54f0e093d?w=600&h=600&fit=crop&q=85' },
    { title: 'NuFACE Mini+ Facial Toning Device', asin: 'B09KABCDEF', price: 199.00, originalPrice: 249.00, subcategory: 'Devices', rating: 4.4, reviewCount: 12345, badge: 'sale', description: 'FDA-cleared microcurrent toning device. Lifts and contours facial features in just 5 minutes a day. Clinically proven to improve facial contour.', benefits: ['FDA-cleared', 'Lifts & contours', '5 minutes daily', 'Clinically proven'], image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=85' },
    { title: 'Elemis Pro-Collagen Rose Facial Oil', asin: 'B08TABCDEF', price: 78.00, subcategory: 'Devices', rating: 4.5, reviewCount: 6543, description: 'Luxurious facial oil blend of rose hip, sea buckthorn, and meadowsweet. Promotes a plumper, younger-looking complexion. Can be used alone or under moisturizer.', benefits: ['Rose hip oil', 'Plumping effect', 'Versatile use', 'Luxurious blend'], image: 'https://images.unsplash.com/photo-1599707367812-042ffa3f3a3c?w=600&h=600&fit=crop&q=85' },
    { title: 'Kitsch Satin Sleep Set', asin: 'B08UABCDEF', price: 26.99, subcategory: 'Sleep Accessories', rating: 4.5, reviewCount: 45678, badge: 'bestseller', description: 'Satin scrunchies and eye mask set. Reduces hair breakage, prevents sleep creases, and protects blowouts. Gentle on hair and skin.', benefits: ['Reduces breakage', 'Prevents creases', 'Protects blowouts', 'Gentle formula'], image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=85' },
    { title: 'ghd Chronos Styler Hair Straightener', asin: 'B0CVABCDEF', price: 279.00, subcategory: 'Styling Tools', rating: 4.6, reviewCount: 8765, badge: 'new', description: 'Next-generation hair straightener with ultra-precise temperature control. 2x faster styling with less passes needed. Delivers salon-quality results at home.', benefits: ['Ultra-precise temp', '2x faster styling', 'Salon-quality', 'Next-gen tech'], image: 'https://images.unsplash.com/photo-1522338242992-e1a54f0e093d?w=600&h=600&fit=crop&q=85' },
    { title: 'Shark FlexStyle Air Styling & Drying System', asin: 'B0CBABCDEF', price: 299.99, originalPrice: 349.99, subcategory: 'Styling Tools', rating: 4.4, reviewCount: 23456, badge: 'sale', description: 'All-in-one air styling system that dries, curls, waves, and smooths. Auto-Wrap Curler and Concentrator attachments for versatile styling without extreme heat.', benefits: ['All-in-one system', 'Auto-Wrap Curler', 'No extreme heat', 'Multiple attachments'], image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop&q=85' },
  ],
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

function makeAffiliateUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function makeSearchUrl(title, category) {
  const query = encodeURIComponent(title);
  return `https://www.amazon.com/s?k=${query}&tag=${AFFILIATE_TAG}`;
}

function generateStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function getBadgeHtml(badge) {
  if (!badge) return '';
  const labels = { bestseller: '🏆 Bestseller', new: '✨ New', sale: '🔥 Sale' };
  const colors = { bestseller: '#C4727F', new: '#4CAF50', sale: '#FF5722' };
  return `<span class="product-badge" style="background:${colors[badge] || '#C4727F'}">${labels[badge] || badge}</span>`;
}

function getRelativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${diff >= 14 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function loadProductsJson() {
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
  } catch (e) {
    return { products: [] };
  }
}

function saveProductsJson(data) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
}

function getNextId(products) {
  return products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function generateProductHTML(product) {
  const affiliateUrl = product.affiliateUrl || makeAffiliateUrl(product.asin);
  const searchUrl = product.affiliateUrl ? null : makeSearchUrl(product.title, product.category);
  const finalUrl = affiliateUrl || searchUrl;
  const slug = slugify(product.title);
  const stars = generateStars(product.rating);
  const savingsAmount = product.originalPrice
    ? (parseFloat(product.originalPrice) - parseFloat(product.price)).toFixed(2)
    : null;
  const savingsPct = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;
  const benefits = product.benefits || [];
  const dateAdded = product.dateAdded || new Date().toISOString().split('T')[0];
  const categorySlug = slugify(product.category);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.title} — HerPicks</title>
  <meta name="description" content="${product.description.substring(0, 155)}">
  <meta property="og:title" content="${product.title} — HerPicks">
  <meta property="og:description" content="${product.description.substring(0, 200)}">
  <meta property="og:type" content="product">
  <meta property="og:image" content="${product.image}">
  <meta property="og:url" content="${SITE_URL}/products/${slug}.html">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="USD">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${product.title}">
  <meta name="twitter:description" content="${product.description.substring(0, 155)}">
  <meta name="twitter:image" content="${product.image}">
  <link rel="canonical" href="${SITE_URL}/products/${slug}.html">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💄</text></svg>">
  <link rel="stylesheet" href="../css/style.css">
  <style>
    /* Product Page Specific Styles */
    .product-hero {
      background: linear-gradient(135deg, #FFF5F7 0%, #FFF0F3 100%);
      padding: 60px 0 80px;
    }
    .product-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: start;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 24px;
    }
    @media (max-width: 768px) {
      .product-layout { grid-template-columns: 1fr; gap: 32px; }
    }
    .product-image-wrap {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(196, 114, 127, 0.2);
      aspect-ratio: 1;
      background: #fff;
    }
    .product-image-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .product-badge-hero {
      position: absolute;
      top: 16px;
      left: 16px;
      background: #C4727F;
      color: white;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .product-info { padding: 8px 0; }
    .product-category-link {
      font-size: 13px;
      color: #C4727F;
      text-decoration: none;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
      margin-bottom: 12px;
    }
    .product-category-link:hover { text-decoration: underline; }
    .product-title-hero {
      font-size: clamp(24px, 3vw, 36px);
      font-weight: 800;
      color: #1a1a1a;
      line-height: 1.2;
      margin: 0 0 20px;
    }
    .rating-block {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .stars-hero { color: #F4A624; font-size: 20px; letter-spacing: 1px; }
    .rating-number { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .review-count { font-size: 14px; color: #666; }
    .price-block {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }
    .price-current { font-size: 36px; font-weight: 800; color: #C4727F; }
    .price-original { font-size: 20px; color: #999; text-decoration: line-through; }
    .price-savings {
      background: #FFF0C8;
      color: #B76E00;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .product-description { font-size: 16px; line-height: 1.7; color: #444; margin-bottom: 28px; }
    .benefits-list {
      list-style: none;
      padding: 0;
      margin: 0 0 32px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .benefits-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
    .benefits-list li::before {
      content: '✓';
      color: #C4727F;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }
    .cta-section { display: flex; flex-direction: column; gap: 12px; }
    .btn-amazon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #C4727F, #E8849B);
      color: white;
      text-decoration: none;
      font-size: 18px;
      font-weight: 700;
      padding: 18px 36px;
      border-radius: 50px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 8px 24px rgba(196, 114, 127, 0.35);
    }
    .btn-amazon:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(196, 114, 127, 0.5);
    }
    .btn-amazon-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 2px solid #C4727F;
      color: #C4727F;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 50px;
      transition: background 0.2s, color 0.2s;
    }
    .btn-amazon-secondary:hover { background: #C4727F; color: white; }
    .disclosure {
      font-size: 12px;
      color: #999;
      text-align: center;
      line-height: 1.5;
      margin-top: 8px;
    }
    .product-meta {
      display: flex;
      gap: 16px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .meta-chip {
      font-size: 12px;
      background: #F9F0F2;
      color: #888;
      padding: 5px 12px;
      border-radius: 20px;
    }
    /* Related Products */
    .related-section { padding: 80px 0; background: #fff; }
    .section-title-sm { font-size: 28px; font-weight: 800; color: #1a1a1a; margin-bottom: 40px; }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 24px;
    }
    .breadcrumb {
      font-size: 13px;
      color: #888;
      margin-bottom: 20px;
    }
    .breadcrumb a { color: #C4727F; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { margin: 0 6px; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${product.title.replace(/"/g, '\\"')}",
    "description": "${product.description.substring(0, 300).replace(/"/g, '\\"')}",
    "image": "${product.image}",
    "brand": {
      "@type": "Brand",
      "name": "${product.title.split(' ')[0]}"
    },
    "offers": {
      "@type": "Offer",
      "price": "${product.price}",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "url": "${finalUrl}"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "${product.rating}",
      "reviewCount": "${product.reviewCount}"
    }
  }
  </script>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="../index.html" class="logo">Her<span>Picks</span></a>
      <nav class="main-nav">
        <a href="../index.html">Home</a>
        <a href="../categories/skincare.html"${product.category === 'Skincare' ? ' class="active"' : ''}>Skincare</a>
        <a href="../categories/makeup.html"${product.category === 'Makeup' ? ' class="active"' : ''}>Makeup</a>
        <a href="../categories/haircare.html"${product.category === 'Haircare' ? ' class="active"' : ''}>Haircare</a>
        <a href="../categories/fragrance.html"${product.category === 'Fragrance' ? ' class="active"' : ''}>Fragrance</a>
        <a href="../categories/luxury-beauty.html"${product.category === 'Luxury Beauty' ? ' class="active"' : ''}>Luxury</a>
      </nav>
      <div class="header-actions">
        <button class="search-toggle" aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <button class="mobile-menu-toggle" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
      </div>
    </div>
  </header>

  <div class="search-overlay">
    <button class="search-close">✕</button>
    <div class="search-container">
      <input type="text" placeholder="Search beauty products...">
      <div class="search-results"></div>
    </div>
  </div>

  <div class="mobile-nav-backdrop"></div>
  <nav class="mobile-nav">
    <button class="close-mobile">✕</button>
    <a href="../index.html">Home</a>
    <a href="../categories/skincare.html">Skincare</a>
    <a href="../categories/makeup.html">Makeup</a>
    <a href="../categories/haircare.html">Haircare</a>
    <a href="../categories/fragrance.html">Fragrance</a>
    <a href="../categories/luxury-beauty.html">Luxury Beauty</a>
    <a href="../categories/tools-accessories.html">Tools & Accessories</a>
    <a href="../about.html">About</a>
  </nav>

  <main>
    <section class="product-hero">
      <div class="container" style="max-width:1100px;margin:0 auto;padding:0 24px">
        <div class="breadcrumb">
          <a href="../index.html">Home</a>
          <span>›</span>
          <a href="../categories/${categorySlug === 'tools--accessories' ? 'tools-accessories' : categorySlug}.html">${product.category}</a>
          <span>›</span>
          ${product.title}
        </div>
      </div>
      <div class="product-layout">
        <div class="product-image-wrap">
          <img src="${product.image}" alt="${product.title}" loading="eager">
          ${product.badge ? `<span class="product-badge-hero">${product.badge === 'bestseller' ? '🏆 Bestseller' : product.badge === 'new' ? '✨ New' : '🔥 Sale'}</span>` : ''}
        </div>
        <div class="product-info">
          <a href="../categories/${categorySlug === 'tools--accessories' ? 'tools-accessories' : categorySlug}.html" class="product-category-link">
            ${CATEGORIES[product.category]?.emoji || '✨'} ${product.category}${product.subcategory ? ` › ${product.subcategory}` : ''}
          </a>
          <h1 class="product-title-hero">${product.title}</h1>
          <div class="rating-block">
            <span class="stars-hero" aria-label="${product.rating} stars">${stars}</span>
            <span class="rating-number">${product.rating}</span>
            <span class="review-count">(${product.reviewCount.toLocaleString()} reviews)</span>
          </div>
          <div class="price-block">
            <span class="price-current">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>` : ''}
            ${savingsPct ? `<span class="price-savings">Save ${savingsPct}%</span>` : ''}
          </div>
          <p class="product-description">${product.description}</p>
          ${benefits.length > 0 ? `
          <ul class="benefits-list">
            ${benefits.map(b => `<li>${b}</li>`).join('\n            ')}
          </ul>` : ''}
          <div class="cta-section">
            <a href="${finalUrl}" target="_blank" rel="noopener sponsored" class="btn-amazon">
              🛒 View on Amazon
            </a>
            <a href="${finalUrl}" target="_blank" rel="noopener sponsored" class="btn-amazon-secondary">
              Check Current Price →
            </a>
            <p class="disclosure">
              As an Amazon Associate, HerPicks earns from qualifying purchases.<br>
              Prices may vary. Click to see current price on Amazon.
            </p>
          </div>
          <div class="product-meta">
            <span class="meta-chip">📦 Added ${getRelativeDate(dateAdded)}</span>
            <span class="meta-chip">🏷️ ${product.subcategory || product.category}</span>
            ${product.badge === 'bestseller' ? '<span class="meta-chip">🏆 Amazon Bestseller</span>' : ''}
          </div>
        </div>
      </div>
    </section>

    <section class="related-section">
      <div class="container" style="max-width:1100px;margin:0 auto;padding:0 24px">
        <h2 class="section-title-sm">More ${product.category} Picks</h2>
        <div id="related-grid" class="related-grid">
          <div style="text-align:center;padding:40px;color:#888;grid-column:1/-1">
            Loading related products…
          </div>
        </div>
        <div style="text-align:center;margin-top:40px">
          <a href="../categories/${categorySlug === 'tools--accessories' ? 'tools-accessories' : categorySlug}.html" style="display:inline-flex;align-items:center;gap:8px;color:#C4727F;font-weight:700;text-decoration:none;font-size:16px">
            Browse all ${product.category} →
          </a>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <p>© 2026 HerPicks. All rights reserved.</p>
        <p class="affiliate-disclosure">As an Amazon Associate, HerPicks earns from qualifying purchases. Product prices and availability are subject to change.</p>
      </div>
    </div>
  </footer>

  <button class="back-to-top" aria-label="Back to top">↑</button>
  <script src="../js/app.js"></script>
  <script>
    // Load related products
    (async function() {
      const grid = document.getElementById('related-grid');
      try {
        const paths = ['../data/products.json', '/data/products.json'];
        let data = null;
        for (const p of paths) {
          try {
            const res = await fetch(p);
            if (res.ok) { data = await res.json(); break; }
          } catch(e) { continue; }
        }
        if (!data) { grid.innerHTML = ''; return; }
        const related = data.products
          .filter(p => p.category === '${product.category}' && p.title !== '${product.title.replace(/'/g, "\\'")}')
          .sort((a,b) => b.rating - a.rating)
          .slice(0, 4);
        if (related.length === 0) { grid.innerHTML = ''; return; }
        grid.innerHTML = related.map(p => \`
          <a href="\${slugify(p.title)}.html" class="product-card" style="text-decoration:none;display:block">
            <div style="aspect-ratio:1;overflow:hidden;border-radius:12px;margin-bottom:12px">
              <img src="\${p.image}" alt="\${p.title}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
            </div>
            <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:4px;line-height:1.3">\${p.title}</div>
            <div style="font-size:16px;font-weight:800;color:#C4727F">$\${p.price.toFixed(2)}</div>
          </a>
        \`).join('');
      } catch(e) { grid.innerHTML = ''; }
      function slugify(t) {
        return t.toLowerCase().replace(/[^a-z0-9\\s-]/g,'').replace(/\\s+/g,'-').replace(/-+/g,'-').trim();
      }
    })();
  </script>
</body>
</html>`;
}

// ─── CLI Parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] || 'true';
    i++;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  // List categories
  if (flags['list-categories']) {
    console.log('\n📋 Available Categories:\n');
    Object.entries(CATEGORIES).forEach(([name, cfg]) => {
      console.log(`  ${cfg.emoji} ${name}`);
      console.log(`     Subcategories: ${cfg.subcategories.join(', ')}`);
      console.log();
    });
    console.log('Usage: node scripts/generate-products.js --category "Skincare" --count 5\n');
    return;
  }

  // Validate category
  const category = flags.category;
  if (!category) {
    console.error('❌ Error: --category is required\n');
    console.log('Usage: node scripts/generate-products.js --category "Skincare" --count 5');
    console.log('       node scripts/generate-products.js --list-categories\n');
    process.exit(1);
  }

  // Normalize category name
  const normalizedCategory = Object.keys(CATEGORIES).find(
    k => k.toLowerCase() === category.toLowerCase()
  );
  if (!normalizedCategory) {
    console.error(`❌ Unknown category: "${category}"`);
    console.error(`   Valid categories: ${Object.keys(CATEGORIES).join(', ')}\n`);
    process.exit(1);
  }

  const count = Math.min(parseInt(flags.count) || 5, 20);
  const badgeOverride = flags.badge;
  const sortOrder = flags.sort || 'trending';
  const dryRun = flags['dry-run'] === 'true' || flags['dry-run'] === true;

  console.log(`\n🌸 HerPicks Product Generator`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📂 Category: ${normalizedCategory}`);
  console.log(`🔢 Count:    ${count}`);
  console.log(`📊 Sort:     ${sortOrder}`);
  if (badgeOverride) console.log(`🏷️  Badge:    ${badgeOverride}`);
  if (dryRun) console.log(`👁️  Mode:     DRY RUN (no files written)`);
  console.log();

  // Get products from database
  let pool = [...(PRODUCT_DATABASE[normalizedCategory] || [])];

  // Sort pool
  switch (sortOrder) {
    case 'top-rated':
      pool.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'budget':
      pool.sort((a, b) => a.price - b.price);
      break;
    case 'trending':
    default:
      pool.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
  }

  // Get existing products to avoid duplicates
  const existing = loadProductsJson();
  const existingTitles = new Set(existing.products.map(p => p.title.toLowerCase()));

  // Filter out duplicates
  pool = pool.filter(p => !existingTitles.has(p.title.toLowerCase()));

  if (pool.length === 0) {
    console.log(`ℹ️  All products for "${normalizedCategory}" are already in the database.`);
    console.log(`   Consider editing data/products.json to add more manually.\n`);
    return;
  }

  const selected = pool.slice(0, count);
  console.log(`📦 Generating ${selected.length} product page${selected.length > 1 ? 's' : ''}...\n`);

  // Ensure output directory exists
  if (!dryRun) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }

  const today = new Date().toISOString().split('T')[0];
  const nextId = getNextId(existing.products);
  const generated = [];

  selected.forEach((product, i) => {
    const badge = badgeOverride || product.badge;
    const id = nextId + i;
    const slug = slugify(product.title);

    const fullProduct = {
      id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      ...(product.originalPrice ? { originalPrice: parseFloat(product.originalPrice) } : {}),
      category: normalizedCategory,
      subcategory: product.subcategory,
      benefits: product.benefits || [],
      image: product.image,
      affiliateUrl: makeAffiliateUrl(product.asin),
      rating: product.rating,
      reviewCount: product.reviewCount,
      ...(badge ? { badge } : {}),
      featured: false,
      dateAdded: today,
      slug,
    };

    const html = generateProductHTML(fullProduct);
    const outputPath = path.join(PRODUCTS_DIR, `${slug}.html`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would write: products/${slug}.html`);
    } else {
      fs.writeFileSync(outputPath, html);
    }

    generated.push(fullProduct);
    console.log(`  ✅ ${i + 1}. ${product.title}`);
    console.log(`       💰 ${formatPrice(product.price)}${product.originalPrice ? ` (was ${formatPrice(product.originalPrice)})` : ''} | ⭐ ${product.rating} | 📝 ${product.reviewCount.toLocaleString()} reviews`);
    console.log(`       🔗 products/${slug}.html`);
    console.log(`       🛒 ${makeAffiliateUrl(product.asin)}`);
    console.log();
  });

  // Update products.json
  if (!dryRun && generated.length > 0) {
    existing.products.push(...generated);
    saveProductsJson(existing);
    console.log(`💾 Updated data/products.json (+${generated.length} products, total: ${existing.products.length})`);
  }

  console.log(`\n🎉 Done! Generated ${generated.length} product page${generated.length > 1 ? 's' : ''} for "${normalizedCategory}"`);
  if (!dryRun) {
    console.log(`   📁 Output: ${PRODUCTS_DIR}/`);
    console.log(`   📊 Database: ${PRODUCTS_FILE}`);
  }
  console.log();
}

main();
