import React, { useState, useEffect } from 'react';
import { useReports } from '../context/ReportContext';
import { useI18n } from '../context/I18nContext';
import { generateInventorySuggestion } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/react/24/solid';
import { getData, setData, StorageKeys } from '../services/StorageService';

import { OfflineQueueService } from '../services/OfflineQueueService';

interface InventoryRecord {
    id: string;
    suggestion: string;
    timestamp: string;
}

const InventoryPage: React.FC = () => {
    const { reports } = useReports();
    const { t, dir } = useI18n();
    const [suggestion, setSuggestion] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [history, setHistory] = useState<InventoryRecord[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        getData<InventoryRecord[]>(StorageKeys.INVENTORY_HISTORY, []).then(saved => {
            setHistory(saved);
            setIsLoaded(true);
            if (saved.length > 0) {
                setSuggestion(saved[0].suggestion); // Load latest suggestion into view
            }
        });
    }, []);

    useEffect(() => {
        if (isLoaded) {
            setData(StorageKeys.INVENTORY_HISTORY, history);
        }
    }, [history, isLoaded]);

    const handleGenerateSuggestion = async () => {
        setIsLoading(true);

        if (!navigator.onLine) {
            await OfflineQueueService.enqueueTask('INVENTORY', { reports });
            setSuggestion(t('invOffline'));
            setIsLoading(false);
            return;
        }

        try {
            const result = await generateInventorySuggestion(reports);
            setSuggestion(result);
            
            const newRecord: InventoryRecord = {
                id: Date.now().toString(),
                suggestion: result,
                timestamp: new Date().toLocaleString('ar-SA')
            };
            setHistory(prev => [newRecord, ...prev]);
        } catch (error) {
            setSuggestion(t('invError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto" dir={dir}>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('invTitle')}</h1>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                    <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-600 me-3" />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('invSuggestions')}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('invDesc').replace('{reports.length}', reports.length.toString())}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-8">
                        <LoadingSpinner message={t('invLoading')} />
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
                         {reports.length === 0 ? (
                            <p className="text-center text-gray-500">{t('invNotEnough')}</p>
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
                        {t('invUpdateBtn')}
                    </button>
                </div>
            </div>

            {/* History Section */}
            {history.length > 1 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                        <ClockIcon className="h-6 w-6 me-2 text-blue-500" />
                        {t('invHistory')}
                    </h2>
                    <div className="space-y-4">
                        {history.slice(1).map(record => (
                            <div key={record.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{t('invReportDate')}</span>
                                    <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                        {record.timestamp}
                                    </span>
                                </div>
                                <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                    {record.suggestion}
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
