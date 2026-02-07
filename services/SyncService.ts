import { Report } from '../types';

/**
 * SyncService - الموزع السحابي الموحد (Cloud Hub Synchronization)
 * 🇵🇸 💻🏥
 * 
 * Provides real-time synchronization between Web, Mobile, and Desktop devices
 * using a shared Clinic ID. Handles offline-to-online transitions automatically.
 * 
 * NOTE: The Clinic ID can be ANY string or number (e.g., "GAZA-1", "12345", "UNIT-7").
 * All devices sharing the SAME ID will automatically see each other's reports.
 */

// We use a public, anonymous JSON storage API for a "No-Setup" free experience.
// For production, this should be replaced with a private FHIR-compliant backend.
// We use a public, anonymous JSON storage API for a "No-Setup" free experience.
// For production, this should be replaced with a private FHIR-compliant backend.
const CLOUD_HUB_API = 'https://jsonblob.com/api/jsonBlob';

// 🇵🇸 GLOBAL MASTER DIRECTORY ID (The "DNS" for Clinics)
// This blob stores the mapping: { "clinicId": "blobId" }
// Generated via script: 06513acd-a11b-4fd5-a060-f6a5136acd03
const MASTER_DIRECTORY_ID = '06513acd-a11b-4fd5-a060-f6a5136acd03';

export const SyncService = {
    /**
     * Resolves the storage Blob ID for a given Clinic ID using the Master Directory.
     * If not found, it creates a new storage blob and registers it.
     */
    async resolveClinicBlobId(clinicId: string): Promise<string | null> {
        try {
            // 1. Check local cache first
            const cachedId = localStorage.getItem(`cloud_hub_blob_${clinicId}`);
            if (cachedId) return cachedId;

            // 2. Fetch Master Directory
            const dirResponse = await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`);
            if (!dirResponse.ok) throw new Error('Failed to fetch Master Directory');

            const directory = await dirResponse.json();

            // 3. Check if Clinic ID exists
            if (directory[clinicId]) {
                const blobId = directory[clinicId];
                localStorage.setItem(`cloud_hub_blob_${clinicId}`, blobId);
                return blobId;
            }

            // 4. If new, create a valid storage blob
            const createResponse = await fetch(CLOUD_HUB_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify([]) // Initialize with empty array
            });

            if (!createResponse.ok) throw new Error('Failed to create new Clinic Storage');

            const location = createResponse.headers.get('Location');
            if (!location) throw new Error('No Location header in creation response');

            const newBlobId = location.split('/').pop();
            if (!newBlobId) throw new Error('Invalid Blob ID');

            // 5. Register in Master Directory (Optimistic update)
            // Note: In high traffic, this needs a read-modify-write loop with ETag, 
            // but for this scale, simple PUT is acceptable "Free" solution.
            directory[clinicId] = newBlobId;

            await fetch(`${CLOUD_HUB_API}/${MASTER_DIRECTORY_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(directory)
            });

            localStorage.setItem(`cloud_hub_blob_${clinicId}`, newBlobId);
            return newBlobId;

        } catch (error) {
            console.error('Resolve Error:', error);
            // Fallback: If Master fails, use local-only mode or try again later
            return null;
        }
    },

    /**
     * Fetches the latest reports for a specific Clinic ID from the cloud hub.
     */
    async fetchRemoteReports(clinicId: string): Promise<Report[]> {
        if (!clinicId) return [];

        try {
            const blobId = await this.resolveClinicBlobId(clinicId);
            if (!blobId) return [];

            const response = await fetch(`${CLOUD_HUB_API}/${blobId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error('فشل الاتصال بالموزع السحابي.');
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch Error:', error);
            return [];
        }
    },

    /**
     * Pushes local reports to the cloud hub.
     * Merges with existing cloud data based on timestamps (LWW - Last Write Wins).
     */
    async syncToCloud(clinicId: string, localReports: Report[]): Promise<Report[]> {
        if (!clinicId || !navigator.onLine) return localReports;

        try {
            const blobId = await this.resolveClinicBlobId(clinicId);
            if (!blobId) return localReports;

            // Fetch current remote state to merge
            const response = await fetch(`${CLOUD_HUB_API}/${blobId}`);
            let remoteReports: Report[] = [];
            if (response.ok) {
                remoteReports = await response.json();
            }

            // Create a map for easy merging
            const reportMap = new Map<string, Report>();

            // Add remote ones first
            remoteReports.forEach(r => reportMap.set(r.id, r));

            // Merge local ones (Last Write Wins)
            localReports.forEach(local => {
                const remote = reportMap.get(local.id);
                if (!remote || new Date(local.updatedAt) > new Date(remote.updatedAt)) {
                    reportMap.set(local.id, { ...local, syncStatus: 'synced' });
                }
            });

            const mergedList = Array.from(reportMap.values());

            // Persist to Cloud Hub
            await fetch(`${CLOUD_HUB_API}/${blobId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(mergedList)
            });

            return mergedList;
        } catch (error) {
            console.error('Sync Error:', error);
            return localReports;
        }
    }
};
