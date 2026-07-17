
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Patient, AnalysisResult, Report } from '../types';
import { SyncService } from '../services/SyncService';

interface ReportContextType {
    reports: Report[];
    clinicId: string;
    setClinicId: (id: string) => void;
    addReport: (patient: Patient, analysisResult: AnalysisResult, imagePreviews: string[], status?: 'processed' | 'pending_sync') => Report;
    updateReport: (id: string, updates: Partial<Report>) => void;
    getReportById: (id: string) => Report | undefined;
    importReport: (report: Report) => void;
    triggerSync: () => Promise<void>;
    isSyncing: boolean;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);



export const ReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [clinicId, setClinicId] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial async load
    useEffect(() => {
        import('../services/StorageService').then(({ getData, StorageKeys }) => {
            Promise.all([
                getData<Report[]>(StorageKeys.REPORTS, []),
                getData<string>(StorageKeys.CLINIC_ID, '')
            ]).then(([savedReports, savedClinicId]) => {
                setReports(savedReports);
                setClinicId(savedClinicId);
                setIsLoaded(true);
            });
        });
    }, []);

    // Save to localForage
    useEffect(() => {
        if (!isLoaded) return;
        import('../services/StorageService').then(({ setData, StorageKeys }) => {
            setData(StorageKeys.REPORTS, reports);
        });
    }, [reports, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        import('../services/StorageService').then(({ setData, StorageKeys }) => {
            setData(StorageKeys.CLINIC_ID, clinicId);
        });
    }, [clinicId, isLoaded]);

    // Background Sync Logic
    const triggerSync = async () => {
        if (!clinicId || !navigator.onLine || isSyncing) return;
        setIsSyncing(true);
        try {
            const syncedReports = await SyncService.syncToCloud(clinicId, reports);
            // Deduplicate and merge
            setReports(syncedReports);
        } catch (e) {
            console.error("Sync Trigger Error:", e);
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync every 30 seconds if online
    useEffect(() => {
        const interval = setInterval(() => {
            if (clinicId && navigator.onLine) triggerSync();
        }, 30000);
        return () => clearInterval(interval);
    }, [clinicId, reports]);

    // 🇵🇸 FEATURE: Immediate Sync on Reconnection
    // Triggers upload as soon as internet comes back
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Network Restored: Triggering Sync...');
            if (clinicId) triggerSync();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [clinicId]);

    const addReport = (patient: Patient, analysisResult: AnalysisResult, imagePreviews: string[], status: 'processed' | 'pending_sync' = 'processed'): Report => {
        const now = new Date().toISOString();
        const newReport: Report = {
            id: `report_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`,
            patientName: patient.name,
            patientAge: patient.age,
            symptoms: patient.symptoms,
            detailedSymptoms: patient.detailedSymptoms,
            notes: patient.notes,
            location: patient.location,
            analysisResult,
            imagePreviews,
            createdAt: now,
            updatedAt: now,
            status: status,
            syncStatus: clinicId ? 'pending' : 'local_only',
            clinicId: clinicId || undefined
        };
        setReports(prevReports => [newReport, ...prevReports]);
        return newReport;
    };

    const updateReport = (id: string, updates: Partial<Report>) => {
        const now = new Date().toISOString();
        setReports(prevReports =>
            prevReports.map(report =>
                report.id === id ? {
                    ...report,
                    ...updates,
                    updatedAt: now,
                    syncStatus: clinicId ? 'pending' : 'local_only'
                } : report
            )
        );
    };

    const getReportById = (id: string): Report | undefined => {
        return reports.find(report => report.id === id);
    };

    const importReport = (report: Report) => {
        const now = new Date().toISOString();
        const importedReport: Report = {
            ...report,
            updatedAt: now,
            syncStatus: 'synced', // Mark as synced since it came from another device
            notes: (report.notes || '') + ' [تم الاستلام عبر النقل المباشر]',
            status: 'processed' as const
        };
        setReports(prevReports => {
            // Check if already exists to prevent duplicates
            if (prevReports.some(r => r.id === report.id)) return prevReports;
            return [importedReport, ...prevReports];
        });
    };

    return (
        <ReportContext.Provider value={{
            reports,
            clinicId,
            setClinicId,
            addReport,
            updateReport,
            getReportById,
            importReport,
            triggerSync,
            isSyncing
        }}>
            {children}
        </ReportContext.Provider>
    );
};

export const useReports = () => {
    const context = useContext(ReportContext);
    if (context === undefined) {
        throw new Error('useReports must be used within a ReportProvider');
    }
    return context;
};