import { useEffect } from 'react';
import { check } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';
import { ask } from '@tauri-apps/api/dialog';
import { useTranslation } from '../localization/LanguageContext';

const UpdateManager = () => {
  const { translate } = useTranslation();

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await check();
        
        if (update?.available) {
          console.log('Found update:', update.version);
          
          // Silent update - download and install without user interaction
          try {
            await update.downloadAndInstall();
            console.log('Update installed successfully');
            
            // Ask to restart (this can also be automatic)
            const shouldRestart = await ask(
              translate('Update installed successfully. Restart now?'),
              {
                title: translate('Update Available'),
                type: 'info',
                okLabel: translate('Restart Now'),
                cancelLabel: translate('Later'),
              }
            );
            
            if (shouldRestart) {
              await relaunch();
            }
          } catch (downloadError) {
            console.error('Failed to download update:', downloadError);
          }
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    // Check for updates on app start and every 4 hours
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000); // 4 hours

    return () => clearInterval(interval);
  }, [translate]);

  return null;
};

export default UpdateManager;