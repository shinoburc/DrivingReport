// カメラとOCR機能の実装
let stream = null;
let recognizedValue = null;

// カメラを開く
async function openCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    try {
        // カメラのストリームを取得
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // 背面カメラを優先
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        video.srcObject = stream;
        modal.style.display = 'flex';
        
        // OCR結果を非表示
        document.getElementById('ocr-result').style.display = 'none';
        document.querySelector('.camera-controls').style.display = 'flex';
        
    } catch (err) {
        console.error('カメラの起動に失敗しました:', err);
        alert('カメラを使用できません。カメラへのアクセスを許可してください。');
    }
}

// カメラを閉じる
function closeCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');
    
    // ストリームを停止
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    video.srcObject = null;
    modal.style.display = 'none';
    recognizedValue = null;
}

// 写真を撮影
async function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const ctx = canvas.getContext('2d');
    
    // キャンバスのサイズをビデオに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // ビデオの内容をキャンバスに描画
    ctx.drawImage(video, 0, 0);
    
    // 画像の前処理
    preprocessImage(ctx, canvas.width, canvas.height);
    
    // プログレス表示
    showOCRProgress(true);
    
    try {
        // Tesseract.jsでOCR実行（複数の設定で試行）
        const result = await Tesseract.recognize(
            canvas,
            'eng',
            {
                logger: m => console.log(m),
                tessedit_char_whitelist: '0123456789', // 数字のみを認識
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // 単一のテキストブロックとして認識
                preserve_interword_spaces: '0',
            }
        );
        
        // 認識結果から数値を抽出（複数の方法を試行）
        let recognizedNumber = null;
        const text = result.data.text.replace(/[^\d]/g, ''); // 数字以外を除去
        
        if (text.length > 0) {
            // 連続した数字を抽出
            const allNumbers = result.data.text.match(/\d+/g) || [];
            
            // 候補となる数値をフィルタリング
            const validNumbers = allNumbers.filter(num => {
                const numValue = parseInt(num);
                // 一般的な走行距離の範囲（100km～999,999km）
                return num.length >= 3 && num.length <= 6 && numValue >= 100;
            });
            
            if (validNumbers.length > 0) {
                // 最も長い、または最も信頼性の高い数値を選択
                recognizedNumber = validNumbers.reduce((best, current) => {
                    return current.length > best.length ? current : best;
                });
                
                recognizedValue = parseInt(recognizedNumber);
                displayOCRResult(recognizedValue);
            } else if (text.length >= 3 && text.length <= 6) {
                // フィルタリングで見つからない場合は、全体の数字を使用
                recognizedValue = parseInt(text);
                displayOCRResult(recognizedValue);
            } else {
                // 手動入力を促す
                displayOCRResult(null, `認識された数字: ${text}\n有効な走行距離として認識できませんでした。`);
            }
        } else {
            displayOCRResult(null, '数値が認識できませんでした。明るい場所で撮影し直してください。');
        }
        
    } catch (err) {
        console.error('OCRエラー:', err);
        displayOCRResult(null, 'テキスト認識に失敗しました。');
    } finally {
        showOCRProgress(false);
    }
}

// 画像の前処理（コントラストと明度の調整）
function preprocessImage(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // グレースケール変換とコントラスト強調
    for (let i = 0; i < data.length; i += 4) {
        // グレースケール値を計算
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // コントラストを強調（しきい値処理）
        const threshold = 128;
        const value = gray > threshold ? 255 : 0;
        
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        // data[i + 3] はアルファ値なのでそのまま
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// OCR進行状況の表示
function showOCRProgress(show) {
    const controls = document.querySelector('.camera-controls');
    if (show) {
        controls.innerHTML = '<div class="ocr-progress"><div class="spinner"></div><span>数値を認識中...</span></div>';
    } else {
        controls.innerHTML = `
            <button class="btn btn-primary" onclick="capturePhoto()">撮影</button>
            <button class="btn btn-secondary" onclick="closeCamera()">キャンセル</button>
        `;
    }
}

// OCR結果を表示
function displayOCRResult(value, error) {
    const resultDiv = document.getElementById('ocr-result');
    const recognizedText = document.getElementById('recognized-text');
    
    resultDiv.style.display = 'block';
    
    if (value) {
        recognizedText.innerHTML = `<strong>${value} km</strong>`;
        recognizedText.className = 'success';
    } else {
        recognizedText.innerHTML = error;
        recognizedText.className = 'error';
    }
}

// 認識した値を使用
function useRecognizedValue() {
    const manualInput = document.getElementById('manual-correction');
    if (manualInput.style.display !== 'none' && manualInput.value) {
        recognizedValue = parseInt(manualInput.value);
    }
    
    if (recognizedValue) {
        document.getElementById('gasMeter').value = recognizedValue;
        closeCamera();
    }
}

// 手動入力を表示
function showManualInput() {
    const manualInput = document.getElementById('manual-correction');
    const recognizedText = document.getElementById('recognized-text');
    
    manualInput.style.display = 'block';
    manualInput.value = recognizedValue || '';
    manualInput.focus();
    
    // ボタンテキストを変更
    const useButton = document.querySelector('#ocr-result .btn-primary');
    useButton.textContent = '入力した値を使用';
}

// 撮り直す
function retakePhoto() {
    document.getElementById('ocr-result').style.display = 'none';
    document.getElementById('manual-correction').style.display = 'none';
    document.getElementById('manual-correction').value = '';
    recognizedValue = null;
    
    // ボタンテキストを元に戻す
    const useButton = document.querySelector('#ocr-result .btn-primary');
    useButton.textContent = 'この値を使用';
}