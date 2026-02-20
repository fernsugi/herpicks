#!/usr/bin/env python3
"""
Fetch real Amazon product images for all products in products.json
"""

import json
import re
import time
import urllib.request
import urllib.error
from pathlib import Path

PRODUCTS_FILE = Path(__file__).parent.parent / "data" / "products.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}


def fetch_amazon_image(asin: str) -> str | None:
    """Fetch main product image URL from Amazon product page."""
    url = f"https://www.amazon.com/dp/{asin}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        
        # Try data-old-hires first (main product image)
        m = re.search(r'data-old-hires="(https://m\.media-amazon\.com/images/I/[^"]+)"', html)
        if m:
            return m.group(1)
        
        # Try hiRes from colorImages JSON
        m = re.search(r'"hiRes":\s*"(https://m\.media-amazon\.com/images/I/[^"]+)"', html)
        if m:
            return m.group(1)
        
        # Try large from colorImages
        m = re.search(r'"large":\s*"(https://m\.media-amazon\.com/images/I/[^"]+)"', html)
        if m:
            return m.group(1)
            
        # Try main image
        m = re.search(r'"main":\s*\{"(https://m\.media-amazon\.com/images/I/[^"]+)"', html)
        if m:
            return m.group(1)
        
        print(f"  [WARN] No image URL found in HTML for ASIN {asin}")
        return None
    except Exception as e:
        print(f"  [ERROR] Failed to fetch {asin}: {e}")
        return None


def extract_asin(affiliate_url: str) -> str | None:
    """Extract ASIN from Amazon affiliate URL."""
    m = re.search(r'/dp/([A-Z0-9]{10})', affiliate_url)
    if m:
        return m.group(1)
    return None


def placeholder_url(title: str) -> str:
    """Generate a placeholder URL when we can't find a real image."""
    encoded = title[:50].replace(" ", "+").replace("'", "")
    return f"https://placehold.co/400x400/f8f4f0/8b5e83?text={encoded}&font=playfair-display"


def main():
    with open(PRODUCTS_FILE) as f:
        data = json.load(f)
    
    products = data["products"]
    print(f"Processing {len(products)} products...\n")
    
    updated = 0
    failed = 0
    
    for i, product in enumerate(products):
        title = product["title"]
        affiliate_url = product.get("affiliateUrl", "")
        asin = extract_asin(affiliate_url)
        
        print(f"[{i+1}/{len(products)}] {title[:60]}")
        print(f"  ASIN: {asin}")
        
        if asin:
            image_url = fetch_amazon_image(asin)
            if image_url:
                print(f"  ✓ Found: {image_url}")
                product["image"] = image_url
                updated += 1
            else:
                # Fall back to placeholder
                placeholder = placeholder_url(title)
                print(f"  ⚠ Using placeholder: {placeholder}")
                product["image"] = placeholder
                failed += 1
        else:
            placeholder = placeholder_url(title)
            print(f"  ⚠ No ASIN found, using placeholder: {placeholder}")
            product["image"] = placeholder
            failed += 1
        
        # Rate limit: 1 request per second to avoid throttling
        if i < len(products) - 1:
            time.sleep(1.5)
    
    # Save updated products
    with open(PRODUCTS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Done! Updated: {updated}, Placeholders: {failed}")
    print(f"Saved to {PRODUCTS_FILE}")


if __name__ == "__main__":
    main()
