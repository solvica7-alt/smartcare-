
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Patient, AnalysisResult, Report } from '../types';
import { SyncService } from '../services/SyncService';
import { analyzeMedicalImage, generateCrisisAnalysis, generateInventorySuggestion, compareMedicalImages } from '../services/geminiService';

interface ReportContextType {
    reports: Report[];
    clinicId: string;
    setClinicId: (id: string) => void;
    addReport: (patient: Patient, analysisResult: AnalysisResult, imagePreviews: string[], status?: 'processed' | 'pending_sync' | 'pending_analysis') => Report;
    updateReport: (id: string, updates: Partial<Report>) => void;
    deleteReport: (id: string) => void;
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

    // Removed auto-sync interval to permanently prevent 429 Too Many Requests.
    // Sync will now only happen manually via the Cloud Hub UI or on specific triggers.

    // 🇵🇸 FEATURE: Background AI Queue Worker
    const processOfflineQueue = async () => {
        const pendingReports = reports.filter(r => r.status === 'pending_analysis');
        if (pendingReports.length === 0) {
            if (clinicId) triggerSync();
            return;
        }

        console.log(`🧠 Background AI Worker: Processing ${pendingReports.length} offline reports...`);
        let updatedReports = [...reports];

        for (const report of pendingReports) {
            try {
                let finalFindings = report.analysisResult.findings;
                let finalColor = report.analysisResult.triage_color;
                let finalRisk = report.analysisResult.risk_level;

                const extractB64 = (preview: string) => {
                    if (!preview) return null;
                    const mimeType = preview.split(';')[0].split(':')[1];
                    const data = preview.split(',')[1];
                    return { data, mimeType };
                };

                if (report.patientName === "تقرير إدارة المخزون الذكي") {
                    finalFindings = await generateInventorySuggestion(updatedReports.filter(r => r.patientName !== "تقرير إدارة المخزون الذكي"));
                } else if (report.patientName === "تحليل تطوري للصور") {
                    if (report.imagePreviews.length >= 2) {
                        const oldImg = extractB64(report.imagePreviews[0]);
                        const newImg = extractB64(report.imagePreviews[1]);
                        if (oldImg && newImg) {
                            finalFindings = await compareMedicalImages(oldImg, newImg, "Patient wound evolution");
                        }
                    }
                } else if (report.patientName.startsWith("حالة أزمة:")) {
                    const desc = report.symptoms[1] || '';
                    const loc = report.location?.toString() || '';
                    const imgInfo = report.imagePreviews.length > 0 ? extractB64(report.imagePreviews[0]) : null;
                    const active = updatedReports.filter(r => r.status === 'processed' && !r.patientName.startsWith("حالة أزمة:"));
                    finalFindings = await generateCrisisAnalysis(active, desc, loc, imgInfo);
                } else {
                    // Standard Patient Form
                    const patientObj: Patient = {
                        name: report.patientName,
                        age: report.patientAge,
                        symptoms: report.symptoms,
                        detailedSymptoms: report.detailedSymptoms,
                        notes: report.notes,
                        location: report.location
                    };
                    const imagesInfo = report.imagePreviews.map(extractB64).filter(Boolean) as {data:string, mimeType:string}[];
                    const aiResult = await analyzeMedicalImage(imagesInfo, patientObj);
                    finalFindings = aiResult.findings;
                    finalColor = aiResult.triage_color;
                    finalRisk = aiResult.risk_level;
                }

                // Update report in array
                const index = updatedReports.findIndex(r => r.id === report.id);
                if (index !== -1) {
                    updatedReports[index] = {
                        ...updatedReports[index],
                        status: 'processed',
                        analysisResult: {
                            ...updatedReports[index].analysisResult,
                            findings: finalFindings,
                            triage_color: finalColor,
                            risk_level: finalRisk
                        },
                        updatedAt: new Date().toISOString()
                    };
                }
            } catch (err) {
                console.error(`Error processing AI for report ${report.id}:`, err);
            }
        }

        setReports(updatedReports);
        
        // After processing AI, trigger sync
        setTimeout(() => {
            if (clinicId) {
                SyncService.syncToCloud(clinicId, updatedReports).then(synced => {
                    setReports(synced);
                });
            }
        }, 1000);
    };

    // 🇵🇸 FEATURE: Immediate Sync & AI Processing on Reconnection
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Network Restored: Triggering AI Queue & Sync...');
            processOfflineQueue();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [reports, clinicId]);

    const addReport = (patient: Patient, analysisResult: AnalysisResult, imagePreviews: string[], status: 'processed' | 'pending_sync' | 'pending_analysis' = 'processed'): Report => {
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
        setReports(prevReports => {
            const updated = [newReport, ...prevReports];
            if (clinicId) {
                // Background sync trigger. Throttled safely by SyncService.
                setTimeout(() => {
                    SyncService.syncToCloud(clinicId, updated).then(synced => setReports(synced));
                }, 1000);
            }
            return updated;
        });
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

    const deleteReport = (id: string) => {
        setReports(prevReports => prevReports.filter(report => report.id !== id));
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
            deleteReport,
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