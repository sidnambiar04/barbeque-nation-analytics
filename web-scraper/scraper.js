const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

const outletQuery = process.argv[2] || process.env.OUTLET_NAME || 'Korum Mall Thane';
const outputFile = path.resolve(__dirname, 'data', 'takeaway_korum_mall_menu.csv');

function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

async function selectOutlet(page, outletName) {
    let searchBox = page.locator('input[placeholder*="Search city or outlet"]');
    if (!(await searchBox.isVisible())) {
        try {
            await page.locator('div.cursor-pointer').filter({ hasText: 'Select Outlet' }).first().click({ force: true, timeout: 3000 });
        } catch (e) {
            console.log('Select Outlet button not clickable, checking if searchbox is visible now...');
        }
    }

    // Wait for search box to be visible
    await searchBox.waitFor({ state: 'visible', timeout: 5000 });
    await searchBox.fill(outletName);
    await page.waitForTimeout(1000);

    const outletInfo = await page.evaluate((needle) => {
        const target = Array.from(document.querySelectorAll('div.cursor-pointer')).find((node) => {
            const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
            return text.toLowerCase().includes(needle.toLowerCase());
        });

        if (!target) {
            return null;
        }

        const parts = (target.innerText || '')
            .split(/\r?\n+/)
            .map((part) => part.trim())
            .filter(Boolean);

        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

        return {
            outletName: parts[0] || needle,
            outletAddress: parts.slice(1).join(' '),
        };
    }, outletName);

    if (!outletInfo) {
        throw new Error(`Outlet not found: ${outletName}`);
    }

    await page.waitForTimeout(2000);
    return outletInfo;
}

async function scrapeMenu(page, outletInfo) {
    await page.waitForSelector('main h2.font-semibold.text-xl', { timeout: 15000 });
    await page.waitForSelector('main div[class*="border-gray-200"][class*="rounded-[24px]"]', { timeout: 15000 });

    return page.evaluate((meta) => {
        const normalize = (text) => String(text || '').replace(/\s+/g, ' ').trim();
        const categorySelector = 'h2.font-semibold.text-xl';
        const cardSelector = 'div[class*="border-gray-200"][class*="rounded-[24px]"]';
        const nodes = Array.from(document.querySelectorAll(`main ${categorySelector}, main ${cardSelector}`));
        const rows = [];
        let currentCategory = '';
        let itemOrder = 0;

        for (const node of nodes) {
            if (node.matches(categorySelector)) {
                currentCategory = normalize(node.textContent);
                continue;
            }

            const title = normalize(node.querySelector('h3')?.textContent);
            if (!title) {
                continue;
            }

            const description = normalize(node.querySelector('p')?.textContent);
            const price = normalize(Array.from(node.querySelectorAll('span')).map((span) => normalize(span.textContent)).find((text) => /^₹/.test(text)) || '');
            const image = Array.from(node.querySelectorAll('img'))
                .map((img) => ({
                    alt: normalize(img.getAttribute('alt')),
                    src: normalize(img.getAttribute('src')),
                }))
                .find((img) => /urbanpiper\.com|cdn\.urbanpiper\.com/i.test(img.src) || /menu item/i.test(img.alt));
            const vegIcon = Array.from(node.querySelectorAll('img')).find((img) => /veg/i.test(normalize(img.getAttribute('alt'))) && !/non-veg/i.test(normalize(img.getAttribute('alt'))));
            const nonVegIcon = Array.from(node.querySelectorAll('img')).find((img) => /non-veg/i.test(normalize(img.getAttribute('alt'))));
            const actionLabel = normalize(node.querySelector('button')?.textContent || '');
            const rawText = normalize(node.textContent);

            itemOrder += 1;

            rows.push({
                outlet_name: meta.outletName,
                outlet_address: meta.outletAddress,
                category: currentCategory,
                item_order: itemOrder,
                item_name: title,
                item_description: description,
                price,
                is_veg: vegIcon ? 'Veg' : nonVegIcon ? 'Non-Veg' : '',
                image_url: image?.src || '',
                action_label: actionLabel,
                raw_text: rawText,
                source_url: location.href,
            });
        }

        return rows;
    }, outletInfo);
}

(async () => {
    const browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
        slowMo: process.env.HEADLESS === 'false' ? 100 : 0,
    });

    try {
        const page = await browser.newPage();
        await page.goto('https://www.barbequenation.com/ubq-delivery', { waitUntil: 'domcontentloaded' });

        try {
            await page.getByRole('button', { name: 'Close' }).first().click({ timeout: 3000 });
        } catch {
            // No popup on some loads.
        }

        const outletInfo = await selectOutlet(page, outletQuery);
        const menuRows = await scrapeMenu(page, outletInfo);

        const csvWriter = createObjectCsvWriter({
            path: outputFile,
            header: [
                { id: 'outlet_name', title: 'outlet_name' },
                { id: 'outlet_address', title: 'outlet_address' },
                { id: 'category', title: 'category' },
                { id: 'item_order', title: 'item_order' },
                { id: 'item_name', title: 'item_name' },
                { id: 'item_description', title: 'item_description' },
                { id: 'price', title: 'price' },
                { id: 'is_veg', title: 'is_veg' },
                { id: 'image_url', title: 'image_url' },
                { id: 'action_label', title: 'action_label' },
                { id: 'raw_text', title: 'raw_text' },
                { id: 'source_url', title: 'source_url' },
                { id: 'scraped_at', title: 'scraped_at' },
            ],
        });

        const scrapedAt = new Date().toISOString();
        const rows = menuRows.map((row) => ({
            ...row,
            scraped_at: scrapedAt,
        }));

        await csvWriter.writeRecords(rows);

        console.log(`✅ Scraped ${rows.length} takeaway menu rows for ${outletInfo.outletName}`);
        console.log(`📄 Saved as: ${outputFile}`);
    } catch (error) {
        console.error('❌ Scrape failed:', error);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();