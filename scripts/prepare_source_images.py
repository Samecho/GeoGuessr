#!/usr/bin/env python3
"""Make web-sized copies of all local Tuxundoc images without altering originals.

Every input image retains its stable archive ID. Only resizing and image encoding
are applied; no cropping, watermark removal, mirroring, or color alteration.
"""
from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/source-images'
IMAGES = json.loads((ROOT / 'src/data/knowledge/images.json').read_text(encoding='utf-8'))['images']


def target(image):
    suffix = '.svg' if image['sourcePath'].lower().endswith('.svg') else '.webp'
    return OUT / (image['id'] + suffix)


def convert(image):
    source = ROOT / image['sourcePath']
    destination = target(image)
    if destination.exists() and destination.stat().st_size:
        return image['id'], 'cached'
    if not source.is_file():
        return image['id'], 'missing'
    try:
        if source.suffix.lower() == '.svg':
            destination.write_bytes(source.read_bytes())
        else:
            with Image.open(source) as opened:
                frame = ImageOps.exif_transpose(opened)
                if getattr(frame, 'n_frames', 1) > 1:
                    frame.seek(0)
                frame.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
                if frame.mode not in ('RGB', 'RGBA'):
                    frame = frame.convert('RGBA' if 'A' in frame.getbands() else 'RGB')
                frame.save(destination, 'WEBP', quality=70, method=4)
        return image['id'], 'converted'
    except (OSError, ValueError, UnidentifiedImageError) as error:
        destination.unlink(missing_ok=True)
        return image['id'], str(error)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    outcomes = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for future in as_completed(pool.submit(convert, image) for image in IMAGES):
            image_id, status = future.result()
            outcomes[image_id] = status
            if len(outcomes) % 500 == 0:
                print(f'{len(outcomes)}/{len(IMAGES)} processed', flush=True)
    failures = {image_id: status for image_id, status in outcomes.items() if status not in ('cached', 'converted')}
    manifest = {
        'schemaVersion': 1, 'source': 'tuxundoc/index.html',
        'imageCount': len(IMAGES), 'convertedCount': len(IMAGES) - len(failures),
        'failures': failures,
        'webBytes': sum(path.stat().st_size for path in OUT.iterdir() if path.is_file() and path.name != 'ready.json'),
        'usage': 'User-directed test publication of tutorial images; author and redistribution rights are not asserted.',
    }
    (OUT / 'ready.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
