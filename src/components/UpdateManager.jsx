import { useEffect } from "react";
import { useLanguage } from "../localization/LanguageContext";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";

const UpdateManager = () => {
    const checkForUpdates = async () => {
      try {
        // Dynamically import Tauri v1 APIs
         const { checkUpdate } = await import('@tauri-apps/api/updater');
         const { relaunch } = await import('@tauri-apps/api/process');
         const { ask } = await import('@tauri-apps/api/dialog');
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
                  console.log("Download completed");
    // Check for updates on app start and every 4 hours
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000); // 4 hours

    return () => clearInterval(interval);
            // Ask to restart (this can also be automatic)
            const shouldRestart = await ask(
              translate("Update installed successfully. Restart now?"),
              {
                title: translate("Update Available"),
                kind: "info",
                okLabel: translate("Restart Now"),
                cancelLabel: translate("Later"),
              },
            );

            if (shouldRestart) {
              await relaunch();
            }
          } catch (downloadError) {
            console.error("Failed to download/install update:", downloadError);
          }
        } else {
          console.log("No updates available");
        }
      } catch (error) {
        // Only log error if it's not a "failed to check for updates" error
        // This prevents spam in console when offline or when updates are not configured
        if (!error.message?.includes("failed to check for updates")) {
          console.error("Failed to check for updates:", error);
        }
      }
    };

    // Check for updates on app start
    checkForUpdates();

    // Check for updates every 4 hours
    const interval = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [translate]);

  return null;
};

export default UpdateManager;
