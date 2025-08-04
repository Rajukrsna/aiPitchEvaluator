interface AudioRecord {
  id: string;
  name: string;
  audioBlob: Blob;
  timestamp: number;
  result?: any;
  overallScore?: number;
}

class AudioStorage {
  private dbName = 'AudioPitchEvaluatorDB';
  private version = 1;
  private storeName = 'audioRecords';

  // Open database connection
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Save audio to IndexedDB
  async saveAudio(audioBlob: Blob, name: string): Promise<string> {
    const db = await this.openDB();
    const id = Date.now().toString();
    
    const audioRecord: AudioRecord = {
      id,
      name,
      audioBlob,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(audioRecord);
      
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all audio records
  async getAllAudio(): Promise<AudioRecord[]> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get specific audio by ID
  async getAudio(id: string): Promise<AudioRecord | null> {
     const db = await this.openDB();
      return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Update audio record (for results)
  async updateAudio(id: string, updates: Partial<AudioRecord>): Promise<void> {
    const db = await this.openDB();
    const existing = await this.getAudio(id);
    
    if (!existing) throw new Error('Audio record not found');
    
    const updated = { ...existing, ...updates };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updated);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Delete audio record
  async deleteAudio(id: string): Promise<void> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Convert blob to URL for playback
  createAudioUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }
}

export const audioStorage = new AudioStorage();
export type { AudioRecord };