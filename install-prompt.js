// PWAインストールプロンプトの処理
let deferredPrompt;
let installButton = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // デフォルトのプロンプトを防ぐ
    e.preventDefault();
    // 後で使用できるように保存
    deferredPrompt = e;
    
    // インストールボタンを作成（まだ存在しない場合）
    if (!installButton) {
        createInstallButton();
    }
    
    // インストールボタンを表示
    if (installButton) {
        installButton.style.display = 'block';
    }
});

function createInstallButton() {
    // インストールボタンを作成
    installButton = document.createElement('button');
    installButton.textContent = 'アプリをインストール';
    installButton.className = 'install-button';
    installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #2196F3;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
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
    
    // ボタンをページに追加
    document.body.appendChild(installButton);
}

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