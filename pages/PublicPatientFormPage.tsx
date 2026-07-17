import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SYMPTOMS } from '../constants';
import { Patient, AnalysisResult } from '../types';
import { analyzeMedicalImage } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PhotoIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import SafetyNotice from '../components/SafetyNotice';
import { useI18n } from '../context/I18nContext';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const PublicPatientFormPage: React.FC = () => {
    const [patient, setPatient] = useState<Patient>({ name: '', age: 0, symptoms: [] });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, dir } = useI18n();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Image is now optional for public users. Age and symptoms are required.
        if (patient.age <= 0 || patient.symptoms.length === 0) {
            setError(t('fillRequiredFields'));
            return;
        }
        setError(null);
        setIsLoading(true);

        try {
            const base64Images: { data: string, mimeType: string }[] = [];
            if (imageFile) {
                const base64Data = await fileToBase64(imageFile);
                base64Images.push({ data: base64Data, mimeType: imageFile.type });
            }

            // Patient name is optional for public form
            const finalPatientData = { ...patient, name: patient.name || t('publicPatient') };

            // Analyze with Gemini (handles empty image array automatically)
            const result: AnalysisResult = await analyzeMedicalImage(base64Images, finalPatientData);

            navigate('/public-result', { state: { patient: finalPatientData, analysisResult: result, imagePreview } });
        } catch (err) {
            setError(t('analyzeError'));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir={dir}>
            <div className="max-w-2xl w-full mx-auto bg-white p-8 rounded-lg shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">{t('registerNewCase')}</h1>
                    <p className="text-gray-600 mt-2">
                        {t('publicFormDesc')}
                    </p>
                </div>

                <div className="my-6">
                    <SafetyNotice />
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
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t('nameOptional')}</label>
                            <input type="text" name="name" id="name" value={patient.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">{t('ageLabel')} <span className="text-red-500">*</span></label>
                            <input type="number" name="age" id="age" value={patient.age === 0 ? '' : patient.age} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('visibleSymptoms')} <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md">
                            {SYMPTOMS.map(symptom => (
                                <button
                                    type="button"
                                    key={symptom}
                                    onClick={() => handleSymptomToggle(symptom)}
                                    className={`px-3 py-1 text-sm rounded-full transition ${patient.symptoms.includes(symptom) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                                >
                                    {symptom}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('uploadCaseImage')} <span className="text-red-500">*</span></label>
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="معاينة الصورة" className="mx-auto h-48 w-auto rounded-md object-contain" />
                                ) : (
                                    <>
                                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                <span>{t('chooseFile')}</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                                            </label>
                                            <p className={`p${dir === 'rtl' ? 's' : 'e'}-1`}>{t('dragAndDrop')}</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                        {imageFile && <p className="text-sm text-gray-500 mt-2 text-center">{t('fileSelected')} {imageFile.name}</p>}
                    </div>

                    <div className="pt-4">
                        {isLoading ? (
                            <div className="flex justify-center">
                                <LoadingSpinner message={t('analyzingImage')} />
                            </div>
                        ) : (
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                                disabled={patient.age <= 0 || patient.symptoms.length === 0}
                            >
                                {t('analyzeCase')}
                            </button>
                        )}
                    </div>
                    <div className="text-center mt-4">
                        <a href="#/" className="text-sm text-blue-600 hover:underline">{t('backToLogin')}</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PublicPatientFormPage;