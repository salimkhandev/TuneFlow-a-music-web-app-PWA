import { clsx } from "clsx";
import { openDB } from "idb";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CACHE_TTL = 10 * 60 * 1000; // Cache expiry time (10 minutes)
// TEMP: Disable API response caching in IndexedDB
const DISABLE_API_IDB_CACHE = false;
// Disable all network requests and serve only from cache
const DISABLE_NETWORK_REQUESTS = false;

// In-memory session cache — synchronous, instant on re-navigation
const memoryCache = new Map();

// Ensure IndexedDB is only accessed in the browser
const dbPromise =
  typeof window !== "undefined" && !DISABLE_API_IDB_CACHE
    ? openDB("music-app-db", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("api-cache")) {
            db.createObjectStore("api-cache");
          }
        },
      })
    : null;

// Store API responses in IndexedDB with expiry
export async function cacheResponse(key, data) {
  if (DISABLE_API_IDB_CACHE || !dbPromise) return; // Temporarily disabled
  const db = await dbPromise;
  const tx = db.transaction("api-cache", "readwrite");
  await tx.store.put({ data, expiry: Date.now() + CACHE_TTL }, key);
  await tx.done;
}

// Retrieve cached response from IndexedDB with expiry check
export async function getCachedResponse(key) {
  if (DISABLE_API_IDB_CACHE || !dbPromise) return null; // Temporarily disabled
  const db = await dbPromise;
  const cached = await db.get("api-cache", key);
  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    await db.transaction("api-cache", "readwrite").store.delete(key); // Delete expired data
    return null;
  }
  return cached.data;
}

export function decodeHtmlEntities(text) {
  if (!text) return text;
  if (typeof window === 'undefined' || !window.DOMParser) {
    const entities = {
      '&quot;': '"',
      '&amp;': '&',
      '&#39;': "'",
      '&lt;': '<',
      '&gt;': '>',
      '&#039;': "'"
    };
    return text.replace(/&quot;|&amp;|&#39;|&lt;|&gt;|&#039;/g, match => entities[match]);
  }
  const parser = new DOMParser();
  return parser.parseFromString(text, "text/html").body.textContent;
}

export function getInitials(text) {
  if (!text) return "";
  return text
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export function formatNumber(num) {
  if (typeof num !== "number" || isNaN(num)) return "0";
  if (num < 1000) return num.toString();

  const units = ["K", "M", "B", "T"];
  let unitIndex = -1;
  let formattedNum = num;

  while (formattedNum >= 1000 && unitIndex < units.length - 1) {
    formattedNum /= 1000;
    unitIndex++;
  }

  return `${formattedNum.toFixed(1).replace(/\.0$/, "")}${
    units[unitIndex] || ""
  }`;
}

// Fetch API with caching (first check IndexedDB, then fetch)
async function fetchWithCache(url, cacheKey) {
  // If network is disabled, try cache only
  if (DISABLE_NETWORK_REQUESTS) {
    try {
      const cachedData = await getCachedResponse(cacheKey);
      return cachedData || { error: "Network disabled and no cached data available" };
    } catch (e) {
      return { error: "Network disabled and cache unavailable" };
    }
  }
  // Bypass IDB caching when disabled
  if (DISABLE_API_IDB_CACHE) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error("Network error (cache disabled):", cacheKey);
      return { error: "Failed to fetch data" };
    }
  }

  // Check in-memory cache first — fastest path, no async needed
  const memHit = memoryCache.get(cacheKey);
  if (memHit && Date.now() < memHit.expiry) {
    return memHit.data;
  }

  const cachedData = await getCachedResponse(cacheKey);
  if (cachedData) {
    // Populate memory cache from IDB on first read
    memoryCache.set(cacheKey, { data: cachedData, expiry: Date.now() + CACHE_TTL });
    console.log("Serving from IndexedDB:", cacheKey);
    return cachedData;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`API Error (${response.status}) for:`, cacheKey);
      return cachedData || { error: `Failed to fetch data (Status: ${response.status})` };
    }
    const data = await response.json();
    await cacheResponse(cacheKey, data);
    memoryCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
    return data;
  } catch (error) {
    console.error("Network/Parsing error for:", cacheKey, error.message);
    return cachedData || { error: "Failed to fetch data" };
  }
}

// Centralized API base for JioSaavn
const API_BASE = "https://saavn.sumit.co";

// (Playlists removed due to API issues)

// Fetch Artists
export async function fetchArtists({ query = "a", limit = 10 }) {
  const url = `${API_BASE}/api/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`;
  return await fetchWithCache(url, `artists_${query}_${limit}`);
}

// Fetch Artist by ID
export async function fetchArtistById({ id }) {
  const cacheKey = `artist_${id}`;
  const cachedData = await getCachedResponse(cacheKey);

  if (cachedData) {
    console.log(`Serving cached artist for: ${id}`);
    return cachedData;
  }

  if (DISABLE_NETWORK_REQUESTS) {
    return { error: "Network disabled and no cached artist available" };
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/artists/${encodeURIComponent(id)}?sortBy=popularity`
    );
    const data = await response.json();
    if (data?.data) {
      await cacheResponse(cacheKey, data.data);
      return data.data;
    }
    return data?.message;
  } catch (error) {
    return { error: "Failed to fetch artist" };
  }
}

// Fetch Songs
export async function fetchSongs({ query = "a", limit = 10 }) {
  const url = `${API_BASE}/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
  return await fetchWithCache(url, `songs_${query}_${limit}`);
}

// Fetch Albums
export async function fetchAlbums({ query = "a", limit = 10 }) {
  const url = `${API_BASE}/api/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`;
  return await fetchWithCache(url, `albums_${query}_${limit}`);
}

// Fetch Album by ID
export async function fetchAlbumById({ id }) {
  const cacheKey = `album_${id}`;
  const cachedData = await getCachedResponse(cacheKey);

  if (cachedData) {
    console.log(`Serving cached album for: ${id}`);
    return cachedData;
  }

  if (DISABLE_NETWORK_REQUESTS) {
    return { error: "Network disabled and no cached album available" };
  }

  try {
    const response = await fetch(`${API_BASE}/api/albums?id=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (data?.data) {
      await cacheResponse(cacheKey, data.data);
      return data.data;
    }
    return data?.message;
  } catch (error) {
    return { error: "Failed to fetch album" };
  }
}

// Search history management utilities
const SEARCH_HISTORY_KEY = 'tuneFlow_search_history';
const MAX_HISTORY_ITEMS = 10;

// Get search history from localStorage
export function getSearchHistory() {
  if (typeof window === 'undefined') return [];
  
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading search history:', error);
    return [];
  }
}

// Add a new search to history
export function addToSearchHistory(query) {
  if (typeof window === 'undefined' || !query?.trim()) return;
  
  try {
    const history = getSearchHistory();
    const trimmedQuery = query.trim().toLowerCase();
    
    // Remove if already exists (to move to top)
    const filteredHistory = history.filter(item => item.toLowerCase() !== trimmedQuery);
    
    // Add to beginning of array
    const newHistory = [query.trim(), ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    console.log('🔍 Search added to history:', query);
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

// Clear search history
export function clearSearchHistory() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    console.log('🗑️ Search history cleared');
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
}

// Remove a specific search from history
export function removeFromSearchHistory(query) {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getSearchHistory();
    const filteredHistory = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
    console.log('❌ Search removed from history:', query);
  } catch (error) {
    console.error('Error removing search from history:', error);
  }
}

// Advanced offline storage for actual audio files
const OFFLINE_AUDIO_STORE = 'offlineAudioFiles';
const OFFLINE_METADATA_STORE = 'offlineMetadata';

// Initialize IndexedDB for offline audio files
export async function initOfflineAudioDB() {
  if (typeof window === 'undefined') return null;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TuneFlowOfflineAudio', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create audio files store
      if (!db.objectStoreNames.contains(OFFLINE_AUDIO_STORE)) {
        const audioStore = db.createObjectStore(OFFLINE_AUDIO_STORE, { keyPath: 'songId' });
        audioStore.createIndex('name', 'name', { unique: false });
        audioStore.createIndex('artist', 'artist', { unique: false });
      }
      
      // Create metadata store
      if (!db.objectStoreNames.contains(OFFLINE_METADATA_STORE)) {
        const metadataStore = db.createObjectStore(OFFLINE_METADATA_STORE, { keyPath: 'songId' });
        metadataStore.createIndex('name', 'name', { unique: false });
        metadataStore.createIndex('artist', 'artist', { unique: false });
      }
    };
  });
}

// Download and store actual audio file
export async function storeAudioOffline(song) {
  if (typeof window === 'undefined' || !song?.id || !song?.downloadUrl) {
    console.error('❌ Missing required data for offline storage');
    return false;
  }
  
  try {
    console.log('🌐 Starting download for:', song.name);
    
    // Get the best quality download URL
    const downloadUrl = song.downloadUrl.find(u => u.quality === "320kbps")?.url || 
                       song.downloadUrl[song.downloadUrl.length - 1]?.url;
    
    if (!downloadUrl) {
      console.error('❌ No download URL available');
      return false;
    }
    
    // Download the audio file
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    console.log('📥 Downloaded audio file:', audioBlob.size, 'bytes');
    
    // Store in IndexedDB
    const db = await initOfflineAudioDB();
    if (!db) return false;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE, OFFLINE_METADATA_STORE], 'readwrite');
    const audioStore = transaction.objectStore(OFFLINE_AUDIO_STORE);
    const metadataStore = transaction.objectStore(OFFLINE_METADATA_STORE);
    
    // Store audio file
    const audioData = {
      songId: song.id,
      audioBlob: audioBlob,
      name: song.name,
      artist: song.artists?.primary?.[0]?.name || 'Unknown Artist',
      storedAt: new Date().toISOString(),
      size: audioBlob.size
    };
    
    await new Promise((resolve, reject) => {
      const request = audioStore.put(audioData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Store only essential metadata used in UI
    const metadata = {
      songId: song.id,
      name: song.name,
      duration: song.duration,
      album: song.album,
      artists: song.artists,
      image: song.image,
      downloadUrl: song.downloadUrl,
      storedAt: new Date().toISOString(),
      likedAt: song.likedAt || new Date().toISOString(), // Preserve likedAt timestamp for proper ordering
      isOffline: true
    };
    
    await new Promise((resolve, reject) => {
      const request = metadataStore.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    console.log('💾 Audio file stored offline:', song.name);
    return true;
    
  } catch (error) {
    console.error('❌ Error storing audio offline:', error);
    return false;
  }
}

// Get offline audio file
export async function getOfflineAudio(songId) {
  if (typeof window === 'undefined' || !songId) return null;
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return null;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE], 'readonly');
    const store = transaction.objectStore(OFFLINE_AUDIO_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(songId);
      request.onsuccess = () => {
        const result = request.result;
        if (result?.audioBlob) {
          // Create object URL for the blob
          const audioUrl = URL.createObjectURL(result.audioBlob);
          resolve({
            ...result,
            audioUrl: audioUrl
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error getting offline audio:', error);
    return null;
  }
}

// Get all offline audio files
export async function getAllOfflineAudio() {
  if (typeof window === 'undefined') return [];
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return [];
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE], 'readonly');
    const store = transaction.objectStore(OFFLINE_AUDIO_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        // Create object URLs for all blobs
        const audioFiles = results.map(result => ({
          ...result,
          audioUrl: URL.createObjectURL(result.audioBlob)
        }));
        resolve(audioFiles);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error getting all offline audio:', error);
    return [];
  }
}

// Check if audio is available offline
export async function isAudioOffline(songId) {
  if (typeof window === 'undefined' || !songId) return false;
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return false;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE], 'readonly');
    const store = transaction.objectStore(OFFLINE_AUDIO_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(songId);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error checking offline audio:', error);
    return false;
  }
}

// Remove audio from offline storage
export async function removeAudioOffline(songId) {
  if (typeof window === 'undefined' || !songId) return false;
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return false;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE, OFFLINE_METADATA_STORE], 'readwrite');
    const audioStore = transaction.objectStore(OFFLINE_AUDIO_STORE);
    const metadataStore = transaction.objectStore(OFFLINE_METADATA_STORE);
    
    // Remove from both stores
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = audioStore.delete(songId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = metadataStore.delete(songId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    console.log('🗑️ Audio removed from offline storage:', songId);
    return true;
  } catch (error) {
    console.error('❌ Error removing audio from offline storage:', error);
    return false;
  }
}

// Get offline storage size
export async function getOfflineAudioSize() {
  if (typeof window === 'undefined') return 0;
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return 0;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE], 'readonly');
    const store = transaction.objectStore(OFFLINE_AUDIO_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        const totalSize = results.reduce((size, result) => size + (result.size || 0), 0);
        resolve(Math.round(totalSize / 1024 / 1024 * 100) / 100); // MB
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error calculating offline audio size:', error);
    return 0;
  }
}

// Clear all offline audio
export async function clearAllOfflineAudio() {
  if (typeof window === 'undefined') return false;
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return false;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE, OFFLINE_METADATA_STORE], 'readwrite');
    const audioStore = transaction.objectStore(OFFLINE_AUDIO_STORE);
    const metadataStore = transaction.objectStore(OFFLINE_METADATA_STORE);
    
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = audioStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = metadataStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    console.log('🗑️ All offline audio cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing offline audio:', error);
    return false;
  }
}

// Get offline audio count
export async function getOfflineAudioCount() {
  if (typeof window === 'undefined') return 0;
  
  try {
    const db = await initOfflineAudioDB();
    if (!db) return 0;
    
    const transaction = db.transaction([OFFLINE_AUDIO_STORE], 'readonly');
    const store = transaction.objectStore(OFFLINE_AUDIO_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Error getting offline audio count:', error);
    return 0;
  }
}

