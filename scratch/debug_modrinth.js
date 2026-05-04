
async function run() {
    // Search for collections where the author is the user
    const res = await fetch('https://api.modrinth.com/v2/search?facets=[["project_type:collection"],["author:el_notorious"]]', {
        headers: {
            'Authorization': 'mrp_zAl2Im5Wgnk26HUQh7D881dpTxbE9U9gu8ZtCF6CZzuNw7cOoUuuMG1Ede2x',
            'User-Agent': 'MIM-Test'
        }
    });
    const data = await res.json();
    console.log("Search results:", JSON.stringify(data, null, 2));
}
run();
