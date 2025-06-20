// PWAインストールプロンプトの処理
let deferredPrompt;
let installButton = null;
let buttonContainer = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのプロンプトを防ぐ
    e.preventDefault();
    // 後で使用できるように保存
    deferredPrompt = e;
    
    // ボタンコンテナを作成（まだ存在しない場合）
    if (!buttonContainer) {
        createButtonContainer();
    }
    
    // インストールボタンを表示
    if (installButton) {
        installButton.style.display = 'inline-block';
    }
});

function createButtonContainer() {
    // ボタンコンテナを作成
    buttonContainer = document.createElement('div');
    buttonContainer.className = 'floating-button-container';
    buttonContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
        z-index: 1000;
        flex-direction: column;
        align-items: flex-end;
    `;
    
    // 復号化ツールボタンを作成
    const decryptButton = document.createElement('button');
    decryptButton.textContent = '復号化ツールを起動';
    decryptButton.className = 'decrypt-tool-button';
    decryptButton.style.cssText = `
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    decryptButton.addEventListener('click', () => {
        showDecryptModal();
    });
    
    // インストールボタンを作成
    installButton = document.createElement('button');
    installButton.textContent = 'アプリをインストール';
    installButton.className = 'install-button';
    installButton.style.cssText = `
        background-color: #2196F3;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: none;
    `;
    
    // ボタンクリック時の処理
    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            // プロンプトを表示
            deferredPrompt.prompt();
            // ユーザーの選択を待つ
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('PWAがインストールされました');
            } else {
                console.log('PWAのインストールがキャンセルされました');
            }
            
            // プロンプトは一度しか使えないのでリセット
            deferredPrompt = null;
            // ボタンを非表示に
            installButton.style.display = 'none';
        }
    });
    
    // ボタンをコンテナに追加
    buttonContainer.appendChild(decryptButton);
    buttonContainer.appendChild(installButton);
    
    // コンテナをページに追加
    document.body.appendChild(buttonContainer);
}

// ページ読み込み時に復号化ツールボタンだけを表示
window.addEventListener('DOMContentLoaded', () => {
    if (!buttonContainer) {
        createButtonContainer();
    }
});

// アプリがすでにインストールされているかチェック
window.addEventListener('appinstalled', () => {
    console.log('PWAがインストールされました');
    if (installButton) {
        installButton.style.display = 'none';
    }
});

// スタンドアロンモードで実行されているかチェック
if (window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true) {
    console.log('PWAとして実行されています');
}