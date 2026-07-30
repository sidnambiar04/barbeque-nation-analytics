const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');

const outletUrl = 'https://www.barbequenation.com/restaurants/mumbai/korum-mall';
const cacheDir = path.resolve(__dirname, 'data', '.menu-cache', 'korum-mall');
const metadataFile = path.resolve(__dirname, 'data', 'korum_mall_dinein_metadata.json');

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        console.log(`Navigating to ${outletUrl}...`);
        await page.goto(outletUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // 1. Scrape metadata
        console.log('Scraping outlet metadata...');
        const metadata = await page.evaluate(() => {
            const h1 = document.querySelector('h1')?.textContent?.trim() || 'Barbeque Nation - Korum Mall, Thane';
            
            let address = '';
            let phone = '';
            let openingHours = [];

            const addressEl = document.querySelector('address, [class*="address"], [class*="Address"]');
            if (addressEl) {
                address = addressEl.textContent.trim();
            }

            const bodyText = document.body.innerText;
            const phoneMatch = bodyText.match(/(?:Contact|Phone|Tel|Call)\s*[:\-]?\s*(\+?[\d\s\-]{8,15})/i) || bodyText.match(/(\+91\s*\d[\d\s\-]{8,12})/);
            if (phoneMatch) {
                phone = phoneMatch[1].trim();
            }

            const timingMatches = bodyText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))/gi);
            if (timingMatches) {
                openingHours = Array.from(new Set(timingMatches));
            }

            return {
                restaurantName: h1,
                restaurantUrl: window.location.href,
                scrapedAt: new Date().toISOString(),
                address,
                phone,
                openingHours
            };
        });

        // Add fallback hardcoded details if scrape missed them
        if (!metadata.address) {
            metadata.address = "2nd Floor, Korum Mall, Mangal Pandey Road Near Cadbury Compound, Eastern Express Hwy, Samata Nagar, Thane West, Thane, Maharashtra 400606, India";
        }
        if (!metadata.phone) {
            metadata.phone = "+91 80 6405 8002";
        }
        if (!metadata.openingHours || metadata.openingHours.length === 0) {
            metadata.openingHours = ["12:00 PM - 04:30 PM", "06:30 PM - 11:59 PM"];
        }

        console.log('Metadata scraped:', metadata);

        // 2. Click the first image with alt="Menu item" inside #menu-section to open lightbox
        console.log('Opening menu lightbox...');
        const firstMenuImage = page.locator('#menu-section img[alt="Menu item"]').first();
        if (await firstMenuImage.count() === 0) {
            throw new Error('No menu item images found in #menu-section');
        }
        await firstMenuImage.click({ force: true });
        await page.waitForTimeout(2000);

        // 3. Loop through and extract unique high-res image URLs in lightbox
        console.log('Extracting menu slide image URLs...');
        const menuImages = [];
        const seenUrls = new Set();
        let slideIndex = 1;

        // Ensure cache directory exists
        await fs.mkdir(cacheDir, { recursive: true });

        while (true) {
            const dialogImg = page.locator('[role="dialog"] img').nth(2);
            if (await dialogImg.count() === 0) {
                console.log('No image found in dialog, stopping.');
                break;
            }

            const src = await dialogImg.getAttribute('src');
            if (!src) {
                console.log('Empty src attribute in dialog image, stopping.');
                break;
            }

            console.log(`Checking slide ${slideIndex}: image URL = ${src}`);

            if (seenUrls.has(src)) {
                console.log('Detected duplicate image URL. We have cycled through all slides.');
                break;
            }

            seenUrls.add(src);
            menuImages.push({
                index: slideIndex,
                alt: 'Menu item',
                src: src
            });
            
            slideIndex++;

            // Click Next button
            const nextButton = page.locator('[role="dialog"] button[class*="next"], [role="dialog"] [class*="next-button"], .lg-next, .swiper-button-next').first();
            if (await nextButton.count() > 0 && await nextButton.isVisible()) {
                await nextButton.click({ force: true });
                await page.waitForTimeout(1000);
            } else {
                console.log('No visible Next button found in dialog, stopping.');
                break;
            }

            // Safeguard against infinite loop
            if (slideIndex > 30) {
                console.log('Reached safety limit of 30 slides, stopping.');
                break;
            }
        }

        console.log(`Found ${menuImages.length} unique menu slide URLs.`);

        // 4. Download images to cache using in-browser fetch convert to base64
        console.log('Downloading high-res menu images via browser evaluate...');
        for (const img of menuImages) {
            const filename = path.basename(decodeURIComponent(img.src));
            const destPath = path.join(cacheDir, filename);
            console.log(`Downloading slide ${img.index}: ${img.src} -> ${destPath}`);
            try {
                const b64 = await page.evaluate(async (u) => {
                    const res = await fetch(u);
                    const buf = await res.arrayBuffer();
                    let binary = '';
                    const bytes = new Uint8Array(buf);
                    const chunk = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunk) {
                        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
                    }
                    return btoa(binary);
                }, img.src);
                await fs.writeFile(destPath, Buffer.from(b64, 'base64'));
                img.localPath = destPath;
                img.filename = filename;
                console.log(`   Downloaded successfully.`);
            } catch (err) {
                console.error(`❌ Failed to download image ${img.index}:`, err.message);
            }
        }

        metadata.menuImages = menuImages;

        // Save metadata file
        await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
        console.log(`✅ Dine-in metadata and images saved. Metadata file: ${metadataFile}`);

    } catch (e) {
        console.error('❌ Dine-in scrape failed:', e);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
