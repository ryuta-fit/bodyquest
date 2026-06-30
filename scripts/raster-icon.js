// Rasterize assets/icon-source.svg -> assets/icon.png (1024x1024, no alpha, flattened)
const sharp = require('sharp');
const path = require('path');
const root = path.resolve(__dirname, '..');
sharp(path.join(root, 'assets/icon-source.svg'))
  .resize(1024, 1024)
  .flatten({ background: '#0b2c54' })
  .png()
  .toFile(path.join(root, 'assets/icon.png'))
  .then((info) => console.log('icon.png', info.width + 'x' + info.height, 'alpha:' + (info.channels === 4)))
  .catch((e) => { console.error(e); process.exit(1); });
