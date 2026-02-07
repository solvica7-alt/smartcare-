const getProxiedUrl = (url) => {
    return 'https://corsproxy.io/?' + encodeURIComponent(url);
};

async function test() {
    try {
        console.log('Testing Proxy Connection...');
        const res = await fetch(getProxiedUrl('https://example.com'));
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Body Length: ${text.length}`);
        if (res.ok && text.length > 0) console.log('✅ Proxy is UP.');
        else console.log('❌ Proxy is DOWN or blocked.');
    } catch (e) {
        console.error('❌ Connection Error:', e.message);
    }
}
test();
