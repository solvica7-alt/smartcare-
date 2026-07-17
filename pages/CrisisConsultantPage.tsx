import React, { useState, useEffect, useRef } from 'react';
import { useReports } from '../context/ReportContext';
import { ExclamationTriangleIcon, FireIcon, UserGroupIcon, MapPinIcon, CameraIcon, PaperAirplaneIcon, ClockIcon } from '@heroicons/react/24/solid';
import { getData, setData, StorageKeys } from '../services/StorageService';
import LoadingSpinner from '../components/LoadingSpinner';

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
    const { reports } = useReports();
    const [description, setDescription] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [history, setHistory] = useState<CrisisRecord[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeReports = reports.filter(r => r.status === 'processed');

    useEffect(() => {
        getData<CrisisRecord[]>(StorageKeys.CRISIS_HISTORY, []).then(saved => {
            setHistory(saved);
            setIsLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (isLoaded) {
            setData(StorageKeys.CRISIS_HISTORY, history);
        }
    }, [history, isLoaded]);

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
                alert("تعذر الحصول على الموقع.");
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

    const generateCrisisAnalysis = async () => {
        setIsLoading(true);
        try {
            let imageB64Info = null;
            if (image) {
                imageB64Info = await fileToBase64(image);
            }

            const prompt = `أنت الذكاء الاصطناعي "المستشار الطبي للأزمات" في تطبيق SmartCare.
            نحن في حالة كارثة/حرب. إليك بيانات ${activeReports.length} مصاب تم تسجيلهم حتى الآن:
            ${activeReports.map(r => `- مريض: ${r.patientName}, تصنيف: ${r.analysisResult.triage_color}`).join('\n')}

            تفاصيل الحدث الميداني المباشر:
            - الوصف: ${description || 'غير محدد'}
            - الموقع: ${locationInput || 'غير محدد'}
            
            ${imageB64Info ? "مرفق صورة حية للحدث. قم بتحليل الصورة بدقة." : ""}

            بناءً على هذه البيانات الحية، قم بتقديم تقرير استراتيجي موجز وحاسم لمدير المستشفى يتضمن:
            1. تقييم عام للموقف الحالي وتوزيع الإصابات.
            2. الأولويات القصوى والتحليل المرئي للكارثة (إن وجد).
            3. النواقص المتوقعة والخطوات الفورية للإخلاء.`;

            // Prepare messages for LLaVA/NVIDIA Vision
            const messages: any[] = [{ role: "user", content: prompt }];
            
            if (imageB64Info) {
                // If using a vision model API, it might require a specific content array format:
                messages[0].content = [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: `data:${imageB64Info.mimeType};base64,${imageB64Info.data}` } }
                ];
            }

            const response = await fetch('/api/nvidia/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer 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`
                },
                body: JSON.stringify({
                    model: "meta/llama-3.2-11b-vision-instruct",
                    messages: messages,
                    max_tokens: 1024,
                    temperature: 0.5
                })
            });

            const data = await response.json();
            let finalStrategy = "تعذر توليد التقرير الاستراتيجي.";
            if (data.choices && data.choices[0]) {
                finalStrategy = data.choices[0].message.content;
            }
            
            setAnalysis(finalStrategy);

            const newRecord: CrisisRecord = {
                id: Date.now().toString(),
                description,
                location: locationInput,
                imageB64: imageB64Info?.data,
                imageMime: imageB64Info?.mimeType,
                strategy: finalStrategy,
                timestamp: new Date().toLocaleString('ar-SA')
            };
            setHistory(prev => [newRecord, ...prev]);

        } catch (error) {
            console.error("Crisis Analysis Error:", error);
            setAnalysis("حدث خطأ في الاتصال بالذكاء الاصطناعي المركزي.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4" dir="rtl">
            <div className="bg-red-600 rounded-xl shadow-lg p-8 text-white mb-6 bg-opacity-90">
                <div className="flex items-center gap-4 mb-4">
                    <FireIcon className="h-12 w-12 text-yellow-300" />
                    <div>
                        <h1 className="text-3xl font-bold">غرفة عمليات الأزمات (Crisis Command Hub)</h1>
                        <p className="text-red-100 opacity-90 mt-1">وحدة تحليل الذكاء الاصطناعي المركزي لحالات الطوارئ والحروب</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700 flex items-center gap-4">
                    <UserGroupIcon className="h-10 w-10 text-blue-500" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الحالات المسجلة</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white">{activeReports.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700 flex items-center gap-4">
                    <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">حالات الفرز الأحمر (حرجة)</p>
                        <p className="text-2xl font-bold text-red-600">{activeReports.filter(r => r.analysisResult.triage_color === 'red').length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border dark:border-gray-700 flex items-center gap-4">
                    <MapPinIcon className="h-10 w-10 text-yellow-500" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">بانتظار الإخلاء الميداني</p>
                        <p className="text-2xl font-bold text-yellow-600">{activeReports.filter(r => r.location).length}</p>
                    </div>
                </div>
            </div>

            {/* Incident Reporting Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">تسجيل بلاغ كارثة جديد</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف الحدث (مثال: انهيار مبنى سكني)</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموقع أو الإحداثيات</label>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">صورة ميدانية للحدث</label>
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
                            <span className="absolute z-10 font-bold bg-white/80 dark:bg-black/50 px-2 py-1 rounded">اضغط لإرفاق صورة</span>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={generateCrisisAnalysis}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center transition disabled:opacity-50"
                    >
                        {isLoading ? <LoadingSpinner message="جاري صياغة الاستراتيجية..." /> : <><PaperAirplaneIcon className="h-5 w-5 me-2"/> إرسال البلاغ وتوليد خطة الاستجابة</>}
                    </button>
                </div>
            </div>

            {/* Current Active Analysis */}
            {analysis && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8">
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4">الاستراتيجية الفورية للحدث الحالي</h3>
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                        {analysis}
                    </div>
                </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                        <ClockIcon className="h-6 w-6 me-2 text-red-500" />
                        سجل بلاغات وتقارير الأزمات السابقة
                    </h2>
                    <div className="space-y-6">
                        {history.map(record => (
                            <div key={record.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-gray-100">{record.description || 'بدون وصف'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400"><MapPinIcon className="h-4 w-4 inline me-1"/> {record.location || 'غير محدد'}</p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-800 rounded-full">{record.timestamp}</span>
                                </div>
                                
                                {record.imageB64 && (
                                    <img src={`data:${record.imageMime};base64,${record.imageB64}`} alt="Crisis" className="w-full h-48 object-cover rounded mb-4" />
                                )}

                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border dark:border-gray-700">
                                    <h4 className="font-bold text-red-600 mb-2">استراتيجية الإنقاذ الصادرة:</h4>
                                    <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{record.strategy}</p>
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
