import localforage from 'localforage';

export const storage = localforage.createInstance({
    name: 'SmartCareDB',
    storeName: 'app_data'
});

export const StorageKeys = {
    REPORTS: 'reports_data',
    CLINIC_ID: 'clinic_id_data',
    CHAT_HISTORY: 'chatbot_messages',
    TRANSLATION_HISTORY: 'translation_history',
    INVENTORY_HISTORY: 'inventory_history',
    COMPARE_HISTORY: 'compare_history',
    CRISIS_HISTORY: 'crisis_history',
    OFFLINE_QUEUE: 'offline_task_queue'
};

/**
 * Universal getter for async storage
 */
export const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
    try {
        const val = await storage.getItem<T>(key);
        return val !== null ? val : defaultValue;
    } catch (e) {
        console.error(`Error loading ${key} from storage`, e);
        return defaultValue;
    }
};

/**
 * Universal setter for async storage
 */
export const setData = async <T>(key: string, value: T): Promise<void> => {
    try {
        await storage.setItem(key, value);
    } catch (e) {
        console.error(`Error saving ${key} to storage`, e);
    }
};
