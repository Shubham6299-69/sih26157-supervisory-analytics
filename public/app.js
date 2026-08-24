/**
 * NCIIPC Supervisory Analytics - Interactive Dashboard Controller
 */

let currentCseId = 'CSE-07';
let leaderboardData = [];

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadLeaderboard();
  loadTimelineDemo();
  loadEntityDetail(currentCseId);
  initModalListeners();
});

// 1. Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-tab'));
      if (target) target.classList.add('active');

      if (btn.getAttribute('data-tab') === 'tab-audit-report') {
        loadAuditReport(currentCseId);
      } else if (btn.getAttribute('data-tab') === 'tab-negative-space') {
        loadNegativeSpaceGrid('CSE-12');
      }
    });
  });

  // Top header shortcut buttons
  document.getElementById('btn-compare-timeline').addEventListener('click', () => {
    document.querySelector('[data-tab="tab-timeline-demo"]').click();
  });

  document.getElementById('select-cse').addEventListener('change', (e) => {
    currentCseId = e.target.value;
    loadEntityDetail(currentCseId);
    loadAuditReport(currentCseId);
  });
}

// 2. Load Sector Leaderboard
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  try {
    const res = await fetch('/api/cses');
    const json = await res.json();
    leaderboardData = json.supervisoryLeaderboard;

    container.innerHTML = '';
    let highCount = 0;
    let totalGaps = 0;
    let totalBlind = 0;

    leaderboardData.forEach(item => {
      const { cse, score, executionSummary, negativeSpaceSummary } = item;
      if (score.priorityLevel === 'HIGH') highCount++;
      totalGaps += executionSummary.flaggedCasesCount;
      totalBlind += negativeSpaceSummary.criticalBlindSpotCount;

      const card = document.createElement('div');
      card.className = 'cse-card';
      card.onclick = () => {
        currentCseId = cse.id;
        document.getElementById('select-cse').value = cse.id;
        document.querySelector('[data-tab="tab-entity-detail"]').click();
        loadEntityDetail(cse.id);
      };

      const findingsList = score.auditFindings.slice(0, 3).map(f => {
        const cssClass = f.severity === 'CRITICAL' ? '' : (f.severity === 'HIGH' ? 'warn' : 'ok');
        return `<li class="${cssClass}"><strong>[${f.pillar.replace('_', ' ')}]</strong> ${f.text}</li>`;
      }).join('');

      card.innerHTML = `
        <div class="cse-card-header">
          <div class="cse-title-group">
            <h3>${cse.id}: ${cse.name}</h3>
            <span class="cse-sector">Sector: ${cse.sector}</span>
          </div>
          <span class="priority-badge ${score.badgeColor}">${score.priorityLevel} ATTENTION</span>
        </div>
        <div class="score-bar-container">
          <div class="score-bar-labels">
            <span>Supervisory Attention Score</span>
            <strong>${score.totalScore} / 100</strong>
          </div>
          <div class="score-track">
            <div class="score-fill ${score.badgeColor}" style="width: ${score.totalScore}%"></div>
          </div>
        </div>
        <ul class="card-findings-list">
          ${findingsList}
        </ul>
        <div class="mt-3 small text-muted" style="display:flex; justify-content:space-between;">
          <span>Cases Evaluated: ${executionSummary.totalCases}</span>
          <span style="color: var(--accent-blue);">Inspect Findings &rarr;</span>
        </div>
      `;
      container.appendChild(card);
    });

    // Update banner stats
    document.getElementById('stat-total-cses').innerText = `${leaderboardData.length} CSEs`;
    document.getElementById('stat-high-attention').innerText = `${highCount} CSEs`;
    document.getElementById('stat-total-gaps').innerText = `${totalGaps} Cases`;
    document.getElementById('stat-total-blindspots').innerText = `${totalBlind} Assets`;

    // Render baseline chips
    renderBaselines(json.sectorBaselines);

  } catch (err) {
    container.innerHTML = `<div class="text-danger">Failed to load analytics: ${err.message}</div>`;
  }
}

function renderBaselines(baselines) {
  const container = document.getElementById('baseline-chips-container');
  if (!baselines) return;

  container.innerHTML = `
    <div class="baseline-chip">Median Escalation Rate: <strong>${baselines.escalationRateMedian}%</strong></div>
    <div class="baseline-chip">Median Handling Time: <strong>${baselines.durationMedian} min</strong></div>
    <div class="baseline-chip">Median Execution Gap Rate: <strong>${Math.round(baselines.executionGapMedian * 100)}%</strong></div>
    <div class="baseline-chip">Forensic Evidence (IES) Median: <strong>${baselines.iesMedian}/100</strong></div>
  `;
}

// 3. Load Entity Deep Dive
async function loadEntityDetail(cseId) {
  try {
    const res = await fetch(`/api/cse/${cseId}`);
    const data = await res.json();
    if (data.status !== 'success') return;

    const { cse, score, executionGaps, negativeSpace, peerDeviation } = data;

    // Score box
    const scoreBox = document.getElementById('detail-score-box');
    scoreBox.innerHTML = `
      <div style="text-align:right;">
        <span class="priority-badge ${score.badgeColor}">${score.priorityLevel} SUPERVISORY PRIORITY</span>
        <h2 style="font-size:2rem; margin-top:0.25rem;">${score.totalScore} <span style="font-size:1rem; color:var(--text-muted);">/ 100</span></h2>
      </div>
    `;

    // Audit reasons
    const reasonsBox = document.getElementById('detail-audit-reasons');
    reasonsBox.innerHTML = `
      <h4 style="margin-bottom:0.5rem; color:var(--accent-cyan);">🔎 Key Supervisory Audit Justifications:</h4>
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        ${score.auditFindings.map(f => `
          <div style="background:rgba(0,0,0,0.3); padding:0.6rem 0.8rem; border-radius:6px; border-left:4px solid ${f.severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--accent-amber)'};">
            <strong>[${f.pillar}]</strong> ${f.text}
          </div>
        `).join('')}
      </div>
    `;

    // Flagged cases table
    const tbody = document.getElementById('flagged-cases-tbody');
    const flagged = executionGaps.cases.filter(c => c.hasExecutionGap);
    document.getElementById('flagged-cases-count-badge').innerText = `${flagged.length} Flagged Cases`;

    tbody.innerHTML = '';
    flagged.slice(0, 30).forEach(c => {
      const tr = document.createElement('tr');
      const primaryGap = c.findings[0] ? c.findings[0].label : 'Low Telemetry';
      const sevClass = c.severity === 'CRITICAL' ? 'text-danger' : 'text-warning';

      tr.innerHTML = `
        <td><code>${c.caseId}</code></td>
        <td class="${sevClass}"><strong>${c.severity}</strong></td>
        <td>${c.alertType}</td>
        <td>${c.durationMins} min</td>
        <td><strong>${c.ies}/100</strong></td>
        <td><span class="badge ${c.findings[0]?.severity === 'CRITICAL' ? 'red' : 'amber'}">${primaryGap}</span></td>
        <td><button class="btn btn-outline small" onclick="openCaseModal('${c.caseId}')">Inspect Trail</button></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Failed to load entity detail:', err);
  }
}

// 4. Load Side-by-Side Timeline Demo
async function loadTimelineDemo() {
  try {
    const res = await fetch('/api/timeline-compare');
    const data = await res.json();
    if (data.status !== 'success') return;

    const { genuineCase, suspiciousCase } = data;

    // Populate Genuine Case
    document.getElementById('genuine-case-meta').innerText = `${genuineCase.caseId} | Asset: ${genuineCase.targetAsset}`;
    document.getElementById('genuine-ies-pill').innerText = `IES Score: ${genuineCase.ies}/100`;
    document.getElementById('genuine-duration').innerText = `${genuineCase.durationMins} mins`;
    document.getElementById('genuine-span').innerText = `${genuineCase.activeSpanMins} mins`;
    document.getElementById('genuine-hadr').innerText = `${genuineCase.hadr}x (Active Investigation)`;

    const genBody = document.getElementById('genuine-timeline-events');
    genBody.innerHTML = `
      <div class="timeline-step crit">
        <div class="step-time">T+00:00 (10:00 AM)</div>
        <div class="step-label">Alert Triggered</div>
        <div class="step-detail">🚨 ${genuineCase.alertType} on ${genuineCase.targetAsset}</div>
      </div>
      <div class="timeline-step ok">
        <div class="step-time">T+02:00 (10:02 AM)</div>
        <div class="step-label">Analyst Opened Alert & Performed Asset Context Lookup</div>
        <div class="step-detail">Retrieved critical OT server asset topology and ownership.</div>
        <div class="step-code">asset_inventory.lookup(host="${genuineCase.targetAsset}")</div>
      </div>
      <div class="timeline-step ok">
        <div class="step-time">T+06:00 (10:06 AM)</div>
        <div class="step-label">SIEM Authentication & Process Log Analysis</div>
        <div class="step-detail">Queried Windows event ID 4688 and process execution history.</div>
        <div class="step-code">index=sec_logs host="${genuineCase.targetAsset}" | stats count by process</div>
      </div>
      <div class="timeline-step ok">
        <div class="step-time">T+14:00 (10:14 AM)</div>
        <div class="step-label">IOC Threat Intel Verification</div>
        <div class="step-detail">Queried threat reputation for C2 beacon IP.</div>
        <div class="step-code">threat_intel.query(ioc="185.220.101.5") -> Threat Score: 88/100</div>
      </div>
      <div class="timeline-step ok">
        <div class="step-time">T+28:00 (10:28 AM)</div>
        <div class="step-label">Forensic Evidence Attachment & Level-2 CERT Escalation</div>
        <div class="step-detail">Memory dump and network pcap attached to case file.</div>
        <div class="step-code">escalate_case(caseId="${genuineCase.caseId}", reason="Confirmed C2")</div>
      </div>
      <div class="timeline-step ok">
        <div class="step-time">T+38:00 (10:38 AM)</div>
        <div class="step-label">Case Closed / Transmitted</div>
        <div class="step-detail">Full digital forensic audit trail preserved.</div>
      </div>
    `;

    // Populate Suspicious Tab-Open Case
    document.getElementById('suspicious-case-meta').innerText = `${suspiciousCase.caseId} | Asset: ${suspiciousCase.targetAsset}`;
    document.getElementById('suspicious-ies-pill').innerText = `IES Score: ${suspiciousCase.ies}/100`;
    document.getElementById('suspicious-duration').innerText = `${suspiciousCase.durationMins} mins`;
    document.getElementById('suspicious-span').innerText = `${suspiciousCase.activeSpanMins} mins`;
    document.getElementById('suspicious-hadr').innerText = `${suspiciousCase.hadr}x (Severe Dormancy)`;

    const suspBody = document.getElementById('suspicious-timeline-events');
    suspBody.innerHTML = `
      <div class="timeline-step crit">
        <div class="step-time">T+00:00 (10:00 AM)</div>
        <div class="step-label">Alert Triggered</div>
        <div class="step-detail">🚨 CRITICAL Alert on ${suspiciousCase.targetAsset}</div>
      </div>
      <div class="timeline-step gap">
        <div class="step-time">T+00:30 (10:00:30 AM)</div>
        <div class="step-label">Single Superficial Action Recorded</div>
        <div class="step-detail">Generic placeholder query executed without inspecting the affected host.</div>
        <div class="step-code">index=* | head 5</div>
      </div>
      <div class="timeline-gap-notice mt-2">
        ⏳ 87 MINUTES OF COMPLETE INACTIVITY (Dormant Browser Session / Tab Left Open)
      </div>
      <div class="timeline-step crit mt-2">
        <div class="step-time">T+88:00 (11:28 AM)</div>
        <div class="step-label">Immediate Closure with Canned Template Note</div>
        <div class="step-detail">Case closed as "False Positive" with zero log queries, IOC checks, or escalation.</div>
        <div class="step-code">Note: "Investigated standard log telemetry, no anomaly detected..."</div>
      </div>
    `;

  } catch (err) {
    console.error('Failed to load timeline demo:', err);
  }
}

// 5. Load Negative Space Blind Spot Grid
async function loadNegativeSpaceGrid(cseId) {
  try {
    const res = await fetch(`/api/cse/${cseId}`);
    const data = await res.json();
    if (data.status !== 'success') return;

    const grid = document.getElementById('asset-blindspot-grid');
    const tbody = document.getElementById('blindspot-table-tbody');
    grid.innerHTML = '';
    tbody.innerHTML = '';

    const blindSpots = data.negativeSpace.blindSpots;
    const allAssets = data.assets || [];

    allAssets.forEach(a => {
      const isDark = blindSpots.some(b => b.hostname === a.hostname);
      const chip = document.createElement('div');
      chip.className = `asset-chip ${isDark ? 'dark' : 'monitored'}`;
      chip.innerHTML = `
        <div style="font-weight:700;">${a.hostname}</div>
        <div class="small">${a.criticality}</div>
        <div class="small text-muted">${isDark ? '🔴 DARK' : '🟢 ACTIVE'}</div>
      `;
      grid.appendChild(chip);
    });

    blindSpots.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${b.assetId}</code></td>
        <td><strong>${b.hostname}</strong></td>
        <td><span class="badge red">${b.criticality}</span></td>
        <td>${b.department}</td>
        <td><span class="badge red">ZERO TELEMETRY</span></td>
        <td>${b.findings[0]}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Failed to load negative space grid:', err);
  }
}

// 6. Load Official Audit Dossier
async function loadAuditReport(cseId) {
  try {
    const res = await fetch(`/api/report/${cseId}`);
    const data = await res.json();
    if (data.status !== 'success') return;

    const reportView = document.getElementById('report-markdown-content');
    reportView.innerText = data.markdown;

    // Hook copy and download buttons
    document.getElementById('btn-copy-report').onclick = () => {
      navigator.clipboard.writeText(data.markdown);
      alert('Official NCIIPC Supervisory Dossier copied to clipboard!');
    };

    document.getElementById('btn-download-report').onclick = () => {
      const blob = new Blob([data.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NCIIPC_Supervisory_Report_${cseId}.md`;
      a.click();
    };

  } catch (err) {
    console.error('Failed to load audit report:', err);
  }
}

// 7. Case Detail Modal
async function openCaseModal(caseId) {
  const modal = document.getElementById('case-modal');
  const title = document.getElementById('modal-case-title');
  const sub = document.getElementById('modal-case-sub');
  const body = document.getElementById('modal-case-body');

  try {
    const res = await fetch(`/api/case/${caseId}`);
    const data = await res.json();
    if (data.status !== 'success') return;

    const c = data.case;
    title.innerText = `Forensic Audit Record: ${c.caseId}`;
    sub.innerText = `Alert: ${c.alertType} | Asset: ${c.targetAsset} | Analyst: ${c.assignedAnalyst}`;

    const eventsHtml = c.telemetry && c.telemetry.length > 0
      ? c.telemetry.map(e => `
          <div style="background:rgba(0,0,0,0.3); border-left:3px solid var(--accent-blue); padding:0.5rem 0.75rem; margin-bottom:0.5rem; border-radius:4px;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${e.timestamp} | ${e.actionCategory}</div>
            <div style="font-weight:600; font-size:0.85rem; margin:0.15rem 0;">${e.resultSummary}</div>
            <div class="step-code">${e.rawQuery}</div>
          </div>
        `).join('')
      : `<div class="timeline-gap-notice">🚨 ZERO FORENSIC TELEMETRY RECORDED FOR THIS CASE</div>`;

    body.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
        <div class="stat-card">
          <div class="stat-label">Investigation Evidence Score</div>
          <div class="stat-value ${c.ies < 35 ? 'text-danger' : 'text-success'}">${c.ies}/100</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Handling Duration</div>
          <div class="stat-value">${c.durationMins} min</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">HADR Divergence</div>
          <div class="stat-value ${c.hadr >= 10 ? 'text-danger' : 'text-success'}">${c.hadr}x</div>
        </div>
      </div>

      <h4 style="margin-bottom:0.5rem; color:var(--accent-cyan);">Execution Gap Audit Findings:</h4>
      <div style="margin-bottom:1.5rem;">
        ${c.findings.map(f => `
          <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:0.6rem; border-radius:6px; margin-bottom:0.5rem;">
            <strong style="color:#f87171;">[${f.severity}] ${f.label}</strong>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">${f.detail}</p>
          </div>
        `).join('')}
      </div>

      <h4 style="margin-bottom:0.5rem; color:var(--accent-cyan);">Investigation Notes Recorded by SOC:</h4>
      <div style="background:#0d1117; padding:0.75rem; border-radius:6px; font-family:var(--font-mono); font-size:0.85rem; margin-bottom:1.5rem; border:1px solid var(--border-color);">
        "${c.notes}"
      </div>

      <h4 style="margin-bottom:0.5rem; color:var(--accent-cyan);">Raw Forensic Telemetry Audit Trail:</h4>
      <div>${eventsHtml}</div>
    `;

    modal.classList.remove('hidden');
  } catch (err) {
    console.error('Failed to open case modal:', err);
  }
}

// 8. Ingest / Upload Modal Listeners
function initModalListeners() {
  const caseModal = document.getElementById('case-modal');
  document.getElementById('btn-close-modal').onclick = () => caseModal.classList.add('hidden');

  const uploadModal = document.getElementById('upload-modal');
  document.getElementById('btn-upload-data').onclick = () => uploadModal.classList.remove('hidden');
  document.getElementById('btn-close-upload-modal').onclick = () => uploadModal.classList.add('hidden');

  document.getElementById('btn-load-sample').onclick = () => {
    const sample = {
      cseId: 'CSE-DEMO-ATTACK',
      cseName: 'Defense Electronics Hub',
      sector: 'Strategic Defense',
      assets: [
        { assetId: 'AST-D-01', hostname: 'RADAR-SIG-01', criticality: 'CRITICAL', department: 'Radar Grid' }
      ],
      cases: [
        {
          caseId: 'CASE-D-101',
          severity: 'CRITICAL',
          alertType: 'SCADA Firmware Memory Tampering',
          targetAsset: 'RADAR-SIG-01',
          assignedAnalyst: 'Analyst_Custom',
          durationMins: 0.8,
          notes: 'Investigated standard log telemetry, no anomaly detected, confirmed false positive.',
          escalated: false
        }
      ],
      telemetry: []
    };
    document.getElementById('custom-json-input').value = JSON.stringify(sample, null, 2);
  };

  document.getElementById('btn-submit-upload').onclick = async () => {
    try {
      const raw = document.getElementById('custom-json-input').value;
      const parsed = JSON.parse(raw);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert(`Custom SOC dataset ingested! Analyzed ${data.cseId}.`);
        uploadModal.classList.add('hidden');
        loadLeaderboard();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert(`Invalid JSON format: ${err.message}`);
    }
  };
}
