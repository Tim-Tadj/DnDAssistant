"""One-off: compress the Avandria map so it fits Pages' 25 MiB file limit.

Source: src/res/talesOfAvandria/Avandria.png  (15360x8112, RGBA, 26.7 MB)
Output: src/res/talesOfAvandria/Avandria.jpg  (~2-3 MB, RGB, 8000x4228)

The output replaces the PNG as the bundled asset; update references if needed.
"""
from PIL import Image

src = r'src/res/talesOfAvandria/Avandria.png'
dst = r'src/res/talesOfAvandria/Avandria.jpg'

im = Image.open(src)
print('original:', im.size, im.mode)

# Drop alpha (RGB only) and downscale to 8000 wide.
im = im.convert('RGB')
target_w = 8000
if im.width > target_w:
    ratio = target_w / im.width
    new_h = int(im.height * ratio)
    im = im.resize((target_w, new_h), Image.LANCZOS)
print('resized:  ', im.size)

im.save(dst, 'JPEG', quality=85, optimize=True, progressive=True)

import os
print('output:   ', os.path.getsize(dst), 'bytes')