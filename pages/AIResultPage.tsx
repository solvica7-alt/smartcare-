import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Patient, AnalysisResult } from '../types';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';

const AIResultPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addReport } = useReports();
    const { patient, analysisResult, imagePreviews } = (location.state || {}) as {
        patient: Patient;
        analysisResult: AnalysisResult;
        imagePreviews: string[];
    };

    if (!patient || !analysisResult) {
        return (
            <div className="text-center p-8">
                <h1 className="text-xl font-bold">لم يتم العثور على بيانات التحليل.</h1>
                <p className="text-gray-600 mt-2">يرجى العودة وتقديم تقرير جديد.</p>
                <Link to="/new-patient" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-md">
                    العودة لصفحة التسجيل
                </Link>
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

    const handleCreateReport = () => {
        if (patient && analysisResult && imagePreviews) {
            const newReport = addReport(patient, analysisResult, imagePreviews);
            navigate(`/chat/${newReport.id}`);
        } else {
            console.error("Cannot create report: missing data.");
            navigate('/new-patient');
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">نتائج تحليل الذكاء الاصطناعي</h1>
            <div className="bg-white p-8 rounded-lg shadow-lg grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Patient & Image */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">بيانات المريض</h2>
                        <div className="space-y-1 text-sm">
                            <p><strong className="font-medium">الاسم:</strong> {patient.name}</p>
                            <p><strong className="font-medium">العمر:</strong> {patient.age}</p>
                            <p><strong className="font-medium">الأعراض:</strong> {patient.symptoms.join(', ')}</p>
                            {patient.detailedSymptoms && <p><strong className="font-medium">تفاصيل الأعراض:</strong> {patient.detailedSymptoms}</p>}
                            {patient.notes && <p><strong className="font-medium">ملاحظات:</strong> {patient.notes}</p>}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">الصور المرفقة</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {imagePreviews.map((src, index) => (
                                <img key={index} src={src} alt={`صورة طبية ${index + 1}`} className="w-full rounded-md border" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">مستوى الخطورة</h2>
                        <div className={`p-4 rounded-md border-s-4 ${getRiskLevelClass(analysisResult.risk_level)}`}>
                            <p className="font-bold text-lg">{analysisResult.risk_level}</p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">الملاحظات الأولية</h2>
                        <p className="text-gray-600 bg-gray-50 p-4 rounded-md border">{analysisResult.findings}</p>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">علامات تحذيرية</h2>
                        {(analysisResult.red_flags?.length || 0) > 0 ? (
                            <ul className="list-disc list-inside space-y-1 bg-red-50 p-4 rounded-md border border-red-200">
                                {analysisResult.red_flags?.map((flag, index) => (
                                    <li key={index} className="text-red-700">{flag}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 bg-gray-50 p-4 rounded-md border">لم يتم رصد علامات تحذيرية واضحة.</p>
                        )}
                    </div>

                    {analysisResult.medical_recommendations && analysisResult.medical_recommendations.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">توصيات طبية فورية</h2>
                            <ul className="list-disc list-inside space-y-1 bg-blue-50 p-4 rounded-md border border-blue-200">
                                {analysisResult.medical_recommendations.map((rec, index) => (
                                    <li key={index} className="text-blue-800">{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="pt-6 border-t">
                        <button
                            onClick={handleCreateReport}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
                        >
                            بدء محادثة مع طبيب متطوع
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIResultPage;