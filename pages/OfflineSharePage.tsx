import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { QrCodeIcon, CameraIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import QRCode from 'react-qr-code';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Html5QrcodeScanner } from 'html5-qrcode';

const OfflineSharePage: React.FC = () => {
    const location = useLocation();
    const { reports, importReport } = useReports();
    const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
    const [selectedReportId, setSelectedReportId] = useState<string>(location.state?.selectedReportId || '');
    const [qrData, setQrData] = useState<string>('');
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scannedReport, setScannedReport] = useState<any | null>(null);
    const [manualData, setManualData] = useState<string>('');

    // Ref to track scanning state
    const isScanningRef = useRef<boolean>(false);
    const scannerRef = useRef<any>(null);

    const fromBase64 = (base64: string) => {
        try {
            const binString = atob(base64);
            const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
            return new TextDecoder().decode(bytes);
        } catch (e) { return ""; }
    };

    const transliterateArabicToEnglish = (text: string) => {
        const map: { [key: string]: string } = {
            'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'A', 'ى': 'A', 'ب': 'B', 'ت': 'T', 'ث': 'TH',
            'j': 'J', 'ح': 'H', 'خ': 'KH', 'د': 'D', 'ذ': 'TH', 'ر': 'R', 'ز': 'Z',
            'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'A',
            'غ': 'GH', 'ف': 'F', 'ق': 'Q', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N',
            'ه': 'H', 'و': 'W', 'ي': 'Y', 'ة': 'H', ' ': ' ', 'ئ': 'E', 'ء': 'A',
            'ؤ': 'O', 'لا': 'LA'
        };
        return text.split('').map(char => map[char] || char).join('').toUpperCase();
    };

    const getReportPayload = (reportId: string): string => {
        const report = reports.find(r => r.id === reportId);
        if (!report) return '';

        // We use a compressed JSON format to fit inside QR/SMS
        // Omitting images as they are too large for offline P2P text transfer
        const payload = {
            n: report.patientName,
            a: report.patientAge,
            s: report.symptoms.join(','),
            t: report.analysisResult.triage_color,
            f: report.analysisResult.findings,
            l: report.location ? `${report.location.lat},${report.location.lng}` : '',
            i: report.id.split('_')[1] || report.id
        };

        return `QR2|${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
    };

    useEffect(() => {
        if (selectedReportId) {
            setQrData(getReportPayload(selectedReportId));
            setActiveTab('send');
        }
    }, [selectedReportId]);

    // Cleanup Only
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                try { scannerRef.current.clear(); } catch (e) { }
                scannerRef.current = null;
            }
            isScanningRef.current = false;
        };
    }, []);

    // Scanner Initialization - Simple & Stable
    useEffect(() => {
        let scanner: any = null;

        if (activeTab === 'receive') {
            setScannedReport(null);
            setScanResult(null);
            setScanError(null);
            isScanningRef.current = false;

            const timer = setTimeout(() => {
                try {
                    scanner = new Html5QrcodeScanner(
                        "reader",
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0,
                            showTorchButtonIfSupported: true
                        },
                        /* verbose= */ false
                    );
                    scannerRef.current = scanner;
                    scanner.render(onScanSuccess, (error: any) => {
                        // Suppress frequent framing errors, only log if critical
                        if (error?.includes?.("Camera not found") || error?.includes?.("Permission denied")) {
                            setScanError("خطأ: تعذر الوصول للكاميرا. تأكد من منح الأذن.");
                        }
                    });
                } catch (e) {
                    console.error("Scanner Init Error", e);
                    setScanError("حدث خطأ أثناء تشغيل الماسح.");
                }
            }, 500); // Increased delay for better stability

            return () => {
                clearTimeout(timer);
                if (scanner) {
                    try { scanner.clear(); } catch (e) { }
                }
            };
        } else {
            if (scannerRef.current) {
                try { scannerRef.current.clear(); } catch (e) { }
                scannerRef.current = null;
            }
        }
    }, [activeTab]);

    const onScanSuccess = (decodedText: string) => {
        if (isScanningRef.current === true) return;
        isScanningRef.current = true;

        try {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }

            let jsonData: any = null;

            // Support ALL formats (Old & New)
            if (decodedText.includes("SMARTCARE REPORT")) {
                const lines = decodedText.split('\n');
                const getData = (key: string) => lines.find(l => l.toUpperCase().includes(key.toUpperCase()))?.split(':')[1]?.trim() || '';
                if (getData('NAME')) {
                    jsonData = {
                        n: getData('NAME'),
                        a: getData('AGE'),
                        t: getData('TRIAGE').toLowerCase(),
                        i: getData('ID')
                    };
                }
            } else if (decodedText.startsWith("{")) {
                jsonData = JSON.parse(decodedText);
            } else if (decodedText.startsWith("QR2|")) {
                const base64 = decodedText.split('|')[1];
                const jsonString = fromBase64(base64);
                jsonData = JSON.parse(jsonString);
            } else if (decodedText.startsWith("QR1|")) {
                const base64 = decodedText.split('|')[1];
                const jsonString = decodeURIComponent(escape(window.atob(base64)));
                jsonData = JSON.parse(jsonString);
            }

            if (jsonData) {
                // Parse location if exists
                let loc = undefined;
                if (jsonData.l && typeof jsonData.l === 'string' && jsonData.l.includes(',')) {
                    const [lat, lng] = jsonData.l.split(',');
                    loc = { lat: parseFloat(lat), lng: parseFloat(lng) };
                }

                const reconstructedData: any = {
                    id: (jsonData.i || "Unknown") + "_" + Date.now(),
                    patientName: jsonData.n || "Unknown",
                    patientAge: jsonData.a || "0",
                    symptoms: jsonData.s ? jsonData.s.split(',') : [],
                    analysisResult: {
                        triage_color: jsonData.t || 'gray',
                        findings: jsonData.f || "تم الاستلام عبر المشاركة بدون إنترنت",
                        risk_level: 'Unknown',
                        red_flags: []
                    },
                    status: 'processed',
                    timestamp: Date.now(),
                    imagePreviews: [],
                    location: loc
                };

                importReport(reconstructedData);
                setScannedReport(reconstructedData);
                setScanResult("Success");
            } else {
                setScanError("بيانات QR غير مفهومة.");
                setTimeout(() => { isScanningRef.current = false; }, 2000); // Allow retry
            }
        } catch (e) {
            console.error("Scan Error", e);
            setScanError("تعذر قراءة بيانات الحالة.");
            isScanningRef.current = false;
        }
    };

    const handleManualSubmit = () => {
        if (!manualData.trim()) return;
        onScanSuccess(manualData.trim());
        setManualData('');
    };

    const onScanFailure = (error: any) => { };

    return (
        <div className="max-w-4xl mx-auto" dir="rtl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">الجسر الجوي للبيانات (Offline Data Bridge)</h1>
                <p className="text-gray-600 dark:text-gray-300">
                    نقل بيانات المرضى بين الأجهزة دون الحاجة للإنترنت.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="flex border-b dark:border-gray-700">
                    <button
                        className={`flex-1 py-4 text-center font-bold flex justify-center items-center ${activeTab === 'send' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setActiveTab('send')}
                    >
                        <QrCodeIcon className="h-5 w-5 me-2" />
                        إرسال حالة (Generate QR)
                    </button>
                    <button
                        className={`flex-1 py-4 text-center font-bold flex justify-center items-center ${activeTab === 'receive' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setActiveTab('receive')}
                    >
                        <CameraIcon className="h-5 w-5 me-2" />
                        استلام حالة (Scan QR)
                    </button>
                </div>

                <div className="p-8">
                    {activeTab === 'send' ? (
                        <div className="flex flex-col items-center">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 w-full max-w-md">اختر التقرير للإرسال</label>
                            <select
                                className="block w-full max-w-md p-2 mb-6 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={selectedReportId}
                                onChange={(e) => setSelectedReportId(e.target.value)}
                            >
                                <option value="">-- اختر حالة من القائمة --</option>
                                {reports.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.patientName} - {r.analysisResult.triage_color.toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            {selectedReportId && qrData ? (
                                <div className="text-center bg-white p-4 rounded-xl border shadow-inner flex flex-col items-center w-full max-w-md">
                                    <div className="bg-white p-2">
                                        <QRCode
                                            value={qrData}
                                            size={200}
                                            level="L"
                                            fgColor="#000000"
                                            bgColor="#FFFFFF"
                                        />
                                    </div>
                                    <p className="mt-4 text-sm text-gray-500 font-semibold">وجه كاميرا الجهاز الآخر للمسح</p>

                                    <div className="w-full mt-6 pt-4 border-t border-gray-200">
                                        <p className="text-xs text-gray-400 mb-2">أو الإرسال للأجهزة البعيدة بدون إنترنت</p>
                                        <button
                                            onClick={() => {
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: 'SmartCare Report',
                                                        text: qrData
                                                    }).catch(console.error);
                                                } else {
                                                    // Fallback for desktop/unsupported: open SMS directly or copy
                                                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                                    if (isMobile) {
                                                        window.location.href = `sms:?body=${encodeURIComponent(qrData)}`;
                                                    } else {
                                                        navigator.clipboard.writeText(qrData);
                                                        alert("تم نسخ التقرير للحافظة! يمكنك إرساله عبر أي وسيلة.");
                                                    }
                                                }
                                            }}
                                            className="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition font-medium flex items-center justify-center shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                            مشاركة عبر SMS / تطبيقات أخرى
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <QrCodeIcon className="h-16 w-16 mx-auto mb-2 opacity-50" />
                                    <p>اختر تقريراً لعرض كود النقل</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            {!scannedReport ? (
                                <div className="w-full max-w-md">
                                    <div id="reader" className="w-full min-h-[300px] bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300"></div>
                                    <p className="text-center mt-4 text-gray-500">وجه الكاميرا نحو QR Code جهاز المسعف الآخر (للأجهزة القريبة).</p>
                                    
                                    <div className="mt-8 border-t border-gray-200 pt-6 w-full">
                                        <h3 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-2">أو لصق بيانات الحالة (للأجهزة البعيدة عبر SMS)</h3>
                                        <textarea
                                            value={manualData}
                                            onChange={(e) => setManualData(e.target.value)}
                                            placeholder="الصق نص التقرير المستلم عبر SMS هنا..."
                                            className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        ></textarea>
                                        <button
                                            onClick={handleManualSubmit}
                                            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition shadow"
                                        >
                                            تحميل بيانات الحالة
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full max-w-lg bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm text-center animate-fade-in-up">
                                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-green-800 mb-2">تم استلام الحالة بنجاح!</h3>

                                    <div className="bg-white p-4 rounded border my-4 text-right" dir="rtl">
                                        <p><strong>الاسم:</strong> {scannedReport.patientName}</p>
                                        <p><strong>السن:</strong> {scannedReport.patientAge}</p>
                                        <p><strong>التصنيف:</strong> {scannedReport.analysisResult.triage_color}</p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setScannedReport(null);
                                            setScanResult(null);
                                            isScanningRef.current = false;
                                        }}
                                        className="mt-2 text-indigo-600 font-bold hover:underline"
                                    >
                                        مسح حالة أخرى
                                    </button>
                                </div>
                            )}
                            {scanError && (
                                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md w-full max-w-md text-center">
                                    {scanError}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OfflineSharePage;