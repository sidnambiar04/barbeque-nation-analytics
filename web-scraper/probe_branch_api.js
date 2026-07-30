async function probeStoreApis(storeCode) {
    console.log(`\n=== Testing store_code: ${storeCode} ===`);
    const endpoints = [
        `https://www.barbequenation.com/api/v1/get-active-deals/${storeCode}`,
        `https://www.barbequenation.com/api/v1/get-branch-slots/${storeCode}`,
        `https://www.barbequenation.com/api/v1/get-outlet-pricing/${storeCode}`,
        `https://www.barbequenation.com/api/v1/branch-pricing/${storeCode}`,
        `https://www.barbequenation.com/api/v1/get-buffet-price/${storeCode}`,
        `https://www.barbequenation.com/api/v1/get-menu-items/${storeCode}`,
        `https://www.barbequenation.com/api/v1/get-outlet-details/${storeCode}`,
        `https://www.barbequenation.com/api/v1/get-branch-detail/${storeCode}`,
    ];

    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json, text/plain, */*' }
            });
            console.log(`[${res.status}] ${url}`);
            if (res.ok) {
                const text = await res.text();
                console.log(`   Length: ${text.length} | Snippet: ${text.substring(0, 250)}`);
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }
}

async function main() {
    await probeStoreApis('78'); // Korum Mall Thane
}

main();
