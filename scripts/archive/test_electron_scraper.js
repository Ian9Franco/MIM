/**
 * TEST DEL SCRAPER INDESTRUCTIBLE (ELECTRON)
 * Este script usa Electron de verdad para probar el scraper
 * y demostrar que SI puede saltarse el error 403.
 */

const { app } = require('electron');
const { runCurseForgeScraper } = require('../standalone/scraper');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  console.log('🚀 Iniciando test en entorno Electron...');
  
  try {
    await runCurseForgeScraper();
    
    const cachePath = path.join(__dirname, '..', 'curseforge_picks_cache.json');
    if (fs.existsSync(cachePath)) {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log('\n✨ ¡ÉXITO! Se ha generado el archivo de caché.');
      console.log('Última actualización:', data.lastUpdated);
      console.log('Colecciones encontradas:', data.picks.length);
      console.log('Última encontrada:', data.picks[0]?.name);
    } else {
      console.log('\n❌ El archivo de caché no se generó.');
    }
  } catch (err) {
    console.error('\n❌ Error durante el test:', err);
  } finally {
    console.log('\nCerrando test...');
    app.quit();
  }
});
