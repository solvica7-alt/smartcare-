import React, { useState, useEffect } from 'react';
import { WifiIcon, SignalSlashIcon } from '@heroicons/react/24/solid';
import { useI18n } from '../context/I18nContext';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useI18n();

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
    <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2">
      <SignalSlashIcon className="h-5 w-5" />
      {t('offline')}
    </div>
  );
};

export default OfflineIndicator;
