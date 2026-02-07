import React, { useState, useEffect } from 'react';
import { useReports } from '../context/ReportContext';
import { generateInventorySuggestion } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';

const InventoryPage: React.FC = () => {
    const { reports } = useReports();
    const [suggestion, setSuggestion] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (reports.length > 0) {
            handleGenerateSuggestion();
        }
    }, [reports.length]);

    const handleGenerateSuggestion = async () => {
        setIsLoading(true);
        try {
            const result = await generateInventorySuggestion(reports);
            setSuggestion(result);
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
                            <div className="whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                                {suggestion}
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
        </div>
    );
};

export default InventoryPage;
