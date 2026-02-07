import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Patient, AnalysisResult } from '../types';
import SafetyNotice from '../components/SafetyNotice';

const PublicAIResultPage: React.FC = () => {
    const location = useLocation();
    const { patient, analysisResult, imagePreview } = (location.state || {}) as {
        patient: Patient;
        analysisResult: AnalysisResult;
        imagePreview: string;
    };

    if (!patient || !analysisResult) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                    <h1 className="text-xl font-bold text-red-600">خطأ في عرض البيانات</h1>
                    <p className="text-gray-600 mt-2">لم نتمكن من العثور على بيانات التحليل. يرجى المحاولة مرة أخرى.</p>
                    <Link to="/register-case" className="mt-6 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition">
                        العودة لتسجيل حالة جديدة
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full mx-auto bg-white p-8 rounded-lg shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">نتائج التحليل الأولي</h1>
                    <p className="text-gray-600 mt-1">هذه النتائج تم إنشاؤها بواسطة الذكاء الاصطناعي وهي ليست بديلاً عن التشخيص الطبي.</p>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Left Column: Image & Patient Data */}
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">الصورة المرفقة</h2>
                            <img src={imagePreview} alt="صورة طبية" className="w-full rounded-md border" />
                        </div>
                        <div>
                             <h2 className="text-xl font-semibold text-gray-700 mb-2">بيانات الحالة</h2>
                            <div className="space-y-1 text-sm bg-gray-50 p-3 rounded-md border">
                                <p><strong className="font-medium">الاسم:</strong> {patient.name}</p>
                                <p><strong className="font-medium">العمر:</strong> {patient.age}</p>
                                <p><strong className="font-medium">الأعراض:</strong> {patient.symptoms.join(', ')}</p>
                            </div>
                        </div>
                    </div>
                    {/* Right Column: AI Analysis */}
                    <div className="md:col-span-3 space-y-6">
                         <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">مستوى الخطورة المقدر</h2>
                            <div className={`p-4 rounded-md border-s-4 ${getRiskLevelClass(analysisResult.risk_level)}`}>
                                <p className="font-bold text-lg">{analysisResult.risk_level}</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">ملاحظات الذكاء الاصطناعي</h2>
                            <p className="text-gray-600 bg-gray-50 p-4 rounded-md border">{analysisResult.findings}</p>
                        </div>
                         <div>
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">علامات تحذيرية تستدعي الانتباه</h2>
                            {analysisResult.red_flags.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 bg-red-50 p-4 rounded-md border border-red-200">
                                    {analysisResult.red_flags.map((flag, index) => (
                                        <li key={index} className="text-red-700">{flag}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 bg-gray-50 p-4 rounded-md border">لم يتم رصد علامات تحذيرية واضحة.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                    <SafetyNotice />
                    <div className="mt-4 text-center">
                         <Link to="/register-case" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                            تسجيل حالة أخرى
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicAIResultPage;
