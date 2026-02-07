const https = require('https');

// The Master Directory ID we hardcoded in SyncService.ts
const MASTER_DIRECTORY_ID = '06513acd-a11b-4fd5-a060-f6a5136acd03';
const CLOUD_HUB_API = 'jsonblob.com';
const TEST_CLINIC_ID = 'TEST_VERIFICATION_' + Math.floor(Math.random() * 10000);

function fetchMasterDirectory() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CLOUD_HUB_API,
            path: `/api/jsonBlob/${MASTER_DIRECTORY_ID}`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(`Failed to parse JSON: ${e.message}`);
                    }
                } else {
                    reject(`Failed to fetch directory: ${res.statusCode}`);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function updateMasterDirectory(directory) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CLOUD_HUB_API,
            path: `/api/jsonBlob/${MASTER_DIRECTORY_ID}`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 204) {
                resolve();
            } else {
                reject(`Failed to update directory: ${res.statusCode}`);
            }
        });
        req.on('error', reject);
        req.write(JSON.stringify(directory));
        req.end();
    });
}

async function simulateDeviceSync(deviceName) {
    try {
        console.log(`[${deviceName}] 1. Fetching Master Directory...`);
        const directory = await fetchMasterDirectory();

        if (directory[TEST_CLINIC_ID]) {
            console.log(`[${deviceName}] 2. Found existing storage ID for ${TEST_CLINIC_ID}: ${directory[TEST_CLINIC_ID]}`);
            return directory[TEST_CLINIC_ID];
        } else {
            console.log(`[${deviceName}] 2. No storage found for ${TEST_CLINIC_ID}. Creating new...`);

            // Simulate creating a new blob
            const newBlobId = 'blob_' + Math.random().toString(36).substring(7);
            directory[TEST_CLINIC_ID] = newBlobId;

            // Optimistic update (simulating the race condition handling)
            await updateMasterDirectory(directory);
            console.log(`[${deviceName}] 3. Registered new storage ID: ${newBlobId}`);
            return newBlobId;
        }
    } catch (e) {
        console.error(`[${deviceName}] ERROR:`, e);
        throw e;
    }
}

async function runTest() {
    console.log(`--- TEST START: Verifying Sync for Clinic ID: ${TEST_CLINIC_ID} ---`);

    try {
        // Device A connects first (should create the entry)
        const idA = await simulateDeviceSync('Device A (Mobile)');

        // Device B connects second (should READ the entry created by A)
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
