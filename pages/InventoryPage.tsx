import React, { useState, useEffect } from 'react';
import { useReports } from '../context/ReportContext';
import { generateInventorySuggestion } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/react/24/solid';
import { getData, setData, StorageKeys } from '../services/StorageService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface InventoryRecord {
    id: string;
    suggestion: string;
    timestamp: string;
}

const InventoryPage: React.FC = () => {
    const { reports, addReport } = useReports();
    const [suggestion, setSuggestion] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    // Derived history from global reports for Cloud Hub synchronization
    const history = reports
        .filter(r => r.patientName === "تقرير إدارة المخزون الذكي")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(r => ({
            id: r.id,
            suggestion: r.analysisResult.findings,
            timestamp: new Date(r.createdAt).toLocaleString('ar-SA')
        }));

    const handleGenerateSuggestion = async () => {
        setIsLoading(true);
        try {
            const patientData = {
                name: "تقرير إدارة المخزون الذكي",
                age: 0,
                symptoms: ["إدارة المخزون وتوقع الاحتياجات"],
                detailedSymptoms: "",
                notes: `تحليل بناءً على ${reports.length} تقارير حالية.`,
                location: "المخزن الطبي الرئيسي"
            };

            if (!navigator.onLine) {
                // 🇵🇸 FEATURE: Offline Queueing
                const offlineAnalysis = {
                    risk_level: "Info 🔵",
                    triage_color: "blue",
                    findings: "تم حفظ الطلب محلياً. سيتم إنشاء توصيات المخزون فور عودة الإنترنت.",
                    red_flags: ["انتظار التزامن السحابي"],
                    medical_recommendations: []
                };
                addReport(patientData, offlineAnalysis, [], 'pending_analysis');
                setSuggestion("تم حفظ الطلب محلياً. سيتم إنشاء توصيات المخزون فور عودة الإنترنت.");
                return;
            }

            const result = await generateInventorySuggestion(reports.filter(r => r.patientName !== "تقرير إدارة المخزون الذكي" && !r.patientName.startsWith("حالة أزمة:") && r.patientName !== "تحليل تطوري للصور"));
            setSuggestion(result);

            const analysisRes = {
                risk_level: "Info 🔵",
                triage_color: "blue",
                findings: result,
                red_flags: ["توصيات لطلب المعدات الناقصة"],
                medical_recommendations: []
            };
            
            addReport(patientData, analysisRes, [], 'processed');

        } catch (error) {
            setSuggestion("حدث خطأ أثناء تحليل المخزون.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">إدارة المخزون الطبي الذكية</h1>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                    <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-600 me-3" />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">التوصيات بناءً على الحالات الحالية</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">يقوم الذكاء الاصطناعي بتحليل إصابات {reports.length} مريض لتقدير الاحتياجات.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-8">
                        <LoadingSpinner message="جاري تحليل البيانات وتقدير الاحتياجات..." />
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
                         {reports.length === 0 ? (
                            <p className="text-center text-gray-500">لا توجد تقارير كافية لإنشاء توصيات.</p>
                         ) : (
                        <div className="prose prose-blue dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {suggestion}
                            </ReactMarkdown>
                        </div>
                         )}
                    </div>
                )}
                
                <div className="mt-6 text-center">
                    <button 
                        onClick={handleGenerateSuggestion} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition"
                        disabled={isLoading || reports.length === 0}
                    >
                        تحديث التوصيات
                    </button>
                </div>
            </div>

            {history.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                        <ClockIcon className="h-6 w-6 ml-2 text-blue-500" />
                        سجل التوصيات السابقة
                    </h2>
                    <div className="space-y-4">
                        {history.map(record => (
                            <div key={record.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{record.timestamp}</span>
                                </div>
                                <div className="prose prose-blue dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {record.suggestion}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPage;
