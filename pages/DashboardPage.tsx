import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { DocumentPlusIcon, ChatBubbleLeftRightIcon, ArrowUpRightIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon, MapPinIcon, CloudIcon, SignalIcon } from '@heroicons/react/24/solid';
import { FAQ_DATA } from '../constants';
import { FaqItem } from '../types';

const DashboardPage: React.FC = () => {
    const { reports, clinicId, setClinicId, triggerSync, isSyncing } = useReports();
    const isOnline = navigator.onLine;

    // START Protocol colors
    const redCount = reports.filter(r => r.analysisResult.triage_color === 'red').length;
    const yellowCount = reports.filter(r => r.analysisResult.triage_color === 'yellow').length;
    const greenCount = reports.filter(r => r.analysisResult.triage_color === 'green').length;
    const blackCount = reports.filter(r => r.analysisResult.triage_color === 'black').length;

    const criticalReports = reports.filter(r => r.analysisResult.triage_color === 'red');

    // Alert for critical cases
    useEffect(() => {
        if (criticalReports.length > 0) {
            // TODO: Check for new critical reports since last visit
        }
    }, [criticalReports.length]);

    return (
        <div className="space-y-8" dir="rtl">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">لوحة التحكم والمراقبة</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">نظام إدارة الكوارث والفرز الطبي الموحد.</p>
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <SignalIcon className="h-4 w-4 me-1" />
                    {isOnline ? 'متصل بالشبكة' : 'يعمل في وضع الأوفلاين'}
                </div>
            </div>

            {/* Cloud Sync Setup */}
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900/30 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center mb-1">
                            <CloudIcon className="h-5 w-5 text-blue-500 me-2" />
                            إعدادات المزامنة السحابية (Cloud Hub)
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">استخدم "كود العيادة" المشترك لربط المتصفح، التطبيق، وبرنامج الكمبيوتر مع زملائك.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <input
                            type="text"
                            value={clinicId}
                            onChange={(e) => setClinicId(e.target.value)}
                            placeholder="أدخل كود العيادة (مثلاً: GAZA-1)"
                            className="w-full sm:w-64 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-center sm:text-right"
                        />
                        <button
                            onClick={triggerSync}
                            disabled={isSyncing || !clinicId || !isOnline}
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center justify-center whitespace-nowrap ${isSyncing ? 'bg-blue-100 text-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'} disabled:opacity-50 w-full sm:w-auto`}
                        >
                            {isSyncing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent me-2"></div>
                                    جاري الربط...
                                </>
                            ) : 'مزامنة الآن'}
                        </button>
                    </div>
                </div>
                {clinicId && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-700 flex items-center text-xs text-gray-500">
                        <div className={`h-2 w-2 rounded-full me-2 ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                        جهازك مرتبط حالياً بـ: <span className="font-bold text-blue-600 dark:text-blue-400 mx-1">{clinicId}</span>
                        (سيتم سحب تقارير الزملاء تلقائياً كل 30 ثانية)
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="أحمر (فوري)" value={redCount} color="red" />
                <StatCard title="أصفر (مؤجل)" value={yellowCount} color="yellow" />
                <StatCard title="أخضر (بسيط)" value={greenCount} color="green" />
                <StatCard title="أسود (وفاة/ميئوس)" value={blackCount} color="black" />
            </div>

            {/* Critical Cases */}
            {criticalReports.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 animate-pulse-slow">
                    <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4 flex items-center">
                        <ExclamationTriangleIcon className="h-6 w-6 me-2" />
                        حالات حرجة (Red Code) - تتطلب إخلاء فوري
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {criticalReports.map(report => (
                            <div key={report.id} className="bg-white dark:bg-gray-800 border-s-4 border-red-500 rounded-lg shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{report.patientName}</h3>
                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold">Immediate</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">العمر: {report.patientAge}</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                                        {report.analysisResult.findings}
                                    </p>
                                    {report.location && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${report.location.lat},${report.location.lng}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-blue-500 hover:underline flex items-center mb-2"
                                        >
                                            <MapPinIcon className="h-3 w-3 me-1" /> الموقع
                                        </a>
                                    )}
                                </div>
                                <Link to={`/chat/${report.id}`} className="text-red-600 dark:text-red-400 text-sm font-semibold hover:text-red-800 flex items-center justify-end mt-2">
                                    متابعة الحالة <ArrowUpRightIcon className="h-4 w-4 ms-1" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <QuickActionButton
                        title="تسجيل مريض جديد"
                        description="إضافة بيانات وصور لحالة جديدة للتحليل."
                        icon={DocumentPlusIcon}
                        href="/new-patient"
                    />
                    <QuickActionButton
                        title="إدارة المخزون الطبي"
                        description="اقتراحات الذكاء الاصطناعي للمستلزمات."
                        icon={ClipboardDocumentListIcon}
                        href="/inventory"
                    />
                    <QuickActionButton
                        title="المستشار السريري"
                        description="استعلام عن الحالات والبيانات."
                        icon={ChatBubbleLeftRightIcon}
                        href="/chatbot"
                    />
                </div>

                {/* Recent Updates */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">آخر التحديثات الميدانية</h2>
                    {reports.length > 0 ? (
                        <ul className="space-y-3">
                            {reports.slice(0, 5).map(report => (
                                <li key={report.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{report.patientName}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Triage: <span className={`font-bold ${getTriageColorClass(report.analysisResult.triage_color)}`}>
                                                {report.analysisResult.triage_color.toUpperCase()}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {report.location && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${report.location.lat},${report.location.lng}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500">
                                                <MapPinIcon className="h-5 w-5" />
                                            </a>
                                        )}
                                        <Link to={`/chat/${report.id}`} className="text-sm text-blue-600 hover:underline">
                                            عرض
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد تقارير مسجلة حتى الآن.</p>
                    )}
                </div>
            </div>

            {/* Protocols */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">بروتوكولات الإسعاف (Offline Reference)</h2>
                <div className="space-y-4">
                    {FAQ_DATA.map((item: FaqItem, index) => (
                        <details key={index} className="group p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <summary className="font-semibold text-gray-800 dark:text-gray-200 cursor-pointer list-none flex justify-between items-center">
                                {item.q}
                                <span className="transition group-open:rotate-180">
                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                </span>
                            </summary>
                            <p className="text-gray-600 dark:text-gray-300 mt-3">{item.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: number; color: 'blue' | 'red' | 'yellow' | 'green' | 'black' }> = ({ title, value, color }) => {
    const colors = {
        blue: 'border-blue-500 bg-blue-50 text-blue-800',
        red: 'border-red-500 bg-red-50 text-red-800',
        yellow: 'border-yellow-500 bg-yellow-50 text-yellow-800',
        green: 'border-green-500 bg-green-50 text-green-800',
        black: 'border-gray-800 bg-gray-200 text-gray-900', // Black code styling
    };
    return (
        <div className={`p-4 rounded-lg shadow-md border-s-4 ${colors[color] || colors.blue} dark:bg-opacity-80`}>
            <h3 className="text-sm font-medium opacity-80">{title}</h3>
            <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
    );
};

const QuickActionButton: React.FC<{ title: string, description: string, icon: React.ElementType, href: string }> = ({ title, description, icon: Icon, href }) => (
    <Link to={href} className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow group border border-transparent hover:border-blue-500">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center space-s-3">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
            <ArrowUpRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
        </div>
    </Link>
);

const getTriageColorClass = (color: string) => {
    switch (color) {
        case 'red': return 'text-red-600';
        case 'yellow': return 'text-yellow-600';
        case 'green': return 'text-green-600';
        case 'black': return 'text-gray-900 font-black';
        default: return 'text-gray-600';
    }
};

export default DashboardPage;
