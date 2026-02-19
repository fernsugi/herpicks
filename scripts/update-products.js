#!/usr/bin/env node
/**
 * HerPicks Product Updater
 * 
 * Usage:
 *   node scripts/update-products.js --category "Skincare" --count 5
 *   node scripts/update-products.js --add '{"title":"...","price":29.99,...}'
 * 
 * This script manages the products.json database.
 * It can add new products with proper affiliate links.
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const AFFILIATE_TAG = 'sentientstudi-22';

function loadProducts() {
  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveProducts(data) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${data.products.length} products to products.json`);
}

function getNextId(products) {
  return Math.max(...products.map(p => p.id), 0) + 1;
}

function makeAffiliateUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function addProduct(data, product) {
  const nextId = getNextId(data.products);
  const newProduct = {
    id: nextId,
    title: product.title || 'Untitled Product',
    description: product.description || '',
    price: parseFloat(product.price) || 0,
    originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
    category: product.category || 'Skincare',
    subcategory: product.subcategory || '',
    image: product.image || `https://placehold.co/400x400/F2E0D9/C4727F?text=${encodeURIComponent(product.title?.substring(0, 20) || 'Product')}`,
    affiliateUrl: product.asin ? makeAffiliateUrl(product.asin) : (product.affiliateUrl || '#'),
    rating: parseFloat(product.rating) || 4.0,
    reviewCount: parseInt(product.reviewCount) || 0,
    badge: product.badge || undefined,
    featured: product.featured || false,
    dateAdded: new Date().toISOString().split('T')[0]
  };
  
  // Clean undefined values
  Object.keys(newProduct).forEach(k => newProduct[k] === undefined && delete newProduct[k]);
  
  data.products.push(newProduct);
  return newProduct;
}

function generateProducts(category, count) {
  // Template products for each category that an AI agent can customize
  const templates = {
    'Skincare': [
      { title: 'New Skincare Product', description: 'A highly-rated skincare essential.', price: 24.99, subcategory: 'Moisturizers' },
    ],
    'Makeup': [
      { title: 'New Makeup Product', description: 'A trending makeup must-have.', price: 19.99, subcategory: 'Lipstick' },
    ],
    'Haircare': [
      { title: 'New Haircare Product', description: 'A salon-quality hair treatment.', price: 29.99, subcategory: 'Treatments' },
    ],
    'Fragrance': [
      { title: 'New Fragrance', description: 'An irresistible new scent.', price: 89.99, subcategory: 'Eau de Parfum' },
    ],
    'Luxury Beauty': [
      { title: 'New Luxury Product', description: 'A premium beauty essential.', price: 65.00, subcategory: 'Serums' },
    ],
    'Tools & Accessories': [
      { title: 'New Beauty Tool', description: 'An essential beauty tool.', price: 34.99, subcategory: 'Devices' },
    ],
  };

  const results = [];
  for (let i = 0; i < count; i++) {
    const template = { ...templates[category]?.[0] || templates['Skincare'][0] };
    template.category = category;
    template.title = `${template.title} ${i + 1}`;
    results.push(template);
  }
  return results;
}

// ─── CLI ───
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

const data = loadProducts();

if (flags.add) {
  try {
    const product = JSON.parse(flags.add);
    const added = addProduct(data, product);
    saveProducts(data);
    console.log(`✅ Added: ${added.title} (ID: ${added.id})`);
  } catch (e) {
    console.error('❌ Invalid JSON:', e.message);
    process.exit(1);
  }
} else if (flags.category) {
  const count = parseInt(flags.count) || 5;
  const products = generateProducts(flags.category, count);
  products.forEach(p => {
    const added = addProduct(data, p);
    console.log(`  + ${added.title} (ID: ${added.id})`);
  });
  saveProducts(data);
  console.log(`\n✅ Added ${count} placeholder products for "${flags.category}".`);
  console.log('💡 Edit data/products.json to fill in real product details, ASINs, and images.');
} else if (flags.list) {
  console.log(`📦 Total products: ${data.products.length}`);
  const cats = {};
  data.products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
} else {
  console.log(`
HerPicks Product Manager
========================

Usage:
  node scripts/update-products.js --list true
    List product counts by category

  node scripts/update-products.js --category "Skincare" --count 5
    Generate placeholder products for a category

  node scripts/update-products.js --add '{"title":"Product Name","price":29.99,"category":"Skincare","asin":"B00XXXXX","rating":4.5,"reviewCount":1234,"description":"..."}'
    Add a specific product with ASIN (auto-generates affiliate URL)

Affiliate Tag: ${AFFILIATE_TAG}
Products File: ${PRODUCTS_FILE}
Current Count: ${data.products.length}
  `);
}
