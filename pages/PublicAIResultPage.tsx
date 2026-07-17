import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Patient, AnalysisResult } from '../types';
import SafetyNotice from '../components/SafetyNotice';
import { useI18n } from '../context/I18nContext';

const PublicAIResultPage: React.FC = () => {
    const location = useLocation();
    const { patient, analysisResult, imagePreview } = (location.state || {}) as {
        patient: Patient;
        analysisResult: AnalysisResult;
        imagePreview: string;
    };
    const { t, dir } = useI18n();

    if (!patient || !analysisResult) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100" dir={dir}>
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h1 className="text-xl font-bold text-red-600">{t('errorDisplayingData')}</h1>
                    <p className="text-gray-600 mt-2">{t('analysisNotFound')}</p>
                    <Link to="/register-case" className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition">
                        {t('backToNewCase')}
                    </Link>
                </div>
            </div>
        );
    }

    const getRiskLevelClass = (risk: string) => {
        switch (risk) {
            case 'مرتفع': return 'bg-red-100 text-red-800 border-red-500';
            case 'متوسط': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
            case 'منخفض': return 'bg-green-100 text-green-800 border-green-500';
            default: return 'bg-gray-100 text-gray-800 border-gray-500';
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir={dir}>
            <div className="max-w-4xl w-full mx-auto bg-white p-8 rounded-lg shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">{t('initialAnalysisResults')}</h1>
                    <p className="text-gray-600 mt-1">{t('aiDisclaimer')}</p>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Left Column: Image & Patient Data */}
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('attachedImageTitle')}</h2>
                            <img src={imagePreview} alt="صورة طبية" className="w-full rounded-md border" />
                        </div>
                        <div>
                             <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('caseDataTitle')}</h2>
                            <div className="space-y-1 text-sm bg-gray-50 p-3 rounded-md border">
                                <p><strong className="font-medium">{t('nameLabel')}</strong> {patient.name}</p>
                                <p><strong className="font-medium">{t('ageLabel')}:</strong> {patient.age}</p>
                                <p><strong className="font-medium">{t('symptomsLabel')}</strong> {patient.symptoms.join(', ')}</p>
                            </div>
                        </div>
                    </div>
                    {/* Right Column: AI Analysis */}
                    <div className="md:col-span-3 space-y-6">
                         <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('estimatedRiskLevel')}</h2>
                            <div className={`p-4 rounded-md border-s-4 ${getRiskLevelClass(analysisResult.risk_level)}`}>
                                <p className="font-bold text-lg">{analysisResult.risk_level === 'مرتفع' ? t('highRisk') : analysisResult.risk_level === 'متوسط' ? t('mediumRisk') : analysisResult.risk_level === 'منخفض' ? t('lowRisk') : analysisResult.risk_level}</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('aiNotes')}</h2>
                            <p className="text-gray-600 bg-gray-50 p-4 rounded-md border">{analysisResult.findings}</p>
                        </div>
                         <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('warningSignsToNote')}</h2>
                            {analysisResult.red_flags.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 bg-red-50 p-4 rounded-md border border-red-200">
                                    {analysisResult.red_flags.map((flag, index) => (
                                        <li key={index} className="text-red-700">{flag}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 bg-gray-50 p-4 rounded-md border">{t('noWarningSigns')}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <SafetyNotice />
                    <div className="mt-4 text-center">
                         <Link to="/register-case" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                            {t('registerAnotherCase')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicAIResultPage;
