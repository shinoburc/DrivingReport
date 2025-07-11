let records = [];
let actionSettings = {
    departure: { visible: true, displayName: '出発', actionName: '出発' },
    waypoint: { visible: false, displayName: '経由', actionName: '経由' },
    arrival: { visible: true, displayName: '到着', actionName: '到着' }
};
let showGasMeter = false; // デフォルトは非表示

if (localStorage.getItem('drivingRecords')) {
    records = JSON.parse(localStorage.getItem('drivingRecords'));
}

if (localStorage.getItem('actionSettings')) {
    actionSettings = JSON.parse(localStorage.getItem('actionSettings'));
}

if (localStorage.getItem('showGasMeter') !== null) {
    showGasMeter = localStorage.getItem('showGasMeter') === 'true';
}

window.onload = function() {
    const now = new Date();
    document.getElementById('exportMonth').value = now.toISOString().slice(0, 7);
    document.getElementById('startDate').value = now.toISOString().slice(0, 10);
    document.getElementById('endDate').value = now.toISOString().slice(0, 10);
    
    displayRecords();
    loadActionSettings();
    applyActionSettings();
    updateMaintenanceSelectOptions();
    initializePassphrase();
    loadGasMeterSettings();
    applyGasMeterVisibility();
    
    document.querySelectorAll('input[name="exportType"]').forEach(radio => {
        radio.addEventListener('change', toggleExportForm);
    });
};

function showProgress(show) {
    const progressEl = document.getElementById('progress');
    const buttons = document.querySelectorAll('.action-buttons button');
    
    if (show) {
        progressEl.style.display = 'block';
        buttons.forEach(btn => btn.disabled = true);
    } else {
        progressEl.style.display = 'none';
        buttons.forEach(btn => btn.disabled = false);
    }
}

function recordAction(actionType) {
    const destination = document.getElementById('destination').value.trim();
    const purpose = document.getElementById('purpose').value.trim();
    const gasMeter = document.getElementById('gasMeter').value.trim();
    const actionName = actionSettings[actionType].actionName;
    
    // 出発のアクションでは行先、目的は必須。ガソリンメーターは表示設定に従う
    if (actionType === 'departure') {
        if (!destination || !purpose) {
            alert(`${actionSettings.departure.displayName}時は行先、目的を入力してください。`);
            return;
        }
        if (showGasMeter && !gasMeter) {
            alert(`${actionSettings.departure.displayName}時はガソリンメーター情報も入力してください。`);
            return;
        }
    }
    
    showProgress(true);
    
    // 到着アクションの場合、有料道路利用確認を行う
    if (actionType === 'arrival') {
        const usedTollRoad = confirm('有料道路を利用しましたか？\n\n「OK」= はい（利用した）\n「キャンセル」= いいえ（利用していない）');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    saveRecord(actionName, destination, purpose, gasMeter, position, usedTollRoad);
                },
                (error) => {
                    showProgress(false);
                    if (confirm('GPS情報を取得できませんでした。GPS情報なしで記録しますか？')) {
                        showProgress(true);
                        saveRecord(actionName, destination, purpose, gasMeter, null, usedTollRoad);
                    }
                }
            );
        } else {
            showProgress(false);
            if (confirm('お使いのブラウザはGPS機能に対応していません。GPS情報なしで記録しますか？')) {
                showProgress(true);
                saveRecord(actionName, destination, purpose, gasMeter, null, usedTollRoad);
            }
        }
    } else {
        // 到着以外のアクションは従来通り
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    saveRecord(actionName, destination, purpose, gasMeter, position);
                },
                (error) => {
                    showProgress(false);
                    if (confirm('GPS情報を取得できませんでした。GPS情報なしで記録しますか？')) {
                        showProgress(true);
                        saveRecord(actionName, destination, purpose, gasMeter, null);
                    }
                }
            );
        } else {
            showProgress(false);
            if (confirm('お使いのブラウザはGPS機能に対応していません。GPS情報なしで記録しますか？')) {
                showProgress(true);
                saveRecord(actionName, destination, purpose, gasMeter, null);
            }
        }
    }
}

function saveRecord(action, destination, purpose, gasMeter, position, usedTollRoad = false) {
    const record = {
        id: Date.now(),
        action: action,
        destination: destination || '',
        purpose: purpose || '',
        gasMeter: gasMeter ? parseFloat(gasMeter) : null,
        datetime: new Date().toISOString(),
        location: position ? {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
        } : null,
        usedTollRoad: usedTollRoad
    };
    
    records.unshift(record);
    localStorage.setItem('drivingRecords', JSON.stringify(records));
    
    document.getElementById('destination').value = '';
    document.getElementById('purpose').value = '';
    document.getElementById('gasMeter').value = '';
    
    displayRecords();
    showTab('records');
    
    showProgress(false);
    alert(`${action}を記録しました。`);
}

function displayRecords() {
    const recordsList = document.getElementById('records-list');
    
    if (records.length === 0) {
        recordsList.innerHTML = '<div class="empty-state"><p>まだ記録がありません。</p></div>';
        return;
    }
    
    recordsList.innerHTML = records.map(record => {
        const date = new Date(record.datetime);
        const dateStr = date.toLocaleDateString('ja-JP');
        const timeStr = date.toLocaleTimeString('ja-JP');
        
        let actionClass = 'departure';
        if (record.action === '経由') actionClass = 'waypoint';
        if (record.action === '到着') actionClass = 'arrival';
        
        return `
            <div class="record-item ${actionClass}">
                <div class="record-header">
                    <span class="record-action">${record.action}</span>
                    <div class="record-header-right">
                        <span class="record-datetime">${dateStr} ${timeStr}</span>
                        <button class="edit-btn" onclick="editRecord(${record.id})" title="編集">✏️</button>
                        <button class="delete-btn" onclick="deleteRecord(${record.id})" title="削除">×</button>
                    </div>
                </div>
                <div class="record-details">
                    ${record.destination ? `<div>行先: ${record.destination}</div>` : ''}
                    ${record.purpose ? `<div>目的: ${record.purpose}</div>` : ''}
                    ${showGasMeter && record.gasMeter !== null ? `<div>メーター: ${record.gasMeter} km</div>` : ''}
                    ${record.location ? 
                        `<div>GPS: ${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}</div>` : 
                        '<div>GPS: 未取得</div>'
                    }
                    ${record.usedTollRoad !== undefined && record.action === '到着' ? 
                        `<div>有料道路: ${record.usedTollRoad ? '利用' : '未利用'}</div>` : 
                        ''
                    }
                </div>
            </div>
        `;
    }).join('');
}

function deleteRecord(id) {
    if (confirm('この記録を削除してもよろしいですか？')) {
        records = records.filter(record => record.id !== id);
        localStorage.setItem('drivingRecords', JSON.stringify(records));
        displayRecords();
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'records') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('records-tab').classList.add('active');
    } else if (tabName === 'export') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('export-tab').classList.add('active');
    } else if (tabName === 'maintenance') {
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('maintenance-tab').classList.add('active');
        // 現在日時をセット
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('manual-datetime').value = now.toISOString().slice(0, 16);
        // パスフレーズを表示
        displayPassphrase();
        // メールアドレスと暗号化設定を表示
        loadEmailSettings();
        // ガソリンメーター設定を表示
        loadGasMeterSettings();
        // 手動記録作成のガソリンメーター入力欄の表示制御
        const manualGasMeterGroup = document.getElementById('manual-gas-meter-group');
        if (manualGasMeterGroup) {
            manualGasMeterGroup.style.display = showGasMeter ? 'block' : 'none';
        }
    }
}

function toggleExportForm() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    
    if (exportType === 'monthly') {
        document.getElementById('monthly-export').style.display = 'block';
        document.getElementById('range-export').style.display = 'none';
    } else {
        document.getElementById('monthly-export').style.display = 'none';
        document.getElementById('range-export').style.display = 'block';
    }
}

async function exportCSV() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    let filteredRecords = [];
    
    if (exportType === 'monthly') {
        const month = document.getElementById('exportMonth').value;
        if (!month) {
            alert('対象月を選択してください。');
            return;
        }
        
        filteredRecords = records.filter(record => {
            return record.datetime.startsWith(month);
        });
    } else {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            alert('開始日と終了日を選択してください。');
            return;
        }
        
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        
        filteredRecords = records.filter(record => {
            const recordDate = new Date(record.datetime).getTime();
            return recordDate >= start && recordDate <= end;
        });
    }
    
    if (filteredRecords.length === 0) {
        alert('指定された期間の記録がありません。');
        return;
    }
    
    const csv = generateCSV(filteredRecords);
    
    // 暗号化設定を確認（初回はデフォルトでtrue）
    const encryptOnEmailSetting = localStorage.getItem('encryptOnEmail');
    const encryptOnEmail = encryptOnEmailSetting === null ? true : encryptOnEmailSetting === 'true';
    const passphrase = localStorage.getItem('appPassphrase');
    
    let blob;
    let fileName;
    
    if (encryptOnEmail && passphrase) {
        // CSVデータを暗号化
        const encryptedData = await encryptAES256GCM(csv, passphrase);
        if (encryptedData) {
            blob = new Blob([encryptedData], { type: 'text/plain;charset=utf-8;' });
            fileName = `driving_report_${new Date().toISOString().slice(0, 10)}.csv.enc`;
        } else {
            alert('暗号化に失敗しました。暗号化せずにダウンロードします。');
            blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            fileName = `driving_report_${new Date().toISOString().slice(0, 10)}.csv`;
        }
    } else {
        // 暗号化しない場合は通常通り
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        fileName = `driving_report_${new Date().toISOString().slice(0, 10)}.csv`;
    }
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
        const file = new File([blob], fileName, { type: blob.type });
        navigator.share({
            files: [file],
            title: '運転日報',
            text: '運転日報のCSVファイル'
        }).catch(err => {
            downloadFile(blob, fileName);
        });
    } else {
        downloadFile(blob, fileName);
    }
}

function generateCSV(records) {
    const headers = ['日時', 'アクション', '行先', '目的', 'ガソリンメーター(km)', '緯度', '経度', 'GPS精度(m)', '有料道路'];
    const rows = records.map(record => {
        const date = new Date(record.datetime);
        return [
            date.toLocaleString('ja-JP'),
            record.action,
            record.destination || '',
            record.purpose || '',
            record.gasMeter !== null ? record.gasMeter : '',
            record.location ? record.location.latitude : '',
            record.location ? record.location.longitude : '',
            record.location ? record.location.accuracy : '',
            record.usedTollRoad !== undefined && record.action === '到着' ? (record.usedTollRoad ? '利用' : '未利用') : ''
        ];
    });
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    return '\uFEFF' + csvContent;
}

function downloadFile(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function exportAndEmail() {
    // メールアドレスが設定されているか確認
    const recipientEmail = localStorage.getItem('recipientEmail');
    if (!recipientEmail) {
        alert('送信先メールアドレスが設定されていません。\nメンテナンス画面で送信先メールアドレスを設定してください。');
        showTab('maintenance');
        return;
    }
    
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    let filteredRecords = [];
    let periodText = '';
    
    if (exportType === 'monthly') {
        const month = document.getElementById('exportMonth').value;
        if (!month) {
            alert('対象月を選択してください。');
            return;
        }
        
        const [year, monthNum] = month.split('-');
        periodText = `${year}年${monthNum}月`;
        
        filteredRecords = records.filter(record => {
            return record.datetime.startsWith(month);
        });
    } else {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            alert('開始日と終了日を選択してください。');
            return;
        }
        
        periodText = `${startDate} ～ ${endDate}`;
        
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        
        filteredRecords = records.filter(record => {
            const recordDate = new Date(record.datetime).getTime();
            return recordDate >= start && recordDate <= end;
        });
    }
    
    if (filteredRecords.length === 0) {
        alert('指定された期間の記録がありません。');
        return;
    }
    
    const csv = generateCSV(filteredRecords);
    const fileName = `運転日報_${periodText.replace(/[\/\s～]/g, '_')}.csv`;
    
    // 暗号化設定を確認（初回はデフォルトでtrue）
    const encryptOnEmailSetting = localStorage.getItem('encryptOnEmail');
    const encryptOnEmail = encryptOnEmailSetting === null ? true : encryptOnEmailSetting === 'true';
    const passphrase = localStorage.getItem('appPassphrase');
    
    let bodyContent;
    if (encryptOnEmail && passphrase) {
        // CSVデータを暗号化
        const encryptedData = await encryptAES256GCM(csv, passphrase);
        if (encryptedData) {
            bodyContent = `運転日報（${periodText}）を送付いたします。\n\n添付ファイル: ${fileName}\n\n---\n以下、AES-256-GCMで暗号化されたCSVデータ：\n（パスフレーズで復号化してください）\n\n${encryptedData}`;
        } else {
            alert('暗号化に失敗しました。暗号化せずに送信します。');
            bodyContent = `運転日報（${periodText}）を送付いたします。\n\n添付ファイル: ${fileName}\n\n---\n以下、CSVデータ：\n\n${csv}`;
        }
    } else {
        // 暗号化しない場合は通常通り
        bodyContent = `運転日報（${periodText}）を送付いたします。\n\n添付ファイル: ${fileName}\n\n---\n以下、CSVデータ：\n\n${csv}`;
    }
    
    // メールアプリを開く
    const subject = encodeURIComponent(`運転日報 ${periodText}`);
    const body = encodeURIComponent(bodyContent);
    
    // まずCSVをダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, fileName);
    
    // 少し遅らせてメールアプリを開く（宛先に送信先メールアドレスを設定）
    setTimeout(() => {
        window.location.href = `mailto:${encodeURIComponent(recipientEmail)}?subject=${subject}&body=${body}`;
    }, 500);
}

function createManualRecord() {
    const datetime = document.getElementById('manual-datetime').value;
    const action = document.getElementById('manual-action').value;
    const destination = document.getElementById('manual-destination').value.trim();
    const purpose = document.getElementById('manual-purpose').value.trim();
    const gasMeter = document.getElementById('manual-gasMeter').value.trim();
    const gpsText = document.getElementById('manual-gps').value.trim();
    const usedTollRoad = document.getElementById('manual-toll-road').checked;
    
    // 入力チェック
    if (!datetime) {
        alert('日時を入力してください。');
        return;
    }
    
    if (action === '出発') {
        if (!destination || !purpose) {
            alert(`${actionSettings.departure.displayName}時は行先、目的を入力してください。`);
            return;
        }
        if (showGasMeter && !gasMeter) {
            alert(`${actionSettings.departure.displayName}時はガソリンメーター情報も入力してください。`);
            return;
        }
    }
    
    // GPS座標のパース
    let location = null;
    if (gpsText) {
        // 様々な形式に対応: "35.6812, 139.7671" or "35.6812,139.7671" or "35.6812 139.7671"
        const gpsMatch = gpsText.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
        if (gpsMatch) {
            location = {
                latitude: parseFloat(gpsMatch[1]),
                longitude: parseFloat(gpsMatch[2]),
                accuracy: 10 // 手動入力なので精度は10mとする
            };
        } else {
            alert('GPS座標の形式が正しくありません。例: 35.6812, 139.7671');
            return;
        }
    }
    
    // 記録の作成
    const record = {
        id: Date.now(),
        action: action,
        destination: destination || '',
        purpose: purpose || '',
        gasMeter: gasMeter ? parseFloat(gasMeter) : null,
        datetime: new Date(datetime).toISOString(),
        location: location,
        usedTollRoad: action === '到着' ? usedTollRoad : false
    };
    
    // 記録を追加してソート
    records.push(record);
    records.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    localStorage.setItem('drivingRecords', JSON.stringify(records));
    
    // フォームをクリア
    document.getElementById('manual-destination').value = '';
    document.getElementById('manual-purpose').value = '';
    document.getElementById('manual-gasMeter').value = '';
    document.getElementById('manual-gps').value = '';
    document.getElementById('manual-toll-road').checked = false;
    document.getElementById('manual-toll-road-container').style.display = 'none';
    
    // 記録一覧タブに移動
    displayRecords();
    showTab('records');
    
    alert('記録を作成しました。');
}

function deleteAllRecords() {
    // 現在の記録数を確認
    if (records.length === 0) {
        alert('削除する記録がありません。');
        return;
    }
    
    // 1回目の確認
    const firstConfirm = confirm(`現在 ${records.length} 件の記録があります。\n本当に全ての記録を削除しますか？\n\nこの操作は取り消すことができません。`);
    
    if (!firstConfirm) {
        return;
    }
    
    // 2回目の確認
    const secondConfirm = confirm('最終確認：本当に全ての記録を削除してもよろしいですか？\n\nこの操作を実行すると、全ての運転日報データが失われます。');
    
    if (!secondConfirm) {
        return;
    }
    
    // 全件削除を実行
    records = [];
    localStorage.setItem('drivingRecords', JSON.stringify(records));
    
    // 記録一覧を更新
    displayRecords();
    
    alert('全ての記録を削除しました。');
    
    // 記録一覧タブに移動
    showTab('records');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('ServiceWorker registration successful'))
            .catch(err => console.log('ServiceWorker registration failed: ', err));
    });
}

function loadActionSettings() {
    // 設定を読み込んでUIに反映
    if (document.getElementById('departure-visible')) {
        document.getElementById('departure-visible').checked = actionSettings.departure.visible;
        document.getElementById('departure-display-name').value = actionSettings.departure.displayName;
        document.getElementById('departure-action-name').value = actionSettings.departure.actionName;
        
        document.getElementById('waypoint-visible').checked = actionSettings.waypoint.visible;
        document.getElementById('waypoint-display-name').value = actionSettings.waypoint.displayName;
        document.getElementById('waypoint-action-name').value = actionSettings.waypoint.actionName;
        
        document.getElementById('arrival-visible').checked = actionSettings.arrival.visible;
        document.getElementById('arrival-display-name').value = actionSettings.arrival.displayName;
        document.getElementById('arrival-action-name').value = actionSettings.arrival.actionName;
    }
}

function saveActionSettings() {
    // UIから設定を取得
    actionSettings = {
        departure: {
            visible: document.getElementById('departure-visible').checked,
            displayName: document.getElementById('departure-display-name').value || '出発',
            actionName: document.getElementById('departure-action-name').value || '出発'
        },
        waypoint: {
            visible: document.getElementById('waypoint-visible').checked,
            displayName: document.getElementById('waypoint-display-name').value || '経由',
            actionName: document.getElementById('waypoint-action-name').value || '経由'
        },
        arrival: {
            visible: document.getElementById('arrival-visible').checked,
            displayName: document.getElementById('arrival-display-name').value || '到着',
            actionName: document.getElementById('arrival-action-name').value || '到着'
        }
    };
    
    // localStorageに保存
    localStorage.setItem('actionSettings', JSON.stringify(actionSettings));
    
    // 設定を適用
    applyActionSettings();
    
    // メンテナンスタブのセレクトボックスも更新
    updateMaintenanceSelectOptions();
    
    alert('設定を保存しました。');
}

function applyActionSettings() {
    // ボタンの表示/非表示とテキストを更新
    const departureBtn = document.getElementById('departure-btn');
    const waypointBtn = document.getElementById('waypoint-btn');
    const arrivalBtn = document.getElementById('arrival-btn');
    
    if (departureBtn) {
        departureBtn.style.display = actionSettings.departure.visible ? 'inline-block' : 'none';
        departureBtn.textContent = actionSettings.departure.displayName;
    }
    
    if (waypointBtn) {
        waypointBtn.style.display = actionSettings.waypoint.visible ? 'inline-block' : 'none';
        waypointBtn.textContent = actionSettings.waypoint.displayName;
    }
    
    if (arrivalBtn) {
        arrivalBtn.style.display = actionSettings.arrival.visible ? 'inline-block' : 'none';
        arrivalBtn.textContent = actionSettings.arrival.displayName;
    }
}

function updateMaintenanceSelectOptions() {
    const select = document.getElementById('manual-action');
    if (select) {
        select.innerHTML = '';
        
        // 表示設定に基づいてオプションを追加
        if (actionSettings.departure.visible) {
            const option = document.createElement('option');
            option.value = actionSettings.departure.actionName;
            option.textContent = actionSettings.departure.displayName;
            select.appendChild(option);
        }
        
        if (actionSettings.waypoint.visible) {
            const option = document.createElement('option');
            option.value = actionSettings.waypoint.actionName;
            option.textContent = actionSettings.waypoint.displayName;
            select.appendChild(option);
        }
        
        if (actionSettings.arrival.visible) {
            const option = document.createElement('option');
            option.value = actionSettings.arrival.actionName;
            option.textContent = actionSettings.arrival.displayName;
            select.appendChild(option);
        }
    }
}

function resetActionSettings() {
    if (confirm('アクション設定をデフォルトに戻しますか？')) {
        // デフォルト設定に戻す
        actionSettings = {
            departure: { visible: true, displayName: '出発', actionName: '出発' },
            waypoint: { visible: false, displayName: '経由', actionName: '経由' },
            arrival: { visible: true, displayName: '到着', actionName: '到着' }
        };
        
        // localStorageに保存
        localStorage.setItem('actionSettings', JSON.stringify(actionSettings));
        
        // UIに反映
        loadActionSettings();
        applyActionSettings();
        updateMaintenanceSelectOptions();
        
        alert('設定をデフォルトに戻しました。');
    }
}

function editRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    // モーダルを表示
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'flex';
    
    // フォームに既存の値をセット
    document.getElementById('edit-record-id').value = record.id;
    
    // 日時をdatetime-local形式に変換
    const date = new Date(record.datetime);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    document.getElementById('edit-datetime').value = date.toISOString().slice(0, 16);
    
    // アクションのセレクトボックスを更新
    updateEditActionOptions();
    document.getElementById('edit-action').value = record.action;
    
    document.getElementById('edit-destination').value = record.destination || '';
    document.getElementById('edit-purpose').value = record.purpose || '';
    document.getElementById('edit-gasMeter').value = record.gasMeter || '';
    
    // GPS座標
    if (record.location) {
        document.getElementById('edit-gps').value = `${record.location.latitude}, ${record.location.longitude}`;
    } else {
        document.getElementById('edit-gps').value = 'GPS未取得';
    }
    
    // 有料道路利用状況
    if (record.action === '到着' && record.usedTollRoad !== undefined) {
        document.getElementById('edit-toll-road').checked = record.usedTollRoad;
        document.getElementById('edit-toll-road-container').style.display = 'block';
    } else {
        document.getElementById('edit-toll-road').checked = false;
        document.getElementById('edit-toll-road-container').style.display = 'none';
    }
    
    // ガソリンメーター入力欄の表示制御
    const editGasMeterGroup = document.getElementById('edit-gas-meter-group');
    if (editGasMeterGroup) {
        editGasMeterGroup.style.display = showGasMeter ? 'block' : 'none';
    }
}

function updateEditActionOptions() {
    const select = document.getElementById('edit-action');
    select.innerHTML = '<option value="">選択してください</option>';
    
    // 全てのアクションを表示（現在の表示設定に関わらず）
    const allActions = [
        { name: 'departure', settings: actionSettings.departure },
        { name: 'waypoint', settings: actionSettings.waypoint },
        { name: 'arrival', settings: actionSettings.arrival }
    ];
    
    allActions.forEach(action => {
        const option = document.createElement('option');
        option.value = action.settings.actionName;
        option.textContent = action.settings.displayName;
        select.appendChild(option);
    });
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('edit-form').reset();
    document.getElementById('edit-toll-road-container').style.display = 'none';
}

function saveEditedRecord() {
    const id = parseInt(document.getElementById('edit-record-id').value);
    const recordIndex = records.findIndex(r => r.id === id);
    
    if (recordIndex === -1) {
        alert('記録が見つかりません。');
        return;
    }
    
    const datetime = document.getElementById('edit-datetime').value;
    const action = document.getElementById('edit-action').value;
    const destination = document.getElementById('edit-destination').value.trim();
    const purpose = document.getElementById('edit-purpose').value.trim();
    const gasMeter = document.getElementById('edit-gasMeter').value.trim();
    const usedTollRoad = document.getElementById('edit-toll-road').checked;
    
    // 必須チェック
    if (!datetime || !action) {
        alert('日時とアクションは必須です。');
        return;
    }
    
    // 出発のアクションでは行先、目的は必須。ガソリンメーターは表示設定に従う
    if (action === actionSettings.departure.actionName) {
        if (!destination || !purpose) {
            alert(`${actionSettings.departure.displayName}時は行先、目的を入力してください。`);
            return;
        }
        if (showGasMeter && !gasMeter) {
            alert(`${actionSettings.departure.displayName}時はガソリンメーター情報も入力してください。`);
            return;
        }
    }
    
    // 記録を更新
    records[recordIndex] = {
        ...records[recordIndex],
        datetime: new Date(datetime).toISOString(),
        action: action,
        destination: destination,
        purpose: purpose,
        gasMeter: gasMeter ? parseFloat(gasMeter) : null,
        usedTollRoad: action === '到着' ? usedTollRoad : records[recordIndex].usedTollRoad
    };
    
    // ソート
    records.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    // 保存
    localStorage.setItem('drivingRecords', JSON.stringify(records));
    
    // 表示を更新
    displayRecords();
    closeEditModal();
    
    alert('記録を更新しました。');
}

// パスフレーズ関連の関数
function generatePassphrase() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let passphrase = '';
    
    // 8文字のランダム文字列を生成
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        passphrase += characters[randomIndex];
    }
    
    return passphrase;
}

function initializePassphrase() {
    if (!localStorage.getItem('appPassphrase')) {
        const passphrase = generatePassphrase();
        localStorage.setItem('appPassphrase', passphrase);
    }
}

function displayPassphrase() {
    const passphrase = localStorage.getItem('appPassphrase');
    if (passphrase) {
        document.getElementById('passphrase-display').value = passphrase;
    }
}

function copyPassphrase() {
    const passphraseInput = document.getElementById('passphrase-display');
    passphraseInput.select();
    passphraseInput.setSelectionRange(0, 99999); // モバイル対応
    
    try {
        document.execCommand('copy');
        alert('パスフレーズをコピーしました。');
    } catch (err) {
        alert('コピーに失敗しました。手動でコピーしてください。');
    }
}

function regeneratePassphrase() {
    if (confirm('現在のパスフレーズを破棄して新しいパスフレーズを生成しますか？この操作は取り消せません。')) {
        const newPassphrase = generatePassphrase();
        localStorage.setItem('appPassphrase', newPassphrase);
        displayPassphrase();
        alert('新しいパスフレーズを生成しました。');
    }
}

// メールアドレス設定関連の関数
function loadEmailSettings() {
    const email = localStorage.getItem('recipientEmail');
    if (email) {
        document.getElementById('recipient-email').value = email;
    }
    
    // 暗号化設定を読み込む（デフォルトはtrue）
    const encryptOnEmail = localStorage.getItem('encryptOnEmail');
    if (encryptOnEmail !== null) {
        document.getElementById('encrypt-on-email').checked = encryptOnEmail === 'true';
    } else {
        // 初回はデフォルトでオン
        document.getElementById('encrypt-on-email').checked = true;
    }
}

function saveEmailSettings() {
    const email = document.getElementById('recipient-email').value.trim();
    
    if (email && !isValidEmail(email)) {
        alert('有効なメールアドレスを入力してください。');
        return;
    }
    
    if (email) {
        localStorage.setItem('recipientEmail', email);
        alert('メール設定を保存しました。');
    } else {
        localStorage.removeItem('recipientEmail');
        alert('メール設定をクリアしました。');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 暗号化設定を即時保存
function saveEncryptionSetting() {
    const encryptOnEmail = document.getElementById('encrypt-on-email').checked;
    localStorage.setItem('encryptOnEmail', encryptOnEmail);
    console.log('暗号化設定を保存しました:', encryptOnEmail);
}

// AES-256-GCM暗号化関数
async function encryptAES256GCM(text, passphrase) {
    try {
        // パスフレーズからキーを生成
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        
        // パスフレーズをハッシュ化してキーマテリアルとして使用
        const keyMaterial = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(passphrase)
        );
        
        // AESキーをインポート
        const key = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        // ランダムなIV（初期化ベクトル）を生成
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // 暗号化
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );
        
        // IVと暗号化データを結合
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        // Base64エンコード
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('暗号化エラー:', error);
        return null;
    }
}

// AES-256-GCM復号化関数
async function decryptAES256GCM(encryptedBase64, passphrase) {
    try {
        // Base64デコード
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        
        // IVと暗号化データを分離
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);
        
        // パスフレーズからキーを生成
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(passphrase)
        );
        
        // AESキーをインポート
        const key = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        
        // 復号化
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encrypted
        );
        
        // テキストに変換
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('復号化エラー:', error);
        return null;
    }
}

// 復号化モーダル関連の関数
function showDecryptModal() {
    document.getElementById('decrypt-modal').style.display = 'block';
    document.getElementById('decrypt-passphrase').value = '';
    document.getElementById('encrypted-data').value = '';
    document.getElementById('encrypted-file').value = '';
    document.getElementById('decrypted-result').style.display = 'none';
    document.getElementById('decrypted-data').value = '';
}

function closeDecryptModal() {
    document.getElementById('decrypt-modal').style.display = 'none';
}

function toggleManualTollRoadOption() {
    const action = document.getElementById('manual-action').value;
    const tollRoadContainer = document.getElementById('manual-toll-road-container');
    
    if (action === '到着') {
        tollRoadContainer.style.display = 'block';
    } else {
        tollRoadContainer.style.display = 'none';
        document.getElementById('manual-toll-road').checked = false;
    }
}

function toggleEditTollRoadOption() {
    const action = document.getElementById('edit-action').value;
    const tollRoadContainer = document.getElementById('edit-toll-road-container');
    
    if (action === '到着' || (actionSettings.arrival && action === actionSettings.arrival.actionName)) {
        tollRoadContainer.style.display = 'block';
    } else {
        tollRoadContainer.style.display = 'none';
        document.getElementById('edit-toll-road').checked = false;
    }
}

// ガソリンメーター表示設定関連の関数
function loadGasMeterSettings() {
    const checkbox = document.getElementById('show-gas-meter');
    if (checkbox) {
        checkbox.checked = showGasMeter;
    }
}

function saveGasMeterSettings() {
    const checkbox = document.getElementById('show-gas-meter');
    showGasMeter = checkbox.checked;
    localStorage.setItem('showGasMeter', showGasMeter);
    applyGasMeterVisibility();
    alert('ガソリンメーター表示設定を保存しました。');
}

function applyGasMeterVisibility() {
    // 記録画面のガソリンメーター入力欄
    const gasMeterGroup = document.getElementById('gas-meter-group');
    if (gasMeterGroup) {
        gasMeterGroup.style.display = showGasMeter ? 'block' : 'none';
    }
    
    // 記録一覧を再表示して変更を反映
    displayRecords();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        // ファイルの内容をテキストエリアに設定
        document.getElementById('encrypted-data').value = content;
    };
    reader.onerror = function() {
        alert('ファイルの読み込みに失敗しました。');
    };
    reader.readAsText(file);
}

async function decryptData() {
    const passphrase = document.getElementById('decrypt-passphrase').value;
    const encryptedData = document.getElementById('encrypted-data').value.trim();
    
    if (!passphrase) {
        alert('パスフレーズを入力してください。');
        return;
    }
    
    if (!encryptedData) {
        alert('暗号化されたデータを入力してください。');
        return;
    }
    
    try {
        // 復号化を実行
        const decryptedData = await decryptAES256GCM(encryptedData, passphrase);
        
        if (decryptedData) {
            document.getElementById('decrypted-data').value = decryptedData;
            document.getElementById('decrypted-result').style.display = 'block';
        } else {
            alert('復号化に失敗しました。パスフレーズが正しいか確認してください。');
        }
    } catch (error) {
        alert('復号化中にエラーが発生しました。');
        console.error('復号化エラー:', error);
    }
}

function copyDecryptedData() {
    const decryptedData = document.getElementById('decrypted-data');
    decryptedData.select();
    decryptedData.setSelectionRange(0, 99999); // モバイル対応
    
    try {
        document.execCommand('copy');
        alert('復号化されたデータをコピーしました。');
    } catch (err) {
        alert('コピーに失敗しました。手動でコピーしてください。');
    }
}

function downloadDecryptedData() {
    const decryptedData = document.getElementById('decrypted-data').value;
    if (!decryptedData) {
        alert('復号化されたデータがありません。');
        return;
    }
    
    const blob = new Blob([decryptedData], { type: 'text/csv;charset=utf-8;' });
    const fileName = `復号化済み_運転日報_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(blob, fileName);
}

// モーダルの外側をクリックしたら閉じる
window.onclick = function(event) {
    const editModal = document.getElementById('edit-modal');
    const decryptModal = document.getElementById('decrypt-modal');
    
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === decryptModal) {
        closeDecryptModal();
    }
}