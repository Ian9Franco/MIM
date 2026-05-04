const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'app');
const componentsDir = path.join(__dirname, 'components');

const replaceColors = (content) => {
  let newContent = content;
  // Backgrounds
  newContent = newContent.replace(/bg-\[\#200D2D\]/g, 'bg-background');
  newContent = newContent.replace(/bg-\[\#1a0a24\]/g, 'bg-card');
  newContent = newContent.replace(/bg-\[\#BB96E4\]/g, 'bg-primary');
  newContent = newContent.replace(/bg-\[\#FFD066\]/g, 'bg-accent');
  
  // Texts
  newContent = newContent.replace(/text-\[\#200D2D\]/g, 'text-background');
  newContent = newContent.replace(/text-\[\#BB96E4\]/g, 'text-primary');
  newContent = newContent.replace(/text-\[\#FFD066\]/g, 'text-accent');
  newContent = newContent.replace(/text-white/g, 'text-foreground');
  
  // Borders
  newContent = newContent.replace(/border-\[\#BB96E4\]/g, 'border-primary');
  newContent = newContent.replace(/border-\[\#FFD066\]/g, 'border-accent');
  newContent = newContent.replace(/border-white/g, 'border-foreground');

  // Replace opacity variations (e.g., text-white/50 -> text-foreground/50)
  newContent = newContent.replace(/text-foreground\/([0-9]+)/g, 'text-foreground/$1');

  return newContent;
};

const walk = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = replaceColors(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
};

walk(directory);
walk(componentsDir);
console.log('Done');
