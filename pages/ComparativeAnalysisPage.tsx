import React, { useState } from 'react';
import { compareMedicalImages } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PhotoIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/solid';

const ComparativeAnalysisPage: React.FC = () => {
    const [oldImage, setOldImage] = useState<File | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [oldPreview, setOldPreview] = useState<string | null>(null);
    const [newPreview, setNewPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

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
            const comparison = await compareMedicalImages(oldB64, newB64, "Patient wound evolution");
            setResult(comparison);
        } catch (error) {
            setResult("حدث خطأ أثناء المقارنة.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">تحليل التطور الزمني للإصابة</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Old Image */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-t-4 border-gray-400">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">الحالة السابقة (قديم)</h2>
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
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">الحالة الحالية (جديد)</h2>
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
                    مقارنة الحالتين بالذكاء الاصطناعي
                </button>
            </div>

            {isLoading && <LoadingSpinner message="جاري تحليل الفروقات والتطور..." />}

            {result && !isLoading && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">نتيجة المقارنة</h3>
                    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {result}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparativeAnalysisPage;
