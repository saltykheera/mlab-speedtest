'use strict';

/**
 * M-Lab Speed Test – IQB Score Page
 *
 * Reads measurement params from the URL query string, POSTs to:
 *   POST /score/mlab        → overall IQB score
 *   POST /score/use-cases   → per-use-case breakdown
 */

const IQB_API_BASE      = 'https://mlabapi.delightfulsea-bc4b3707.eastasia.azurecontainerapps.io';
const IQB_API_URL       = `${IQB_API_BASE}/score/mlab`;
const IQB_USE_CASE_URL  = `${IQB_API_BASE}/score/use-cases`;

// ── Grade thresholds (0–100 scale) ───────────────────────────────────────────
const GRADES = [
  { min: 90, label: 'Excellent', cls: 'grade-excellent', desc: 'Your connection is outstanding — great for 4K streaming, gaming, and video calls.' },
  { min: 75, label: 'Good',      cls: 'grade-good',      desc: 'Your connection is solid and handles most online activities with ease.' },
  { min: 50, label: 'Fair',      cls: 'grade-fair',      desc: 'Your connection is usable but may struggle with high-bandwidth activities.' },
  { min: 25, label: 'Poor',      cls: 'grade-poor',      desc: 'Your connection has significant issues that will impact your experience.' },
  { min: 0,  label: 'Very Poor', cls: 'grade-verypoor',  desc: 'Your connection is severely degraded. Basic browsing may be affected.' },
];

// ── Use-case metadata: icon (Font Awesome) + experience copy ─────────────────
const USE_CASE_META = {
  'web browsing': {
    icon: 'fa-globe',
    supported:     'Pages load instantly with no delays.',
    partial:       'Most pages load fine; heavy sites may lag.',
    notSupported:  'Slow load times and frequent timeouts.',
  },
  'video streaming': {
    icon: 'fa-play-circle',
    supported:     'Smooth HD / 4K streaming with no buffering.',
    partial:       'Standard quality OK; HD may buffer.',
    notSupported:  'Frequent buffering and low quality.',
  },
  'audio streaming': {
    icon: 'fa-music',
    supported:     'Crystal-clear audio, zero dropouts.',
    partial:       'Audio mostly clear; occasional glitches.',
    notSupported:  'Choppy audio and frequent interruptions.',
  },
  'video conferencing': {
    icon: 'fa-video-camera',
    supported:     'Clear HD video calls, no freezing.',
    partial:       'Calls work at reduced quality.',
    notSupported:  'Poor call quality, freezing, or drops.',
  },
  'online backup': {
    icon: 'fa-cloud-upload',
    supported:     'Backups complete quickly in the background.',
    partial:       'Backups run slowly; large files take long.',
    notSupported:  'Backups time out or fail to complete.',
  },
  'gaming': {
    icon: 'fa-gamepad',
    supported:     'Low latency, responsive gameplay.',
    partial:       'Playable but with occasional lag spikes.',
    notSupported:  'High latency causes lag and disconnects.',
  },
};

// ── Score arc gauge ───────────────────────────────────────────────────────────
function drawScoreGauge(score100) {
  const canvas = document.getElementById('scoreGauge');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx  = canvas.width / 2;
  const cy  = canvas.height / 2;
  const r   = 100;
  const lw  = 16;
  const startAngle = Math.PI * 0.75;
  const fullSweep  = Math.PI * 1.5;
  const endAngle   = startAngle + fullSweep * Math.min(score100, 100) / 100;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, startAngle + fullSweep);
  ctx.lineWidth   = lw;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineCap     = 'round';
  ctx.stroke();

  if (score100 <= 0) return;

  let colour;
  if (score100 >= 75)      colour = '#4caf50';
  else if (score100 >= 50) colour = '#ff9800';
  else if (score100 >= 25) colour = '#f44336';
  else                     colour = '#b71c1c';

  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.lineWidth   = lw;
  ctx.strokeStyle = colour;
  ctx.lineCap     = 'round';
  ctx.stroke();
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function show(id)          { const el = document.getElementById(id); if (el) el.style.display = ''; }
function hide(id)          { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function showError(msg) {
  hide('scoreLoading');
  hide('scoreDisplay');
  setText('scoreErrorMsg', msg);
  show('scoreError');
}

// ── Render overall score ──────────────────────────────────────────────────────
function renderScore(rawScore, inputs) {
  hide('scoreLoading');
  hide('scoreError');

  const score100 = Math.min(rawScore * 100, 100);
  const rounded  = Math.round(score100);

  if (inputs.download !== null) setText('summaryDownload', inputs.download.toFixed(2) + ' Mb/s');
  if (inputs.upload   !== null) setText('summaryUpload',   inputs.upload.toFixed(2)   + ' Mb/s');
  if (inputs.latency  !== null) setText('summaryLatency',  inputs.latency.toFixed(0)  + ' ms');
  if (inputs.loss     !== null) setText('summaryLoss',     (inputs.loss * 100).toFixed(3) + '%');

  setText('scoreValue', score100.toFixed(1));
  drawScoreGauge(score100);

  const grade   = GRADES.find(g => rounded >= g.min) || GRADES[GRADES.length - 1];
  const labelEl = document.getElementById('scoreLabel');
  const descEl  = document.getElementById('scoreDesc');
  if (labelEl) { labelEl.textContent = grade.label; labelEl.className = 'score-grade ' + grade.cls; }
  if (descEl)  { descEl.textContent  = grade.desc; }

  show('scoreDisplay');
}

// ── Render use-case breakdown ─────────────────────────────────────────────────
function renderUseCases(data) {
  const grid = document.getElementById('useCaseGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const scores      = data.use_case_scores  || {};
  const supported   = new Set(data.supported     || []);
  const notSupported= new Set(data.not_supported  || []);

  // Render in a fixed display order
  const ORDER = [
    'web browsing', 'video streaming', 'audio streaming',
    'video conferencing', 'online backup', 'gaming',
  ];

  for (const name of ORDER) {
    const raw   = scores[name] ?? 0;           // 0–1 from API
    const pct   = Math.round(raw * 100);       // 0–100 for display
    const meta  = USE_CASE_META[name] || { icon: 'fa-wifi', supported: '', partial: '', notSupported: '' };

    let stateClass, experienceText, statusLabel;
    if (supported.has(name)) {
      stateClass     = 'supported';
      experienceText = meta.supported;
      statusLabel    = '✓ Supported';
    } else if (notSupported.has(name)) {
      stateClass     = 'not-supported';
      experienceText = meta.notSupported;
      statusLabel    = '✗ Not supported';
    } else {
      stateClass     = 'partial';
      experienceText = meta.partial;
      statusLabel    = '~ Partial';
    }

    const card = document.createElement('div');
    card.className = `usecase-card ${stateClass}`;
    card.innerHTML = `
      <div class="usecase-card-header">
        <i class="fa ${meta.icon} usecase-icon" aria-hidden="true"></i>
        <span class="usecase-name">${name}</span>
        <span class="usecase-status-dot" title="${statusLabel}"></span>
      </div>
      <div class="usecase-bar-track">
        <div class="usecase-bar-fill" style="width:${pct}%"></div>
      </div>
      <div class="usecase-footer">
        <span class="usecase-experience">${experienceText}</span>
        <span class="usecase-score">${pct}%</span>
      </div>`;

    grid.appendChild(card);
  }

  show('useCaseSection');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function loadScore() {
  const params = new URLSearchParams(window.location.search);

  const download = params.has('download') ? parseFloat(params.get('download')) : null;
  const upload   = params.has('upload')   ? parseFloat(params.get('upload'))   : null;
  const latency  = params.has('latency')  ? parseFloat(params.get('latency'))  : null;
  const loss     = params.has('loss')     ? parseFloat(params.get('loss'))     : null;

  if (download === null && upload === null) {
    showError('No measurement data found. Please run a speed test first.');
    return;
  }

  const body = {};
  if (download !== null) body.download_throughput_mbps = download;
  if (upload   !== null) body.upload_throughput_mbps   = upload;
  if (latency  !== null) body.latency_ms               = latency;
  if (loss     !== null) body.packet_loss               = loss;

  try {
    // Fire both requests in parallel
    const [scoreResp, useCaseResp] = await Promise.all([
      fetch(IQB_API_URL,      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      fetch(IQB_USE_CASE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    ]);

    if (!scoreResp.ok) {
      showError(`Server error (${scoreResp.status}): ${await scoreResp.text()}`);
      return;
    }

    const scoreData   = await scoreResp.json();
    const useCaseData = useCaseResp.ok ? await useCaseResp.json() : null;

    if (typeof scoreData.iqb_score !== 'number') {
      showError('Unexpected response from the scoring service.');
      return;
    }

    renderScore(scoreData.iqb_score, { download, upload, latency, loss });

    if (useCaseData && useCaseData.use_case_scores) {
      renderUseCases(useCaseData);
    }
  } catch (err) {
    console.error('[score] fetch failed:', err);
    showError('Could not reach the scoring service. Please try again later.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof i18n !== 'undefined') await i18n.init();
  loadScore();
});
