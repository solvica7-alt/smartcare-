// Comprehensive Diagnostic Script for Sync Failure
// 🇵🇸 💻🏥

const CLOUD_HUB_API = 'https://jsonblob.com/api/jsonBlob';
const MASTER_DIRECTORY_ID = '019c3a0d-c841-7c2b-9589-47f4fd455ac5';
const TEST_CLINIC_ID = 'DIAGNOSTIC_' + Math.floor(Math.random() * 100000);

async function log(step, message, data = null) {
    console.log(`\n[${step}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
}

async function runDiagnosis() {
    try {
        log('INIT', `Starting diagnosis for Clinic ID: ${TEST_CLINIC_ID}`);

        // 1. Connectivity Check
        log('STEP 1', 'Checking connectivity to Cloud Hub API...');
        const initCheck = await fetch(CLOUD_HUB_API, { method: 'POST', body: '[]', headers: { 'Content-Type': 'application/json' } });
        if (!initCheck.ok) throw new Error(`Connectivity failed: ${initCheck.status}`);
        log('STEP 1', 'Connectivity CONFIRMED.');

        // 2. Fetch Master Directory
        log('STEP 2', `Fetching Master Directory (${MASTER_DIRECTORY_ID})...`);
        const dirRes = await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`);
        if (!dirRes.ok) throw new Error(`Failed to fetch Master Directory: ${dirRes.status}`);
        const directory = await dirRes.json();
        log('STEP 2', 'Master Directory fetched successfully.', { entries: Object.keys(directory).length });

        // 3. Simulate Device A Registration
        log('STEP 3', 'Device A: Attempting to resolve/register Clinic ID...');
        let blobIdA;
        if (directory[TEST_CLINIC_ID]) {
            blobIdA = directory[TEST_CLINIC_ID];
            log('STEP 3', 'Found existing ID (Unexpected for new test)', { blobIdA });
        } else {
            // Create new blob
            const createRes = await fetch(CLOUD_HUB_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify([])
            });
            if (!createRes.ok) throw new Error('Device A: Failed to create storage blob');
            const loc = createRes.headers.get('Location');
            blobIdA = loc.split('/').pop();

            // Update Master
            directory[TEST_CLINIC_ID] = blobIdA;
            const updateRes = await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(directory)
            });
            if (!updateRes.ok) throw new Error(`Device A: Failed to update Master Directory: ${updateRes.status}`);
            log('STEP 3', 'Device A: Registered new storage.', { blobIdA });
        }

        // 4. Simulate Device B Resolution (Immediate Follow-up)
        log('STEP 4', 'Device B: Attempting to resolve SAME Clinic ID...');
        const dirResB = await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`);
        const directoryB = await dirResB.json();

        if (directoryB[TEST_CLINIC_ID] === blobIdA) {
            log('STEP 4', 'SUCCESS: Device B resolved to the SAME Blob ID.', { idFromB: directoryB[TEST_CLINIC_ID] });
        } else {
            log('STEP 4', 'FAILURE: Device B see different or no ID!', {
                expected: blobIdA,
                actual: directoryB[TEST_CLINIC_ID]
            });
            throw new Error('Sync Logic Mismatch detected.');
        }

        // 5. Data Write/Read Test
        log('STEP 5', 'Testing Data Persistence (Write from A, Read from B)...');
        const testData = [{ id: 'rpt_1', patientName: 'Test Patient', updatedAt: new Date().toISOString() }];

        // Write A
        await fetch(`${CLOUD_HUB_API}/${blobIdA}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        // Read B
        const readResB = await fetch(`${CLOUD_HUB_API}/${blobIdA}`);
        const dataB = await readResB.json();

        if (dataB.length === 1 && dataB[0].id === 'rpt_1') {
            log('STEP 5', 'SUCCESS: Data synced correctly between devices.');
        } else {
            throw new Error('Data persistence failed.');
        }

        console.log('\n✅ DIAGNOSIS RESULT: SYSTEM IS HEALTHY. NO LOGIC ERRORS FOUND.');

    } catch (e) {
        console.error('\n❌ DIAGNOSIS FAILED:', e.message);
        if (e.stack) console.error(e.stack);
        process.exit(1);
    }
}

runDiagnosis();
