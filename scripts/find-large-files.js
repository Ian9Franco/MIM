const fs = require('fs');
const path = require('path');

/**
 * MIM — Project Auditor (Large Files & Refactored Files)
 * 1. Identifica archivos que exceden las 300 líneas de lógica (sin comentarios).
 * 2. Identifica archivos recientemente refactorizados/modularizados para revisión de comentarios.
 */

const TARGET_DIRS = ['app', 'components', 'lib', 'services', 'hooks'];
const LINE_THRESHOLD = 300;
const OUTPUT_FILE = path.join(__dirname, 'large-files.json');
const ROOT_DIR = path.join(__dirname, '..');

function analyzeFile(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  
  // Contar líneas de lógica (omitiendo comentarios)
  let logicContent = rawContent.replace(/\/\*[\s\S]*?\*\//g, '');
  logicContent = logicContent.replace(/^\s*\/\/.*$/gm, '');
  const logicLines = logicContent.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//')).length;

  // Detectar si fue refactorizado
  // 1. Por marcas en comentarios
  const hasRefactorKeyword = /Refactorizado|Modularizado|Delega|Extraído|Refactored/i.test(rawContent);
  // 2. Por ubicación en carpetas de componentes modularizados
  const isInModularDir = /[\\/](parts|stores|classifier|scanner|services)[\\/]/.test(filePath);

  const isRefactored = hasRefactorKeyword || isInModularDir;

  return { logicLines, isRefactored };
}

function getFiles(dir, allFiles = []) {
  if (!fs.existsSync(dir)) return allFiles;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        getFiles(name, allFiles);
      }
    } else if (/\.(tsx|ts|js|jsx)$/.test(file)) {
      allFiles.push(name);
    }
  }
  return allFiles;
}

function scan() {
  console.log(`🚀 Iniciando auditoría del proyecto MIM...`);
  const largeFiles = [];
  const refactoredFiles = [];

  TARGET_DIRS.forEach(target => {
    const targetPath = path.join(ROOT_DIR, target);
    const files = getFiles(targetPath);
    
    files.forEach(file => {
      const { logicLines, isRefactored } = analyzeFile(file);
      const relativePath = path.relative(ROOT_DIR, file);

      if (logicLines > LINE_THRESHOLD) {
        largeFiles.push({ path: relativePath, lines: logicLines });
      }
      
      if (isRefactored) {
        refactoredFiles.push({ path: relativePath, lines: logicLines });
      }
    });
  });

  largeFiles.sort((a, b) => b.lines - a.lines);
  
  const result = {
    summary: {
      totalLargeFiles: largeFiles.length,
      totalRefactored: refactoredFiles.length,
      threshold: LINE_THRESHOLD
    },
    largeFiles,
    refactoredFiles
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  
  console.log(`✅ Auditoría completa.`);
  console.log(`📊 Archivos grandes (>300 líneas): ${largeFiles.length}`);
  console.log(`🛠️  Archivos refactorizados detectados: ${refactoredFiles.length}`);
  console.log(`📄 Resultados guardados en: ${OUTPUT_FILE}`);
}

scan();
