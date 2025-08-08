import { invoke } from "@tauri-apps/api/tauri";

// Check if running in Tauri environment
const isTauri = typeof window !== "undefined" && window.__TAURI_IPC__;

// Helper function to use either Tauri or localStorage
export const useStorage = {
  async getEntries(date) {
    if (isTauri) {
      try {
        return await invoke("get_entries", { date });
      } catch (error) {
        console.warn(
          "Tauri command failed, falling back to localStorage:",
          error,
        );
      }
    }

    // Fallback to localStorage
    const storageKey = `entries_${date}`;
    const storedEntries = localStorage.getItem(storageKey);
    const lockedKey = `locked_${date}`;
    const lockedStatus = localStorage.getItem(lockedKey) === "true";

    return {
      entries: storedEntries ? JSON.parse(storedEntries) : [],
      locked: lockedStatus,
    };
  },

  async addEntries(date, entries) {
    if (isTauri) {
      try {
        await invoke("add_entries", { date, entries });
        return;
      } catch (error) {
        console.warn(
          "Tauri command failed, falling back to localStorage:",
          error,
        );
      }
    }

    // Fallback to localStorage
    const storageKey = `entries_${date}`;
    const entryObjects = entries.map((entry, index) => ({
      id: Date.now() + index,
      date: entry.date,
      tag: entry.tag,
      value: entry.value,
      locked: false,
      description: entry.description,
    }));
    localStorage.setItem(storageKey, JSON.stringify(entryObjects));
  },

  async lockDay(date) {
    if (isTauri) {
      try {
        return await invoke("lock_day", { date });
      } catch (error) {
        console.warn(
          "Tauri command failed, falling back to localStorage:",
          error,
        );
      }
    }

    // Fallback to localStorage
    const lockedKey = `locked_${date}`;
    localStorage.setItem(lockedKey, "true");
    return `Day ${date} locked successfully`;
  },

  async getTagConfig() {
    if (isTauri) {
      try {
        return await invoke("get_tag_config");
      } catch (error) {
        console.warn("Tauri command failed, falling back to JSON file:", error);
      }
    }

    // Try to load from public/tags.json
    try {
      const response = await fetch("/tags.json");
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("Failed to load tags.json:", error);
    }

    // Fallback to localStorage
    const storedConfig = localStorage.getItem("tags_config");
    if (storedConfig) {
      return JSON.parse(storedConfig);
    }

    // If all else fails, return empty config
    throw new Error("No tag configuration available");
  },

  async getMonthlyEntries(month) {
    if (isTauri) {
      try {
        const monthlyEntries = await invoke("get_monthly_entries", {
          month: month,
        });
        return monthlyEntries;
      } catch (error) {
        console.error("Failed to get monthly entries:", error);
        return [];
      }
    }

    // Fallback for web version - collect entries from all dates in the month
    const allEntries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith("entries_") &&
        key.substring(8).startsWith(month)
      ) {
        const entries = JSON.parse(localStorage.getItem(key) || "[]");
        allEntries.push(...entries);
      }
    }
    return allEntries;
  },
};
