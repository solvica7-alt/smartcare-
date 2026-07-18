
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SYMPTOMS } from '../constants';
import { Patient, AnalysisResult } from '../types';
import { analyzeMedicalImage } from '../services/geminiService';
import { useReports } from '../context/ReportContext';
import { useI18n } from '../context/I18nContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PhotoIcon, ExclamationCircleIcon, XCircleIcon, MicrophoneIcon, MapPinIcon, WifiIcon } from '@heroicons/react/24/solid';

const fileToBase64 = (file: File): Promise<{ data: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: file.type });
        reader.onerror = error => reject(error);
    });
};

const PatientFormPage: React.FC = () => {
    const [patient, setPatient] = useState<Patient>({ name: '', age: 0, symptoms: [], detailedSymptoms: '', notes: '', location: undefined });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { t, dir } = useI18n();

    const navigate = useNavigate();
    const { addReport } = useReports();

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPatient(prev => ({ ...prev, [name]: value }));
    };

    const handleSymptomToggle = (symptom: string) => {
        setPatient(prev => {
            const symptoms = prev.symptoms.includes(symptom)
                ? prev.symptoms.filter(s => s !== symptom)
                : [...prev.symptoms, symptom];
            return { ...prev, symptoms };
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const combinedFiles = [...imageFiles, ...files].slice(0, 3);
            setImageFiles(combinedFiles);
            const previews = combinedFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(previews);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const startListening = (field: 'detailedSymptoms' | 'notes') => {
        if (!('webkitSpeechRecognition' in window)) {
            alert(t('browserNoSpeech'));
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.start();
        setIsListening(field);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setPatient(prev => ({
                ...prev,
                [field]: (prev[field] ? prev[field] + ' ' : '') + transcript
            }));
            setIsListening(null);
        };

        recognition.onerror = () => setIsListening(null);
        recognition.onend = () => setIsListening(null);
    };

    const [isLocating, setIsLocating] = useState(false);

    const [showManualInput, setShowManualInput] = useState(false);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');

    const getLocation = () => {
        if (isLocating) return;
        setIsLocating(true);
        setShowManualInput(false);

        const handleManualInput = (reason: string) => {
            setIsLocating(false);
            console.warn(reason); // Log warning but don't force error immediately
            setShowManualInput(true);
        };

        // 🇵🇸 FEATURE: Hybrid GPS Logic
        // Try GPS first. If it fails (or is offline), fall back to manual.
        if (!navigator.geolocation) {
            handleManualInput(t('browserNoLocation'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setPatient(prev => ({
                    ...prev,
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                }));
                setIsLocating(false);
            },
            (error) => {
                console.warn("Location error:", error);
                let msg = t('cannotDetectLocation');

                if (error.code === error.PERMISSION_DENIED) {
                    msg = "⚠️ " + t('locationPermissionDenied');
                } else if (error.code === error.TIMEOUT) {
                    msg = t('locationTimeout');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg = t('locationUnavailable');
                }

                // If offline or GPS fails, show manual input
                handleManualInput(msg);
            },
            // 🇵🇸 FIX: Disable high accuracy for better speed/desktop compatibility
            // Increase timeout to 15s
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
    };

    const toggleManualInput = () => {
        setShowManualInput(!showManualInput);
    };

    const confirmManualLocation = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setPatient(prev => ({ ...prev, location: { lat, lng } }));
            setShowManualInput(false);
            setError(null);
        } else {
            alert(t('invalidCoordinates'));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Images are now optional. Basic fields and symptoms are required.
        if (!patient.name || patient.age <= 0 || patient.symptoms.length === 0) {
            setError(t('fillRequiredFields'));
            return;
        }
        setError(null);
        setIsLoading(true);

        try {
            const base64Promises = imageFiles.map(file => fileToBase64(file));
            const base64Images = await Promise.all(base64Promises);

            // Prepare images for local display and permanent storage
            const base64Previews = base64Images.map(img => `data:${img.mimeType};base64,${img.data}`);

            // Online check
            if (navigator.onLine) {
                const result: AnalysisResult = await analyzeMedicalImage(base64Images, patient);
                navigate('/ai-result', { state: { patient, analysisResult: result, imagePreviews: base64Previews } });
            } else {
                // Offline save
                const offlineResult: AnalysisResult = {
                    risk_level: t('undefinedOffline'),
                    triage_color: 'gray',
                    findings: t('savedLocally'),
                    red_flags: []
                };

                // 🇵🇸 FEATURE: Save as pending_analysis for Background AI Worker
                addReport(patient, offlineResult, base64Previews, 'pending_analysis');
                navigate('/reports');
            }
        } catch (err: any) {
            console.error("Full Error Object:", err);
            let errorMessage = "حدث خطأ غير متوقع";

            if (err instanceof Error) {
                // If the error message contains the API response, try to show it
                errorMessage = err.message;
            } else if (typeof err === 'object') {
                errorMessage = JSON.stringify(err);
            }

            // Hack to show more details to user for debugging
            if (errorMessage.includes("400")) {
                errorMessage += " (Make sure images are PNG/JPG and not too large)";
            }

            setError(`${t('processingFailed')} ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md transition-colors duration-200" dir={dir}>
            <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('formTitle')}</h1>
                {!isOnline && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center">
                        <WifiIcon className={`w-4 h-4 ${dir === 'rtl' ? 'me-1' : 'ms-1'}`} /> {t('offlineMode')}
                    </span>
                )}
            </div>

            {error && (
                <div className="bg-red-100 border-s-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-center" role="alert">
                    <ExclamationCircleIcon className="h-5 w-5 me-2" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientNameLabel')}</label>
                        <input type="text" name="name" id="name" value={patient.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:text-white" required />
                    </div>
                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientAgeLabel')}</label>
                        <input type="number" name="age" id="age" value={patient.age === 0 ? '' : patient.age} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:text-white" required />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('visibleSymptoms')}</label>
                    <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md">
                        {SYMPTOMS.map(symptom => (
                            <button type="button" key={symptom} onClick={() => handleSymptomToggle(symptom)} className={`px-3 py-1 text-sm rounded-full transition ${patient.symptoms.includes(symptom) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                {t(symptom) || symptom}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="detailedSymptoms" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('detailedSymptoms')}</label>
                        <button type="button" onClick={() => startListening('detailedSymptoms')} className={`text-xs flex items-center ${isListening === 'detailedSymptoms' ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                            <MicrophoneIcon className={`h-4 w-4 ${dir === 'rtl' ? 'me-1' : 'ms-1'}`} />
                            {isListening === 'detailedSymptoms' ? t('listening') : t('voiceDictation')}
                        </button>
                    </div>
                    <textarea name="detailedSymptoms" id="detailedSymptoms" value={patient.detailedSymptoms} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:text-white" placeholder={t('detailedSymptomsPlaceholder')}></textarea>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('additionalNotes')}</label>
                        <button type="button" onClick={() => startListening('notes')} className={`text-xs flex items-center ${isListening === 'notes' ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                            <MicrophoneIcon className={`h-4 w-4 ${dir === 'rtl' ? 'me-1' : 'ms-1'}`} />
                            {isListening === 'notes' ? t('listening') : t('voiceDictation')}
                        </button>
                    </div>
                    <textarea name="notes" id="notes" value={patient.notes} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:text-white" placeholder={t('notesPlaceholder')}></textarea>
                </div>

                <div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <button type="button" onClick={getLocation} disabled={isLocating} className={`flex items-center text-sm ${isLocating ? 'text-gray-500' : 'text-blue-600 hover:text-blue-800'}`}>
                            <MapPinIcon className={`h-5 w-5 ${dir === 'rtl' ? 'me-1' : 'ms-1'} ${isLocating ? 'animate-bounce' : ''}`} />
                            {isLocating ? t('tryingLocation') : (patient.location ? `${t('locationSet')} ${patient.location.lat.toFixed(4)}, ${patient.location.lng.toFixed(4)}` : t('autoLocation'))}
                        </button>
                        <span className="text-gray-300 mx-2">|</span>
                        <button type="button" onClick={toggleManualInput} className="text-sm text-gray-500 hover:text-gray-700 underline decoration-dotted">
                            {showManualInput ? t('hideManualInput') : t('manualInput')}
                        </button>
                    </div>

                    {showManualInput && (
                        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 animate-fade-in transition-all">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                <MapPinIcon className={`h-4 w-4 ${dir === 'rtl' ? 'me-1' : 'ms-1'} text-gray-500`} />
                                {t('manualInputTitle')}
                            </h4>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('latitude')}</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={manualLat}
                                        onChange={(e) => setManualLat(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder={t('latPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('longitude')}</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={manualLng}
                                        onChange={(e) => setManualLng(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder={t('lngPlaceholder')}
                                    />
                                </div>
                            </div>
                            <div className={`flex justify-end space-x-2 ${dir === 'rtl' ? 'space-x-reverse' : ''}`}>
                                <button
                                    type="button"
                                    onClick={confirmManualLocation}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition shadow-sm"
                                >
                                    {t('confirmLocation')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowManualInput(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm hover:underline mx-2"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('uploadImages')}</label>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md bg-gray-50 dark:bg-gray-700">
                        <div className="space-y-1 text-center">
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                    <span>{t('chooseFiles')}</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" multiple disabled={imageFiles.length >= 3} />
                                </label>
                                <p className={`ps-1 ${dir === 'ltr' ? 'pl-1' : ''}`}>{t('dragDropHere')}</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{imageFiles.length} / 3 {t('imagesLoaded')}</p>
                        </div>
                    </div>
                    {imagePreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-4">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative">
                                    <img src={preview} alt={`${t('preview')} ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                                    <button type="button" onClick={() => removeImage(index)} className={`absolute -top-2 ${dir === 'rtl' ? '-left-2' : '-right-2'} bg-red-500 text-white rounded-full p-1`}>
                                        <XCircleIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4">
                    {isLoading ? (
                        <div className="flex justify-center"><LoadingSpinner message={t('processingData')} /></div>
                    ) : (
                        <button type="submit" className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isOnline ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400`} disabled={!patient.name || patient.age <= 0 || patient.symptoms.length === 0}>
                            {isOnline ? t('analyzeCreateReport') : t('offlineSave')}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default PatientFormPage;
