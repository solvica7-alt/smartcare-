import React, { useState, useEffect } from 'react';
import { XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../context/I18nContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { t, dir } = useI18n();
    const [useLocalAI, setUseLocalAI] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUseLocalAI(localStorage.getItem('USE_LOCAL_OLLAMA') === 'true');
            setSaved(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        localStorage.setItem('USE_LOCAL_OLLAMA', useLocalAI ? 'true' : 'false');
        setSaved(true);
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Cog6ToothIcon className="w-6 h-6 text-green-500" />
                        إعدادات الذكاء الاصطناعي المحلي (Ollama)
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-200 mb-2 font-medium">
                            لحل مشكلة حظر الإنترنت والقيود نهائياً، يمكنك تشغيل الذكاء الاصطناعي <b>محلياً على جهازك</b> (Localhost) باستخدام برنامج <b>Ollama</b> المجاني والمفتوح المصدر من GitHub.
                        </p>
                        <ul className="text-xs text-green-700 dark:text-green-300 list-disc list-inside mt-2 space-y-1">
                            <li>حمل البرنامج من <a href="https://ollama.com" target="_blank" className="font-bold underline">ollama.com</a></li>
                            <li>افتح موجه الأوامر (CMD) واكتب: <code>ollama run llava</code></li>
                            <li>قم بتفعيل الخيار بالأسفل وسيعمل التطبيق بدون إنترنت!</li>
                        </ul>
                    </div>

                    <div className="flex items-center mt-4">
                        <input
                            type="checkbox"
                            id="localAiToggle"
                            checked={useLocalAI}
                            onChange={(e) => setUseLocalAI(e.target.checked)}
                            className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label htmlFor="localAiToggle" className="mr-3 ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                            تفعيل الذكاء الاصطناعي المحلي (Ollama - Llava)
                        </label>
                    </div>

                    {saved && (
                        <div className="text-green-600 dark:text-green-400 text-sm font-medium text-center bg-green-50 dark:bg-green-900/30 p-2 rounded">
                            تم الحفظ بنجاح! تأكد من أن Ollama يعمل في الخلفية.
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                    >
                        حفظ الإعدادات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
