import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import localforage from 'localforage';
import { Patient, AnalysisResult, Report } from '../types';
import { SyncService } from '../services/SyncService';
import { analyzeMedicalImage } from '../services/geminiService';

localforage.config({
    name: 'SmartCareDB',
    storeName: 'reports_store'
});

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
    isProcessingOffline: boolean;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const ReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [clinicId, setClinicId] = useState(() => localStorage.getItem('clinicId') || '');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isProcessingOffline, setIsProcessingOffline] = useState(false);
    const processingRef = useRef(false);

    // Initial Load from localForage
    useEffect(() => {
        const loadData = async () => {
            try {
                // Migrate from localStorage to localforage if needed
                const oldReports = localStorage.getItem('reports');
                if (oldReports) {
                    const parsed = JSON.parse(oldReports);
                    await localforage.setItem('reports', parsed);
                    localStorage.removeItem('reports');
                    setReports(parsed);
                } else {
                    const savedReports = await localforage.getItem<Report[]>('reports');
                    if (savedReports) {
                        setReports(savedReports);
                    }
                }
            } catch (error) {
                console.error("Failed to load reports from localForage", error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadData();
    }, []);

    // Save to localForage on change
    useEffect(() => {
        if (isLoaded) {
            localforage.setItem('reports', reports).catch(console.error);
        }
    }, [reports, isLoaded]);

    useEffect(() => {
        localStorage.setItem('clinicId', clinicId);
    }, [clinicId]);

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

    const processOfflineQueue = async () => {
        if (!navigator.onLine || processingRef.current) return;
        
        processingRef.current = true;
        setIsProcessingOffline(true);
        
        try {
            // Find reports that were saved offline
            const pendingReports = reports.filter(r => r.status === 'pending_sync');
            
            if (pendingReports.length > 0) {
                console.log(`Processing ${pendingReports.length} offline reports via AI...`);
                let hasUpdates = false;
                const newReports = [...reports];

                for (let i = 0; i < pendingReports.length; i++) {
                    const report = pendingReports[i];
                    try {
                        // Reconstruct image formats
                        const base64Images = report.imagePreviews.map(preview => {
                            const match = preview.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
                            if (match) {
                                return { mimeType: match[1], data: match[2] };
                            }
                            return null;
                        }).filter(img => img !== null) as { mimeType: string, data: string }[];

                        const patientInfo: Patient = {
                            name: report.patientName,
                            age: report.patientAge,
                            symptoms: report.symptoms,
                            detailedSymptoms: report.detailedSymptoms,
                            notes: report.notes,
                            location: report.location
                        };

                        const analysisResult = await analyzeMedicalImage(base64Images, patientInfo);
                        
                        // Update report in array
                        const index = newReports.findIndex(r => r.id === report.id);
                        if (index !== -1) {
                            newReports[index] = {
                                ...newReports[index],
                                analysisResult,
                                status: 'processed',
                                updatedAt: new Date().toISOString(),
                                syncStatus: clinicId ? 'pending' : 'local_only'
                            };
                            hasUpdates = true;
                        }
                    } catch (err) {
                        console.error(`Failed to process offline report ${report.id}:`, err);
                    }
                }

                if (hasUpdates) {
                    setReports(newReports);
                    if (clinicId) {
                        setTimeout(() => triggerSync(), 1000);
                    }
                }
            }
        } finally {
            processingRef.current = false;
            setIsProcessingOffline(false);
        }
    };

    // Auto-sync every 30 seconds if online
    useEffect(() => {
        const interval = setInterval(() => {
            if (navigator.onLine) {
                processOfflineQueue();
                if (clinicId) triggerSync();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [clinicId, reports]);

    // Immediate Sync on Reconnection
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Network Restored: Triggering Sync and Processing...');
            processOfflineQueue();
            if (clinicId) triggerSync();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
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
        
        // If created online and has clinicId, sync immediately
        if (navigator.onLine && clinicId && status === 'processed') {
            setTimeout(() => triggerSync(), 500);
        }
        
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
        
        if (navigator.onLine && clinicId) {
            setTimeout(() => triggerSync(), 500);
        }
    };

    const getReportById = (id: string): Report | undefined => {
        return reports.find(report => report.id === id);
    };

    const importReport = (report: Report) => {
        const now = new Date().toISOString();
        const importedReport: Report = {
            ...report,
            updatedAt: now,
            syncStatus: clinicId ? 'pending' : 'local_only', 
            notes: (report.notes || '') + ' [تم الاستلام عبر النقل المباشر]',
            status: 'processed' as const,
            clinicId: clinicId || undefined
        };
        setReports(prevReports => {
            if (prevReports.some(r => r.id === report.id)) return prevReports;
            return [importedReport, ...prevReports];
        });
        
        if (navigator.onLine && clinicId) {
            setTimeout(() => triggerSync(), 500);
        }
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
            isSyncing,
            isProcessingOffline
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
