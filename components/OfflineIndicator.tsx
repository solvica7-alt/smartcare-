
import React, { useState, useEffect } from 'react';
import { WifiIcon } from '@heroicons/react/24/solid';

const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center shadow-md animate-pulse">
            <WifiIcon className="h-5 w-5 me-2" />
            أنت غير متصل بالإنترنت. سيتم حفظ البيانات محلياً ومزامنتها لاحقاً.
        </div>
    );
};

export default OfflineIndicator;
