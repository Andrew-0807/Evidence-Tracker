export const process = {};
export const app = {};
export const window = {};
export const path = {};
export const fs = {};
export const shell = {};
export const event = {};
export const cli = {};
export const os = {};
export const http = {};
export const notification = {};
export const tauri = {};

export const updater = {
  checkUpdate: async () => ({ shouldUpdate: false, manifest: null }),
  downloadAndInstall: async () => {},
};

export const dialog = {
  ask: async (message, options) => {
    console.warn(`Mocked dialog.ask called with message: ${message}`);
    return false; // Default to 'cancel' for mock
  },
};

export function relaunch() {
  console.warn('Mocked relaunch called');
}

export async function invoke(cmd, args) {
  console.warn(`Mocked invoke called with cmd: ${cmd}, args:`, args);
  return undefined; // Or return a mock response as needed
}