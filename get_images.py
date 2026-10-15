"""Downloads the Higgsfield images into assets/img/ as JPG files.
Run once on your own computer:  python3 get_images.py   (needs: pip install pillow)
"""
import io, urllib.request
from pathlib import Path
from PIL import Image

BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_3HlaVpiMvO4POBdayuQwhhmjT0J/"
IMAGES = {
    "home-hero.jpg": "hf_20261014_083426_88104490-b566-4b05-80af-d39feb85c960.png",
    "contract-desk.jpg": "hf_20261014_083427_6d73443c-0d05-4e69-b962-a6b5d7b8fb73.png",
    "zaandam.jpg": "hf_20261014_083427_39fe0a8a-51e4-4425-9678-bb6c77daefce.png",
    "notebook.jpg": "hf_20261014_083428_141a114a-aafc-40f5-afc1-6aebe69a994f.png",
    "workshop.jpg": "hf_20261014_083427_a56c71e1-b047-46fc-bf7f-b3c12f4c1594.png",
}
out = Path(__file__).parent / "assets" / "img"
out.mkdir(parents=True, exist_ok=True)
for name, file in IMAGES.items():
    with urllib.request.urlopen(BASE + file) as r:
        img = Image.open(io.BytesIO(r.read())).convert("RGB")
    img.save(out / name, "JPEG", quality=84, optimize=True, progressive=True)
    print("saved", name)
