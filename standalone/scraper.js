const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Scraper "indestructible" que usa una ventana oculta de Electron 
 * para evadir Cloudflare y obtener las colecciones de CurseForge.
 */
async function runCurseForgeScraper() {
  console.log('🔍 Iniciando scraper indestructible de CurseForge...');
  
  const scraperWindow = new BrowserWindow({
    show: false, // Ventana invisible
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const url = "https://www.curseforge.com/community-picks/minecraft";
  const cachePath = path.join(__dirname, '..', 'curseforge_picks_cache.json');

  try {
    await scraperWindow.loadURL(url, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    // Esperamos un poco a que cargue el contenido dinámico si lo hay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extraemos los datos usando executeJavaScript
    const collections = await scraperWindow.webContents.executeJavaScript(`
      (() => {
        const results = [];
        // Buscamos los links que dicen "View Community Picks"
        const links = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.includes('View Community Picks'));
        
        links.forEach(link => {
          const href = link.getAttribute('href');
          const slug = href.split('/').pop();
          
          const card = link.closest('div') || link.parentElement;
          const titleEl = card?.querySelector('h3') || card?.querySelector('.title');
          const imgEl = card?.querySelector('img');
          
          let imgUrl = null;
          if (imgEl) {
            imgUrl = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || imgEl.currentSrc;
            if (imgUrl && imgUrl.startsWith('data:image')) {
              imgUrl = imgEl.getAttribute('srcset')?.split(' ')[0] || imgUrl;
            }
          }

          // Si la URL es relativa, la convertimos en absoluta
          if (imgUrl && imgUrl.startsWith('/')) {
            imgUrl = 'https://www.curseforge.com' + imgUrl;
          }

          // Si la imagen encontrada es un avatar, intentamos usar el thumbnail estándar de la colección
          // que suele ser más visual para el Spotlight.
          const finalIconUrl = (imgUrl && !imgUrl.includes('/avatars/')) 
            ? imgUrl 
            : 'https://www.curseforge.com/community-picks/assets/minecraft/' + slug + '/featured-thumbnail.webp';

          // Extraer el conteo de proyectos (ej: "6 Mods")
          const textContent = card.textContent || '';
          const modCountMatch = textContent.match(/(\d+)\s+Mods/i);
          const projectCount = modCountMatch ? parseInt(modCountMatch[1], 10) : 0;

          results.push({
            id: slug,
            name: titleEl ? titleEl.textContent.trim() : slug,
            description: "Curated by CurseForge Community",
            iconUrl: finalIconUrl,
            slug: slug,
            source: "curseforge",
            projectCount: projectCount
          });
        });
        return results;
      })()
    `);

    if (collections && collections.length > 0) {
      fs.writeFileSync(cachePath, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        picks: collections
      }, null, 2));
      console.log(`✅ Scraper completado: ${collections.length} colecciones guardadas en caché.`);
    }

  } catch (error) {
    console.error('❌ Error en el scraper de CurseForge:', error);
  } finally {
    scraperWindow.destroy();
  }
}

/**
 * Scraper on-demand para obtener los mods de una colección específica.
 */
async function scrapeCollectionMods(slug) {
  console.log(`🔍 Scrapeando mods para la colección: ${slug}...`);
  
  const scraperWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const url = `https://www.curseforge.com/community-picks/minecraft/${slug}`;
  let modSlugs = [];

  try {
    await scraperWindow.loadURL(url, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const html = await scraperWindow.webContents.executeJavaScript('document.documentElement.innerHTML');
    const matches = [...html.matchAll(/\/minecraft\/mc-mods\/([a-z0-9-]+)(?:["'\/])/gi)];
    const slugs = [...new Set(matches.map((m) => m[1]))];
    const blocked = new Set(["files", "download", "all", "install", "external", "discord", "settings"]);
    modSlugs = slugs.filter((s) => s.length > 2 && !blocked.has(s));
    
    console.log(`✅ Encontrados ${modSlugs.length} mods para ${slug}`);
  } catch (error) {
    console.error(`❌ Error scrapeando mods de ${slug}:`, error);
  } finally {
    scraperWindow.destroy();
  }

  return modSlugs;
}

module.exports = { runCurseForgeScraper, scrapeCollectionMods };
