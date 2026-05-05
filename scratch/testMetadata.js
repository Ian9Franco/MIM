const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const targetDir = "D:\\.mine\\source\\1.20.1\\forge\\.essential\\librerias";
const filesToTest = [
  "botarium-forge-1.20.1-2.3.4.jar",
  "lionfishapi-2.7.jar"
];

filesToTest.forEach(fileName => {
  const filePath = path.join(targetDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  console.log(`\n===========================================`);
  console.log(`Analyzing: ${fileName}`);
  console.log(`===========================================`);
  
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    // Look for mods.toml
    let tomlEntry = zipEntries.find(e => e.entryName === "META-INF/mods.toml");
    let result = { 
      file: fileName, 
      gameVersion: "UNKNOWN", 
      version: "UNKNOWN", 
      author: "UNKNOWN", 
      logo: "UNKNOWN" 
    };

    if (tomlEntry) {
      const text = zip.readAsText(tomlEntry);
      
      // Simple regex extraction
      const versionMatch = text.match(/version\s*=\s*["']([^"']+)["']/);
      const authorsMatch = text.match(/authors\s*=\s*["']([^"']+)["']/);
      const logoMatch = text.match(/logoFile\s*=\s*["']([^"']+)["']/);
      
      // Extract minecraft version dependency
      const mcMatch = text.match(/modId\s*=\s*["']minecraft["'][\s\S]*?versionRange\s*=\s*["']([^"']+)["']/);
      
      if (versionMatch) result.version = versionMatch[1];
      if (authorsMatch) result.author = authorsMatch[1];
      if (logoMatch) result.logo = logoMatch[1];
      if (mcMatch) result.gameVersion = mcMatch[1];
      
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(JSON.stringify({ file: fileName, error: "No mods.toml found" }, null, 2));
    }
  } catch (e) {
    console.error(`Error reading ${fileName}:`, e.message);
  }
});
