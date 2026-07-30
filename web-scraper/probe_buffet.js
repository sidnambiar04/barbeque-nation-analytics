const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Log all network requests to catch API calls during booking flow
    page.on('request', request => {
        const url = request.url();
        if (!url.includes('.png') && !url.includes('.jpg') && !url.includes('.css') && !url.includes('.js') && !url.includes('fonts.')) {
            console.log(`[Request] ${request.method()} ${url}`);
        }
    });

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('api') || url.includes('slot') || url.includes('price') || url.includes('table') || url.includes('booking') || url.includes('outlet') || url.includes('availability') || url.includes('graphql')) {
            try {
                const json = await response.json();
                console.log(`\n=== API JSON Response: ${url} ===`);
                console.log(JSON.stringify(json, null, 2).substring(0, 2000));
                console.log(`===================================\n`);
            } catch(e) {}
        }
    });

    console.log('Navigating to barbequenation.com...');
    await page.goto('https://www.barbequenation.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Try clicking 'Book Table' or 'Select Outlet'
    try {
        const bookBtn = page.locator('button, a').filter({ hasText: /Book a Table|Book Table/i }).first();
        if (await bookBtn.isVisible()) {
            console.log('Clicking Book a Table button...');
            await bookBtn.click();
            await page.waitForTimeout(3000);
        }
    } catch(e) {
        console.log('Book button click error:', e.message);
    }

    // Try selecting an outlet in the search modal
    try {
        const searchInput = page.locator('input[placeholder*="Search city or outlet"]');
        if (await searchInput.isVisible()) {
            console.log('Filling search input...');
            await searchInput.fill('Korum Mall');
            await page.waitForTimeout(2000);
            
            const firstResult = page.locator('div.cursor-pointer').filter({ hasText: /Korum Mall/i }).first();
            if (await firstResult.isVisible()) {
                console.log('Clicking Korum Mall option...');
                await firstResult.click();
                await page.waitForTimeout(3000);
            }
        }
    } catch(e) {
        console.log('Search outlet error:', e.message);
    }

    await page.waitForTimeout(5000);
    await browser.close();
})();
