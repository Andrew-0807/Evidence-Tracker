/**
 * Enhanced storage utilities for optimized localStorage and sessionStorage operations
 */

/**
 * A wrapper around localStorage that adds throttling to prevent excessive writes
 * to improve performance and avoid hitting browser quotas.
 */
export const enhancedStorage = {
  /**
   * Throttled timeouts for each key to prevent excessive writes
   */
  _writeTimeouts: {},
  
  /**
   * In-memory cache of values to reduce reads from localStorage
   */
  _cache: {},
  
  /**
   * Default throttle delay in milliseconds
   */
  _defaultThrottleMs: 500,
  
  /**
   * Get item from cache or localStorage
   * 
   * @param {string} key - Storage key
   * @param {boolean} [useCache=true] - Whether to use the in-memory cache
   * @returns {any} The stored value or null if not found
   */
  getItem(key, useCache = true) {
    // Use cache if available and requested
    if (useCache && this._cache[key] !== undefined) {
      return this._cache[key];
    }
    
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          // Store parsed value in cache
          this._cache[key] = JSON.parse(value);
        } catch {
          // If not valid JSON, store as is
          this._cache[key] = value;
        }
      } else {
        this._cache[key] = null;
      }
      return this._cache[key];
    } catch (error) {
      console.warn(`Error reading from localStorage key '${key}':`, error);
      return null;
    }
  },
  
  /**
   * Set item with throttling to prevent excessive writes
   * 
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {number} [throttleMs] - Custom throttle time in milliseconds
   */
  setItem(key, value, throttleMs) {
    // Update the cache immediately
    this._cache[key] = value;
    
    // Clear any existing timeout for this key
    if (this._writeTimeouts[key]) {
      clearTimeout(this._writeTimeouts[key]);
    }
    
    // Set up a new throttled write
    this._writeTimeouts[key] = setTimeout(() => {
      try {
        const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, valueToStore);
        delete this._writeTimeouts[key];
      } catch (error) {
        console.error(`Error writing to localStorage key '${key}':`, error);
      }
    }, throttleMs || this._defaultThrottleMs);
  },
  
  /**
   * Remove item from localStorage and cache
   * 
   * @param {string} key - Storage key to remove
   */
  removeItem(key) {
    // Remove from cache
    delete this._cache[key];
    
    // Clear any pending writes
    if (this._writeTimeouts[key]) {
      clearTimeout(this._writeTimeouts[key]);
      delete this._writeTimeouts[key];
    }
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key '${key}':`, error);
    }
  },
  
  /**
   * Clear all items from localStorage and cache
   */
  clear() {
    // Clear cache
    this._cache = {};
    
    // Clear all pending writes
    Object.keys(this._writeTimeouts).forEach(key => {
      clearTimeout(this._writeTimeouts[key]);
    });
    this._writeTimeouts = {};
    
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
  
  /**
   * Force immediate write of a cached item to localStorage
   * 
   * @param {string} key - Storage key to flush
   */
  flush(key) {
    if (key && this._cache[key] !== undefined) {
      try {
        const valueToStore = typeof this._cache[key] === 'string' 
          ? this._cache[key] 
          : JSON.stringify(this._cache[key]);
          
        localStorage.setItem(key, valueToStore);
        
        // Clear any pending writes
        if (this._writeTimeouts[key]) {
          clearTimeout(this._writeTimeouts[key]);
          delete this._writeTimeouts[key];
        }
      } catch (error) {
        console.error(`Error flushing localStorage key '${key}':`, error);
      }
    } else if (!key) {
      // Flush all keys
      Object.keys(this._cache).forEach(cacheKey => {
        this.flush(cacheKey);
      });
    }
  },
  
  /**
   * Gets all keys from localStorage that match a pattern
   * 
   * @param {RegExp|string} pattern - Pattern to match keys against
   * @returns {string[]} Array of matching keys
   */
  getKeys(pattern) {
    const keys = [];
    try {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (regex.test(key)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.error('Error getting keys from localStorage:', error);
    }
    return keys;
  }
};