const fs = require('fs');

async function testAdAstra() {
  const projectId = 'ad-astra'; // slug
  const gameVersion = '1.20.1';
  const loader = 'forge';
  
  const headers = { "User-Agent": "MIM-App/1.0 (contact@mim.local)" };

  try {
    // 1. Fetch project details
    console.log("Fetching project details...");
    const pRes = await fetch(`https://api.modrinth.com/v2/project/${projectId}`, { headers });
    const projectData = await pRes.json();

    // 2. Fetch versions exactly as our API does
    console.log("Fetching versions...");
    const params = new URLSearchParams();
    params.set("game_versions", JSON.stringify([gameVersion]));
    params.set("loaders", JSON.stringify([loader]));
    
    let url = `https://api.modrinth.com/v2/project/${projectId}/version?${params.toString()}`;
    const vRes = await fetch(url, { headers });
    const rawVersions = await vRes.json();

    // 3. Batch resolve dependencies exactly as our API does
    console.log("Resolving dependencies in bulk...");
    const depIds = new Set();
    rawVersions.forEach((v) => {
      v.dependencies?.forEach((d) => {
        if (d.project_id) depIds.add(d.project_id);
      });
    });

    const projectNames = {};
    if (depIds.size > 0) {
      const depUrl = `https://api.modrinth.com/v2/projects?ids=${JSON.stringify(Array.from(depIds))}`;
      const depRes = await fetch(depUrl, { headers });
      if (depRes.ok) {
        const pData = await depRes.json();
        pData.forEach((p) => {
          projectNames[p.id] = p.title;
        });
      }
    }

    // 4. Map the data structure similar to what our app uses
    console.log("Mapping versions...");
    const versions = rawVersions.map((v) => {
      const primaryFile = v.files?.find((f) => f.primary) ?? v.files?.[0] ?? null;
      
      return {
        id: v.id,
        versionNumber: v.version_number,
        name: v.name,
        datePublished: v.date_published,
        changelog_preview: v.changelog ? v.changelog.substring(0, 150) + "..." : null, // Truncated just for this test so JSON isn't 10MB
        dependencies: (v.dependencies ?? []).map((d) => ({
          projectId: d.project_id,
          title: projectNames[d.project_id] || d.project_id,
          dependencyType: d.dependency_type,
        })),
        primaryFile: primaryFile ? {
          filename: primaryFile.filename,
          hashes: primaryFile.hashes
        } : null
      };
    });

    // Output object
    const finalData = {
      project_title: projectData.title,
      description: projectData.description,
      body_preview: projectData.body ? projectData.body.substring(0, 150) + "..." : null,
      total_compatible_versions_found: versions.length,
      versions: versions
    };

    fs.writeFileSync('d:\\.mine\\manager\\scratch\\ad_astra_test.json', JSON.stringify(finalData, null, 2), 'utf-8');
    console.log("Successfully saved to scratch/ad_astra_test.json");

  } catch (err) {
    console.error("Error during test:", err);
  }
}

testAdAstra();
