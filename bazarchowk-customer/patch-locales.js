const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'i18n', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.ai && data.ai.pills) {
    if (data.ai.pills.cake) {
        delete data.ai.pills.cake;
    }
    data.ai.pills.pandit = 'Book a Pandit'; // Fallback english if translation missing
  }

  if (data.categories) {
    data.categories.pandit = 'Pandits & Astrology';
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Updated ${file}`);
});
