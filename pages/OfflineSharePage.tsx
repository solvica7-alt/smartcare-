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

        const nameEnglish = transliterateArabicToEnglish(report.patientName);
        const shortId = report.id.split('_')[1] || report.id;
        const displayId = `REF-${shortId}`;

        // Return the standard Text Format
        return `SMARTCARE REPORT
------------------------------
Name: ${nameEnglish}
Age: ${report.patientAge}
Triage: ${report.analysisResult.triage_color.toUpperCase()}
ID: ${displayId}`;
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
        if (activeTab === 'receive') {
            setScannedReport(null);
            setScanResult(null);
            setScanError(null);
            isScanningRef.current = false;

            const timer = setTimeout(() => {
                if (!scannerRef.current) {
                    try {
                        const scanner = new Html5QrcodeScanner(
                            "reader",
                            { fps: 10, qrbox: { width: 250, height: 250 } },
                            false
                        );
                        scannerRef.current = scanner;
                        scanner.render(onScanSuccess, onScanFailure);
                    } catch (e) {
                        // ignore init errors
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
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
                const reconstructedData: any = {
                    id: (jsonData.i || "Unknown") + "_" + Date.now(),
                    patientName: jsonData.n || "Unknown",
                    patientAge: jsonData.a || "0",
                    symptoms: [],
                    analysisResult: {
                        triage_color: jsonData.t || 'gray',
                        findings: "تم الاستلام عبر QR",
                        risk_level: 'Unknown',
                        red_flags: []
                    },
                    status: 'processed',
                    timestamp: Date.now(),
                    imagePreviews: []
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

                                    <p className="mt-4 text-sm text-gray-500">وجه كاميرا الجهاز الآخر للمسح</p>
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
                                    <p className="text-center mt-4 text-gray-500">وجه الكاميرا نحو QR Code جهاز المسعف الآخر.</p>
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