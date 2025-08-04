// IndexedDB管理クラス
class DrivingReportDB {
    constructor() {
        this.dbName = 'DrivingReportDB';
        this.version = 2; // マイグレーション対応のためバージョン管理
        this.db = null;
    }

    // データベースを開く/初期化
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB open error:', request.error);
                reject(request.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;

                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

                // 運転記録用のオブジェクトストア
                if (!db.objectStoreNames.contains('records')) {
                    const recordsStore = db.createObjectStore('records', { keyPath: 'id' });
                    recordsStore.createIndex('datetime', 'datetime', { unique: false });
                    recordsStore.createIndex('action', 'action', { unique: false });
                }

                // 設定用のオブジェクトストア
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // データベースが開いているか確認
    async ensureOpen() {
        if (!this.db) {
            await this.open();
        }
        return this.db;
    }

    // 運転記録の全取得
    async getAllRecords() {
        await this.ensureOpen();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readonly');
            const store = transaction.objectStore('records');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result || [];
                // 日時でソート（新しい順）
                records.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
                resolve(records);
            };

            request.onerror = () => {
                console.error('Failed to get records:', request.error);
                reject(request.error);
            };
        });
    }

    // 運転記録の追加
    async addRecord(record) {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.add(record);

            request.onsuccess = () => {
                console.log('Record added successfully');
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to add record:', request.error);
                reject(request.error);
            };
        });
    }

    // 運転記録の更新
    async updateRecord(record) {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.put(record);

            request.onsuccess = () => {
                console.log('Record updated successfully');
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to update record:', request.error);
                reject(request.error);
            };
        });
    }

    // 運転記録の削除
    async deleteRecord(id) {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('Record deleted successfully');
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to delete record:', request.error);
                reject(request.error);
            };
        });
    }

    // 全運転記録の削除
    async deleteAllRecords() {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('All records deleted successfully');
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to delete all records:', request.error);
                reject(request.error);
            };
        });
    }

    // 設定の取得
    async getSetting(key) {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };

            request.onerror = () => {
                console.error(`Failed to get setting ${key}:`, request.error);
                reject(request.error);
            };
        });
    }

    // 設定の保存
    async setSetting(key, value) {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => {
                console.log(`Setting ${key} saved successfully`);
                resolve();
            };

            request.onerror = () => {
                console.error(`Failed to save setting ${key}:`, request.error);
                reject(request.error);
            };
        });
    }

    // 設定の削除
    async deleteSetting(key) {
        await this.ensureOpen();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.delete(key);

            request.onsuccess = () => {
                console.log(`Setting ${key} deleted successfully`);
                resolve();
            };

            request.onerror = () => {
                console.error(`Failed to delete setting ${key}:`, request.error);
                reject(request.error);
            };
        });
    }

    // LocalStorageからIndexedDBへのマイグレーション
    async migrateFromLocalStorage() {
        console.log('Starting migration from LocalStorage to IndexedDB...');
        
        try {
            // 運転記録のマイグレーション
            const recordsJson = localStorage.getItem('drivingRecords');
            if (recordsJson) {
                const records = JSON.parse(recordsJson);
                console.log(`Migrating ${records.length} records...`);
                
                for (const record of records) {
                    try {
                        await this.addRecord(record);
                    } catch (e) {
                        // 既に存在する場合はスキップ
                        console.log(`Record ${record.id} already exists, skipping...`);
                    }
                }
                
                // マイグレーション成功後、LocalStorageから削除
                localStorage.removeItem('drivingRecords');
                console.log('Records migration completed');
            }

            // 設定のマイグレーション
            const settingsToMigrate = [
                'actionSettings',
                'showGasMeter',
                'appPassphrase',
                'recipientEmail',
                'encryptOnEmail'
            ];

            for (const key of settingsToMigrate) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    console.log(`Migrating setting: ${key}`);
                    
                    // JSON文字列の場合はパース、そうでない場合はそのまま保存
                    let parsedValue;
                    try {
                        parsedValue = JSON.parse(value);
                    } catch {
                        // JSONでない場合（文字列やboolean）はそのまま使用
                        parsedValue = value === 'true' ? true : value === 'false' ? false : value;
                    }
                    
                    await this.setSetting(key, parsedValue);
                    localStorage.removeItem(key);
                }
            }

            console.log('Migration completed successfully');
            return true;
        } catch (error) {
            console.error('Migration failed:', error);
            return false;
        }
    }

    // データベースを閉じる
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('Database closed');
        }
    }
}

// シングルトンインスタンスをエクスポート
const dbInstance = new DrivingReportDB();