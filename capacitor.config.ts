// @ts-ignore
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.smartcare.app',
    appName: 'SmartCare',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
