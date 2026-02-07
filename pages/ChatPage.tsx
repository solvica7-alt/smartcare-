import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import { Report } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { sendChatResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
    text: string;
    sender: 'user' | 'bot';
}

const ChatPage: React.FC = () => {
    const { reportId } = useParams<{ reportId: string }>();
    const { getReportById } = useReports();
    const [report, setReport] = useState<Report | undefined | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Derived state for system instruction
    const getSystemInstruction = (r: Report) => `
        أنت "استشاري أول لطب الطوارئ"، خبير في بروتوكول SBAR و START Triage.
        أنت الآن تناقش حالة المريض "${r.patientName}" مع زميل (طبيب أو مسعف).
        
        بيانات الحالة الحالية:
        - الاسم: ${r.patientName}
        - العمر: ${r.patientAge}
        - الأعراض الأساسية: ${r.symptoms.join(', ')}
        - الأعراض المفصلة: ${r.detailedSymptoms || 'لا يوجد'}
        - ملاحظات إضافية: ${r.notes || 'لا يوجد'}
        - تحليل الذكاء الاصطناعي الأولي:
          * مستوى الخطورة: ${r.analysisResult.risk_level}
          * النتائج: ${r.analysisResult.findings}
          * علامات الخطر (Red Flags): ${r.analysisResult.red_flags.join(', ') || 'لا يوجد'}
        
        تعليمات صارمة للرد:
        1. الرد باللغة العربية الطبية الاحترافية.
        2. استخدم بروتوكول SBAR عند الحاجة لتلخيص الحالة.
        3. استخدم الجداول (Markdown Tables) لتنظيم البيانات المعقدة أو المؤشرات الحيوية.
        4. كن مباشراً، دقيقاً، وقدم توصيات طبية مبنية على الأدلة والمؤشرات المذكورة.
        5. لا تكرر البيانات الأساسية إلا إذا طُلب منك ذلك للتوثيق.
    `;

    useEffect(() => {
        if (reportId) {
            const foundReport = getReportById(reportId);
            setReport(foundReport);
            if (foundReport && messages.length === 0) {
                // Initial message
                const initialBotMessage: ChatMessage = {
                    text: `مرحباً، أنا مساعدك الطبي. كيف يمكنني المساعدة بخصوص حالة ${foundReport.patientName}؟`,
                    sender: 'bot'
                };
                setMessages([initialBotMessage]);
            }
        }
    }, [reportId, getReportById]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading || !report) return;

        const userMessage: ChatMessage = { text: input, sender: 'user' };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const apiMessages = [
                { role: 'system' as const, content: getSystemInstruction(report) },
                ...newMessages.map(m => ({
                    role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                    content: m.text
                }))
            ];

            const responseText = await sendChatResponse(apiMessages);

            const botMessage: ChatMessage = { text: responseText, sender: 'bot' };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error sending message to AI:", error);
            const errorMessage: ChatMessage = { text: "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.", sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (report === null) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    if (report === undefined) {
        return <Navigate to="/reports" replace />;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200" dir="rtl">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">محادثة حول حالة: {report.patientName}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الخطورة: <span className="font-bold text-red-600">{report.analysisResult.risk_level}</span></p>
                </div>
                <Link to="/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">العودة للتقارير</Link>
            </div>

            <div className="flex-grow p-6 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] lg:max-w-2xl p-3 rounded-lg overflow-x-auto ${msg.sender === 'user'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm border dark:border-gray-600'
                            }`}>
                            <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-lg p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border dark:border-gray-600">
                            <LoadingSpinner message="يقوم المستشار بتحليل الحالة..." />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 space-x-reverse mt-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="اكتب سؤالك هنا..."
                        className="flex-grow block w-full px-4 py-3 text-gray-700 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button type="submit" className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 shadow-md transform active:scale-95 transition-all disabled:bg-gray-300 dark:disabled:bg-gray-600" disabled={isLoading || !input.trim()}>
                        <PaperAirplaneIcon className="h-6 w-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;
