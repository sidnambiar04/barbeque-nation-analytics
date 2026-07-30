const fs = require('fs');

async function inspectHtml() {
    const url = 'https://www.barbequenation.com/restaurants/mumbai/korum-mall';
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
    });
    const html = await res.text();
    fs.writeFileSync('korum_mall_page.html', html);
    console.log(`Saved HTML, total length: ${html.length}`);

    // Look for JSON script tags like __NEXT_DATA__ or self.__next_f
    const matches = html.match(/<script[^>]*>(.*?)<\/script>/gs) || [];
    console.log(`Found ${matches.length} script tags.`);
    for (let i = 0; i < matches.length; i++) {
        const script = matches[i];
        if (script.includes('price') || script.includes('buffet') || script.includes('branch') || script.includes('slot') || script.includes('lunch')) {
            console.log(`\nScript #${i} matching keywords (len=${script.length}):`);
            console.log(script.substring(0, 500));
        }
    }
}

inspectHtml();
