async function probePromotions() {
    console.log('Testing /api/v1/promotions...');
    const res1 = await fetch('https://www.barbequenation.com/api/v1/promotions', {
        headers: { 'Accept': 'application/json, text/plain, */*' }
    });
    const json1 = await res1.json();
    const promos = json1.results?.promotion || [];
    console.log(`Found ${promos.length} promotions in /api/v1/promotions.`);

    if (promos.length > 0) {
        console.log('Sample promotion 0:', JSON.stringify(promos[0], null, 2));
    }

    console.log('\nTesting /api/v1/latest-updates...');
    const res2 = await fetch('https://www.barbequenation.com/api/v1/latest-updates');
    const json2 = await res2.json();
    const updates = json2.results || [];
    console.log(`Found ${updates.length} updates in /api/v1/latest-updates.`);

    if (updates.length > 0) {
        console.log('Sample update 0:', JSON.stringify(updates[0], null, 2));
    }
}

probePromotions();
