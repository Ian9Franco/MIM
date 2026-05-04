const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const componentsDir = path.join(rootDir, 'components');
const appDir = path.join(rootDir, 'app');

const structure = {
  layout: ['RootLayoutClient.tsx', 'AlertSidebar.tsx', 'ThemeToggle.tsx'],
  library: ['LibrarySection.tsx', 'ModCard.tsx', 'SubcategoryPanel.tsx', 'QuickCategorizeSection.tsx', 'PendingFilesSection.tsx'],
  projects: ['ProjectsSection.tsx', 'ProjectEditor.tsx', 'BuildPanel.tsx'],
  ui: ['EmptyState.tsx', 'SectionHeading.tsx', 'SkeletonLoader.tsx', 'HotkeyCard.tsx', 'DescriptionModal.tsx'],
  fomo: ['FomoSidebar.tsx']
};

// Create folders
for (const folder of Object.keys(structure)) {
  const folderPath = path.join(componentsDir, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

// Map old path -> new path for imports
const importMap = {};

// Move files
for (const [folder, files] of Object.entries(structure)) {
  for (const file of files) {
    const oldPath = path.join(componentsDir, file);
    const newPath = path.join(componentsDir, folder, file);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      // Map for imports (e.g. "@/components/ModCard" -> "@/components/library/ModCard")
      const basename = file.replace('.tsx', '');
      importMap[`@/components/${basename}`] = `@/components/${folder}/${basename}`;
    }
  }
}

// Function to update imports in a file
function updateImportsInFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  
  for (const [oldImport, newImport] of Object.entries(importMap)) {
    // Regex to match exact import path, e.g., from "@/components/ModCard"
    const regex = new RegExp(`from ["']${oldImport}["']`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `from "${newImport}"`);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated imports in ${filePath}`);
  }
}

// Recursively find and update files in a directory
function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      updateImportsInFile(fullPath);
    }
  }
}

processDirectory(componentsDir);
processDirectory(appDir);

console.log("Component organization complete.");
