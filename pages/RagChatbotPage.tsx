import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getClinicalAssistantResponse, sendChatResponse } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PaperAirplaneIcon, MicrophoneIcon, PaperClipIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useReports } from '../context/ReportContext';
import { useI18n } from '../context/I18nContext';
import { getData, setData, StorageKeys } from '../services/StorageService';
import { OfflineQueueService } from '../services/OfflineQueueService';

interface ChatMessage {
    text: string;
    sender: 'user' | 'bot';
    attachments?: { data: string; mimeType: string }[];
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: string;
}

const RagChatbotPage: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [attachments, setAttachments] = useState<{ data: string; mimeType: string }[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const { reports } = useReports();
    const { t, dir } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

    // Load initial history
    useEffect(() => {
        getData<ChatSession[]>(StorageKeys.CHAT_HISTORY, []).then(saved => {
            // Migration: if saved is an array of messages instead of sessions
            if (saved.length > 0 && !('messages' in saved[0])) {
                const legacySession: ChatSession = {
                    id: Date.now().toString(),
                    title: "محادثة سابقة",
                    messages: saved as any,
                    updatedAt: new Date().toISOString()
                };
                setSessions([legacySession]);
                setCurrentSessionId(legacySession.id);
            } else {
                setSessions(saved);
                if (saved.length > 0) setCurrentSessionId(saved[0].id);
            }
            setIsLoaded(true);
        });
    }, []);

    // Save history when it changes
    useEffect(() => {
        if (isLoaded) {
            setData(StorageKeys.CHAT_HISTORY, sessions);
        }
    }, [sessions, isLoaded]);

    const handleNewChat = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: "محادثة جديدة",
            messages: [],
            updatedAt: new Date().toISOString()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
    };

    const updateCurrentSession = (newMessages: ChatMessage[]) => {
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                return {
                    ...s,
                    messages: newMessages,
                    title: newMessages.length === 1 ? newMessages[0].text.substring(0, 30) : s.title,
                    updatedAt: new Date().toISOString()
                };
            }
            return s;
        }));
    };

    const quickQuestions = [
        t('q1'),
        t('q2'),
        t('q3'),
        t('q4'),
    ];

    const handleSendMessage = async (e?: React.FormEvent, customInput?: string) => {
        if (e) e.preventDefault();
        const finalInput = customInput || input;
        if ((finalInput.trim() === '' && attachments.length === 0) || isLoading) return;

        const userMessage: ChatMessage = {
            text: finalInput,
            sender: 'user',
            attachments: attachments.length > 0 ? [...attachments] : undefined
        };

        const updatedMessages = [...currentMessages, userMessage];
        updateCurrentSession(updatedMessages);
        
        const currentInput = finalInput;
        const currentAttachments = [...attachments];

        setInput('');
        setAttachments([]);
        setIsLoading(true);

        if (!navigator.onLine) {
            await OfflineQueueService.enqueueTask('CHAT', { text: currentInput, reports });
            const botMessage: ChatMessage = { text: t('chatbotOffline'), sender: 'bot' };
            updateCurrentSession([...updatedMessages, botMessage]);
            setIsLoading(false);
            return;
        }

        try {
            let botResponse: string;

            if (currentAttachments.length === 0) {
                botResponse = await getClinicalAssistantResponse(currentInput, reports);
            } else {
                const fullConversation = [
                    { role: 'system' as const, content: 'أنت مساعد طبي خبير. قم بتحليل الملفات المرفقة (صور أو PDF) والرد بدقة طبية عالية باللغة العربية.' },
                    ...messages.map(m => ({
                        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                        content: m.text,
                        attachments: m.attachments
                    })),
                    { role: 'user' as const, content: currentInput, attachments: currentAttachments }
                ];
                botResponse = await sendChatResponse(fullConversation);
            }

            const botMessage: ChatMessage = { text: botResponse, sender: 'bot' };
            updateCurrentSession([...updatedMessages, botMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { text: t('chatbotError'), sender: 'bot' };
            updateCurrentSession([...updatedMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuestionClick = (q: string) => {
        handleSendMessage(undefined, q);
    };

    const startRecording = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert(t('browserNoSpeech'));
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + ' ' + transcript);
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: { data: string; mimeType: string }[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            const fileData = await new Promise<string>((resolve) => {
                reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
                reader.readAsDataURL(file);
            });

            newAttachments.push({
                data: fileData,
                mimeType: file.type
            });
        }

        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-colors duration-200" dir={dir}>
            {/* Sidebar for Sessions */}
            <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b dark:border-gray-700">
                    <button onClick={handleNewChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition shadow-sm">
                        + محادثة جديدة
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => setCurrentSessionId(s.id)}
                            className={`p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition ${currentSessionId === s.id ? 'bg-gray-200 dark:bg-gray-700 border-l-4 border-l-blue-500' : ''}`}
                        >
                            <p className="font-semibold text-gray-800 dark:text-white truncate">{s.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(s.updatedAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('chatbotTitle')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('chatbotSub')}</p>
                    </div>
                </div>

                <div className="flex-grow p-4 lg:p-6 overflow-y-auto space-y-4">
                    {currentMessages.length === 0 && (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                            <MicrophoneIcon className="h-12 w-12 mx-auto mb-4 text-blue-500 opacity-20" />
                            <p className="mb-4 text-lg">{t('chatbotEmptyTitle')}</p>
                        </div>
                    )}
                    {currentMessages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] lg:max-w-2xl p-3 rounded-lg overflow-x-auto ${msg.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm border dark:border-gray-600'
                            }`}>
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {msg.attachments.map((att, i) => (
                                        att.mimeType.startsWith('image/') ? (
                                            <img key={i} src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="h-20 w-20 object-cover rounded border border-white/20" />
                                        ) : (
                                            <div key={i} className="h-20 w-20 flex items-center justify-center bg-white/10 rounded border border-white/20 text-[10px] text-center p-1">
                                                {t('filePrefix')} {att.mimeType.split('/')[1].toUpperCase()}
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
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
                            <LoadingSpinner message={t('chatbotProcessing')} />
                        </div>
                    </div>
                )}
                </div>

                <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                    {currentMessages.length === 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                        {quickQuestions.map((q: string, index: number) => (
                            <button
                                key={index}
                                onClick={() => handleQuestionClick(q)}
                                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {attachments.map((att, i) => (
                            <div key={i} className="relative group">
                                {att.mimeType.startsWith('image/') ? (
                                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="h-16 w-16 object-cover rounded-md" />
                                ) : (
                                    <div className="h-16 w-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-md text-xs font-bold text-blue-600 dark:text-blue-300">
                                        {att.mimeType.split('/')[1].toUpperCase()}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(i)}
                                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center space-x-2 space-x-reverse">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 transition-colors"
                        title={t('attachFile')}
                    >
                        <PaperClipIcon className="h-6 w-6" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                    />

                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isRecording ? t('listening') : t('chatbotPlaceholder')}
                            className="w-full pl-12 pr-4 py-3 text-gray-700 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:text-blue-500'
                                }`}
                        >
                            {isRecording ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 shadow-md transform active:scale-95 transition-all disabled:bg-gray-300 dark:disabled:bg-gray-600"
                        disabled={isLoading || (input.trim() === '' && attachments.length === 0)}
                    >
                        <PaperAirplaneIcon className="h-6 w-6" />
                    </button>
                </form>
            </div>
            </div>
        </div>
    );
};

export default RagChatbotPage;