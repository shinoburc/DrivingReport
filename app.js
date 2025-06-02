let records = [];
let actionSettings = {
    departure: { visible: true, displayName: '出発', actionName: '出発' },
    waypoint: { visible: false, displayName: '経由', actionName: '経由' },
    arrival: { visible: true, displayName: '到着', actionName: '到着' }
};

if (localStorage.getItem('drivingRecords')) {
    records = JSON.parse(localStorage.getItem('drivingRecords'));
}

if (localStorage.getItem('actionSettings')) {
    actionSettings = JSON.parse(localStorage.getItem('actionSettings'));
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
    
    // 出発のアクションでは全て必須入力
    if (actionType === 'departure' && (!destination || !purpose || !gasMeter)) {
        alert(`${actionSettings.departure.displayName}時は行先、目的、ガソリンメーター情報を全て入力してください。`);
        return;
    }
    
    showProgress(true);
    
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

function saveRecord(action, destination, purpose, gasMeter, position) {
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
        } : null
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
                    ${record.gasMeter !== null ? `<div>メーター: ${record.gasMeter} km</div>` : ''}
                    ${record.location ? 
                        `<div>GPS: ${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}</div>` : 
                        '<div>GPS: 未取得</div>'
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

function exportCSV() {
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fileName = `driving_report_${new Date().toISOString().slice(0, 10)}.csv`;
    
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
    const headers = ['日時', 'アクション', '行先', '目的', 'ガソリンメーター(km)', '緯度', '経度', 'GPS精度(m)'];
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
            record.location ? record.location.accuracy : ''
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

function exportAndEmail() {
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
    
    // メールアプリを開く
    const subject = encodeURIComponent(`運転日報 ${periodText}`);
    const body = encodeURIComponent(`運転日報（${periodText}）を送付いたします。\n\n添付ファイル: ${fileName}\n\n---\n以下、CSVデータ：\n\n${csv}`);
    
    // データURIスキームでCSVを作成
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    
    // まずCSVをダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, fileName);
    
    // 少し遅らせてメールアプリを開く
    setTimeout(() => {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }, 500);
}

function createManualRecord() {
    const datetime = document.getElementById('manual-datetime').value;
    const action = document.getElementById('manual-action').value;
    const destination = document.getElementById('manual-destination').value.trim();
    const purpose = document.getElementById('manual-purpose').value.trim();
    const gasMeter = document.getElementById('manual-gasMeter').value.trim();
    const gpsText = document.getElementById('manual-gps').value.trim();
    
    // 入力チェック
    if (!datetime) {
        alert('日時を入力してください。');
        return;
    }
    
    if (action === '出発' && (!destination || !purpose || !gasMeter)) {
        alert(`${actionSettings.departure.displayName}時は行在、目的、ガソリンメーター情報を全て入力してください。`);
        return;
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
        location: location
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
    
    // 必須チェック
    if (!datetime || !action) {
        alert('日時とアクションは必須です。');
        return;
    }
    
    // 出発のアクションでは全て必須入力
    if (action === actionSettings.departure.actionName && (!destination || !purpose || !gasMeter)) {
        alert(`${actionSettings.departure.displayName}時は行先、目的、ガソリンメーター情報を全て入力してください。`);
        return;
    }
    
    // 記録を更新
    records[recordIndex] = {
        ...records[recordIndex],
        datetime: new Date(datetime).toISOString(),
        action: action,
        destination: destination,
        purpose: purpose,
        gasMeter: gasMeter ? parseFloat(gasMeter) : null
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