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
  initSettings();
  initDateNav();
});

// ========================================
// 日付初期化
// ========================================
function initDate() {
  const input = document.getElementById('targetDate');
  const today = new Date();
  // 前日をデフォルトに（閉店後に入力する想定）
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
// ドロップゾーン
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
// ログ出力
// ========================================
function log(msg, type = '') {
  const area = document.getElementById('logArea');
  const section = document.getElementById('logSection');
  section.style.display = 'block';

  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.textContent = `[${time}] ${msg}`;
  area.appendChild(line);
  area.scrollTop = area.scrollHeight;
}

function clearLog() {
  document.getElementById('logArea').innerHTML = '';
}

function setStatus(status) {
  const dot = document.getElementById('statusDot');
  const runBtn = document.getElementById('runBtn');
  const statusMap = {
    ready:      { text: '● READY',      cls: '' },
    processing: { text: '◉ PROCESSING', cls: 'processing' },
    success:    { text: '● DONE',       cls: '' },
    error:      { text: '✕ ERROR',      cls: 'error' },
  };
  const s = statusMap[status] || statusMap.ready;
  dot.textContent = s.text;
  dot.className = `header-status ${s.cls}`;

  if (status === 'processing') {
    runBtn.classList.add('running');
    runBtn.innerHTML = `<span class="run-icon">◉</span><span class="run-label">処理中...</span><div class="run-progress" id="runProgress"></div>`;
    animateProgress();
  } else {
    runBtn.classList.remove('running');
    runBtn.innerHTML = `<span class="run-icon">▶</span><span class="run-label">ANALYZE &amp; WRITE TO SHEETS</span><div class="run-progress" id="runProgress"></div>`;
  }
}

function animateProgress() {
  let w = 0;
  const interval = setInterval(() => {
    w = Math.min(w + Math.random() * 8, 85);
    const bar = document.getElementById('runProgress');
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
// メイン処理：画像をGASに送信
// ========================================
async function processImages() {
  const targetDate = document.getElementById('targetDate').value;
  if (!targetDate) { alert('日付を選択してください'); return; }
  if (files.length === 0) { alert('画像を選択してください'); return; }
  if (!GAS_URL) { alert('設定タブでGASのURLを入力してください'); return; }

  clearLog();
  setStatus('processing');
  document.getElementById('resultSection').style.display = 'none';

  log(`対象日: ${targetDate}`, 'info');
  log(`画像数: ${files.length}枚`, 'info');

  try {
    // 画像をbase64に変換
    const imageDataList = [];
    for (const f of files) {
      log(`変換中: ${f.name}`);
      const b64 = await fileToBase64(f);
      imageDataList.push({ name: f.name, data: b64, type: f.type });
    }

    log('GAS / Claude APIに送信中...', 'info');

    // GASにPOST
    // GASはCORSを完全サポートしないためno-corsではなく
    // Content-Typeをtext/plainにしてプリフライトを回避
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ targetDate, images: imageDataList }),
      redirect: 'follow',
    });

    const result = await response.json();

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
    document.getElementById('runBtn').disabled = files.length === 0;
  }
}

// ========================================
// 結果表示
// ========================================
function showResult(data) {
  const section = document.getElementById('resultSection');
  const content = document.getElementById('resultContent');
  section.style.display = 'block';

  if (!data || data.length === 0) {
    content.innerHTML = '<div class="log-line">抽出データなし</div>';
    return;
  }

  // 機種別にグループ化
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
