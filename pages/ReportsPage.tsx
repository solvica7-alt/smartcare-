
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { Report, AnalysisResult } from '../types';
import { analyzeMedicalImage } from '../services/geminiService';
import { MagnifyingGlassIcon, QrCodeIcon, PrinterIcon, ArrowPathIcon, CloudArrowUpIcon, ShareIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import QRCode from 'react-qr-code';

const ReportsPage: React.FC = () => {
    const { reports, updateReport } = useReports();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeQr, setActiveQr] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const pendingReports = reports.filter(r => r.status === 'pending_sync');

    const filteredReports = reports.filter(report => {
        const term = searchTerm.toLowerCase();
        return (
            report.patientName.toLowerCase().includes(term) ||
            report.symptoms.some(s => s.toLowerCase().includes(term))
        );
    });

    const toggleQr = (id: string) => {
        if (activeQr === id) setActiveQr(null);
        else setActiveQr(id);
    };

    const printReport = () => {
        window.print();
    };

    const handleShareOffline = (id: string) => {
        navigate('/transfer', { state: { selectedReportId: id } });
    }

    const handleSync = async () => {
        if (!isOnline || pendingReports.length === 0) return;
        setIsSyncing(true);

        for (const report of pendingReports) {
            try {
                // Prepare data for analysis
                const patientData = {
                    name: report.patientName,
                    age: report.patientAge,
                    symptoms: report.symptoms,
                    detailedSymptoms: report.detailedSymptoms,
                    notes: report.notes,
                    location: report.location
                };

                const imagesPayload = report.imagePreviews.map(dataUrl => {
                    // Parse Data URL
                    const parts = dataUrl.split(',');
                    const mimeType = parts[0].split(':')[1].split(';')[0];
                    const data = parts[1];
                    return { data, mimeType };
                });

                const result: AnalysisResult = await analyzeMedicalImage(imagesPayload, patientData);

                // Update report
                updateReport(report.id, {
                    analysisResult: result,
                    status: 'processed'
                });

            } catch (error) {
                console.error(`Failed to sync report ${report.id}`, error);
                // TODO: Handle sync error
            }
        }
        setIsSyncing(false);
    };

    return (
        <div className="max-w-7xl mx-auto" dir="rtl">
            <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">قائمة التقارير</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">عرض جميع الحالات المسجلة وتحليلاتها الأولية.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-2 items-end md:items-center">
                    {/* Sync Button */}
                    {pendingReports.length > 0 && (
                        <button
                            onClick={handleSync}
                            disabled={!isOnline || isSyncing}
                            className={`flex items-center px-4 py-2 rounded-lg text-white font-semibold transition ${isOnline
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : 'bg-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isSyncing ? (
                                <ArrowPathIcon className="h-5 w-5 animate-spin me-2" />
                            ) : (
                                <CloudArrowUpIcon className="h-5 w-5 me-2" />
                            )}
                            {isSyncing ? 'جاري المزامنة...' : `مزامنة ${pendingReports.length} حالة معلقة`}
                        </button>
                    )}

                    <button onClick={printReport} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white p-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        <PrinterIcon className="h-6 w-6" />
                    </button>
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="بحث باسم المريض..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {reports.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">اسم المريض</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">العمر</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">نتائج تحليل الذكاء الاصطناعي</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الفرز (START)</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">QR Code</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">عرض</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report: Report) => (
                                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{report.patientName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{report.patientAge}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                                                {report.analysisResult.findings ? (
                                                    <Link
                                                        to={`/ai-report/${report.id}`}
                                                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full text-xs font-bold transition"
                                                    >
                                                        <CpuChipIcon className="h-4 w-4 me-1" />
                                                        عرض تقرير الذكاء الاصطناعي
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">لا توجد نتائج</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTriageBadgeClass(report.analysisResult.triage_color)}`}>
                                                    {report.analysisResult.triage_color === 'gray' ? 'بانتظار التحليل' : report.analysisResult.triage_color.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap relative flex gap-2">
                                                <button onClick={() => toggleQr(report.id)} className="text-gray-500 hover:text-blue-600" title="QR سريع">
                                                    <QrCodeIcon className="h-6 w-6" />
                                                </button>
                                                <button onClick={() => handleShareOffline(report.id)} className="text-gray-500 hover:text-green-600" title="نقل الحالة أوفلاين">
                                                    <ShareIcon className="h-6 w-6" />
                                                </button>
                                                {activeQr === report.id && (
                                                    <div className="absolute top-10 right-0 z-10 bg-white p-4 shadow-xl border rounded-lg flex flex-col items-center w-48">
                                                        <QRCode
                                                            value={`SMARTCARE REPORT
------------------------------
Name: ${report.patientName.split('').map(c => ({ 'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'A', 'ى': 'A', 'ب': 'B', 'ت': 'T', 'ث': 'TH', 'ج': 'J', 'ح': 'H', 'خ': 'KH', 'د': 'D', 'ذ': 'TH', 'ر': 'R', 'ز': 'Z', 'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'A', 'غ': 'GH', 'ف': 'F', 'ق': 'Q', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ه': 'H', 'و': 'W', 'ي': 'Y', 'ة': 'H', ' ': ' ' })[c] || c).join('').toUpperCase()}
Age: ${report.patientAge}
Triage: ${report.analysisResult.triage_color.toUpperCase()}
ID: REF-${report.id.split('_')[1] || report.id}`}
                                                            size={150}
                                                            level="L"
                                                            fgColor="#000000"
                                                            bgColor="#FFFFFF"
                                                        />
                                                        <span className="text-[10px] text-gray-500 mt-2">ID: {report.id.slice(0, 8)}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link to={`/chat/${report.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 block mb-1">عرض الملف</Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            لا توجد نتائج تطابق بحثك.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center bg-white dark:bg-gray-800 p-12 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">لا توجد تقارير مسجلة</h2>
                    <Link to="/new-patient" className="mt-6 inline-block bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition">
                        تسجيل مريض جديد
                    </Link>
                </div>
            )}
        </div>
    );
};

const getTriageBadgeClass = (color: string) => {
    switch (color) {
        case 'red': return 'bg-red-100 text-red-800 border border-red-200';
        case 'yellow': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        case 'green': return 'bg-green-100 text-green-800 border border-green-200';
        case 'black': return 'bg-gray-800 text-white border border-gray-900';
        case 'gray': return 'bg-gray-200 text-gray-800 border border-gray-300';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default ReportsPage;