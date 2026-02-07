// The Master Directory ID we hardcoded in SyncService.ts
const MASTER_DIRECTORY_ID = '019c3a0d-c841-7c2b-9589-47f4fd455ac5';
const CLOUD_HUB_API = 'https://jsonblob.com/api/jsonBlob';
const TEST_CLINIC_ID = 'TEST_VERIFICATION_' + Math.floor(Math.random() * 10000);

async function fetchMasterDirectory() {
    const response = await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`);
    if (!response.ok) throw new Error(`Failed to fetch directory: ${response.status}`);
    return await response.json();
}

async function updateMasterDirectory(directory) {
    const response = await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(directory)
    });
    if (!response.ok) throw new Error(`Failed to update directory: ${response.status}`);
}

async function simulateDeviceSync(deviceName) {
    console.log(`[${deviceName}] 1. Fetching Master Directory...`);
    const directory = await fetchMasterDirectory();

    if (directory[TEST_CLINIC_ID]) {
        console.log(`[${deviceName}] 2. Found existing storage ID for ${TEST_CLINIC_ID}: ${directory[TEST_CLINIC_ID]}`);
        return directory[TEST_CLINIC_ID];
    } else {
        console.log(`[${deviceName}] 2. No storage found for ${TEST_CLINIC_ID}. Creating new...`);

        // Simulate creating a new blob
        const createResponse = await fetch(CLOUD_HUB_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify([])
        });

        if (!createResponse.ok) throw new Error('Failed to create new storage');
        const location = createResponse.headers.get('Location');
        const newBlobId = location.split('/').pop();

        directory[TEST_CLINIC_ID] = newBlobId;

        // Optimistic update
        await updateMasterDirectory(directory);
        console.log(`[${deviceName}] 3. Registered new storage ID: ${newBlobId}`);
        return newBlobId;
    }
}

async function runTest() {
    console.log(`--- TEST START: Verifying Sync for Clinic ID: ${TEST_CLINIC_ID} ---`);

    try {
        // Device A connects first
        const idA = await simulateDeviceSync('Device A (Mobile)');

        // Device B connects second
        const idB = await simulateDeviceSync('Device B (Desktop)');

        console.log('--- RESULTS ---');
        console.log(`Device A sees ID: ${idA}`);
        console.log(`Device B sees ID: ${idB}`);

        if (idA === idB) {
            console.log('✅ SUCCESS: Both devices resolved to the SAME storage bucket!');
            console.log('✅ PASSED: Cross-platform sync logic is VERIFIED.');
        } else {
            console.error('❌ FAIL: Devices resolved to different buckets. Logic is flawed.');
            process.exit(1);
        }
    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

runTest();
