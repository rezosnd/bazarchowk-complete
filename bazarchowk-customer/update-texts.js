const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') && !filePath.includes('TranslatedText.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Make sure we only add import once
    if (content.includes('<Text') && !content.includes('@/components/TranslatedText')) {
      content = "import { Text as AppText } from '@/components/TranslatedText';\n" + content;
      
      // Replace <Text ...> with <AppText ...>
      content = content.replace(/<Text(\s|>)/g, '<AppText$1');
      // Replace </Text> with </AppText>
      content = content.replace(/<\/Text>/g, '</AppText>');
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated: ' + filePath);
    }
  }
});
