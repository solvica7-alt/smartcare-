
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
    const [reports, setReports] = useState<Report[]>(() => {
        try {
            const savedReports = localStorage.getItem('reports');
            return savedReports ? JSON.parse(savedReports) : [];
        } catch (error) {
            console.error("Failed to parse reports from localStorage", error);
            return [];
        }
    });

    const [clinicId, setClinicId] = useState(() => localStorage.getItem('clinicId') || '');
    const [isSyncing, setIsSyncing] = useState(false);

    // Save to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('reports', JSON.stringify(reports));
        } catch (error) {
            console.error("Failed to save reports to localStorage", error);
        }
    }, [reports]);

    useEffect(() => {
        localStorage.setItem('clinicId', clinicId);
    }, [clinicId]);

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