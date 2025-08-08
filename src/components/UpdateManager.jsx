import { useEffect } from "react";
import { useLanguage } from "../localization/LanguageContext";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";

const UpdateManager = () => {
  const { translate } = useLanguage();

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Using static imports for Tauri v2 APIs

        console.log("Checking for updates...");
        const update = await check();

        if (update) {
          console.log("Found update:", {
            version: update.version,
            date: update.date,
            body: update.body,
          });

          // Silent update - download and install without user interaction
          try {
            console.log("Starting update download...");

            // Download and install the update
            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
              switch (event.event) {
                case "Started":
                  contentLength = event.data.contentLength || 0;
                  console.log(
                    `Started downloading ${event.data.contentLength} bytes`,
                  );
                  break;
                case "Progress":
                  downloaded += event.data.chunkLength || 0;
                  const progress =
                    contentLength > 0 ? (downloaded / contentLength) * 100 : 0;
                  console.log(`Download progress: ${progress.toFixed(1)}%`);
                  break;
                case "Finished":
                  console.log("Download completed");
                  break;
              }
            });

            console.log("Update installed successfully");

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
