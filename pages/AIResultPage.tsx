import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Patient, AnalysisResult } from '../types';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { ClipboardDocumentListIcon, ShieldExclamationIcon, HeartIcon, IdentificationIcon, ChartBarIcon } from '@heroicons/react/24/solid';

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
        <div className="max-w-5xl mx-auto mb-10">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                
                {/* Header section representing a formal medical record */}
                <div className="bg-gradient-to-l from-blue-900 to-blue-700 p-8 text-white relative">
                    <div className="absolute top-4 left-4 opacity-20">
                        <ChartBarIcon className="w-32 h-32" />
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end z-10 relative">
                        <div>
                            <h1 className="text-3xl font-black mb-2 flex items-center">
                                <ClipboardDocumentListIcon className="w-8 h-8 ml-2" />
                                تقرير طبي تشخيصي (مبدئي)
                            </h1>
                            <p className="text-blue-200 text-lg font-medium">نظام SmartCare لتحليل البيانات السريرية</p>
                        </div>
                        <div className="mt-4 md:mt-0 text-left bg-blue-950/40 px-4 py-2 rounded-lg border border-blue-600/50">
                            <p className="text-xs text-blue-200 uppercase tracking-widest mb-1">رقم التقرير السجل</p>
                            <p className="font-mono font-bold text-lg">#MR-{Date.now().toString().slice(-6)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Right/Main Column: Patient Info & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Section 1: Patient Identity */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center border-b pb-2 dark:border-gray-700">
                                <IdentificationIcon className="w-6 h-6 ml-2 text-blue-600 dark:text-blue-400" />
                                البيانات الديموغرافية والسريرية
                            </h2>
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">اسم المريض</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg">{patient.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">العمر المقدر</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg">{patient.age} سنة</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">الأعراض الظاهرة</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {patient.symptoms.map((sym, i) => (
                                                <span key={i} className="px-3 py-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-full text-sm font-medium shadow-sm text-gray-700 dark:text-gray-200">
                                                    {sym}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {patient.detailedSymptoms && (
                                        <div className="col-span-2 mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">الشكوى الرئيسية (تفصيلاً)</p>
                                            <p className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-700 mt-1">{patient.detailedSymptoms}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Clinical Findings */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center border-b pb-2 dark:border-gray-700">
                                <HeartIcon className="w-6 h-6 ml-2 text-red-500" />
                                الفحص السريري (تحليل الذكاء الاصطناعي)
                            </h2>
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                <p className="text-gray-800 dark:text-gray-200 leading-relaxed font-medium whitespace-pre-wrap">
                                    {analysisResult.findings}
                                </p>
                            </div>
                        </section>

                        {/* Section 3: Red Flags */}
                        <section>
                            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4 flex items-center border-b pb-2 dark:border-gray-700 border-red-200">
                                <ShieldExclamationIcon className="w-6 h-6 ml-2 text-red-600" />
                                المؤشرات الحرجة (Red Flags)
                            </h2>
                            {(analysisResult.red_flags?.length || 0) > 0 ? (
                                <ul className="space-y-3">
                                    {analysisResult.red_flags?.map((flag, index) => (
                                        <li key={index} className="flex items-start bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-900/50">
                                            <span className="text-red-600 ml-2 mt-0.5">⚠️</span>
                                            <span className="text-red-800 dark:text-red-300 font-semibold">{flag}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-md border border-green-200 dark:border-green-800/50 font-medium">
                                    ✓ لم يتم رصد مؤشرات حيوية خطيرة. الحالة مستقرة مبدئياً.
                                </div>
                            )}
                        </section>

                        {/* Section 4: Recommendations */}
                        {analysisResult.medical_recommendations && analysisResult.medical_recommendations.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400 mb-4 flex items-center border-b pb-2 dark:border-gray-700 border-blue-200">
                                    خطة التدخل الطبي الفوري
                                </h2>
                                <ul className="space-y-2">
                                    {analysisResult.medical_recommendations.map((rec, index) => (
                                        <li key={index} className="flex items-center text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700 shadow-sm">
                                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm ml-3 font-bold">{index + 1}</span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Left Column: Triage, Images, Actions */}
                    <div className="space-y-6">
                        
                        {/* Triage Badge */}
                        <div className={`p-6 rounded-xl border shadow-sm text-center ${getRiskLevelClass(analysisResult.risk_level)}`}>
                            <p className="text-sm uppercase tracking-wider font-bold mb-2 opacity-80">تصنيف بروتوكول START</p>
                            <p className="text-4xl font-black mb-1">{analysisResult.risk_level}</p>
                            <p className="text-sm font-medium mt-2">التصنيف اللوني: {analysisResult.triage_color || 'غير محدد'}</p>
                        </div>

                        {/* Attached Images */}
                        {imagePreviews.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 text-center uppercase">المرفقات الإشعاعية/البصرية</h3>
                                <div className="space-y-3">
                                    {imagePreviews.map((src, index) => (
                                        <div key={index} className="rounded-md overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm relative group">
                                            <img src={src} alt={`صورة طبية ${index + 1}`} className="w-full h-auto object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">مرفق {index + 1}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-6">
                            <button
                                onClick={handleCreateReport}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-lg">حفظ التقرير وفتح الاستشارة</span>
                                <span className="text-xs font-normal opacity-80">إرسال لغرفة الطبيب عبر Cloud Hub</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIResultPage;