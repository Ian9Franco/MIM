
const CURSEFORGE_API_KEY = '2534c484-3d6c-4310-ac05-4092025c6d11';

async function testConfig(name, url, headers) {
    console.log(`Testing [${name}]...`);
    try {
        const res = await fetch(url, { headers });
        if (res.ok) {
            console.log(`  SUCCESS [${res.status}]`);
            const data = await res.json();
            return true;
        } else {
            console.log(`  FAILED [${res.status}] ${res.statusText}`);
            return false;
        }
    } catch (e) {
        console.log(`  ERROR: ${e.message}`);
        return false;
    }
}

async function runTests() {
    const endpoints = [
        'https://api.curseforge.com/v1/games',
        'https://api.curseforge.com/v1/mods/238222' // JEI mod
    ];

    const headerConfigs = [
        { name: 'x-api-key', headers: { 'x-api-key': CURSEFORGE_API_KEY, 'Accept': 'application/json' } },
        { name: 'X-API-KEY', headers: { 'X-API-KEY': CURSEFORGE_API_KEY, 'Accept': 'application/json' } },
        { name: 'Authorization', headers: { 'Authorization': `Bearer ${CURSEFORGE_API_KEY}`, 'Accept': 'application/json' } },
        { name: 'User-Agent Browser', headers: { 
            'x-api-key': CURSEFORGE_API_KEY, 
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        } }
    ];

    for (const endpoint of endpoints) {
        console.log(`\nEndpoint: ${endpoint}`);
        for (const config of headerConfigs) {
            await testConfig(config.name, endpoint, config.headers);
        }
    }
}

runTests();
