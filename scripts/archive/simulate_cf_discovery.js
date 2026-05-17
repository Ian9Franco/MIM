/**
 * SIMULADOR DE DESCUBRIMIENTO DE CURSEFORGE
 * Este script simula lo que hace el backend de MIM para encontrar
 * las colecciones mensuales de CurseForge.
 */

const https = require('https');

const URL = "https://www.curseforge.com/community-picks/minecraft";

console.log('🚀 Iniciando simulación de descubrimiento...');
console.log(`🌐 Accediendo a: ${URL}\n`);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  }
};

https.get(URL, options, (res) => {
  let data = '';

  res.on('data', (chunk) => { data += chunk; });

  res.on('end', () => {
    console.log(`✅ Respuesta recibida (Código: ${res.statusCode})`);
    
    // 1. Buscamos los slugs usando el patrón de los botones
    const slugPattern = /href="\/community-picks\/minecraft\/([a-z0-9-]+)"[^>]*>View Community Picks/gi;
    const matches = [...data.matchAll(slugPattern)];
    
    console.log(`📊 Se encontraron ${matches.length} colecciones potenciales.\n`);

    const collections = matches.map((match, index) => {
      const slug = match[1];
      const name = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      return {
        rank: index + 1,
        id: slug,
        name: name,
        slug: slug,
        thumbnail_guessed: `https://www.curseforge.com/community-picks/assets/minecraft/${slug}/featured-thumbnail.webp`,
        is_featured_candidate: index === 0 // La primera es la que irá al Spotlight
      };
    });

    // 2. Mostramos el resultado como el JSON que vería la app
    console.log('--- JSON RESULTANTE PARA SPOTLIGHT ---');
    console.log(JSON.stringify({ 
      count: collections.length,
      latest_featured: collections[0]?.name || "None",
      picks: collections 
    }, null, 2));
    
    console.log('\n💡 NOTA: En producción (Electron), el scraper usa un navegador real');
    console.log('para asegurar que las imágenes lazy-loaded se capturen correctamente.');
  });

}).on('error', (err) => {
  console.error('❌ Error en la conexión:', err.message);
});
