import React, { useState, useEffect } from 'react';
import { compareMedicalImages } from '../services/geminiService';
import { useI18n } from '../context/I18nContext';
import { useReports } from '../context/ReportContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PhotoIcon, ArrowsRightLeftIcon, ClockIcon } from '@heroicons/react/24/solid';
import { getData, setData, StorageKeys } from '../services/StorageService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CompareRecord {
    id: string;
    oldImageB64: string;
    oldImageMime: string;
    newImageB64: string;
    newImageMime: string;
    result: string;
    timestamp: string;
}

const ComparativeAnalysisPage: React.FC = () => {
    const { t, dir } = useI18n();
    const { reports, addReport } = useReports();
    const [oldImage, setOldImage] = useState<File | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [oldPreview, setOldPreview] = useState<string | null>(null);
    const [newPreview, setNewPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Derived history from global reports for Cloud Hub synchronization
    const history = reports
        .filter(r => r.patientName === "تحليل تطوري للصور")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(r => ({
            id: r.id,
            oldImageB64: r.imagePreviews && r.imagePreviews[0] ? r.imagePreviews[0].split(',')[1] : '',
            oldImageMime: r.imagePreviews && r.imagePreviews[0] ? r.imagePreviews[0].split(';')[0].split(':')[1] : '',
            newImageB64: r.imagePreviews && r.imagePreviews[1] ? r.imagePreviews[1].split(',')[1] : '',
            newImageMime: r.imagePreviews && r.imagePreviews[1] ? r.imagePreviews[1].split(';')[0].split(':')[1] : '',
            result: r.analysisResult.findings,
            timestamp: new Date(r.createdAt).toLocaleString('ar-SA')
        }));

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'old' | 'new') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (type === 'old') {
                setOldImage(file);
                setOldPreview(URL.createObjectURL(file));
            } else {
                setNewImage(file);
                setNewPreview(URL.createObjectURL(file));
            }
        }
    };

    const fileToBase64 = (file: File): Promise<{data: string, mimeType: string}> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: file.type });
        });
    };

    const handleCompare = async () => {
        if (!oldImage || !newImage) return;
        setIsLoading(true);
        try {
            const oldB64 = await fileToBase64(oldImage);
            const newB64 = await fileToBase64(newImage);
            const base64Previews = [`data:${oldB64.mimeType};base64,${oldB64.data}`, `data:${newB64.mimeType};base64,${newB64.data}`];

            const patientData = {
                name: "تحليل تطوري للصور",
                age: 0,
                symptoms: ["تتبع حالة الجرح أو الإصابة"],
                detailedSymptoms: "",
                notes: "مقارنة آلية للصور الطبية باستخدام الذكاء الاصطناعي",
                location: "قسم التحليل التطوري"
            };

            if (!navigator.onLine) {
                const offlineAnalysis: any = {
                    risk_level: 'مؤجل',
                    triage_color: 'gray',
                    findings: 'تم حفظ الصور محلياً. بانتظار عودة الاتصال للمقارنة.',
                    red_flags: []
                };
                addReport(patientData, offlineAnalysis, base64Previews, 'pending_analysis');
                setResult(t('savedLocally') + " - سيتم إجراء التحليل التطوري تلقائياً فور عودة الإنترنت.");
                return;
            }

            const comparison = await compareMedicalImages(oldB64, newB64, "Patient wound evolution");
            setResult(comparison);

            const analysisRes = {
                risk_level: "Medium 🟡",
                triage_color: "yellow",
                findings: comparison,
                red_flags: ["تغير في حالة الإصابة بناءً على الصور"],
                medical_recommendations: []
            };
            
            addReport(patientData, analysisRes, base64Previews, 'processed');

        } catch (error) {
            setResult(t('compError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto" dir={dir}>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t('compTitle')}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Old Image */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-t-4 border-gray-400">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">{t('compOld')}</h2>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 h-64 flex flex-col justify-center items-center relative overflow-hidden">
                        {oldPreview ? (
                            <img src={oldPreview} alt="Old" className="absolute inset-0 w-full h-full object-contain" />
                        ) : (
                            <PhotoIcon className="h-12 w-12 text-gray-400" />
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageChange(e, 'old')} accept="image/*" />
                    </div>
                </div>

                {/* New Image */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-t-4 border-blue-500">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">{t('compNew')}</h2>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 h-64 flex flex-col justify-center items-center relative overflow-hidden">
                         {newPreview ? (
                            <img src={newPreview} alt="New" className="absolute inset-0 w-full h-full object-contain" />
                        ) : (
                            <PhotoIcon className="h-12 w-12 text-gray-400" />
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageChange(e, 'new')} accept="image/*" />
                    </div>
                </div>
            </div>

            <div className="text-center mb-8">
                <button
                    onClick={handleCompare}
                    disabled={!oldImage || !newImage || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition flex items-center justify-center mx-auto disabled:bg-gray-400"
                >
                    <ArrowsRightLeftIcon className="h-5 w-5 me-2" />
                    {t('compBtn')}
                </button>
            </div>

            {isLoading && <LoadingSpinner message={t('compLoading')} />}

            {result && !isLoading && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('compResult')}</h3>
                    <div className="prose prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {result}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                        <ClockIcon className="h-6 w-6 me-2 text-blue-500" />
                        {t('compHistory')}
                    </h2>
                    <div className="space-y-6">
                        {history.map(record => (
                            <div key={record.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('compPrevious')}</span>
                                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                                        {record.timestamp}
                                    </span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-6 mb-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1 text-center">{t('compOld')}</p>
                                        <img src={`data:${record.oldImageMime};base64,${record.oldImageB64}`} alt="Old" className="w-full h-32 object-contain rounded bg-gray-50 dark:bg-gray-900 border" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1 text-center">{t('compNew')}</p>
                                        <img src={`data:${record.newImageMime};base64,${record.newImageB64}`} alt="New" className="w-full h-32 object-contain rounded bg-gray-50 dark:bg-gray-900 border" />
                                    </div>
                                </div>
                                <div className="prose prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {record.result}
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

export default ComparativeAnalysisPage;
