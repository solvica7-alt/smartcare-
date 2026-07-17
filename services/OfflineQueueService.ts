import { getData, setData, StorageKeys } from './StorageService';
import { translateText, generateInventorySuggestion, compareMedicalImages, getClinicalAssistantResponse } from './geminiService';

export interface OfflineTask {
    id: string;
    type: 'TRANSLATE' | 'INVENTORY' | 'COMPARE' | 'CHAT' | 'CRISIS';
    payload: any;
    timestamp: string;
    status: 'pending' | 'processing' | 'failed';
}

export const OfflineQueueService = {
    async enqueueTask(type: OfflineTask['type'], payload: any) {
        const queue = await getData<OfflineTask[]>(StorageKeys.OFFLINE_QUEUE, []);
        const newTask: OfflineTask = {
            id: Date.now().toString(),
            type,
            payload,
            timestamp: new Date().toLocaleString('ar-SA'),
            status: 'pending'
        };
        await setData(StorageKeys.OFFLINE_QUEUE, [...queue, newTask]);
        return newTask;
    },

    async processQueue() {
        if (!navigator.onLine) return;

        let queue = await getData<OfflineTask[]>(StorageKeys.OFFLINE_QUEUE, []);
        const pendingTasks = queue.filter(t => t.status === 'pending');
        if (pendingTasks.length === 0) return;

        // Mark as processing
        queue = queue.map(t => t.status === 'pending' ? { ...t, status: 'processing' } : t);
        await setData(StorageKeys.OFFLINE_QUEUE, queue);

        const newQueue = [...queue];

        for (const task of pendingTasks) {
            try {
                if (task.type === 'TRANSLATE') {
                    const { text, targetLang } = task.payload;
                    const result = await translateText(text, targetLang);
                    
                    // Add to Translation History directly
                    const history = await getData<any[]>(StorageKeys.TRANSLATION_HISTORY, []);
                    await setData(StorageKeys.TRANSLATION_HISTORY, [{
                        id: task.id,
                        source: text,
                        result,
                        targetLang,
                        timestamp: task.timestamp
                    }, ...history]);

                } else if (task.type === 'INVENTORY') {
                    const { reports } = task.payload;
                    const result = await generateInventorySuggestion(reports);
                    
                    const history = await getData<any[]>(StorageKeys.INVENTORY_HISTORY, []);
                    await setData(StorageKeys.INVENTORY_HISTORY, [{
                        id: task.id,
                        suggestion: result,
                        timestamp: task.timestamp
                    }, ...history]);

                } else if (task.type === 'CHAT') {
                    const { text, reports } = task.payload;
                    const result = await getClinicalAssistantResponse(text, reports);
                    
                    const history = await getData<any[]>(StorageKeys.CHAT_HISTORY, []);
                    // Update the "pending" message in history to be the bot response
                    const newMsg = { text: result, sender: 'bot' };
                    await setData(StorageKeys.CHAT_HISTORY, [...history, newMsg]);
                }
                
                // Remove successful task
                const idx = newQueue.findIndex(t => t.id === task.id);
                if (idx > -1) newQueue.splice(idx, 1);

            } catch (error) {
                console.error(`Failed offline task ${task.id}`, error);
                // Mark failed to retry later
                const idx = newQueue.findIndex(t => t.id === task.id);
                if (idx > -1) newQueue[idx].status = 'pending';
            }
        }

        await setData(StorageKeys.OFFLINE_QUEUE, newQueue);
    }
};

// Auto-process when online
window.addEventListener('online', () => {
    OfflineQueueService.processQueue();
});
