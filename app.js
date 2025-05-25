let records = [];

if (localStorage.getItem('drivingRecords')) {
    records = JSON.parse(localStorage.getItem('drivingRecords'));
}

window.onload = function() {
    const now = new Date();
    document.getElementById('exportMonth').value = now.toISOString().slice(0, 7);
    document.getElementById('startDate').value = now.toISOString().slice(0, 10);
    document.getElementById('endDate').value = now.toISOString().slice(0, 10);
    
    displayRecords();
    
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

function recordAction(action) {
    const destination = document.getElementById('destination').value.trim();
    const purpose = document.getElementById('purpose').value.trim();
    const gasMeter = document.getElementById('gasMeter').value.trim();
    
    // 出発のアクションでは全て必須入力
    if (action === '出発' && (!destination || !purpose || !gasMeter)) {
        alert('出発時は行先、目的、ガソリンメーター情報を全て入力してください。');
        return;
    }
    
    showProgress(true);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                saveRecord(action, destination, purpose, gasMeter, position);
            },
            (error) => {
                showProgress(false);
                if (confirm('GPS情報を取得できませんでした。GPS情報なしで記録しますか？')) {
                    showProgress(true);
                    saveRecord(action, destination, purpose, gasMeter, null);
                }
            }
        );
    } else {
        showProgress(false);
        if (confirm('お使いのブラウザはGPS機能に対応していません。GPS情報なしで記録しますか？')) {
            showProgress(true);
            saveRecord(action, destination, purpose, gasMeter, null);
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
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('export-tab').classList.add('active');
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('ServiceWorker registration successful'))
            .catch(err => console.log('ServiceWorker registration failed: ', err));
    });
}