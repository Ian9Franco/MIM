const fs = require('fs');
const path = require('path');
const os = require('os');

// Read settings manually
const portableDir = fs.existsSync(path.join("D:", ".mine", "source")) 
  ? path.join("D:", ".mine", "source", ".mim-index") 
  : path.join(os.homedir(), ".mim-index");

const settingsFile = path.join(portableDir, "mim-settings.json");
let apiKey = "";

if (fs.existsSync(settingsFile)) {
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  apiKey = settings.curseforgeApiKey;
}

if (!apiKey) {
  console.error("No API key found in settings");
  process.exit(1);
}

async function run() {
  try {
    const res = await fetch("https://api.curseforge.com/v1/categories?gameId=432", {
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey
      }
    });
    
    if (!res.ok) {
      console.error("API Error:", await res.text());
      process.exit(1);
    }
    
    const data = await res.json();
    const categories = data.data;
    
    const modMap = {};
    const rpMap = {};
    const shaderMap = {};
    const dpMap = {};
    const mpMap = {};
    
    categories.forEach(c => {
      const name = c.name.toLowerCase();
      if (c.classId === 6) {
        modMap[name] = c.id;
      } else if (c.classId === 12) {
        rpMap[name] = c.id;
      } else if (c.classId === 6552) {
        shaderMap[name] = c.id;
      } else if (c.classId === 6945) {
        dpMap[name] = c.id;
      } else if (c.classId === 4471) {
        mpMap[name] = c.id;
      }
    });
    
    const result = {
      mod: modMap,
      resourcepack: rpMap,
      shader: shaderMap,
      datapack: dpMap,
      modpack: mpMap
    };
    
    const outputPath = path.join(__dirname, "cf_categories.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log("Saved categories to:", outputPath);
    
    // Also print to console for convenience
    console.log("MODPACKS MAP:", JSON.stringify(mpMap, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
