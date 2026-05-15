const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * MIM — Review List Generator
 * Obtiene todos los archivos modificados o creados hoy (vía git)
 * y los guarda en un JSON para revisión sistemática de comentarios.
 */

const OUTPUT_FILE = path.join(__dirname, 'review-list.json');

try {
  // Obtener archivos modificados (M) y no rastreados (??) incluyendo contenido de carpetas nuevas
  const status = execSync('git status --porcelain -uall', { encoding: 'utf8' });
  
  const files = status.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const statusType = line.substring(0, 2).trim();
      let filePath = line.substring(2).trim();
      
      if (filePath.endsWith('/')) return null;

      return {
        path: filePath,
        status: statusType === 'M' ? 'Modified' : 'New',
        reviewed: false,
        priority: filePath.includes('/parts/') || filePath.includes('/services/') || filePath.includes('/db/') ? 'High' : 'Normal'
      };
    })
    .filter(f => f !== null);

  const result = {
    generatedAt: new Date().toISOString(),
    total: files.length,
    files: files
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  
  console.log(`✅ Lista de revisión generada con ${files.length} archivos.`);
} catch (error) {
  console.error('❌ Error:', error.message);
}
