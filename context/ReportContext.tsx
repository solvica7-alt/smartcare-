
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Patient, AnalysisResult, Report } from '../types';

interface ReportContextType {
  reports: Report[];
  addReport: (patient: Patient, analysisResult: AnalysisResult, imagePreviews: string[], status?: 'processed' | 'pending_sync') => Report;
  updateReport: (id: string, updates: Partial<Report>) => void;
  getReportById: (id: string) => Report | undefined;
  importReport: (report: Report) => void;
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

    useEffect(() => {
        try {
            localStorage.setItem('reports', JSON.stringify(reports));
        } catch (error) {
            console.error("Failed to save reports to localStorage", error);
        }
    }, [reports]);

    const addReport = (patient: Patient, analysisResult: AnalysisResult, imagePreviews: string[], status: 'processed' | 'pending_sync' = 'processed'): Report => {
        const newReport: Report = {
            id: `report_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`,
            patientName: patient.name,
            patientAge: patient.age,
            symptoms: patient.symptoms,
            detailedSymptoms: patient.detailedSymptoms,
            notes: patient.notes,
            analysisResult,
            imagePreviews, // Note: In a real PWA, base64 strings might fill LocalStorage quota. IndexedDB is better for images.
            createdAt: new Date().toISOString(),
            status: status
        };
        setReports(prevReports => [newReport, ...prevReports]);
        return newReport;
    };

    const updateReport = (id: string, updates: Partial<Report>) => {
        setReports(prevReports => 
            prevReports.map(report => 
                report.id === id ? { ...report, ...updates } : report
            )
        );
    };

    const getReportById = (id: string): Report | undefined => {
        return reports.find(report => report.id === id);
    };

    const importReport = (report: Report) => {
        // Generate a new ID to avoid collisions if imported multiple times
        const importedReport = {
            ...report,
            id: `imported_${new Date().getTime()}_${Math.random().toString(36).substring(2, 5)}`,
            notes: (report.notes || '') + ' [تم الاستلام عبر النقل المباشر]',
            status: 'processed' as const
        };
        setReports(prevReports => [importedReport, ...prevReports]);
    };

    return (
        <ReportContext.Provider value={{ reports, addReport, updateReport, getReportById, importReport }}>
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