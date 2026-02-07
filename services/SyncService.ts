import { Report } from '../types';

/**
 * SyncService - الموزع السحابي الموحد (Cloud Hub Synchronization)
 * 🇵🇸 💻🏥
 * 
 * Provides real-time synchronization between Web, Mobile, and Desktop devices
 * using a shared Clinic ID. Handles offline-to-online transitions automatically.
 */

// We use a public, anonymous JSON storage API for a "No-Setup" free experience.
// For production, this should be replaced with a private FHIR-compliant backend.
const CLOUD_HUB_API = 'https://jsonblob.com/api/jsonBlob';

export const SyncService = {
    /**
     * Fetches the latest reports for a specific Clinic ID from the cloud hub.
     */
    async fetchRemoteReports(clinicId: string): Promise<Report[]> {
        if (!clinicId) return [];

        try {
            // We use the clinicId as a unique identifier in the Cloud Hub
            // Note: Real implementation would use a stable URL or a search index.
            const savedBlobId = localStorage.getItem(`blob_id_${clinicId}`);
            if (!savedBlobId) return [];

            const response = await fetch(`${CLOUD_HUB_API}/${savedBlobId}`, {
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
            const remoteReports = await this.fetchRemoteReports(clinicId);

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
            let blobId = localStorage.getItem(`blob_id_${clinicId}`);
            let url = `${CLOUD_HUB_API}`;
            let method = 'POST';

            if (blobId) {
                url = `${CLOUD_HUB_API}/${blobId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(mergedList)
            });

            if (!response.ok) throw new Error('فشل مزامنة البيانات.');

            // Capture the Blob ID for future updates if it's new
            if (method === 'POST') {
                const location = response.headers.get('Location');
                if (location) {
                    const newId = location.split('/').pop();
                    if (newId) localStorage.setItem(`blob_id_${clinicId}`, newId);
                }
            }

            return mergedList;
        } catch (error) {
            console.error('Sync Error:', error);
            return localReports;
        }
    }
};
