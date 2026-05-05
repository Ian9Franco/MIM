const path = require('path');
const fs = require('fs');

// Simple .env.local parser
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[key] = value;
  }
});

const searchMods = async (query) => {
  const apiKey = process.env.CURSEFORGE_API_KEY;
  
  if (!apiKey) {
    console.error("Error: No se encontró CURSEFORGE_API_KEY en .env.local");
    return;
  }

  // Parámetros: 
  // gameId: 432 (Minecraft)
  // classId: 6 (Mods)
  // searchFilter: tu búsqueda
  const url = `https://api.curseforge.com/v1/mods/search?gameId=432&classId=6&searchFilter=${encodeURIComponent(query)}&pageSize=10`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (response.ok) {
      const { data } = await response.json();
      console.log(`✅ Resultados para "${query}":`);
      data.forEach(mod => {
        console.log(`- ${mod.name} (ID: ${mod.id}) | Downloads: ${mod.downloadCount}`);
      });
    } else {
      console.error("❌ Falló la petición:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

searchMods("JourneyMap");
