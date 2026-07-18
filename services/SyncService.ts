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
    const match = url.match(/\/api\/jsonBlob\/([a-z0-9-]+)/);
    const blobId = match ? match[1] : null;

    if (blobId) {
        return `/api/sync/${blobId}${timestamp}`;
    }

    // Fallback
    return url + timestamp;
};

// 🇵🇸 GLOBAL UNIVERSAL STORAGE ID (Migrated back to jsonblob for stability)
const UNIVERSAL_STORAGE_ID = '019f75df-b46b-753a-82e8-da3d64160565';
const STORAGE_URL = `https://jsonblob.com/api/jsonBlob/${UNIVERSAL_STORAGE_ID}`;

export const SyncService = {
    lastSyncTime: 0,
    isSyncing: false,

    /**
     * Fetches reports directly from the Universal Storage.
     */
    async fetchRemoteReports(clinicId: string): Promise<Report[]> {
        if (!clinicId) return [];

        try {
            const response = await fetch(getProxiedUrl(STORAGE_URL));
            if (!response.ok) throw new Error('فشل الاتصال بالمخزن السحابي');

            const rootData = await response.json();
            const allData = rootData.data || {};
            // Data structure is { "clinicId": [reports], ... }

            const clinicData = allData[clinicId];
            if (Array.isArray(clinicData)) {
                return clinicData;
            }
            return [];

        } catch (error: any) {
            if (error.message && error.message.includes('429')) return []; // Ignore rate limits silently
            // Return empty if offline or error, so app continues locally
            return [];
        }
    },

    /**
     * Syncs local reports to the Universal Storage.
     * Includes Cooldown/Throttling to prevent 429 Too Many Requests.
     */
    async syncToCloud(clinicId: string, localReports: Report[]): Promise<Report[]> {
        if (!clinicId || !navigator.onLine) return localReports;

        // 🇵🇸 FEATURE: Throttling & Debouncing
        // Prevent overlapping syncs and rapid sequential syncs (10s cooldown)
        if (SyncService.isSyncing) return localReports;
        const nowTime = Date.now();
        if (nowTime - SyncService.lastSyncTime < 10000) {
            console.log(`Sync throttled (Cooldown active). Try again in ${Math.ceil((10000 - (nowTime - SyncService.lastSyncTime))/1000)}s`);
            return localReports;
        }

        SyncService.isSyncing = true;

        try {
            // 1. Get current universal state
            const response = await fetch(getProxiedUrl(STORAGE_URL));
            let allData: Record<string, any> = {};

            if (response.ok) {
                const rootData = await response.json();
                allData = rootData.data || {};
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
            await fetch(getProxiedUrl(STORAGE_URL), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ data: allData })
            });

            SyncService.lastSyncTime = Date.now();
            return mergedList;

        } catch (error: any) {
            if (error.message && error.message.includes('429')) return localReports; // Ignore rate limits silently
            return localReports;
        } finally {
            SyncService.isSyncing = false;
        }
    },

    // Legacy method kept empty to prevent import errors if called elsewhere
    async resolveClinicBlobId(clinicId: string) { return null; }
};
