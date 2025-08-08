import { useEffect } from 'react';
import { useLanguage } from "../localization/LanguageContext";

const UpdateManager = () => {
  const { translate } = useLanguage();

  useEffect(() => {
    if (window.__TAURI__) {
      const checkForUpdates = async () => {
        try {
          const { updater, relaunch, dialog } = await import('../tauri-api-mock.js');
          const { checkUpdate } = updater;
          const { ask } = dialog;

          console.log("Checking for updates...");
          const { shouldUpdate, manifest } = await checkUpdate();

          if (shouldUpdate) {
            console.log('Found update:', manifest.version);

            // Silent update - download and install without user interaction
            try {
              await manifest.downloadAndInstall();
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

      checkForUpdates();
      const interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000); // 4 hours

      return () => clearInterval(interval);
    }
  }, [translate]);
  return null;
};

export default UpdateManager;
