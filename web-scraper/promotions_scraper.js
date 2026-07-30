const fs = require('fs/promises');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

const OUTPUT_CSV_PATH = path.resolve(__dirname, 'data', 'promotions_and_offers.csv');

function cleanText(text) {
    if (!text) return '';
    return String(text)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function categorizePromotion(title, desc, type) {
    const combined = `${title} ${desc}`.toLowerCase();
    if (combined.includes('chef') || combined.includes('curated') || combined.includes('tribute')) {
        return 'Chef Special / Festival';
    } else if (combined.includes('monsoon') || combined.includes('summer') || combined.includes('festive') || combined.includes('diwali') || combined.includes('friendship')) {
        return 'Seasonal Campaign';
    } else if (combined.includes('discount') || combined.includes('off') || combined.includes('deal') || combined.includes('fab') || combined.includes('sizzling')) {
        return 'Discount & Offer';
    } else if (type === 'blogs') {
        return 'Culinary Feature & Blog';
    }
    return 'Brand Event / Promotion';
}

async function scrapePromotionsAndOffers(targetCount = 100) {
    console.log('Fetching promotions and offers data from Barbeque Nation API...');
    const records = [];
    const seenIds = new Set();
    const scrapedAt = new Date().toISOString();

    // 1. Fetch latest updates (news, events, chef festivals, promos)
    try {
        const res = await fetch('https://www.barbequenation.com/api/v1/latest-updates');
        if (res.ok) {
            const data = await res.json();
            const items = data.results || [];
            console.log(`Retrieved ${items.length} raw promotion items from latest-updates.`);

            for (const item of items) {
                if (records.length >= targetCount) break;

                const promoId = String(item.id || '');
                if (!promoId || seenIds.has(promoId)) continue;
                seenIds.add(promoId);

                const title = cleanText(item.title);
                if (!title) continue;

                const desc = cleanText(item.desc || item.description);
                const category = categorizePromotion(title, desc, item.type);
                const image = Array.isArray(item.image) ? item.image[0] : (item.image || '');

                records.push({
                    record_id: records.length + 1,
                    promotion_id: promoId,
                    title: title,
                    category: category,
                    posted_date: item.posted_date || 'N/A',
                    description: desc.substring(0, 400),
                    image_url: image || '',
                    source_url: item.url_alias || `https://www.barbequenation.com/news/${promoId}`,
                    scraped_at: scrapedAt
                });
            }
        }
    } catch (e) {
        console.error('Error fetching latest-updates:', e.message);
    }

    // 2. If needed, fetch active deals from sample branches to supplement unique offers
    if (records.length < targetCount) {
        console.log(`Current records count: ${records.length}. Fetching active store deals...`);
        const sampleBranches = ['12', '78', '1', '2', '6', '16', '36', '82'];
        
        for (const branchId of sampleBranches) {
            if (records.length >= targetCount) break;
            try {
                const res = await fetch(`https://www.barbequenation.com/api/v1/get-active-deals/${branchId}`);
                if (!res.ok) continue;
                const data = await res.json();
                const deals = data.results || [];

                for (const deal of deals) {
                    if (records.length >= targetCount) break;

                    const dealId = `DEAL_${deal.id || deal.voucher_head_id || Math.random().toString(36).substring(7)}`;
                    if (seenIds.has(dealId)) continue;
                    seenIds.add(dealId);

                    const title = cleanText(deal.title || deal.AutoApplyDeal);
                    if (!title) continue;

                    const desc = cleanText(deal.terms_and_conditions || deal.description);
                    const category = categorizePromotion(title, desc, 'deal');
                    const image = Array.isArray(deal.image_url) ? deal.image_url[0] : (deal.deal_icon_url || '');

                    records.push({
                        record_id: records.length + 1,
                        promotion_id: dealId,
                        title: title,
                        category: category,
                        posted_date: deal.start_date ? deal.start_date.split('T')[0] : 'Active Offer',
                        description: desc.substring(0, 400),
                        image_url: image || '',
                        source_url: `https://www.barbequenation.com/deals`,
                        scraped_at: scrapedAt
                    });
                }
            } catch (e) {
                console.error(`Error fetching deals for branch ${branchId}:`, e.message);
            }
        }
    }

    console.log(`Collected total ${records.length} promotion & offer records.`);

    // Trim to exactly targetCount if desired or write all
    const finalRecords = records.slice(0, targetCount);

    console.log(`\nWriting ${finalRecords.length} records to CSV...`);
    await fs.mkdir(path.dirname(OUTPUT_CSV_PATH), { recursive: true });

    const csvWriter = createObjectCsvWriter({
        path: OUTPUT_CSV_PATH,
        header: [
            { id: 'record_id', title: 'record_id' },
            { id: 'promotion_id', title: 'promotion_id' },
            { id: 'title', title: 'title' },
            { id: 'category', title: 'category' },
            { id: 'posted_date', title: 'posted_date' },
            { id: 'description', title: 'description' },
            { id: 'image_url', title: 'image_url' },
            { id: 'source_url', title: 'source_url' },
            { id: 'scraped_at', title: 'scraped_at' }
        ]
    });

    await csvWriter.writeRecords(finalRecords);
    console.log(`✅ Promotions & Offers scraping completed! Saved ${finalRecords.length} rows to: ${OUTPUT_CSV_PATH}`);
    return finalRecords.length;
}

scrapePromotionsAndOffers(100).catch(err => {
    console.error('Fatal Scraper Error:', err);
    process.exit(1);
});
