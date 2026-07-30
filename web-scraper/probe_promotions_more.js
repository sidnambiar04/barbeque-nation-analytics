async function probeMore() {
    const res = await fetch('https://www.barbequenation.com/api/v1/latest-updates');
    const json = await res.json();
    const items = json.results || [];
    console.log(`Total latest-updates items: ${items.length}`);
    
    const types = {};
    items.forEach(item => {
        types[item.type] = (types[item.type] || 0) + 1;
    });
    console.log('Types distribution:', types);

    console.log('\nSample items:');
    items.slice(0, 5).forEach((item, idx) => {
        console.log(`\n[${idx + 1}] ID: ${item.id} | Type: ${item.type} | Date: ${item.posted_date}`);
        console.log(`Title: ${item.title}`);
        console.log(`Alias: ${item.url_alias}`);
        console.log(`Images:`, item.image);
    });
}

probeMore();
