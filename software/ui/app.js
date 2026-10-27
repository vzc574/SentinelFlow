// SentinelFlow Enterprise Frontend Controller
let currentScanState = {
  isScanning: false,
  isPaused: false,
  scanType: 'quick'
};

let junkScanCache = null;
let currentUsbDrive = null;

// Search index for global search
const SEARCHABLE_ITEMS = [
  { name: "Quick Threat Scan", category: "Scanner", action: () => { switchTab('scanner'); startScan('quick'); } },
  { name: "Full System Scan", category: "Scanner", action: () => { switchTab('scanner'); startScan('full'); } },
  { name: "Selected Target Scan", category: "Scanner", action: () => { switchTab('scanner'); } },
  { name: "Network & Internet Safety Scan", category: "Scanner", action: () => { switchTab('scanner'); runNetworkScan(); } },
  { name: "Device & Drive Health Score", category: "Performance", action: () => { switchTab('optimizer'); } },
  { name: "Removable Junk File Cleaner", category: "Performance", action: () => { switchTab('optimizer'); scanJunkFiles(); } },
  { name: "Startup Speed Optimizer", category: "Performance", action: () => { switchTab('optimizer'); loadStartupApps(); } },
  { name: "Unused & Bloatware Apps", category: "Performance", action: () => { switchTab('optimizer'); loadInstalledApps(); } },
  { name: "Battery & Power Saver", category: "Performance", action: () => { switchTab('optimizer'); loadBatteryHogs(); } },
  { name: "PC Resource Consumption & Task Review", category: "Performance", action: () => { openProcessManagerWindow(); } },
  { name: "Real-Time File Guard", category: "Protection", action: () => { switchTab('realtime'); } },
  { name: "Quarantine Vault", category: "Protection", action: () => { switchTab('quarantine'); } },
  { name: "Activity History & Audit Log", category: "Audit", action: () => { openHistoryWindow(); } },
  { name: "System Settings & Appearance", category: "Settings", action: () => { switchTab('settings'); } },
  { name: "Upgrade To Pro", category: "Pro", action: () => { openProUpgrade(); } }
];

// Initialize when pywebview is ready
window.addEventListener('pywebviewready', function () {
  console.log("SentinelFlow Python API initialized.");
  loadInitialConfig();
  refreshDashboard();
  refreshQuarantine();
  loadSystemHealth();
  loadRecentActivityFeed();
});

// Navigation
function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.toggle('active', tab.id === `tab-${tabId}`);
  });

  const titles = {
    dashboard: "Dashboard Overview",
    scanner: "Antivirus Threat Scanner",
    realtime: "Real-Time Protection Guard",
    optimizer: "Performance Tune-up Suite",
    quarantine: "Quarantine Vault",
    settings: "System Settings & Policies"
  };

  const titleElem = document.getElementById('page-title');
  if (titleElem && titles[tabId]) {
    titleElem.innerText = titles[tabId];
  }

  if (tabId === 'dashboard') { 
    refreshDashboard(); 
    loadSystemHealth();
    loadRecentActivityFeed();
  }
  if (tabId === 'quarantine') refreshQuarantine();
  if (tabId === 'settings') loadSettings();
  if (tabId === 'optimizer') {
    loadSystemHealth();
    scanJunkFiles();
    loadStartupApps();
    loadInstalledApps();
    loadBatteryHogs();
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// Global Search Bar Controller
function onGlobalSearchInput(query) {
  const dropdown = document.getElementById('search-results-dropdown');
  if (!query || query.trim() === "") {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = "";
    return;
  }

  const q = query.toLowerCase().trim();
  const hits = SEARCHABLE_ITEMS.filter(item => 
    item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  );

  if (hits.length === 0) {
    dropdown.innerHTML = `<div class="search-result-item" style="color:var(--text-muted);">No matching features found.</div>`;
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.innerHTML = hits.map((h, idx) => `
    <div class="search-result-item" onclick="executeSearchResult(${idx})">
      <span><strong>${h.name}</strong></span>
      <span class="badge secondary">${h.category}</span>
    </div>
  `).join('');
  dropdown.classList.remove('hidden');
}

function executeSearchResult(idx) {
  const query = document.getElementById('global-search-input').value.toLowerCase().trim();
  const hits = SEARCHABLE_ITEMS.filter(item => 
    item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
  );
  if (hits[idx]) {
    hits[idx].action();
  }
  document.getElementById('search-results-dropdown').classList.add('hidden');
  document.getElementById('global-search-input').value = "";
}

// Close search dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.global-search-wrapper')) {
    const dd = document.getElementById('search-results-dropdown');
    if (dd) dd.classList.add('hidden');
  }
});

// Upgrade To Pro Button
function openProUpgrade() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.open_pro_upgrade();
  } else {
    window.open("https://www.youtube.com", "_blank");
  }
}

// Activity History New Window
function openHistoryWindow() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.open_history_window();
  }
}

// Process Manager New Window
function openProcessManagerWindow() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.open_process_window();
  }
}

// Minimize to System Tray
document.getElementById('btn-minimize-tray').addEventListener('click', () => {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.minimize_to_tray();
  }
});

// Kaspersky-Style Custom Titlebar Handlers
function windowMinimize() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.window_minimize();
  }
}

async function windowToggleMaximize() {
  if (window.pywebview && window.pywebview.api) {
    try {
      const isMax = await window.pywebview.api.window_toggle_maximize();
      const btn = document.getElementById('win-maximize-btn');
      if (btn) {
        if (isMax) {
          btn.innerHTML = `<svg viewBox="0 0 24 24" class="win-icon"><path d="M4 8H2V2h6v2H4v4zm10-6h6v6h-2V4h-4V2zM2 16h2v4h4v2H2v-6zm18 4h-4v2h6v-6h-2v4z"/></svg>`;
          btn.title = "Restore";
        } else {
          btn.innerHTML = `<svg viewBox="0 0 24 24" class="win-icon"><path d="M5 5h14v14H5V5zm2 2v10h10V7H7z"/></svg>`;
          btn.title = "Maximize";
        }
      }
    } catch (e) {
      console.error("Maximize error:", e);
    }
  }
}

function windowClose() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.window_close();
  } else {
    window.close();
  }
}

function openHelpModal() {
  const modal = document.getElementById('help-about-modal');
  if (modal) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themeLabel = document.getElementById('help-theme-label');
    if (themeLabel) {
      themeLabel.innerText = `${currentTheme} Theme Active`;
    }
    modal.classList.remove('hidden');
  }
}

function closeHelpModal() {
  const modal = document.getElementById('help-about-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Dashboard Quick Scan Button
document.getElementById('dash-quick-scan-btn').addEventListener('click', () => {
  switchTab('scanner');
  startScan('quick');
});

// Settings Section Switcher
function switchSettingsSection(sectionKey) {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.settingsTab === sectionKey);
  });
  document.querySelectorAll('.settings-section-card').forEach(card => {
    card.classList.toggle('active', card.id === `sec-settings-${sectionKey}`);
    card.classList.toggle('hidden', card.id !== `sec-settings-${sectionKey}`);
  });
}

// Theme Setting
async function setAppTheme(theme) {
  let effectiveTheme = theme;
  if (theme === 'system') {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_system_theme) {
      try {
        effectiveTheme = await window.pywebview.api.get_system_theme();
      } catch (e) {
        effectiveTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      }
    } else {
      effectiveTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
  }

  document.documentElement.setAttribute('data-theme', effectiveTheme);

  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.id === `theme-card-${theme}`);
  });

  const badge = document.getElementById('current-theme-badge');
  if (badge) {
    if (theme === 'system') {
      badge.innerText = `Windows Auto (${effectiveTheme.toUpperCase()})`;
    } else {
      badge.innerText = `${theme.toUpperCase()} Mode`;
    }
  }

  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.set_theme(theme);
  }
}

// Initial Config Loader
async function loadInitialConfig() {
  if (!window.pywebview || !window.pywebview.api) return;
  try {
    const config = await window.pywebview.api.get_config();
    const currentTheme = config.theme || 'system';
    await setAppTheme(currentTheme);
    updateDashboardUI(config.stats, config.realtime_protection);
    loadSettings();
  } catch (e) {
    console.error("Config load error:", e);
  }
}

async function refreshDashboard() {
  if (!window.pywebview || !window.pywebview.api) return;
  try {
    const stats = await window.pywebview.api.get_stats();
    const config = await window.pywebview.api.get_config();
    updateDashboardUI(stats, config.realtime_protection);
  } catch (e) {
    console.error("Dashboard refresh error:", e);
  }
}

function updateDashboardUI(stats, realtimeActive) {
  if (stats) {
    document.getElementById('dash-threats-blocked').innerText = stats.threats_blocked || 0;
    document.getElementById('dash-files-scanned').innerText = (stats.files_scanned || 0).toLocaleString();
    document.getElementById('dash-junk-cleaned').innerText = `${stats.junk_cleaned_mb || 0} MB`;
    document.getElementById('dash-last-scan').innerText = stats.last_scan_date || "Never";
  }
  const rtElem = document.getElementById('dash-realtime-status');
  if (rtElem) {
    rtElem.innerText = realtimeActive ? "Operational" : "Disabled";
    rtElem.className = realtimeActive ? "stat-value text-success" : "stat-value text-danger";
  }
}

// Scanner Functions
async function startScan(type, customTarget = null) {
  currentScanState.isScanning = true;
  currentScanState.isPaused = false;
  currentScanState.scanType = type;

  document.getElementById('scan-select-view').classList.add('hidden');
  document.getElementById('scan-results-view').classList.add('hidden');
  document.getElementById('scan-progress-view').classList.remove('hidden');
  document.getElementById('network-scan-results').classList.add('hidden');

  const typeLabels = {
    quick: "Running Quick Threat Scan...",
    selected: "Running Selected Target Scan...",
    full: "Running Exhaustive Full System Scan..."
  };
  document.getElementById('scan-type-title').innerText = typeLabels[type] || "Inspection in Progress...";
  document.getElementById('scan-percent-text').innerText = "0%";
  document.getElementById('scan-progress-bar').style.width = "0%";
  document.getElementById('scan-threats-count').innerText = "0";
  document.getElementById('scan-data-processed').innerText = "0 MB";

  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.start_scan(type, customTarget);
  }
}

async function browseAndScanFolder() {
  if (window.pywebview && window.pywebview.api) {
    const folder = await window.pywebview.api.browse_folder();
    if (folder) {
      startScan('selected', folder);
    }
  }
}

async function browseAndScanFile() {
  if (window.pywebview && window.pywebview.api) {
    const file = await window.pywebview.api.browse_file();
    if (file) {
      startScan('selected', file);
    }
  }
}

function updateScanProgress(data) {
  document.getElementById('scan-percent-text').innerText = `${data.percent}%`;
  document.getElementById('scan-progress-bar').style.width = `${data.percent}%`;
  document.getElementById('scan-current-file').innerText = data.current_file || "Inspecting binary...";
  document.getElementById('scan-files-count').innerText = `${data.scanned_count} / ${data.total_files}`;
  document.getElementById('scan-speed').innerText = `${data.speed} files/s`;
  document.getElementById('scan-data-processed').innerText = `${data.mb_scanned || 0} MB`;
  document.getElementById('scan-threats-count').innerText = data.threats_count;

  const mins = Math.floor(data.elapsed_seconds / 60).toString().padStart(2, '0');
  const secs = (data.elapsed_seconds % 60).toString().padStart(2, '0');
  document.getElementById('scan-elapsed').innerText = `${mins}:${secs}`;
}

function onThreatFound(threat) {
  logGuardEvent(`Threat Neutralized: ${threat.threat_name} in ${threat.file_path}`, true);
}

function onScanComplete(summary) {
  currentScanState.isScanning = false;
  document.getElementById('scan-progress-view').classList.add('hidden');
  document.getElementById('scan-results-view').classList.remove('hidden');

  const resultIcon = document.getElementById('result-icon-display');
  const resultTitle = document.getElementById('result-title');
  const resultSubtitle = document.getElementById('result-subtitle');
  const resultBadge = document.getElementById('result-status-badge');
  const threatsTable = document.getElementById('threats-table-container');
  const threatsBody = document.getElementById('threats-table-body');
  const threatsCountBadge = document.getElementById('threats-table-count-badge');

  // Populate Verdict KPIs
  const filesElem = document.getElementById('res-kpi-files');
  const mbElem = document.getElementById('res-kpi-mb');
  const timeElem = document.getElementById('res-kpi-time');
  const threatsElem = document.getElementById('res-kpi-threats');

  const totalFiles = (summary.scanned_count || 0).toLocaleString();
  const totalMb = summary.scanned_mb || 0;
  const elapsedSec = summary.elapsed_seconds || 0;
  const mins = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
  const secs = (elapsedSec % 60).toString().padStart(2, '0');

  if (filesElem) filesElem.innerText = totalFiles;
  if (mbElem) mbElem.innerText = `${totalMb} MB`;
  if (timeElem) timeElem.innerText = `${mins}:${secs}`;
  if (threatsElem) threatsElem.innerText = summary.threats_count || 0;

  if (summary.threats_count > 0) {
    resultIcon.className = "verdict-icon-container threat";
    resultIcon.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    resultTitle.innerText = `${summary.threats_count} Threat(s) Neutralized & Isolated`;
    resultSubtitle.innerText = `Malicious binaries and unverified payloads were automatically quarantined in the Encrypted Vault.`;
    if (resultBadge) {
      resultBadge.className = "badge danger";
      resultBadge.innerText = "Threats Detected";
    }
    
    threatsTable.classList.remove('hidden');
    if (threatsCountBadge) threatsCountBadge.innerText = `${summary.threats_count} Neutralized`;
    threatsBody.innerHTML = summary.threats_found.map(t => `
      <tr>
        <td><strong>${t.threat_name}</strong></td>
        <td><span class="badge secondary">${t.threat_type}</span></td>
        <td><span class="badge danger">${t.severity}</span></td>
        <td title="${t.file_path}">${t.file_path.substring(0, 45)}...</td>
        <td><span class="badge success">Quarantined</span></td>
      </tr>
    `).join('');
  } else {
    resultIcon.className = "verdict-icon-container";
    resultIcon.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
    resultTitle.innerText = summary.was_cancelled ? "Inspection Cancelled by User" : "System Clean & Protected";
    resultSubtitle.innerText = `Inspection completed with zero anomalies. Scanned ${totalFiles} objects (${totalMb} MB) in ${mins}:${secs}.`;
    if (resultBadge) {
      resultBadge.className = "badge success";
      resultBadge.innerText = "Verified Clean";
    }
    threatsTable.classList.add('hidden');
  }

  refreshDashboard();
  refreshQuarantine();
}

function togglePauseScan() {
  currentScanState.isPaused = !currentScanState.isPaused;
  const btn = document.getElementById('btn-pause-scan');
  btn.innerText = currentScanState.isPaused ? "Resume" : "Pause";
  if (window.pywebview && window.pywebview.api) {
    if (currentScanState.isPaused) {
      window.pywebview.api.pause_scan();
    } else {
      window.pywebview.api.resume_scan();
    }
  }
}

function cancelScan() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.cancel_scan();
  }
}

function resetScannerView() {
  document.getElementById('scan-results-view').classList.add('hidden');
  document.getElementById('scan-progress-view').classList.add('hidden');
  document.getElementById('scan-select-view').classList.remove('hidden');
}

// Network Safety Scanner
async function runNetworkScan() {
  if (window.pywebview && window.pywebview.api) {
    const netRes = await window.pywebview.api.scan_network();
    document.getElementById('network-scan-results').classList.remove('hidden');
    document.getElementById('net-scan-summary').innerText = `Scanned ${netRes.total_connections} active connections (${netRes.listening_ports_count} listening ports). Host: ${netRes.hostname} (${netRes.local_ip}).`;
    
    const badge = document.getElementById('net-safety-badge');
    badge.innerText = netRes.status;
    badge.className = netRes.status === "Secure" ? "badge success" : "badge danger";

    const tbody = document.getElementById('net-connections-tbody');
    tbody.innerHTML = netRes.active_connections.map(c => `
      <tr>
        <td><span class="badge secondary">${c.protocol}</span></td>
        <td style="font-family:monospace;">${c.local_address}</td>
        <td style="font-family:monospace;">${c.remote_address}</td>
        <td>${c.status}</td>
        <td><strong>${c.process_name}</strong> (PID: ${c.pid || '-'})</td>
      </tr>
    `).join('');
  }
}

// Performance Tune-up Suite Controller
function switchTuneTab(tuneKey) {
  document.querySelectorAll('.tune-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tune === tuneKey);
  });

  document.querySelectorAll('.tune-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `tune-${tuneKey}`);
    sec.classList.toggle('hidden', sec.id !== `tune-${tuneKey}`);
  });

  if (tuneKey === 'health') loadSystemHealth();
  if (tuneKey === 'junk') scanJunkFiles();
  if (tuneKey === 'startup') loadStartupApps();
  if (tuneKey === 'apps') loadInstalledApps();
  if (tuneKey === 'battery') loadBatteryHogs();
}

// 1. Health Score & Gauge Loader (Matching User Image 2)
async function loadSystemHealth() {
  if (window.pywebview && window.pywebview.api) {
    const h = await window.pywebview.api.get_system_health();
    const scoreText = document.getElementById('gauge-score-text');
    const descText = document.getElementById('gauge-health-desc');
    const arc = document.getElementById('gauge-progress-arc');

    if (scoreText) scoreText.innerText = h.health_percent;
    if (descText) descText.innerText = h.health_text;
    
    // Animate arc
    if (arc) {
      const totalLen = 235.6;
      const offset = totalLen - (totalLen * (h.health_percent / 100));
      arc.style.strokeDashoffset = offset;
    }

    const stVal = document.getElementById('health-storage-val');
    const ramVal = document.getElementById('health-ram-val');
    const cpuVal = document.getElementById('health-cpu-val');
    if (stVal) stVal.innerText = `${h.disk_free_gb} GB Free / ${h.disk_total_gb} GB`;
    if (ramVal) ramVal.innerText = `${h.ram_free_gb} GB Free / ${h.ram_total_gb} GB`;
    if (cpuVal) cpuVal.innerText = `${h.cpu_load_percent}% Normal Load`;

    // Also update Dashboard Snapshot bar
    const snapHealth = document.getElementById('dash-snap-health');
    const snapStorage = document.getElementById('dash-snap-storage');
    const snapRam = document.getElementById('dash-snap-ram');
    const snapCpu = document.getElementById('dash-snap-cpu');
    if (snapHealth) snapHealth.innerText = `${h.health_percent}% (${h.status_level === 'optimal' ? 'Optimal' : 'Good'})`;
    if (snapStorage) snapStorage.innerText = `${h.disk_free_gb} GB Free`;
    if (snapRam) snapRam.innerText = `${h.ram_free_gb} GB Available`;
    if (snapCpu) snapCpu.innerText = `${h.cpu_load_percent}% Normal`;
  }
}

async function loadRecentActivityFeed() {
  if (window.pywebview && window.pywebview.api) {
    try {
      const events = await window.pywebview.api.get_history_events();
      const container = document.getElementById('dash-recent-activity');
      if (container && events && events.length > 0) {
        const recent = events.slice(0, 4);
        container.innerHTML = recent.map(e => `
          <div class="log-entry ${e.severity ? e.severity.toLowerCase() : 'info'}">
            <span class="log-time">[${(e.timestamp || '').split(' ')[1] || e.timestamp || 'Now'}]</span>
            <span class="log-msg"><strong>${e.title}</strong>: ${e.details}</span>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error("Activity feed error:", e);
    }
  }
}

async function boostSystemMemory() {
  if (window.pywebview && window.pywebview.api) {
    const res = await window.pywebview.api.clean_junk(["user_temp", "system_temp"]);
    alert(`🎉 Speed Booster Finished!\nProcess working sets flushed.\nRAM and storage optimized.`);
    loadSystemHealth();
    refreshDashboard();
    loadRecentActivityFeed();
  }
}

// 2. Junk Files Cleaner
async function scanJunkFiles() {
  const btn = document.getElementById('btn-scan-junk');
  btn.innerText = "Analyzing System Junk...";
  btn.disabled = true;

  try {
    if (window.pywebview && window.pywebview.api) {
      const res = await window.pywebview.api.scan_junk();
      junkScanCache = res;

      document.getElementById('opt-total-size').innerText = res.total_size_formatted;
      document.getElementById('opt-total-files').innerText = `${res.total_files} items`;

      const container = document.getElementById('junk-categories-container');
      const cats = Object.values(res.categories);

      if (cats.length > 0) {
        container.innerHTML = cats.map(cat => {
          const sampleFile = (cat.files && cat.files.length > 0) ? cat.files[0] : "";
          return `
            <div class="junk-category-item">
              <div class="junk-cat-info">
                <input type="checkbox" class="junk-cat-checkbox" id="chk-${cat.key}" data-key="${cat.key}" checked>
                <div>
                  <strong>${cat.name} (${cat.count} items)</strong>
                  <p class="text-muted" style="font-size:12px;">${cat.desc}</p>
                </div>
              </div>
              <div class="junk-cat-actions">
                <div style="font-weight:700; color:var(--accent-color);">${cat.size_formatted}</div>
                ${sampleFile ? `<button class="btn btn-outline btn-sm" onclick="openPathInExplorer('${sampleFile.replace(/\\/g, '\\\\')}')" title="Review files in Windows Explorer">Show in Explorer</button>` : ''}
              </div>
            </div>
          `;
        }).join('');

        document.getElementById('btn-clean-junk-action').disabled = (res.total_files === 0);
      }
    }
  } catch (e) {
    console.error("Junk scan error:", e);
  } finally {
    btn.innerText = "Scan Removable Files";
    btn.disabled = false;
  }
}

async function openPathInExplorer(path) {
  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.open_path_in_explorer(path);
  }
}

function confirmAndCleanJunk() {
  if (!junkScanCache) return;
  document.getElementById('confirm-clean-size').innerText = junkScanCache.total_size_formatted;
  document.getElementById('clean-confirm-modal').classList.remove('hidden');
}

function closeCleanModal() {
  document.getElementById('clean-confirm-modal').classList.add('hidden');
}

async function executeCleanJunk() {
  closeCleanModal();
  const selectedKeys = [];
  document.querySelectorAll('.junk-cat-checkbox:checked').forEach(chk => {
    selectedKeys.push(chk.dataset.key);
  });

  const btn = document.getElementById('btn-clean-junk-action');
  btn.innerText = "Purging Junk Files...";
  btn.disabled = true;

  try {
    if (window.pywebview && window.pywebview.api) {
      const cleanRes = await window.pywebview.api.clean_junk(selectedKeys);
      alert(`System Optimization Completed!\nReclaimed: ${cleanRes.cleaned_formatted} (${cleanRes.cleaned_files} files removed)\nProcess working sets and memory caches flushed.`);
      scanJunkFiles();
      refreshDashboard();
      loadSystemHealth();
    }
  } catch (e) {
    console.error("Clean junk error:", e);
  } finally {
    btn.innerText = "Purge Selected Junk";
    btn.disabled = false;
  }
}

// 3. Startup Speed Optimizer Loader
async function loadStartupApps() {
  if (window.pywebview && window.pywebview.api) {
    const apps = await window.pywebview.api.get_startup_apps();
    const tbody = document.getElementById('startup-apps-tbody');
    if (!apps || apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No Windows startup apps detected.</td></tr>`;
      return;
    }

    tbody.innerHTML = apps.map(app => {
      const impactClass = app.impact === 'High' ? 'danger' : (app.impact === 'Medium' ? 'secondary' : 'success');
      return `
        <tr>
          <td><strong>${app.name}</strong><br><small class="text-muted" title="${app.executable}">${app.executable.substring(0, 45)}...</small></td>
          <td><span class="badge secondary">${app.location}</span></td>
          <td><span class="badge ${impactClass}">${app.impact} Impact</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="toggleStartup('${app.name.replace(/'/g, "\\'")}', false)">Disable</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function toggleStartup(name, enable) {
  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.toggle_startup_app(name, enable);
    loadStartupApps();
  }
}

// 4. Installed Apps Loader
async function loadInstalledApps() {
  if (window.pywebview && window.pywebview.api) {
    const apps = await window.pywebview.api.get_installed_apps();
    const tbody = document.getElementById('installed-apps-tbody');
    if (!apps || apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No installed applications found.</td></tr>`;
      return;
    }

    tbody.innerHTML = apps.map(app => `
      <tr>
        <td><strong>${app.name}</strong><br><small class="text-muted">v${app.version}</small></td>
        <td>${app.publisher}</td>
        <td style="color:var(--accent-color); font-weight:700;">${app.size_formatted}</td>
        <td>${app.install_date}</td>
        <td>
          <div style="display:flex; gap:6px;">
            ${app.install_location ? `<button class="btn btn-outline btn-sm" onclick="openPathInExplorer('${app.install_location.replace(/\\/g, '\\\\')}')">Show in Explorer</button>` : ''}
            ${app.uninstall_string ? `<button class="btn btn-danger btn-sm" onclick="uninstallApp('${app.uninstall_string.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">Uninstall</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }
}

async function uninstallApp(str) {
  if (confirm("Launch native uninstaller for this application?")) {
    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.launch_app_uninstaller(str);
    }
  }
}

// 5. Battery Power Saver Loader
async function loadBatteryHogs() {
  if (window.pywebview && window.pywebview.api) {
    const b = await window.pywebview.api.get_battery_hogs();
    const tbody = document.getElementById('battery-hogs-tbody');
    if (!b.processes || b.processes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No high power background processes detected.</td></tr>`;
      return;
    }

    tbody.innerHTML = b.processes.map(p => {
      const drainClass = p.energy_level === 'High' ? 'danger' : (p.energy_level === 'Moderate' ? 'secondary' : 'success');
      return `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td style="font-family:monospace;">${p.pid}</td>
          <td>${p.cpu_percent}%</td>
          <td>${p.memory_percent}%</td>
          <td><span class="badge ${drainClass}">${p.energy_level} Energy Impact</span></td>
        </tr>
      `;
    }).join('');
  }
}

// Quarantine Vault
async function refreshQuarantine() {
  if (!window.pywebview || !window.pywebview.api) return;
  try {
    const list = await window.pywebview.api.get_quarantine();
    const tbody = document.getElementById('quarantine-table-body');
    const badge = document.getElementById('quarantine-badge');
    badge.innerText = list.length;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No files in quarantine vault. System is clean.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${item.threat_name}</strong></td>
        <td>${item.file_name}</td>
        <td title="${item.original_path}">${item.original_path.substring(0, 35)}...</td>
        <td>${item.date_quarantined}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="restoreQuarantineFile('${item.id}')">Restore</button>
          <button class="btn btn-sm btn-danger" onclick="deleteQuarantineFile('${item.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error("Quarantine error:", e);
  }
}

async function restoreQuarantineFile(id) {
  if (confirm("Restore this file to its original location?")) {
    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.restore_quarantine(id);
      refreshQuarantine();
    }
  }
}

async function deleteQuarantineFile(id) {
  if (confirm("Permanently wipe this malicious file from disk?")) {
    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.delete_quarantine(id);
      refreshQuarantine();
    }
  }
}

async function wipeAllQuarantine() {
  if (confirm("Permanently wipe and purge all files in the Quarantine Vault?")) {
    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.wipe_quarantine();
      refreshQuarantine();
    }
  }
}

// Real-Time Guard & Log
function toggleRealtimeShield(enabled) {
  updateSetting('realtime_protection', enabled);
  const statusElem = document.getElementById('dash-realtime-status');
  if (statusElem) {
    statusElem.innerText = enabled ? "Operational" : "Disabled";
    statusElem.className = enabled ? "stat-value text-success" : "stat-value text-danger";
  }
  logGuardEvent(`Real-Time Interceptor turned ${enabled ? 'ON' : 'OFF'}`);
}

function logGuardEvent(msg, isThreat = false) {
  const container = document.getElementById('guard-activity-log');
  if (!container) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = isThreat ? "log-entry threat" : "log-entry info";
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${msg}</span>`;
  container.prepend(entry);
}

function clearGuardEvents() {
  document.getElementById('guard-activity-log').innerHTML = `<div class="log-entry info"><span class="log-time">[System]</span> Log stream cleared.</div>`;
}

// Security EICAR Test
async function generateEicarTest() {
  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.test_eicar_drop();
    logGuardEvent("Generated safe EICAR test string in Downloads directory.");
  }
}

// Settings & Exclusions
async function loadSettings() {
  if (!window.pywebview || !window.pywebview.api) return;
  try {
    const config = await window.pywebview.api.get_config();
    document.getElementById('setting-realtime').checked = config.realtime_protection;
    document.getElementById('realtime-toggle-switch').checked = config.realtime_protection;
    document.getElementById('setting-scan-modify').checked = config.realtime_scan_on_modify;
    const autoScanUsbElem = document.getElementById('setting-auto-scan-usb');
    if (autoScanUsbElem) autoScanUsbElem.checked = (config.auto_scan_usb !== false);
    document.getElementById('setting-usb-policy').value = config.usb_policy || 'auto_scan';
    document.getElementById('setting-auto-quarantine').checked = config.auto_quarantine;
    document.getElementById('setting-heuristic').value = config.heuristic_level || 'deep';
    document.getElementById('setting-scan-archives').checked = config.scan_archives;
    document.getElementById('setting-perf-profile').value = config.performance_profile || 'balanced';
    document.getElementById('setting-start-boot').checked = config.start_on_boot;
    document.getElementById('setting-quarantine-retention').value = config.quarantine_retention_days || 30;

    const exclList = document.getElementById('exclusions-list');
    if (config.exclusions && config.exclusions.length > 0) {
      exclList.innerHTML = config.exclusions.map(ex => `
        <li class="exclusion-item">
          <span>${ex}</span>
          <button class="btn btn-sm btn-danger" onclick="removeExclusion('${ex.replace(/\\/g, '\\\\')}')">Remove</button>
        </li>
      `).join('');
    } else {
      exclList.innerHTML = `<li class="empty-text">No custom exclusions configured.</li>`;
    }
  } catch (e) {
    console.error("Settings error:", e);
  }
}

async function updateSetting(key, val) {
  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.update_config(key, val);
  }
}

async function resetFactorySettings() {
  if (confirm("Reset all protection policies and settings to default values?")) {
    if (window.pywebview && window.pywebview.api) {
      await window.pywebview.api.reset_settings();
      loadInitialConfig();
    }
  }
}

async function addExclusionFolder() {
  if (window.pywebview && window.pywebview.api) {
    const folder = await window.pywebview.api.browse_folder();
    if (folder) {
      await window.pywebview.api.add_exclusion(folder);
      loadSettings();
    }
  }
}

async function removeExclusion(path) {
  if (window.pywebview && window.pywebview.api) {
    await window.pywebview.api.remove_exclusion(path);
    loadSettings();
  }
}

// USB Modal Handling
function showUsbModal(drive) {
  currentUsbDrive = drive;
  document.getElementById('usb-modal-drive').innerText = drive;
  document.getElementById('usb-modal').classList.remove('hidden');
}

function closeUsbModal() {
  document.getElementById('usb-modal').classList.add('hidden');
}

function scanUsbDrive() {
  closeUsbModal();
  if (currentUsbDrive) {
    switchTab('scanner');
    startScan('selected', currentUsbDrive);
  }
}

async function scanConnectedUsbDrive() {
  if (window.pywebview && window.pywebview.api) {
    try {
      const drives = await window.pywebview.api.get_connected_usb_drives();
      if (!drives || drives.length === 0) {
        alert("🔌 No removable USB storage drives currently detected.\nPlease insert a USB drive to scan.");
        return;
      }
      if (drives.length === 1) {
        switchTab('scanner');
        startScan('selected', drives[0].drive);
      } else {
        const driveList = drives.map((d, i) => `${i + 1}. ${d.display || d.drive}`).join('\n');
        const choice = prompt(`Select USB volume to scan:\n${driveList}\nEnter number (1-${drives.length}):`, "1");
        if (choice) {
          const idx = parseInt(choice) - 1;
          if (idx >= 0 && idx < drives.length) {
            switchTab('scanner');
            startScan('selected', drives[idx].drive);
          }
        }
      }
    } catch (e) {
      console.error("Scan USB error:", e);
    }
  }
}
