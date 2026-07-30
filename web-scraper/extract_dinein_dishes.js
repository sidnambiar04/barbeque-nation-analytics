const fs = require('fs/promises');
const path = require('path');
const { recognize } = require('tesseract.js');
const { createObjectCsvWriter } = require('csv-writer');
const fsSync = require('fs');

const metadataFile = path.resolve(__dirname, 'data', 'korum_mall_dinein_metadata.json');
const outputKorumCsv = path.resolve(__dirname, 'data', 'restaurant_menu_dishes_korum_mall.csv');
const outputMainCsv = path.resolve(__dirname, 'data', 'restaurant_menu_dishes.csv');
const outputMergedCsv = path.resolve(__dirname, 'data', 'restaurant_menu_dishes_merged.csv');

// List of words indicating page/menu noise to skip
const NOISE_WORDS = [
    'crustaceans', 'gluten', 'sulphites', 'kcal mentioned', 'subject to change',
    'taxes as applicable', 'please contact', 'images are for representation',
    'government taxes', 'serving', 'allergen', 'contains', 'peanuts', 'celery',
    'mustard', 'lupin', 'molluscs', 'service charge', 'all prices', 'indian rupees',
    'alcohol', 'crafted taste', '0.0%', 'non-alcoholic beer', 'way to'
];

function isNoise(text) {
    const lower = text.toLowerCase();
    if (text.replace(/[^a-zA-Z0-9]/g, '').length <= 1) {
        return true;
    }
    return NOISE_WORDS.some(word => lower.includes(word));
}

function cleanDishName(text) {
    let cleaned = text.replace(/[\(\)©®™~¥¢#ø\*]/g, '').trim();
    cleaned = cleaned.replace(/\d+(\.\d+)?\s*KCAL/i, '');
    cleaned = cleaned.replace(/\d+(\.\d+)?\s*(?:cal|calories)/i, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// Simple custom CSV parser to read existing file without library dependencies
function parseCsv(content) {
    const lines = content.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        cells.push(current.trim());

        const record = {};
        headers.forEach((header, index) => {
            record[header] = cells[index] || '';
        });
        records.push(record);
    }
    return records;
}

// Clean and extract price from OCR text with custom rules for common OCR mistakes
function extractPrice(rawText) {
    // 169/- -> 169
    const hyphenMatch = rawText.match(/(\d+)\s*\/\-/);
    if (hyphenMatch) return hyphenMatch[1];

    // Check for currency symbols or prefix characters
    const currMatch = rawText.match(/(?:[¥F₹3]|\b)\s*(\d{3,4})\b/);
    if (currMatch) {
        let priceStr = currMatch[1];
        
        // Handle common OCR leading-digit failures (e.g. 7199 -> 199, 7169 -> 169, 7129 -> 129, 3129 -> 129, 2209 -> 209)
        if (priceStr.length === 4) {
            if (priceStr.startsWith('71') || priceStr.startsWith('31')) {
                return priceStr.slice(1);
            }
            if (priceStr.startsWith('2209') || priceStr.startsWith('3209')) {
                return '209';
            }
        }
        return priceStr;
    }
    return '';
}

(async () => {
    try {
        console.log('Loading dine-in metadata...');
        const metadataRaw = await fs.readFile(metadataFile, 'utf-8');
        const metadata = JSON.parse(metadataRaw);

        // Deduplicate menu images by src URL
        const uniqueImages = [];
        const seenUrls = new Set();
        for (const img of metadata.menuImages) {
            if (!seenUrls.has(img.src) && img.localPath) {
                seenUrls.add(img.src);
                uniqueImages.push(img);
            }
        }

        console.log(`Starting OCR processing for ${uniqueImages.length} unique menu images...`);
        const rows = [];

        for (let i = 0; i < uniqueImages.length; i++) {
            const img = uniqueImages[i];
            console.log(`\n[${i + 1}/${uniqueImages.length}] Performing OCR on: ${img.filename}`);
            
            let ocrResult;
            try {
                ocrResult = await recognize(img.localPath, 'eng');
            } catch (ocrErr) {
                console.error(`❌ OCR failed for ${img.filename}:`, ocrErr);
                continue;
            }

            const rawText = ocrResult.data.text || '';
            const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
            console.log(`Found ${lines.length} text lines. Parsing dishes...`);

            let currentSection = '';
            
            // Map the page file to default sections if applicable
            if (img.filename.toLowerCase().includes('bottle')) {
                currentSection = 'BEVERAGES (BAR)';
            } else if (img.filename.toLowerCase().includes('classic') || img.filename.toLowerCase().includes('menu_page')) {
                currentSection = 'MAIN BUFFET MENU';
            }

            const parsedItems = [];

            for (let j = 0; j < lines.length; j++) {
                const rawLineText = lines[j];
                
                if (isNoise(rawLineText)) {
                    continue;
                }

                // Check section headers
                const isSectionHeader = /^(STARTERS|SOUPS|SALADS|MAIN COURSE|DESSERTS|BEVERAGES|UBQ SPECIALS|CHEF'S SPECIAL|DRINKS|MOCKTAILS|BEERS|SINGLE MALT|WHISKY|SPIRITS)$/i.test(rawLineText);
                if (isSectionHeader) {
                    currentSection = rawLineText.toUpperCase();
                    console.log(`   📂 Section detected: ${currentSection}`);
                    continue;
                }

                // If the line is mostly lowercase, treat it as a description for the previous dish
                const isLowercaseDesc = /^[a-z]/.test(rawLineText) && !rawLineText.includes('/-') && !/\b\d{3,4}\b/.test(rawLineText);
                if (isLowercaseDesc && parsedItems.length > 0) {
                    parsedItems[parsedItems.length - 1].description = rawLineText;
                    console.log(`   📝 Description added: "${rawLineText}" to ${parsedItems[parsedItems.length - 1].dish_name}`);
                    continue;
                }

                // Extract calories
                let calories = '';
                const calMatch = rawLineText.match(/(\d+(?:\.\d+)?)\s*(?:KCAL|CALORIES)/i) || rawLineText.match(/KCAL\s+(\d+(?:\.\d+)?)/i);
                if (calMatch) {
                    calories = calMatch[1];
                }

                // Extract price
                const price = extractPrice(rawLineText);

                // Clean name
                let cleanedName = cleanDishName(rawLineText);
                
                // If it contains a price/calorie number at the end, strip it
                if (price) {
                    cleanedName = cleanedName.replace(new RegExp(`\\b${price}\\b`, 'g'), '').trim();
                }
                
                cleanedName = cleanedName.replace(/[\d\.\-\/\,]+/g, ' ').replace(/\s+/g, ' ').trim();

                if (!cleanedName || cleanedName.length < 3 || cleanedName.toUpperCase() === 'VEG' || cleanedName.toUpperCase() === 'NON VEG') {
                    continue;
                }

                const item = {
                    restaurant_name: metadata.restaurantName,
                    restaurant_url: metadata.restaurantUrl,
                    menu_slide: img.index,
                    source_image_name: img.filename,
                    source_image_url: img.src,
                    section: currentSection,
                    ocr_line_index: j + 1,
                    dish_name: cleanedName,
                    price: price,
                    calories: calories,
                    description: '',
                    tags: '',
                    raw_text: rawLineText,
                    ocr_confidence: Math.round(ocrResult.data.confidence || 0),
                    extracted_as: 'ocr-segment',
                    address: metadata.address,
                    phone: metadata.phone,
                    opening_hours: (metadata.openingHours || []).join(' | '),
                    scraped_at: metadata.scrapedAt
                };

                parsedItems.push(item);
                rows.push(item);
                console.log(`   🍽️ Dish: "${cleanedName}" | Price: ${price} | Calories: ${calories}`);
            }
        }

        console.log(`\nParsed ${rows.length} total dish records from Korum Mall dine-in menu.`);

        const csvHeader = [
            { id: 'restaurant_name', title: 'restaurant_name' },
            { id: 'restaurant_url', title: 'restaurant_url' },
            { id: 'menu_slide', title: 'menu_slide' },
            { id: 'source_image_name', title: 'source_image_name' },
            { id: 'source_image_url', title: 'source_image_url' },
            { id: 'section', title: 'section' },
            { id: 'ocr_line_index', title: 'ocr_line_index' },
            { id: 'dish_name', title: 'dish_name' },
            { id: 'price', title: 'price' },
            { id: 'calories', title: 'calories' },
            { id: 'description', title: 'description' },
            { id: 'tags', title: 'tags' },
            { id: 'raw_text', title: 'raw_text' },
            { id: 'ocr_confidence', title: 'ocr_confidence' },
            { id: 'extracted_as', title: 'extracted_as' },
            { id: 'address', title: 'address' },
            { id: 'phone', title: 'phone' },
            { id: 'opening_hours', title: 'opening_hours' },
            { id: 'scraped_at', title: 'scraped_at' }
        ];

        // 1. Write Korum-specific CSV
        const korumWriter = createObjectCsvWriter({
            path: outputKorumCsv,
            header: csvHeader
        });
        await korumWriter.writeRecords(rows);
        console.log(`📄 Saved Korum Mall dine-in CSV: ${outputKorumCsv}`);

        // 2. Read existing main CSV
        let existingRows = [];
        try {
            if (fsSync.existsSync(outputMainCsv)) {
                const fileContent = await fs.readFile(outputMainCsv, 'utf-8');
                existingRows = parseCsv(fileContent);
                console.log(`Read ${existingRows.length} existing rows from main CSV.`);
            }
        } catch (readErr) {
            console.log('Error reading main CSV:', readErr.message);
        }

        // Filter out duplicate rows for Korum Mall from existingRows
        const filteredExisting = existingRows.filter(r => r.restaurant_url !== metadata.restaurantUrl);
        const mergedRows = [...filteredExisting, ...rows];

        // 3. Write back to main CSV, with EBUSY fallback handling
        try {
            const mainWriter = createObjectCsvWriter({
                path: outputMainCsv,
                header: csvHeader
            });
            await mainWriter.writeRecords(mergedRows);
            console.log(`📄 Saved merged main dine-in CSV: ${outputMainCsv} (Total rows: ${mergedRows.length})`);
        } catch (writeErr) {
            if (writeErr.code === 'EBUSY') {
                console.warn(`\n⚠️ Warning: ${outputMainCsv} is currently locked or busy (e.g. open in Excel/VS Code).`);
                console.warn(`💾 Saving the merged output as fallback to: ${outputMergedCsv}`);
                const mergedWriter = createObjectCsvWriter({
                    path: outputMergedCsv,
                    header: csvHeader
                });
                await mergedWriter.writeRecords(mergedRows);
                console.log(`📄 Saved fallback merged CSV: ${outputMergedCsv} (Total rows: ${mergedRows.length})`);
            } else {
                throw writeErr;
            }
        }

        console.log('\n✅ OCR Extraction complete!');

    } catch (e) {
        console.error('❌ Extraction script failed:', e);
        process.exitCode = 1;
    }
})();
