async function testDeals() {
    const res = await fetch('https://www.barbequenation.com/api/v1/get-active-deals/12');
    const json = await res.json();
    console.log('Results count:', json.results ? json.results.length : 0);
    if (json.results && json.results.length > 0) {
        console.log('Sample Deal 0:', JSON.stringify(json.results[0], null, 2));
        console.log('Sample Deal 1:', JSON.stringify(json.results[1], null, 2));
    }
}
testDeals();
