#!/usr/bin/env python3
"""Apply final image URLs to products.json for remaining products."""

import json
from pathlib import Path

PRODUCTS_FILE = Path(__file__).parent.parent / "data" / "products.json"

# Final image URLs for remaining products
FINAL_IMAGES = {
    34: "https://m.media-amazon.com/images/I/61whbylEdOL._SL1500_.jpg",   # Too Faced Better Than Sex Mascara
    48: "https://m.media-amazon.com/images/I/71JogW0dacL._AC_SL1500_.jpg",  # Kitsch Satin Pillowcase
    49: "https://m.media-amazon.com/images/I/818BAXE9mmL._SL1500_.jpg",   # PMD Clean
    51: "https://m.media-amazon.com/images/I/51esnnJ8xzL._SL1500_.jpg",   # Glow Recipe Watermelon Dew Drops
    53: "https://m.media-amazon.com/images/I/517jKStLQvL._SL1500_.jpg",   # Herbivore Prism Serum
    55: "https://m.media-amazon.com/images/I/61JOCYHN5QL._SL1500_.jpg",   # T3 Cura LUXE Hair Dryer
    56: "https://m.media-amazon.com/images/I/61FfGNgMGsL._SL1500_.jpg",   # e.l.f. Power Grip Primer
    57: "https://m.media-amazon.com/images/I/81gXfo8de4L._SL1500_.jpg",   # Benefit BADgal BANG! Mascara
    58: "https://m.media-amazon.com/images/I/61NC8ycAbIL._SL1500_.jpg",   # Urban Decay All Nighter Foundation
}


def main():
    with open(PRODUCTS_FILE) as f:
        data = json.load(f)
    
    updated = 0
    for product in data["products"]:
        pid = product["id"]
        if pid in FINAL_IMAGES:
            old = product["image"]
            product["image"] = FINAL_IMAGES[pid]
            print(f"[{pid}] {product['title'][:50]}")
            print(f"  Old: {old[:60]}")
            print(f"  New: {FINAL_IMAGES[pid]}")
            updated += 1
    
    with open(PRODUCTS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Updated {updated} products")
    
    # Count placeholders remaining
    placeholders = sum(1 for p in data["products"] if "placehold.co" in p.get("image", "") or "unsplash.com" in p.get("image", ""))
    real = len(data["products"]) - placeholders
    print(f"📊 Real images: {real}/{len(data['products'])}")
    if placeholders > 0:
        print("⚠️  Still placeholder:")
        for p in data["products"]:
            img = p.get("image", "")
            if "placehold.co" in img or "unsplash.com" in img:
                print(f"  [{p['id']}] {p['title'][:50]}")


if __name__ == "__main__":
    main()
