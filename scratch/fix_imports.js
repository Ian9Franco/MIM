const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const replaceMap = {
    '../../theme/tokens': '@/theme/tokens',
    '../../hooks/useStatusBanner': '@/hooks/useStatusBanner',
    '../../hooks/useFomoDiscover': '@/hooks/useFomoDiscover',
    '../../utils/format': '@/utils/format',
    '../../types': '@/types',
    '../theme/tokens': '@/theme/tokens',
    '../hooks/useStatusBanner': '@/hooks/useStatusBanner',
    '../hooks/useFomoDiscover': '@/hooks/useFomoDiscover',
    '../utils/format': '@/utils/format',
    '../types': '@/types',
  };

  for (const [oldPath, newPath] of Object.entries(replaceMap)) {
    if (content.includes(oldPath)) {
      content = content.split(oldPath).join(newPath);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed imports in', filePath);
  }
}

const fomoDir = path.join('d:\\.mine\\manager', 'components', 'fomo');
if (fs.existsSync(fomoDir)) {
  fs.readdirSync(fomoDir).forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceInFile(path.join(fomoDir, file));
    }
  });
}

const uiDir = path.join('d:\\.mine\\manager', 'components', 'ui');
if (fs.existsSync(uiDir)) {
  fs.readdirSync(uiDir).forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceInFile(path.join(uiDir, file));
    }
  });
}

const libraryDir = path.join('d:\\.mine\\manager', 'components', 'library');
if (fs.existsSync(libraryDir)) {
  fs.readdirSync(libraryDir).forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceInFile(path.join(libraryDir, file));
    }
  });
}
