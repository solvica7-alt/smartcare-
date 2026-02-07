import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { ArrowLeftIcon, CpuChipIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AIReportViewPage: React.FC = () => {
    const { reportId } = useParams();
    const { reports } = useReports();
    const navigate = useNavigate();

    const report = reports.find(r => r.id === reportId);

    if (!report) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl text-red-600">التقرير غير موجود</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-600">عودة</button>
            </div>
        );
    }

    const { analysisResult } = report;

    return (
        <div className="max-w-4xl mx-auto p-4" dir="rtl">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition"
            >
                <ArrowLeftIcon className="h-5 w-5 me-2" />
                عودة للقائمة
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <CpuChipIcon className="h-8 w-8 text-blue-200" />
                        <h1 className="text-2xl font-bold">تقرير الذكاء الاصطناعي</h1>
                    </div>
                    <p className="opacity-90">تحليل محفوظ للحالة: {report.patientName}</p>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {/* Triage Status */}
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">توصية الفرز (Triage)</h3>
                            <div className={`text-3xl font-bold ${getTriageColorClass(analysisResult.triage_color)}`}>
                                {analysisResult.triage_color.toUpperCase()}
                            </div>
                        </div>
                        {analysisResult.risk_level && (
                            <div className="flex-1 border-r border-gray-200 dark:border-gray-600 mr-6 pr-6">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">مستوى الخطورة</h3>
                                <div className="text-xl font-medium text-gray-800 dark:text-gray-200">
                                    {analysisResult.risk_level}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Findings */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center">
                            <span className="w-1 h-6 bg-blue-500 rounded-full me-2"></span>
                            النتائج والملاحظات
                        </h3>
                        <div className="prose dark:prose-invert max-w-none bg-blue-50/50 dark:bg-gray-700/30 p-6 rounded-lg leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {analysisResult.findings}
                        </div>
                    </div>

                    {/* Red Flags / Warnings */}
                    {analysisResult.red_flags && analysisResult.red_flags.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-3 flex items-center">
                                <ExclamationTriangleIcon className="h-6 w-6 me-2" />
                                علامات تحذيرية (Red Flags)
                            </h3>
                            <ul className="space-y-2">
                                {analysisResult.red_flags.map((flag, idx) => (
                                    <li key={idx} className="flex items-start text-red-600 dark:text-red-300 font-medium bg-red-50 dark:bg-red-900/10 p-3 rounded-md">
                                        <span className="me-2">•</span>
                                        {flag}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for colors
const getTriageColorClass = (color: string) => {
    switch (color) {
        case 'red': return 'text-red-600';
        case 'yellow': return 'text-yellow-600';
        case 'green': return 'text-green-600';
        case 'black': return 'text-gray-900 dark:text-white';
        default: return 'text-gray-500';
    }
};

export default AIReportViewPage;
