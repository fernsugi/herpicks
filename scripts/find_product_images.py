#!/usr/bin/env python3
"""
Find real product images by searching Amazon and other retailer sites.
"""

import json
import re
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

PRODUCTS_FILE = Path(__file__).parent.parent / "data" / "products.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
}


def fetch_url(url: str) -> str:
    """Fetch URL and return HTML content."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        import gzip
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            # Handle gzip
            try:
                html = gzip.decompress(data).decode("utf-8", errors="replace")
            except Exception:
                html = data.decode("utf-8", errors="replace")
        return html
    except Exception as e:
        return ""


def find_image_in_html(html: str) -> str | None:
    """Try to find product image URL in HTML."""
    patterns = [
        r'data-old-hires="(https://m\.media-amazon\.com/images/I/[^"]+)"',
        r'"hiRes":\s*"(https://m\.media-amazon\.com/images/I/[^"]+)"',
        r'"large":\s*"(https://m\.media-amazon\.com/images/I/[^"]+)"',
        r'"main":\s*\{.*?"(https://m\.media-amazon\.com/images/I/[^"]+)"',
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            return m.group(1)
    return None


def fetch_amazon_by_asin(asin: str) -> str | None:
    """Fetch Amazon product image by ASIN."""
    url = f"https://www.amazon.com/dp/{asin}"
    html = fetch_url(url)
    if len(html) < 10000:  # 404 pages are tiny
        return None
    return find_image_in_html(html)


def search_amazon_for_product(query: str) -> list[str]:
    """Search Amazon for a product and return ASINs."""
    encoded = urllib.parse.quote(query)
    url = f"https://www.amazon.com/s?k={encoded}&i=beauty"
    html = fetch_url(url)
    asins = re.findall(r'/dp/([A-Z0-9]{10})/', html)
    return list(dict.fromkeys(asins))[:5]


def fetch_sephora_image(product_name: str) -> str | None:
    """Try to find product image on Sephora."""
    encoded = urllib.parse.quote(product_name)
    url = f"https://www.sephora.com/search?keyword={encoded}"
    html = fetch_url(url)
    # Sephora uses CDN images
    m = re.search(r'(https://www\.sephora\.com/productimages/sku/s\d+-main-[A-Za-z0-9]+\.jpg)', html)
    if m:
        return m.group(1)
    # Try their image CDN
    m = re.search(r'"thumbnail":\s*"(https://[^"]+sephora[^"]+\.jpg)"', html)
    if m:
        return m.group(1)
    return None


def fetch_ulta_image(product_name: str) -> str | None:
    """Try to find product image on Ulta."""
    encoded = urllib.parse.quote(product_name)
    url = f"https://www.ulta.com/search?search={encoded}"
    html = fetch_url(url)
    m = re.search(r'"image":\s*"(https://media\.ulta\.com/[^"]+)"', html)
    if m:
        return m.group(1)
    return None


def is_placeholder(url: str) -> bool:
    return "placehold.co" in url or "unsplash.com" in url


# Products that still need real images after first pass
PRODUCTS_TO_FIX = {
    5: {
        "title": "The Ordinary Niacinamide 10% + Zinc 1% Serum",
        "search": "The Ordinary Niacinamide 10% Zinc 1% serum",
        "asins": ["B01MDTVZTZ", "B0C9F1CL8N"],
    },
    9: {
        "title": "Maybelline Lash Sensational Sky High Mascara",
        "search": "Maybelline Sky High Mascara black",
        "asins": ["B08H3JPH74", "B08H43738R", "B09J5HRNTM"],
    },
    10: {
        "title": "Rare Beauty Soft Pinch Liquid Blush",
        "search": "Rare Beauty Soft Pinch Liquid Blush",
        "asins": ["B09WWXB7J3", "B09WDVYJB7", "B09N3GPDKH"],
    },
    11: {
        "title": "Charlotte Tilbury Pillow Talk Matte Revolution Lipstick",
        "search": "Charlotte Tilbury Pillow Talk lipstick",
        "asins": ["B07VRG3XMY", "B08DCLK6YG"],
    },
    12: {
        "title": "NYX Professional Makeup Butter Gloss",
        "search": "NYX Butter Gloss lip gloss",
        "asins": ["B00KSAQRXM", "B00E5BHK8G", "B00E5BHLQM"],
    },
    13: {
        "title": "e.l.f. Camo CC Cream SPF 30",
        "search": "e.l.f. Camo CC Cream SPF 30",
        "asins": ["B09CXNB6DX", "B09CXL3XMK", "B07Z8QWB9L"],
    },
    14: {
        "title": "NARS Radiant Creamy Concealer",
        "search": "NARS Radiant Creamy Concealer",
        "asins": ["B00FS64Y3W", "B077GPDCH9", "B07FMSCX58"],
    },
    15: {
        "title": "Anastasia Beverly Hills Brow Wiz Pencil",
        "search": "Anastasia Beverly Hills Brow Wiz eyebrow pencil",
        "asins": ["B00GMPJRK4", "B004AMZXPE", "B08FC8J5KD"],
    },
    16: {
        "title": "Urban Decay Naked3 Eyeshadow Palette",
        "search": "Urban Decay Naked3 eyeshadow palette",
        "asins": ["B00H4TEWW2", "B086ZVWZF5", "B07VCVS8LX"],
    },
    19: {
        "title": "Dyson Airwrap Multi-Styler Complete Long",
        "search": "Dyson Airwrap multi-styler complete",
        "asins": ["B0BNH3RTJB", "B09CXWCQVN", "B0BRS5BL3R"],
    },
    20: {
        "title": "Revlon One-Step Volumizer PLUS Hair Dryer",
        "search": "Revlon One Step Volumizer hair dryer brush",
        "asins": ["B079Z25XKT", "B0CMW8N7HQ", "B076HJWSNX"],
    },
    21: {
        "title": "Chanel Coco Mademoiselle Eau de Parfum",
        "search": "Chanel Coco Mademoiselle eau de parfum spray",
        "asins": ["B000C1ZNCA", "B0C5XWMDX2", "B0077TSWDW"],
    },
    22: {
        "title": "YSL Black Opium Eau de Parfum",
        "search": "YSL Black Opium Eau de Parfum",
        "asins": ["B00R5BCHYG", "B00O99VLYO", "B09FNWLXGV"],
    },
    23: {
        "title": "Sol de Janeiro Brazilian Bum Bum Cream",
        "search": "Sol de Janeiro Brazilian Bum Bum Cream",
        "asins": ["B01MCSKVN5", "B082ZY6N6P", "B09G7T8LPT"],
    },
    24: {
        "title": "La Mer Moisturizing Cream",
        "search": "La Mer Creme de la Mer moisturizing cream",
        "asins": ["B00142RTBM", "B000NQ9O62", "B000NQ9O8A"],
    },
    25: {
        "title": "SK-II Facial Treatment Essence",
        "search": "SK-II Facial Treatment Essence pitera",
        "asins": ["B00142RTAE", "B0000DDYIK", "B00006IL8V"],
    },
    26: {
        "title": "Tatcha The Dewy Skin Cream",
        "search": "Tatcha The Dewy Skin Cream moisturizer",
        "asins": ["B07QKWZVNV", "B07R1QJMPW", "B06XY83MYV"],
    },
    27: {
        "title": "Drunk Elephant C-Firma Fresh Day Serum",
        "search": "Drunk Elephant C-Firma vitamin C day serum",
        "asins": ["B01LXIMKPI", "B07F7H4JN9", "B09J2XVZMB"],
    },
    28: {
        "title": "Laneige Lip Sleeping Mask",
        "search": "Laneige Lip Sleeping Mask berry",
        "asins": ["B084RN2GFG", "B00V0HBB4W", "B085RJJMHP"],
    },
    29: {
        "title": "BEAUTY OF JOSEON Glow Serum",
        "search": "Beauty of Joseon Glow Serum propolis niacinamide",
        "asins": ["B08TC2V2MD", "B09TGLKL1P", "B08XYK55KT"],
    },
    33: {
        "title": "MAC Matte Lipstick in Ruby Woo",
        "search": "MAC Cosmetics Matte Lipstick Ruby Woo",
        "asins": ["B00M3Z6RQE", "B00OWP4SL4", "B0007QF6GG"],
    },
    34: {
        "title": "Too Faced Better Than Sex Mascara",
        "search": "Too Faced Better Than Sex volumizing mascara",
        "asins": ["B00FZSFCGE", "B08WKRQFXW", "B08WL9B9ZX"],
    },
    35: {
        "title": "Fenty Beauty Gloss Bomb Universal Lip Luminizer",
        "search": "Fenty Beauty Gloss Bomb Universal Lip Luminizer",
        "asins": ["B0752BWZD9", "B07MXHK3JH", "B07PLN7B7G"],
    },
    36: {
        "title": "IT Cosmetics CC+ Cream with SPF 50+",
        "search": "IT Cosmetics CC Plus Cream SPF 50",
        "asins": ["B01AX9G7KA", "B07BBMJ7S6", "B07BBKZRQB"],
    },
    37: {
        "title": "Living Proof Perfect Hair Day Dry Shampoo",
        "search": "Living Proof Perfect Hair Day Dry Shampoo",
        "asins": ["B018SJCV12", "B07JNK87ZP", "B01N2ZPQRZ"],
    },
    38: {
        "title": "Briogeo Don't Despair Repair Deep Conditioning Mask",
        "search": "Briogeo Don't Despair Repair deep conditioning mask",
        "asins": ["B00N2SHM12", "B07NWN89RW", "B0B5DRFLX1"],
    },
    39: {
        "title": "Redken All Soft Shampoo",
        "search": "Redken All Soft Shampoo argan oil dry brittle hair",
        "asins": ["B003WKIJFO", "B07THTRPXQ", "B07BXJFC8B"],
    },
    40: {
        "title": "Color Wow Dream Coat Supernatural Spray",
        "search": "Color Wow Dream Coat Supernatural Spray anti-frizz",
        "asins": ["B01LYXZ2CP", "B01FXAKST0", "B07X8LT23K"],
    },
    41: {
        "title": "Kenra Volume Spray 25 Super Hold Hairspray",
        "search": "Kenra Volume Spray 25 finishing hairspray",
        "asins": ["B003XQUIPI", "B01N0JKCR3", "B01FPUOKK2"],
    },
    42: {
        "title": "Marc Jacobs Daisy Eau de Toilette",
        "search": "Marc Jacobs Daisy Eau de Toilette spray",
        "asins": ["B001CT09VK", "B000XZ2KMI", "B07XJBFKKG"],
    },
    43: {
        "title": "Viktor & Rolf Flowerbomb Eau de Parfum",
        "search": "Viktor Rolf Flowerbomb Eau de Parfum spray",
        "asins": ["B000VOM8LO", "B000VOM8L0", "B07X8YV9GP"],
    },
    44: {
        "title": "Dior Miss Dior Blooming Bouquet Eau de Toilette",
        "search": "Dior Miss Dior Blooming Bouquet Eau de Toilette",
        "asins": ["B00HMMFWDW", "B07THSL9GC", "B08C5KB3M5"],
    },
    45: {
        "title": "Versace Bright Crystal Eau de Toilette",
        "search": "Versace Bright Crystal Eau de Toilette spray",
        "asins": ["B001FSKK5E", "B0019OS5K2", "B07X8N4QTB"],
    },
    46: {
        "title": "BEAUTYBLENDER Original Makeup Sponge",
        "search": "Beautyblender original makeup sponge pink",
        "asins": ["B000HKGC08", "B004LKZXWQ", "B0845HPGYK"],
    },
    47: {
        "title": "Real Techniques Everyday Essentials Brush Set",
        "search": "Real Techniques Everyday Essentials brush set 5-piece",
        "asins": ["B005FYJCWE", "B019OASQD8", "B00TWDWBAY"],
    },
    48: {
        "title": "Kitsch Satin Pillowcase",
        "search": "Kitsch Satin Pillowcase hair skin standard size",
        "asins": ["B07HQ4BPQD", "B07H9LC2C7", "B08DHJFKG3"],
    },
    49: {
        "title": "PMD Clean Smart Facial Cleansing Device",
        "search": "PMD Clean Smart Facial Cleansing Device sonic",
        "asins": ["B07G3J5QCC", "B08BNHKMCR", "B07VCMQ1K2"],
    },
    50: {
        "title": "FOREO LUNA 4 Facial Cleansing & Firming Device",
        "search": "FOREO LUNA 4 facial cleansing device",
        "asins": ["B0BBHFQKRP", "B09YMW5YN5", "B07CFDX46V"],
    },
    51: {
        "title": "Glow Recipe Watermelon Glow Niacinamide Dew Drops",
        "search": "Glow Recipe Watermelon Glow Niacinamide Dew Drops serum",
        "asins": ["B096LWHP83", "B0B8Y44S3N", "B08T1LV9CP"],
    },
    52: {
        "title": "Summer Fridays Jet Lag Mask",
        "search": "Summer Fridays Jet Lag Mask cream mask",
        "asins": ["B07BVJNRDM", "B07GVHW2LN", "B07DLC8PNW"],
    },
    53: {
        "title": "Herbivore Botanicals Prism Exfoliating Glow Serum",
        "search": "Herbivore Prism exfoliating glow serum AHA BHA",
        "asins": ["B07DM2F9JN", "B09QLYF58P", "B01GLBXJCK"],
    },
    54: {
        "title": "Tom Ford Lost Cherry Eau de Parfum",
        "search": "Tom Ford Lost Cherry Eau de Parfum spray",
        "asins": ["B07HHHXZMW", "B07HHM5S2X", "B07X3TH5ZB"],
    },
    55: {
        "title": "T3 Cura LUXE Hair Dryer",
        "search": "T3 Cura LUXE professional hair dryer ionic",
        "asins": ["B07BQPHFGB", "B093KMH1PR", "B09C5KDDCH"],
    },
    56: {
        "title": "e.l.f. Power Grip Primer",
        "search": "e.l.f. Power Grip Primer gel hyaluronic acid",
        "asins": ["B09C2TSVYR", "B09C26QW95", "B07NZ73B24"],
    },
    57: {
        "title": "Benefit Cosmetics BADgal BANG! Mascara",
        "search": "Benefit BADgal BANG! mascara volumizing",
        "asins": ["B073FMY2T4", "B0762ZKWDP", "B07T5TK4TQ"],
    },
    58: {
        "title": "Urban Decay All Nighter Foundation",
        "search": "Urban Decay All Nighter Foundation 24-hour",
        "asins": ["B00BSEPFUM", "B07T49C7S4", "B07WQ3PMMN"],
    },
}


def main():
    with open(PRODUCTS_FILE) as f:
        data = json.load(f)
    
    products_by_id = {p["id"]: p for p in data["products"]}
    
    updated = 0
    failed = []
    
    for pid, info in PRODUCTS_TO_FIX.items():
        product = products_by_id.get(pid)
        if not product:
            print(f"[{pid}] Product not found!")
            continue
        
        # Skip if already has a real Amazon image
        if not is_placeholder(product.get("image", "")):
            print(f"[{pid}] Already has real image: {product['image'][:60]}")
            continue
        
        title = info["title"]
        print(f"\n[{pid}] {title[:55]}")
        
        found_image = None
        
        # Try each ASIN
        for asin in info["asins"]:
            print(f"  Trying ASIN: {asin}")
            img = fetch_amazon_by_asin(asin)
            if img:
                found_image = img
                print(f"  ✓ Found image via ASIN {asin}: {img}")
                break
            time.sleep(1.5)
        
        # If no luck with ASINs, try Amazon search
        if not found_image:
            print(f"  Searching Amazon for: {info['search']}")
            asins = search_amazon_for_product(info["search"])
            print(f"  Search returned ASINs: {asins}")
            
            for asin in asins[:3]:
                if asin not in info["asins"]:  # Don't retry ones we already tried
                    print(f"  Trying search ASIN: {asin}")
                    img = fetch_amazon_by_asin(asin)
                    if img:
                        found_image = img
                        print(f"  ✓ Found via search: {img}")
                        break
                    time.sleep(1.5)
        
        if found_image:
            product["image"] = found_image
            updated += 1
        else:
            print(f"  ✗ Could not find image")
            failed.append(title)
        
        time.sleep(1)
    
    # Save
    with open(PRODUCTS_FILE, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"\n✅ Fixed {updated} products")
    if failed:
        print(f"❌ Still need images: {len(failed)} products")
        for f in failed:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
