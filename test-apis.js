
const MODRINTH_TOKEN = process.env.MODRINTH_TOKEN; // Usar variable de entorno
const CURSEFORGE_API_KEY = process.env.CURSEFORGE_API_KEY;

async function testCurseForge() {
    console.log('--- Testing CurseForge API ---');
    // Try both headers
    const headersList = [
        { 'x-api-key': CURSEFORGE_API_KEY, 'Accept': 'application/json', 'User-Agent': 'MIM-App/1.0' },
        { 'Eternal-API-Key': CURSEFORGE_API_KEY, 'Accept': 'application/json', 'User-Agent': 'MIM-App/1.0' }
    ];

    for (const headers of headersList) {
        const headerName = Object.keys(headers).find(k => k.toLowerCase().includes('key'));
        console.log(`Testing with ${headerName}...`);
        try {
            const res = await fetch('https://api.curseforge.com/v1/games', { headers });
            if (res.ok) {
                console.log(`SUCCESS [${res.status}] with ${headerName}`);
                return;
            } else {
                console.log(`FAILED [${res.status}] with ${headerName}`);
            }
        } catch (e) {
            console.error(`Exception with ${headerName}:`, e.message);
        }
    }
}

async function testModrinthCollections() {
    console.log('\n--- Testing Modrinth Collections API ---');
    const headers = { 
        'Authorization': MODRINTH_TOKEN,
        'User-Agent': 'MIM-App/1.0 (contact@mim.local)'
    };
    try {
        const userRes = await fetch('https://api.modrinth.com/v2/user', { headers });
        const user = await userRes.json();
        const userId = user.id;

        console.log('Testing follows endpoint...');
        const followsRes = await fetch(`https://api.modrinth.com/v2/user/${userId}/follows`, { headers });
        if (followsRes.ok) {
            const follows = await followsRes.json();
            console.log(`SUCCESS: Found ${follows.length} follows`);
            // Check if any follow is a collection
            const collections = follows.filter(f => f.object_type === 'collection');
            console.log(`Followed collections: ${collections.length}`);
        } else {
            console.log(`Follows FAILED [${followsRes.status}]: ${followsRes.statusText}`);
        }

        // Try searching for collections
        console.log('Testing search collections...');
        const searchRes = await fetch(`https://api.modrinth.com/v2/search?facets=[["project_type:collection"]]`, { headers });
        if (searchRes.ok) {
            const search = await searchRes.json();
            console.log(`SUCCESS: Found ${search.total_hits} total collections in search`);
        } else {
            console.log(`Search FAILED [${searchRes.status}]`);
        }

    } catch (e) {
        console.error('Modrinth Exception:', e.message);
    }
}

async function runTests() {
    await testCurseForge();
    await testModrinthCollections();
}

runTests();
