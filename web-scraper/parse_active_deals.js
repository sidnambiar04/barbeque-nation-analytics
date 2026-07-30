const fs = require('fs');

async function parseDeals() {
    const res = await fetch('https://www.barbequenation.com/api/v1/get-active-deals/78');
    const json = await res.json();
    console.log(`Total deals in get-active-deals/78: ${json.results ? json.results.length : 0}`);

    if (json.results) {
        json.results.forEach((deal, idx) => {
            console.log(`\n--- Deal #${idx + 1}: ${deal.title} (ID: ${deal.id}) ---`);
            console.log(`AutoApplyDeal: ${deal.AutoApplyDeal}`);
            console.log(`FlatBufffetPrice: ${deal.FlatBufffetPrice}`);
            console.log(`IsDealPriceDynamic: ${deal.IsDealPriceDynamic}`);
            console.log(`dealType: ${deal.dealType}`);
            console.log(`min_pax: ${deal.min_pax}, max_pax: ${deal.max_pax}`);
            console.log(`per_pax_discount: ${deal.per_pax_discount}`);
            console.log(`terms_and_conditions: ${deal.terms_and_conditions}`);
            if (deal.day_slots && deal.day_slots.length > 0) {
                console.log(`day_slots:`, JSON.stringify(deal.day_slots, null, 2));
            }
        });
    }
}

parseDeals();
