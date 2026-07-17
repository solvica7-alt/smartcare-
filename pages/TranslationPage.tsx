import React, { useState, useEffect } from 'react';
import { translateText } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { LanguageIcon, MicrophoneIcon, ClockIcon } from '@heroicons/react/24/solid';
import { getData, setData, StorageKeys } from '../services/StorageService';

import { OfflineQueueService } from '../services/OfflineQueueService';

interface TranslationRecord {
    id: string;
    source: string;
    result: string;
    targetLang: string;
    timestamp: string;
}

const TranslationPage: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [targetLang, setTargetLang] = useState('Arabic');
    const [isListening, setIsListening] = useState(false);
    
    const [history, setHistory] = useState<TranslationRecord[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        getData<TranslationRecord[]>(StorageKeys.TRANSLATION_HISTORY, []).then(saved => {
            setHistory(saved);
            setIsLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (isLoaded) {
            setData(StorageKeys.TRANSLATION_HISTORY, history);
        }
    }, [history, isLoaded]);

    const handleTranslate = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);

        if (!navigator.onLine) {
            await OfflineQueueService.enqueueTask('TRANSLATE', { text: inputText, targetLang });
            setTranslatedText('أنت غير متصل بالإنترنت. تم حفظ طلبك وسينفذ تلقائياً عند عودة الاتصال.');
            setIsLoading(false);
            return;
        }

        try {
            const result = await translateText(inputText, targetLang);
            setTranslatedText(result);
            
            // Add to history
            const newRecord: TranslationRecord = {
                id: Date.now().toString(),
                source: inputText,
                result: result,
                targetLang: targetLang,
                timestamp: new Date().toLocaleString('ar-SA')
            };
            setHistory(prev => [newRecord, ...prev]);
        } catch (error) {
            setTranslatedText("Error translating.");
        } finally {
            setIsLoading(false);
        }
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition not supported');
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // Logic: if translating TO Arabic, source is likely English or Italian.
        // If translating TO English/Italian, source is likely Arabic.
        if (targetLang === 'Arabic') {
            recognition.lang = 'en-US'; // Defaulting source to English if target is Arabic, could be Italian too but we'll use English as fallback
        } else if (targetLang === 'English' || targetLang === 'Italian') {
            recognition.lang = 'ar-SA';
        }
        
        recognition.start();
        setIsListening(true);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
    };

    return (
        <div className="max-w-2xl mx-auto p-4" dir="rtl">
             <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center">المترجم الطبي الفوري</h1>
             
             <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl overflow-hidden">
                 <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                     <span className="font-bold text-lg">اللغة المطلوبة للترجمة:</span>
                     <select 
                        value={targetLang} 
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-blue-700 text-white border-none rounded-md p-2 focus:ring-2 focus:ring-white"
                     >
                         <option value="Arabic">العربية (للمريض)</option>
                         <option value="English">English (For Medic)</option>
                         <option value="Italian">Italiano (For Medic)</option>
                     </select>
                 </div>
                 
                 <div className="p-6 space-y-6">
                     <div>
                         <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">النص الأصلي (تحدث أو اكتب)</label>
                         <div className="relative">
                             <textarea 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                rows={4}
                                placeholder="تحدث هنا..."
                             />
                             <button 
                                onClick={startListening}
                                className={`absolute bottom-3 left-3 p-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'} text-white`}
                             >
                                 <MicrophoneIcon className="h-5 w-5" />
                             </button>
                         </div>
                     </div>

                     <button 
                        onClick={handleTranslate}
                        disabled={isLoading || !inputText}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition flex justify-center items-center disabled:opacity-50"
                     >
                         {isLoading ? <LoadingSpinner message=""/> : <><LanguageIcon className="h-5 w-5 me-2"/> ترجم الآن</>}
                     </button>

                     {translatedText && (
                         <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6">
                             <h3 className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">الترجمة:</h3>
                             <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{translatedText}</p>
                         </div>
                     )}
                 </div>
             </div>

             {/* History Section */}
             {history.length > 0 && (
                 <div className="mt-8">
                     <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                         <ClockIcon className="h-6 w-6 me-2 text-blue-500" />
                         سجل الترجمات السابقة
                     </h2>
                     <div className="space-y-4">
                         {history.map(record => (
                             <div key={record.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="text-xs font-semibold px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                         إلى: {record.targetLang}
                                     </span>
                                     <span className="text-xs text-gray-400">{record.timestamp}</span>
                                 </div>
                                 <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{record.source}</p>
                                 <p className="text-gray-800 dark:text-gray-100 font-bold">{record.result}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
        </div>
    );
};

export default TranslationPage;
