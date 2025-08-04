// IndexedDBとLocalStorageの統一アクセスヘルパー関数

// 設定値を取得するヘルパー関数
async function getSetting(key) {
    try {
        // まずIndexedDBから取得を試行
        const value = await dbInstance.getSetting(key);
        if (value !== null) {
            return value;
        }
    } catch (error) {
        console.warn(`Failed to get setting ${key} from IndexedDB:`, error);
    }
    
    // フォールバック: LocalStorageから取得
    const localValue = localStorage.getItem(key);
    if (localValue !== null) {
        try {
            // JSON文字列の場合はパース
            return JSON.parse(localValue);
        } catch {
            // JSONでない場合（文字列やboolean）はそのまま返す
            return localValue === 'true' ? true : localValue === 'false' ? false : localValue;
        }
    }
    
    return null;
}

// 設定値を保存するヘルパー関数
async function setSetting(key, value) {
    try {
        // IndexedDBに保存
        await dbInstance.setSetting(key, value);
        return true;
    } catch (error) {
        console.warn(`Failed to save setting ${key} to IndexedDB:`, error);
        
        // フォールバック: LocalStorageに保存
        try {
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
            return false; // LocalStorageに保存したことを示す
        } catch (localError) {
            console.error(`Failed to save setting ${key} to LocalStorage:`, localError);
            throw localError;
        }
    }
}

// パスフレーズを安全に取得する関数
async function getPassphrase() {
    return await getSetting('appPassphrase');
}

// メールアドレスを取得する関数
async function getRecipientEmail() {
    return await getSetting('recipientEmail');  
}

// 暗号化設定を取得する関数
async function getEncryptOnEmail() {
    const setting = await getSetting('encryptOnEmail');
    return setting !== null ? setting : true; // デフォルトはtrue
}