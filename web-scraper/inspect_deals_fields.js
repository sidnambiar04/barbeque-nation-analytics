const fs = require('fs');

async function inspectBranchDeals(branchId) {
    const res = await fetch(`https://www.barbequenation.com/api/v1/get-active-deals/${branchId}`);
    const data = await res.json();
    const deals = data.results || [];
    console.log(`Branch ${branchId}: Found ${deals.length} deals.`);
    
    deals.slice(0, 5).forEach((d, i) => {
        console.log(`\n  Deal ${i+1}: "${d.title}"`);
        console.log(`  - Days:`, d.applicable_days);
        console.log(`  - Time:`, d.applicable_time);
        console.log(`  - Pax: min=${d.min_pax}, max=${d.max_pax}`);
        console.log(`  - AutoApplyDeal:`, d.AutoApplyDeal);
        console.log(`  - Terms snippet:`, (d.terms_and_conditions || d.description || '').substring(0, 150));
    });
}

async function run() {
    await inspectBranchDeals('12'); // Indiranagar, Bangalore
    await inspectBranchDeals('78'); // Korum Mall Thane
    await inspectBranchDeals('1');  // Hyderabad
}

run();
