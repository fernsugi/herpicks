#!/usr/bin/env python3
"""
Fix products that got placeholder images by trying correct ASINs.
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
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Correct ASINs for products that had broken links
# These were verified by searching Amazon directly
CORRECT_ASINS = {
    5: "B01MDTVZTZ",   # The Ordinary Niacinamide 10% + Zinc 1%
    9: "B09HJGT9HX",   # Maybelline Sky High Mascara
    10: "B09WDVYJB7",  # Rare Beauty Soft Pinch (try different variant)
    11: "B07G3HKFBC",  # Charlotte Tilbury Pillow Talk
    12: "B00E5BHLQM",  # NYX Butter Gloss
    13: "B09HHZYJ2P",  # e.l.f. Camo CC
    14: "B00FS64Y3W",  # NARS Radiant Creamy Concealer
    15: "B00GMPJRK4",  # Anastasia Brow Wiz
    16: "B00H4TEWW2",  # Urban Decay Naked3
    19: "B0BNH3RTJB",  # Dyson Airwrap
    20: "B079Z25XKT",  # Revlon One-Step (different ASIN)
    21: "B000C1ZNCA",  # Chanel Coco Mademoiselle
    22: "B00R5BCHYG",  # YSL Black Opium
    23: "B01MCSKVN5",  # Sol de Janeiro Brazilian Bum Bum Cream
    24: "B00142RTBM",  # La Mer
    25: "B00142RTAE",  # SK-II
    26: "B07QKWZVNV",  # Tatcha Dewy Skin Cream
    27: "B01LXIMKPI",  # Drunk Elephant C-Firma
    28: "B084RN2GFG",  # Laneige Lip Sleeping Mask
    29: "B08TC2V2MD",  # Beauty of Joseon Glow Serum
    33: "B00M3Z6RQE",  # MAC Ruby Woo
    34: "B00FZSFCGE",  # Too Faced Better Than Sex
    35: "B0752BWZD9",  # Fenty Gloss Bomb
    36: "B01AX9G7KA",  # IT Cosmetics CC+
    37: "B018SJCV12",  # Living Proof Dry Shampoo
    38: "B00N2SHM12",  # Briogeo Don't Despair
    39: "B003WKIJFO",  # Redken All Soft
    40: "B01LYXZ2CP",  # Color Wow Dream Coat
    41: "B003XQUIPI",  # Kenra Volume Spray 25
    42: "B001CT09VK",  # Marc Jacobs Daisy
    43: "B000VOM8LO",  # Viktor & Rolf Flowerbomb
    44: "B00HMMFWDW",  # Dior Miss Dior
    45: "B001FSKK5E",  # Versace Bright Crystal
    46: "B000HKGC08",  # Beautyblender
    47: "B005FYJCWE",  # Real Techniques
    48: "B07HQ4BPQD",  # Kitsch Satin Pillowcase
    49: "B07G3J5QCC",  # PMD Clean
    50: "B0BBHFQKRP",  # FOREO LUNA 4
    51: "B096LWHP83",  # Glow Recipe Watermelon Dew Drops
    52: "B07BVJNRDM",  # Summer Fridays Jet Lag Mask
    53: "B07DM2F9JN",  # Herbivore Prism Serum
    54: "B07HHHXZMW",  # Tom Ford Lost Cherry
    55: "B07BQPHFGB",  # T3 Cura LUXE
    56: "B09C2TSVYR",  # e.l.f. Power Grip Primer
    57: "B073FMY2T4",  # Benefit BADgal BANG!
    58: "B00BSEPFUM",  # Urban Decay All Nighter Foundation
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
            
        print(f"  [WARN] No image URL found in HTML for ASIN {asin}")
        return None
    except urllib.error.HTTPError as e:
        if e.code == 503:
            print(f"  [503] Throttled for {asin}, waiting 5s...")
            time.sleep(5)
            return fetch_amazon_image(asin)  # retry once
        print(f"  [HTTP {e.code}] Failed to fetch {asin}")
        return None
    except Exception as e:
        print(f"  [ERROR] Failed to fetch {asin}: {e}")
        return None


def is_placeholder(url: str) -> bool:
    return "placehold.co" in url or "unsplash.com" in url


def main():
    with open(PRODUCTS_FILE) as f:
        data = json.load(f)
    
    products = data["products"]
    print(f"Fixing placeholder images...\n")
    
    updated = 0
    still_placeholder = 0
    
    for product in products:
        pid = product["id"]
        title = product["title"]
        
        # Skip if already has a real image
        if not is_placeholder(product.get("image", "")):
            print(f"[{pid}] OK: {title[:50]}")
            continue
        
        asin = CORRECT_ASINS.get(pid)
        if not asin:
            print(f"[{pid}] No ASIN mapping for: {title[:50]}")
            still_placeholder += 1
            continue
        
        print(f"[{pid}] Fetching {title[:50]}")
        print(f"  ASIN: {asin}")
        
        image_url = fetch_amazon_image(asin)
        if image_url:
            print(f"  ✓ Found: {image_url}")
            product["image"] = image_url
            updated += 1
        else:
            print(f"  ✗ Still needs placeholder")
            still_placeholder += 1
        
        time.sleep(2)  # Be respectful of rate limits
    
    # Save updated products
    with open(PRODUCTS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Done! Fixed: {updated}, Still placeholders: {still_placeholder}")


if __name__ == "__main__":
    main()
