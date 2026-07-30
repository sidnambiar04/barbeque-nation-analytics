const fs = require('fs');

async function testEndpoints() {
    const branchId = '12'; // Indiranagar, Bangalore
    const endpoints = [
        `https://www.barbequenation.com/api/v1/get-all-nearby-branches`,
        `https://www.barbequenation.com/api/v1/get-active-deals/${branchId}`,
        `https://www.barbequenation.com/api/v1/get-branch-details/${branchId}`,
        `https://www.barbequenation.com/api/v1/branch-details/${branchId}`,
        `https://www.barbequenation.com/api/v1/get-slots/${branchId}`,
        `https://www.barbequenation.com/api/v1/get-time-slots/${branchId}`,
        `https://www.barbequenation.com/api/v1/buffet-prices/${branchId}`,
        `https://www.barbequenation.com/api/v1/get-menu/${branchId}`,
        `https://www.barbequenation.com/api/v1/menu/${branchId}`,
        `https://www.barbequenation.com/api/v1/get-outlet-details`,
        `https://www.barbequenation.com/api/v1/promotions`,
    ];

    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                }
            });
            console.log(`[${res.status}] ${url}`);
            if (res.ok) {
                const text = await res.text();
                console.log(`   Length: ${text.length} | Snippet: ${text.substring(0, 300)}`);
            }
        } catch (e) {
            console.log(`[ERR] ${url}: ${e.message}`);
        }
    }
}

testEndpoints();
