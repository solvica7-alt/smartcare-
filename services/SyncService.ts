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

// 🇵🇸 Proxy Helper: Uses Vite proxy locally or Netlify/Vercel proxy in production
const getProxiedUrl = (url: string) => {
    // Add timestamp to prevent caching
    const timestamp = '?t=' + Date.now();

    // Use local proxy rule: /api/sync/ID
    const match = url.match(/\/jsonBlob\/([a-z0-9-]+)/);
    const blobId = match ? match[1] : null;

    if (blobId) {
        return `/api/sync/${blobId}${timestamp}`;
    }

    // Fallback
    return url + timestamp;
};

// 🇵🇸 GLOBAL UNIVERSAL STORAGE ID
// We store ALL clinics in ONE big JSON object: { "clinicId": [reports...], "anotherId": [...] }
const UNIVERSAL_STORAGE_ID = '019f710b-6834-755c-bcac-70bfb1b698ad';
const STORAGE_URL = `https://jsonblob.com/api/jsonBlob/${UNIVERSAL_STORAGE_ID}`;

export const SyncService = {
    /**
     * Fetches reports directly from the Universal Storage.
     */
    async fetchRemoteReports(clinicId: string): Promise<Report[]> {
        if (!clinicId) return [];

        try {
            const response = await fetch(getProxiedUrl(STORAGE_URL));
            if (!response.ok) throw new Error('فشل الاتصال بالمخزن السحابي');

            const allData = await response.json();
            // Data structure is { "clinicId": [reports], ... }
            // If clinicId is strictly mapped to a blobId string (legacy), we handle that too, 
            // but we are checking if it's an ARRAY of reports.

            const clinicData = allData[clinicId];
            if (Array.isArray(clinicData)) {
                return clinicData;
            }
            return [];

        } catch (error) {
            console.error('Fetch Error:', error);
            // Return empty if offline or error, so app continues locally
            return [];
        }
    },

    /**
     * Syncs local reports to the Universal Storage.
     */
    async syncToCloud(clinicId: string, localReports: Report[]): Promise<Report[]> {
        if (!clinicId || !navigator.onLine) return localReports;

        try {
            // 1. Get current universal state
            const response = await fetch(getProxiedUrl(STORAGE_URL));
            let allData: Record<string, any> = {};

            if (response.ok) {
                allData = await response.json();
            }

            // 2. Extract THIS clinic's existing remote reports
            let remoteReports: Report[] = [];
            if (Array.isArray(allData[clinicId])) {
                remoteReports = allData[clinicId];
            }

            // 3. Merge Strategy (Last Write Wins)
            const reportMap = new Map<string, Report>();

            // Add remote ones first
            remoteReports.forEach(r => reportMap.set(r.id, r));

            // Merge local ones
            localReports.forEach(local => {
                const remote = reportMap.get(local.id);
                // If local is newer or remote doesn't exist
                if (!remote || new Date(local.updatedAt) > new Date(remote.updatedAt)) {
                    reportMap.set(local.id, { ...local, syncStatus: 'synced' });
                }
            });

            const mergedList = Array.from(reportMap.values());

            // 4. Update the Universal Object
            allData[clinicId] = mergedList;

            // 5. Save back to Cloud (PUT)
            // Note: This replaces the whole blob. In a real backend, we'd patch.
            // But for jsonblob, we must PUT the whole updated JSON.
            await fetch(getProxiedUrl(STORAGE_URL), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(allData)
            });

            return mergedList;

        } catch (error) {
            console.error('Sync Error:', error);
            return localReports;
        }
    },

    // Legacy method kept empty to prevent import errors if called elsewhere
    async resolveClinicBlobId(clinicId: string) { return null; }
};
