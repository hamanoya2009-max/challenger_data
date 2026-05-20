// ========================================
// JUGGLER DATA SYSTEM - app.js
// ========================================

// GASのWebアプリURL（設定タブで変更可能）
let GAS_URL = localStorage.getItem('gas_url') || 'https://script.google.com/macros/s/AKfycbwMliehrkydhGBzOqjfqKbVz7xpZzWyADa8xb7NmM2yNXrWYoO_WVr3raXeEBhd8i5iXw/exec';

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initTabs();
  initDropzone();
  initGraphDropzone();
  initSettings();
  initDateNav();
  initGraphDateNav();
});

// ========================================
// 日付初期化（データ入力タブ）
// ========================================
function initDate() {
  const input = document.getElementById('targetDate');
  const today = new Date();
  today.setDate(today.getDate() - 1);
  input.value = formatDate(today);
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function initDateNav() {
  document.getElementById('datePrev').addEventListener('click', () => shiftDate(-1));
  document.getElementById('dateNext').addEventListener('click', () => shiftDate(1));
}

function shiftDate(delta) {
  const input = document.getElementById('targetDate');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = formatDate(d);
}

// ========================================
// 日付初期化（グラフタブ）
// ========================================
function initGraphDateNav() {
  const input = document.getElementById('gTargetDate');
  const today = new Date();
  today.setDate(today.getDate() - 1);
  input.value = formatDate(today);

  document.getElementById('gDatePrev').addEventListener('click', () => shiftGraphDate(-1));
  document.getElementById('gDateNext').addEventListener('click', () => shiftGraphDate(1));
}

function shiftGraphDate(delta) {
  const input = document.getElementById('gTargetDate');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = formatDate(d);
}

// ========================================
// タブ切り替え
// ========================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

// ========================================
// ドロップゾーン（データ入力タブ）
// ========================================
let files = [];

function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  fileInput.addEventListener('change', e => addFiles(Array.from(e.target.files)));

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(dropped);
  });

  document.getElementById('runBtn').addEventListener('click', processImages);
}

function addFiles(newFiles) {
  newFiles.forEach(f => {
    if (!files.find(x => x.name === f.name)) files.push(f);
  });
  renderPreviews();
}

function removeFile(name) {
  files = files.filter(f => f.name !== name);
  renderPreviews();
}

function renderPreviews() {
  const grid = document.getElementById('previewGrid');
  const badge = document.getElementById('imgBadge');
  const runBtn = document.getElementById('runBtn');

  badge.textContent = files.length;
  grid.innerHTML = '';

  files.forEach(f => {
    const url = URL.createObjectURL(f);
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${url}" alt="${f.name}">
      <button class="preview-remove" onclick="removeFile('${f.name.replace(/'/g, "\\'")}')">×</button>
      <div class="preview-badge">${f.name}</div>
    `;
    grid.appendChild(item);
  });

  runBtn.disabled = files.length === 0;
}

// ========================================
// ドロップゾーン（グラフタブ）
// ========================================
let gFile = null;

function initGraphDropzone() {
  const dropzone = document.getElementById('gDropzone');
  const fileInput = document.getElementById('gFileInput');

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) setGraphFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const f = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (f) setGraphFile(f);
  });

  document.getElementById('gRunBtn').addEventListener('click', processGraphImage);
}

function setGraphFile(f) {
  gFile = f;
  renderGraphPreview();
}

function removeGraphFile() {
  gFile = null;
  renderGraphPreview();
}

function renderGraphPreview() {
  const grid = document.getElementById('gPreviewGrid');
  const badge = document.getElementById('gImgBadge');
  const runBtn = document.getElementById('gRunBtn');

  badge.textContent = gFile ? 1 : 0;
  grid.innerHTML = '';

  if (gFile) {
    const url = URL.createObjectURL(gFile);
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${url}" alt="${gFile.name}">
      <button class="preview-remove" onclick="removeGraphFile()">×</button>
      <div class="preview-badge">${gFile.name}</div>
    `;
    grid.appendChild(item);
  }

  runBtn.disabled = !gFile;
}

// ========================================
// ログ出力（共通）
// ========================================
function log(msg, type = '', areaId = 'logArea', sectionId = 'logSection') {
  const area = document.getElementById(areaId);
  const section = document.getElementById(sectionId);
  section.style.display = 'block';

  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.textContent = `[${time}] ${msg}`;
  area.appendChild(line);
  area.scrollTop = area.scrollHeight;
}

function clearLog(areaId = 'logArea') {
  document.getElementById(areaId).innerHTML = '';
}

function setStatus(status) {
  const dot = document.getElementById('statusDot');
  const statusMap = {
    ready:      { text: '● READY',      cls: '' },
    processing: { text: '◉ PROCESSING', cls: 'processing' },
    success:    { text: '● DONE',       cls: '' },
    error:      { text: '✕ ERROR',      cls: 'error' },
  };
  const s = statusMap[status] || statusMap.ready;
  dot.textContent = s.text;
  dot.className = `header-status ${s.cls}`;
}

function setRunBtn(btnId, progressId, isRunning, disabled = false) {
  const runBtn = document.getElementById(btnId);
  if (isRunning) {
    runBtn.classList.add('running');
    runBtn.innerHTML = `<span class="run-icon">◉</span><span class="run-label">処理中...</span><div class="run-progress" id="${progressId}"></div>`;
    animateProgress(progressId);
  } else {
    runBtn.classList.remove('running');
    const label = btnId === 'runBtn'
      ? 'ANALYZE &amp; WRITE TO SHEETS'
      : 'READ GRAPH &amp; WRITE TO SHEETS';
    runBtn.innerHTML = `<span class="run-icon">▶</span><span class="run-label">${label}</span><div class="run-progress" id="${progressId}"></div>`;
    runBtn.disabled = disabled;
  }
}

function animateProgress(progressId) {
  let w = 0;
  const interval = setInterval(() => {
    w = Math.min(w + Math.random() * 8, 85);
    const bar = document.getElementById(progressId);
    if (bar) bar.style.width = w + '%';
    else clearInterval(interval);
  }, 300);
  return interval;
}

// ========================================
// base64変換
// ========================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========================================
// GASへのPOST（リトライ付き）
// ========================================
async function postToGAS(body, logAreaId = 'logArea') {
  let result = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        log(`リトライ中... (${attempt}/3)`, 'info', logAreaId, logAreaId === 'logArea' ? 'logSection' : 'gLogSection');
        await new Promise(r => setTimeout(r, 2000));
      }
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body),
        redirect: 'follow',
      });
      result = await response.json();
      break;
    } catch (e) {
      lastError = e;
      log(`通信エラー (${attempt}/3): ${e.message}`, 'error', logAreaId, logAreaId === 'logArea' ? 'logSection' : 'gLogSection');
    }
  }
  if (!result) throw lastError;
  return result;
}

// ========================================
// メイン処理：台データ画像をGASに送信
// ========================================
async function processImages() {
  const targetDate = document.getElementById('targetDate').value;
  if (!targetDate) { alert('日付を選択してください'); return; }
  if (files.length === 0) { alert('画像を選択してください'); return; }
  if (!GAS_URL) { alert('設定タブでGASのURLを入力してください'); return; }

  clearLog('logArea');
  setStatus('processing');
  setRunBtn('runBtn', 'runProgress', true);
  document.getElementById('resultSection').style.display = 'none';

  log(`対象日: ${targetDate}`, 'info');
  log(`画像数: ${files.length}枚`, 'info');

  try {
    const imageDataList = [];
    for (const f of files) {
      log(`変換中: ${f.name}`);
      const b64 = await fileToBase64(f);
      imageDataList.push({ name: f.name, data: b64, type: f.type });
    }

    log('GAS / Claude APIに送信中...', 'info');

    const result = await postToGAS({ targetDate, images: imageDataList }, 'logArea');

    const bar = document.getElementById('runProgress');
    if (bar) bar.style.width = '100%';

    if (result.success) {
      log(`✓ ${result.rowCount}行をシートに書き込みました`, 'success');
      setStatus('success');
      showResult(result.data);
    } else {
      log(`ERROR: ${result.error}`, 'error');
      setStatus('error');
    }

  } catch (err) {
    log(`ERROR: ${err.message || err}`, 'error');
    setStatus('error');
  } finally {
    setRunBtn('runBtn', 'runProgress', false, files.length === 0);
  }
}

// ========================================
// グラフ処理：スランプグラフ画像をGASに送信
// ========================================
async function processGraphImage() {
  const date = document.getElementById('gTargetDate').value;
  const machineNo = document.getElementById('gMachineNo').value.trim();

  if (!date) { alert('日付を選択してください'); return; }
  if (!machineNo) { alert('台番号を入力してください'); return; }
  if (!gFile) { alert('グラフ画像を選択してください'); return; }
  if (!GAS_URL) { alert('設定タブでGASのURLを入力してください'); return; }

  clearLog('gLogArea');
  setStatus('processing');
  setRunBtn('gRunBtn', 'gRunProgress', true);
  document.getElementById('gResultSection').style.display = 'none';

  log(`対象日: ${date}`, 'info', 'gLogArea', 'gLogSection');
  log(`台番号: ${machineNo}`, 'info', 'gLogArea', 'gLogSection');
  log(`ファイル: ${gFile.name}`, 'info', 'gLogArea', 'gLogSection');

  try {
    log('画像をbase64に変換中...', 'info', 'gLogArea', 'gLogSection');
    const b64 = await fileToBase64(gFile);

    log('GAS / Claude APIに送信中...', 'info', 'gLogArea', 'gLogSection');

    const result = await postToGAS({
      action: 'uploadGraph',
      date,
      machineNo,
      imageBase64: b64,
      mimeType: gFile.type,
    }, 'gLogArea');

    const bar = document.getElementById('gRunProgress');
    if (bar) bar.style.width = '100%';

    if (result.success) {
      log(`✓ ${result.message}`, 'success', 'gLogArea', 'gLogSection');
      setStatus('success');
      showGraphResult(result.summary);
    } else {
      log(`ERROR: ${result.error}`, 'error', 'gLogArea', 'gLogSection');
      setStatus('error');
    }

  } catch (err) {
    log(`ERROR: ${err.message || err}`, 'error', 'gLogArea', 'gLogSection');
    setStatus('error');
  } finally {
    setRunBtn('gRunBtn', 'gRunProgress', false, !gFile);
  }
}

// ========================================
// 結果表示（台データ）
// ========================================
function showResult(data) {
  const section = document.getElementById('resultSection');
  const content = document.getElementById('resultContent');
  section.style.display = 'block';

  if (!data || data.length === 0) {
    content.innerHTML = '<div class="log-line">抽出データなし</div>';
    return;
  }

  const grouped = {};
  data.forEach(row => {
    const key = row.machine || '不明';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  let html = '';
  Object.entries(grouped).forEach(([model, rows]) => {
    html += `
      <div class="result-model-label">▸ ${model}</div>
      <table class="result-table">
        <thead>
          <tr>
            <th>台番号</th>
            <th>BB</th>
            <th>RB</th>
            <th>総回転</th>
          </tr>
        </thead>
        <tbody>
    `;
    rows
      .sort((a, b) => Number(a.rack_no) - Number(b.rack_no))
      .forEach(r => {
        html += `
          <tr>
            <td>${r.rack_no}</td>
            <td>${r.bb ?? '-'}</td>
            <td>${r.rb ?? '-'}</td>
            <td>${r.total_games ?? '-'}</td>
          </tr>
        `;
      });
    html += '</tbody></table>';
  });

  content.innerHTML = html;
}

// ========================================
// 結果表示（グラフ）
// ========================================
function showGraphResult(summary) {
  const section = document.getElementById('gResultSection');
  const content = document.getElementById('gResultContent');
  section.style.display = 'block';

  if (!summary) {
    content.innerHTML = '<div class="log-line">サマリーなし</div>';
    return;
  }

  const endColor = summary.end >= 0 ? 'var(--accent3)' : 'var(--accent2)';

  content.innerHTML = `
    <div class="info-grid">
      <div class="info-row">
        <span class="info-key">機種名</span>
        <span class="info-val">${summary.machine || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">総回転数</span>
        <span class="info-val">${summary.total_g ? summary.total_g.toLocaleString() + 'G' : '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">最大差枚</span>
        <span class="info-val" style="color: var(--accent3)">+${summary.max ?? '-'}枚</span>
      </div>
      <div class="info-row">
        <span class="info-key">最小差枚</span>
        <span class="info-val" style="color: var(--accent2)">${summary.min ?? '-'}枚</span>
      </div>
      <div class="info-row">
        <span class="info-key">終値</span>
        <span class="info-val" style="color: ${endColor}; font-weight: bold">${summary.end >= 0 ? '+' : ''}${summary.end ?? '-'}枚</span>
      </div>
      <div class="info-row">
        <span class="info-key">座標点数</span>
        <span class="info-val">${summary.points ?? '-'}点</span>
      </div>
    </div>
  `;
}

// ========================================
// 設定
// ========================================
function initSettings() {
  const gasInput = document.getElementById('gasUrl');
  gasInput.value = GAS_URL;

  document.getElementById('saveBtn').addEventListener('click', saveSettings);
}

function saveSettings() {
  const url = document.getElementById('gasUrl').value.trim();
  if (url && !url.startsWith('https://script.google.com/')) {
    alert('GASのURLは https://script.google.com/ から始まる必要があります');
    return;
  }
  GAS_URL = url;
  localStorage.setItem('gas_url', url);

  const btn = document.getElementById('saveBtn');
  btn.textContent = '✓ 保存しました';
  setTimeout(() => { btn.textContent = '設定を保存'; }, 2000);
}
