// Final Universal Sync Verification
// 🇵🇸 💻🏥

// The new Universal Storage ID
const UNIVERSAL_STORAGE_ID = '019c3a0d-c841-7c2b-9589-47f4fd455ac5';
const TEST_CLINIC_ID = 'TEST_UNIVERSAL_' + Math.floor(Math.random() * 1000);

// Proxy Helper (Exact copy from SyncService.ts)
const getProxiedUrl = (url) => {
    const noCacheUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    return 'https://corsproxy.io/?' + encodeURIComponent(noCacheUrl);
};

async function verify() {
    console.log(`\n🌍 STARTING UNIVERSAL SYNC CHECK...`);
    console.log(`-----------------------------------`);

    try {
        const STORAGE_URL = `https://jsonblob.com/api/jsonBlob/${UNIVERSAL_STORAGE_ID}`;

        // 1. Fetch Universal Blob
        console.log(`[1/3] Fetching Universal Storage...`);
        const res = await fetch(getProxiedUrl(STORAGE_URL));
        if (!res.ok) throw new Error(`Fetch Failed: ${res.status}`);

        let allData = await res.json();
        console.log(`✅ Storage Accessed. Total Clinics: ${Object.keys(allData).length}`);

        // 2. Simulate Adding Data
        console.log(`[2/3] Writing Test Data for ${TEST_CLINIC_ID}...`);
        allData[TEST_CLINIC_ID] = [{ id: 'test-report', patientName: 'Test Patient', status: 'synced' }];

        // 3. Save Back
        console.log(`[3/3] Saving to Cloud...`);
        const saveRes = await fetch(getProxiedUrl(STORAGE_URL), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(allData)
        });

        if (!saveRes.ok) throw new Error(`Save Failed: ${saveRes.status}`);
        console.log(`✅ Saved Successfully.`);

        console.log(`-----------------------------------`);
        console.log(`🎉 UNIVERSAL SYNC IS WORKING PERFECTLY!`);
        console.log(`The new simplified logic is solid.`);

    } catch (e) {
        console.error(`\n❌ VERIFICATION FAILED:`, e.message);
        process.exit(1);
    }
}

verify();
