const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next') && !file.includes('dist') && !file.includes('build')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.match(/\.(ts|tsx|js|jsx|json|md|env)$/)) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:\\bazarchowk-complete');
let changedCount = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
      .replace(/https:\/\/bazarchowkapi\.veritasco\.tech/g, 'https://bazarchowk-complete.vercel.app')
      .replace(/bazarchowkapi\.veritasco\.tech/g, 'bazarchowk-complete.vercel.app')
      .replace(/http:\/\/10\.153\.104\.1:3000/g, 'https://bazarchowk-complete.vercel.app')
      .replace(/10\.153\.104\.1:3000/g, 'bazarchowk-complete.vercel.app')
      .replace(/http:\/\/bazarchowk-complete.vercel.app/g, 'https://bazarchowk-complete.vercel.app')
      .replace(/http:\/\/localhost/g, 'https://bazarchowk-complete.vercel.app')
      .replace(/bazarchowk-complete.vercel.app/g, 'bazarchowk-complete.vercel.app');
      
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated ${file}`);
      changedCount++;
    }
  } catch (err) {
    console.error(`Error processing ${file}: ${err.message}`);
  }
});

console.log(`Total files updated: ${changedCount}`);
