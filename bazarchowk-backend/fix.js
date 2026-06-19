const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if(c.includes('\\`')) {
    console.log('Fixing: ' + f);
    c = c.replace(/\\`/g, '\`');
    fs.writeFileSync(f, c);
  }
});
