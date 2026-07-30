const fs = require('fs/promises');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

const OUTPUT_CSV_PATH = path.resolve(__dirname, 'data', 'buffet_price_matrix.csv');

function cleanText(text) {
    if (!text) return '';
    return String(text)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractPrice(title, description, terms, flatPrice) {
    if (flatPrice && flatPrice.trim() !== '') {
        return flatPrice.trim();
    }
    const combined = `${title} ${terms} ${description}`;
    const match = combined.match(/₹\s*(\d+[\d,]*)|@\s*(\d+)|rs\.?\s*(\d+[\d,]*)|(\d+)\s*per\s*person/i);
    if (match) {
        const val = match[1] || match[2] || match[3] || match[4];
        if (val) return `₹${val}`;
    }
    return 'Dynamic/Standard Rate';
}

async function fetchBranches() {
    console.log('Fetching list of outlets from Barbeque Nation API...');
    const res = await fetch('https://www.barbequenation.com/api/v1/get-all-nearby-branches', {
        headers: { 'Accept': 'application/json, text/plain, */*' }
    });
    const json = await res.json();
    const cityList = json.results?.data || [];
    
    const branches = [];
    for (const cityObj of cityList) {
        const cityName = cityObj.city_name || 'India';
        for (const b of (cityObj.branches || [])) {
            branches.push({
                city_name: cityName,
                branch_id: b.branch_id,
                branch_name: b.branch_name,
                branch_address: b.branch_address || ''
            });
        }
    }
    console.log(`Found total ${branches.length} outlets across ${cityList.length} cities.`);
    return branches;
}

async function scrapeBuffetPriceMatrix(targetCount = 200) {
    const branches = await fetchBranches();
    const records = [];
    const scrapedAt = new Date().toISOString();
    let recordId = 1;

    console.log(`Starting extraction to collect at least ${targetCount} buffet price matrix records...`);

    for (const branch of branches) {
        if (records.length >= targetCount) {
            console.log(`Target limit reached (${records.length} records). Stopping iteration.`);
            break;
        }

        try {
            const url = `https://www.barbequenation.com/api/v1/get-active-deals/${branch.branch_id}`;
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json, text/plain, */*' }
            });

            if (!res.ok) continue;
            const data = await res.json();
            const deals = data.results || [];

            for (const deal of deals) {
                if (records.length >= targetCount) break;

                const title = cleanText(deal.title || deal.AutoApplyDeal);
                if (!title) continue;

                const days = Array.isArray(deal.applicable_days) ? deal.applicable_days.join(', ') : 'All Days';
                
                let timings = 'Standard Hours';
                if (Array.isArray(deal.applicable_time) && deal.applicable_time.length > 0) {
                    timings = deal.applicable_time.map(t => `${t.from || ''} - ${t.to || ''}`).join(', ');
                }

                const terms = cleanText(deal.terms_and_conditions || deal.description);
                const price = extractPrice(title, deal.description, terms, deal.FlatBufffetPrice);

                records.push({
                    record_id: recordId++,
                    city_name: branch.city_name,
                    branch_id: branch.branch_id,
                    branch_name: branch.branch_name,
                    package_name: title,
                    price,
                    min_pax: deal.min_pax || '1',
                    max_pax: deal.max_pax || 'N/A',
                    applicable_days: days,
                    slot_timings: timings,
                    full_address: cleanText(branch.branch_address),
                    terms_summary: terms.substring(0, 300),
                    scraped_at: scrapedAt
                });
            }

            console.log(`Scraped outlet ${branch.branch_name} (${branch.city_name}): Total accumulated records = ${records.length}`);
        } catch (err) {
            console.error(`Error scraping branch ${branch.branch_id}: ${err.message}`);
        }
    }

    console.log(`\nWriting ${records.length} records to CSV...`);
    await fs.mkdir(path.dirname(OUTPUT_CSV_PATH), { recursive: true });

    const csvWriter = createObjectCsvWriter({
        path: OUTPUT_CSV_PATH,
        header: [
            { id: 'record_id', title: 'record_id' },
            { id: 'city_name', title: 'city_name' },
            { id: 'branch_id', title: 'branch_id' },
            { id: 'branch_name', title: 'branch_name' },
            { id: 'package_name', title: 'package_name' },
            { id: 'price', title: 'price' },
            { id: 'min_pax', title: 'min_pax' },
            { id: 'max_pax', title: 'max_pax' },
            { id: 'applicable_days', title: 'applicable_days' },
            { id: 'slot_timings', title: 'slot_timings' },
            { id: 'full_address', title: 'full_address' },
            { id: 'terms_summary', title: 'terms_summary' },
            { id: 'scraped_at', title: 'scraped_at' },
        ]
    });

    await csvWriter.writeRecords(records);
    console.log(`✅ Buffet Price Matrix scraping completed successfully! Saved ${records.length} rows to: ${OUTPUT_CSV_PATH}`);
    return records.length;
}

scrapeBuffetPriceMatrix(200).catch(err => {
    console.error('Fatal Scraper Error:', err);
    process.exit(1);
});
