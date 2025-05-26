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
    
    // プログレス表示
    showOCRProgress(true);
    
    try {
        // Tesseract.jsでOCR実行
        const result = await Tesseract.recognize(
            canvas,
            'eng',
            {
                logger: m => console.log(m),
                tessedit_char_whitelist: '0123456789', // 数字のみを認識
            }
        );
        
        // 認識結果から数値を抽出
        const text = result.data.text;
        const numbers = text.match(/\d+/g);
        
        if (numbers && numbers.length > 0) {
            // 最も長い数値列を採用（通常メーターの値は連続した数字）
            const longestNumber = numbers.reduce((a, b) => a.length >= b.length ? a : b);
            
            // 5〜7桁の数値が妥当（一般的な走行距離）
            if (longestNumber.length >= 4 && longestNumber.length <= 7) {
                recognizedValue = parseInt(longestNumber);
                displayOCRResult(recognizedValue);
            } else {
                displayOCRResult(null, '有効な数値が認識できませんでした。');
            }
        } else {
            displayOCRResult(null, '数値が認識できませんでした。');
        }
        
    } catch (err) {
        console.error('OCRエラー:', err);
        displayOCRResult(null, 'テキスト認識に失敗しました。');
    } finally {
        showOCRProgress(false);
    }
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
    if (recognizedValue) {
        document.getElementById('gasMeter').value = recognizedValue;
        closeCamera();
    }
}

// 撮り直す
function retakePhoto() {
    document.getElementById('ocr-result').style.display = 'none';
    recognizedValue = null;
}