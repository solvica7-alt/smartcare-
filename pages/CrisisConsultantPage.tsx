import React, { useState, useEffect, useRef } from 'react';
import { useReports } from '../context/ReportContext';
import { generateCrisisAnalysis } from '../services/geminiService';
import { ExclamationTriangleIcon, FireIcon, UserGroupIcon, MapPinIcon, CameraIcon, PaperAirplaneIcon, ClockIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';
import { getData, setData, StorageKeys } from '../services/StorageService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useI18n } from '../context/I18nContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CrisisRecord {
    id: string;
    description: string;
    location: string;
    imageB64?: string;
    imageMime?: string;
    strategy: string;
    timestamp: string;
}

const CrisisConsultantPage: React.FC = () => {
    const { reports, addReport } = useReports();
    const { t, dir } = useI18n();
    const [description, setDescription] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Derived history from global reports for Cloud Hub synchronization
    const history = reports
        .filter(r => r.patientName.startsWith("حالة أزمة: "))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(r => ({
            id: r.id,
            description: r.symptoms[1] || r.symptoms[0],
            location: r.location || '',
            strategy: r.analysisResult.findings,
            timestamp: new Date(r.createdAt).toLocaleString('ar-SA'),
            imageB64: r.imagePreviews && r.imagePreviews.length > 0 ? r.imagePreviews[0].split(',')[1] : undefined,
            imageMime: r.imagePreviews && r.imagePreviews.length > 0 ? r.imagePreviews[0].split(';')[0].split(':')[1] : undefined,
        }));

    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeReports = reports.filter(r => r.status === 'processed' && r.patientName !== "تقرير إدارة المخزون الذكي" && r.patientName !== "تحليل تطوري للصور" && !r.patientName.startsWith("حالة أزمة: "));

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const getGPSLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocationInput(`${position.coords.latitude}, ${position.coords.longitude}`);
            }, () => {
                alert(t('cannotGetLocation'));
            });
        }
    };

    const fileToBase64 = (file: File): Promise<{data: string, mimeType: string}> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: file.type });
        });
    };

    const handleGenerateCrisisAnalysis = async () => {
        setIsLoading(true);
        try {
            let imageB64Info = null;
            if (image) {
                imageB64Info = await fileToBase64(image);
            }
            const base64Previews = imageB64Info ? [`data:${imageB64Info.mimeType};base64,${imageB64Info.data}`] : [];
            
            // 🇵🇸 FEATURE: Integrate with global Sync (Cloud/Offline)
            const patientData = {
                name: "حالة أزمة: " + (description.substring(0, 15) || "ميدانية"),
                age: 0,
                symptoms: ["حالة كوارث", description || "غير محدد"],
                detailedSymptoms: "",
                notes: "تم التقرير من وحدة إدارة الأزمات.",
                location: locationInput
            };

            if (!navigator.onLine) {
                const offlineAnalysis: any = {
                    risk_level: 'غير متوفر',
                    triage_color: 'gray',
                    findings: 'تم حفظ الصورة محلياً للمزامنة لاحقاً عبر Cloud Hub',
                    red_flags: []
                };
                addReport(patientData, offlineAnalysis, base64Previews, 'pending_analysis');
                setAnalysis(t('savedLocally') + " - سيتم تحليل الخطة الاستراتيجية تلقائياً فور عودة الإنترنت.");
                return;
            }

            const finalStrategy = await generateCrisisAnalysis(activeReports, description, locationInput, imageB64Info);
            setAnalysis(finalStrategy);

            const analysisRes = {
                risk_level: "High 🔴",
                triage_color: "red",
                findings: finalStrategy,
                red_flags: ["توجيه استراتيجي لإدارة الأزمات"],
                medical_recommendations: []
            };
            
            addReport(patientData, analysisRes, base64Previews, 'processed');

        } catch (error) {
            console.error("Crisis Analysis Error:", error);
            setAnalysis(t('aiConnectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4" dir={dir}>
            <div className="bg-red-600 rounded-xl shadow-lg p-8 text-white mb-6 bg-opacity-90">
                <div className={`flex items-center gap-4 mb-4`}>
                    <FireIcon className="h-12 w-12 text-yellow-300" />
                    <div>
                        <h1 className="text-3xl font-bold">{t('crisisCommandHub')}</h1>
                        <p className="text-red-100 opacity-90 mt-1">{t('crisisHubDesc')}</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700 flex items-center gap-4">
                    <UserGroupIcon className="h-10 w-10 text-blue-500" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalRegisteredCases')}</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{activeReports.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700 flex items-center gap-4">
                    <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('redTriageCases')}</p>
                        <p className="text-2xl font-bold text-red-600">{activeReports.filter(r => r.analysisResult.triage_color === 'red').length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700 flex items-center gap-4">
                    <MapPinIcon className="h-10 w-10 text-yellow-500" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('pendingEvacuation')}</p>
                        <p className="text-2xl font-bold text-yellow-600">{activeReports.filter(r => r.location).length}</p>
                    </div>
                </div>
            </div>

            {/* Incident Reporting Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('reportNewCrisis')}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('incidentDescription')}</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('locationOrCoords')}</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={locationInput}
                                    onChange={(e) => setLocationInput(e.target.value)}
                                    className="flex-1 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <button onClick={getGPSLocation} className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-4 rounded-lg font-bold">
                                    <MapPinIcon className="h-5 w-5 inline" /> GPS
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fieldImage')}</label>
                        <div 
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-32 flex justify-center items-center relative overflow-hidden bg-gray-50 dark:bg-gray-900 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Preview" />
                            ) : (
                                <CameraIcon className="h-10 w-10 text-gray-400" />
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            <span className="absolute z-10 font-bold bg-white/80 dark:bg-black/50 px-2 py-1 rounded">{t('clickToAttach')}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleGenerateCrisisAnalysis}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center transition disabled:opacity-50"
                    >
                        {isLoading ? <LoadingSpinner message={t('formulatingStrategy')} /> : <><PaperAirplaneIcon className={`h-5 w-5 ${dir === 'rtl' ? 'me-2' : 'ms-2'}`}/> {t('sendReportGeneratePlan')}</>}
                    </button>
                </div>
            </div>

            {/* Current Active Analysis */}
            {analysis && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4">{t('immediateStrategy')}</h3>
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                        {analysis}
                    </div>
                </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                        <ClockIcon className="h-6 w-6 ml-2 text-red-500" />
                        سجل تقارير الأزمات (Archive)
                    </h2>
                    <div className="space-y-8">
                        {history.map(record => (
                            <div key={record.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-700 overflow-hidden relative">
                                {/* Print Header overlay for PDF look */}
                                <div className="bg-red-50 dark:bg-red-900/30 border-b-2 border-red-600 dark:border-red-500 px-8 py-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-600 text-white p-2 rounded-lg">
                                                <ShieldExclamationIcon className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider">تقرير أزمة ميدانية</h3>
                                                <p className="text-red-700 dark:text-red-400 font-bold mt-1">وحدة إدارة الكوارث والطوارئ</p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm inline-block">
                                                <p className="text-xs text-gray-500 font-semibold uppercase">رقم التقرير</p>
                                                <p className="font-mono text-gray-800 dark:text-gray-200 font-bold">#CR-{record.id.substring(record.id.length - 6)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                                        <div className="flex items-center gap-2">
                                            <MapPinIcon className="h-5 w-5 text-gray-400" />
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">الموقع: <span className="text-gray-900 dark:text-white">{record.location || 'غير محدد'}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <ClockIcon className="h-5 w-5 text-gray-400" />
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">التاريخ: <span className="text-gray-900 dark:text-white" dir="ltr">{record.timestamp}</span></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-8">
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b pb-2 mb-3">وصف الحالة الأولية</h4>
                                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md border border-gray-100 dark:border-gray-700 leading-relaxed">
                                            {record.description}
                                        </p>
                                    </div>

                                    {record.imageB64 && (
                                        <div className="mb-8">
                                            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b pb-2 mb-3">المرفقات البصرية</h4>
                                            <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 p-2 inline-block shadow-sm">
                                                <img src={`data:${record.imageMime};base64,${record.imageB64}`} alt="حالة الأزمة" className="max-h-64 object-contain rounded" />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-lg font-bold text-red-700 dark:text-red-400 border-b pb-2 mb-4">خطة التدخل الاستراتيجي (AI Analysis)</h4>
                                        <div className="prose prose-red dark:prose-invert max-w-none prose-h3:text-red-700 prose-h3:border-b prose-h3:pb-1 prose-h4:text-red-600">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {record.strategy}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Signatures */}
                                <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-8 py-6">
                                    <div className="grid grid-cols-3 gap-8 text-center">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-8 border-b border-gray-300 dark:border-gray-600 pb-2">تصديق المستشار الطبي</p>
                                            <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-8 border-b border-gray-300 dark:border-gray-600 pb-2">توقيع الذكاء الاصطناعي (AI)</p>
                                            <div className="font-mono text-gray-400 text-xs">VERIFIED_SMARTCARE_AI</div>
                                            <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto mt-2"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-500 mb-8 border-b border-gray-300 dark:border-gray-600 pb-2">ختم الطوارئ</p>
                                            <div className="w-16 h-16 border-4 border-red-500/30 rounded-full mx-auto flex items-center justify-center rotate-[-15deg]">
                                                <span className="text-red-500/50 font-bold text-xs uppercase text-center leading-tight">OFFICIAL<br/>REPORT</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrisisConsultantPage;
