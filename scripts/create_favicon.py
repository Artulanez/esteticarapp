from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / 'public' / 'images' / 'logo.jpeg'
out = root / 'public' / 'favicon.ico'

if not source.exists():
    raise FileNotFoundError(f'Arquivo não encontrado: {source}')

img = Image.open(source).convert('RGBA')
size = 256
canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
img = img.resize((size, size), Image.Resampling.LANCZOS)
canvas.alpha_composite(img)
canvas.save(out, format='ICO')
print(f'favicon criado em: {out}')
