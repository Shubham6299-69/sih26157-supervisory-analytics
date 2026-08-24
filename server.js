/**
 * NCIIPC Supervisory Analytics Platform - Core Backend Server
 * SIH26157 Problem Statement Solution
 * Pure Node.js zero-dependency HTTP server and REST API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { generateDatasets } = require('./data/generator');
const { analyzeExecutionGaps } = require('./engine/executionGap');
const { analyzeNegativeSpace } = require('./engine/negativeSpace');
const { analyzePeerDeviations } = require('./engine/peerDeviation');
const { calculateSupervisoryScore } = require('./engine/supervisoryScore');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// In-memory data store initialized with 5 CSEs
let systemData = generateDatasets();

function computeAllAnalytics() {
  const { cses, datasets } = systemData;

  // 1. First pass: individual metrics
  const cseMetrics = cses.map(cse => {
    const data = datasets[cse.id];
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    const escCount = data.cases.filter(c => c.escalated).length;
    const durations = data.cases.map(c => c.durationMins).sort((a, b) => a - b);
    const medianDur = durations[Math.floor(durations.length / 2)] || 0;

    return {
      cseId: cse.id,
      escalationRate: Math.round((escCount / (data.cases.length || 1)) * 100),
      medianDuration: medianDur,
      executionGapRatio: exec.summary.executionGapRatio,
      avgIES: exec.summary.avgIES,
      blindSpotRatio: neg.summary.blindSpotRatio
    };
  });

  // 2. Peer Deviations
  const peerResults = analyzePeerDeviations(cseMetrics);

  // 3. Complete Supervisory Scores & Reports
  const cseSummaries = cses.map(cse => {
    const data = datasets[cse.id];
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    const sam = calculateSupervisoryScore(cse, exec, neg, peerResults);

    return {
      cse,
      score: sam,
      executionSummary: exec.summary,
      negativeSpaceSummary: neg.summary,
      peerDeviation: peerResults.deviations[cse.id]
    };
  });

  return { cseSummaries, peerResults };
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Endpoints ---

  // GET /api/cses - Sector-wide Leaderboard and Baselines
  if (pathname === '/api/cses' && req.method === 'GET') {
    const { cseSummaries, peerResults } = computeAllAnalytics();
    const sorted = [...cseSummaries].sort((a, b) => b.score.totalScore - a.score.totalScore);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      supervisoryLeaderboard: sorted,
      sectorBaselines: peerResults.baselines
    }));
    return;
  }

  // GET /api/cse/:id - Deep drill-down for one CSE
  if (pathname.startsWith('/api/cse/') && req.method === 'GET') {
    const cseId = pathname.replace('/api/cse/', '').trim().toUpperCase();
    const data = systemData.datasets[cseId];
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: `CSE ${cseId} not found` }));
      return;
    }

    const { peerResults } = computeAllAnalytics();
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    const score = calculateSupervisoryScore(data.cse, exec, neg, peerResults);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      cse: data.cse,
      score,
      executionGaps: exec,
      negativeSpace: neg,
      peerDeviation: peerResults.deviations[cseId],
      assets: data.assets
    }));
    return;
  }

  // GET /api/case/:caseId - Single case forensic breakdown
  if (pathname.startsWith('/api/case/') && req.method === 'GET') {
    const caseId = pathname.replace('/api/case/', '').trim();
    let foundCase = null;
    let foundCseId = null;

    for (const [cseId, cseData] of Object.entries(systemData.datasets)) {
      const c = cseData.cases.find(x => x.caseId === caseId);
      if (c) {
        foundCase = c;
        foundCseId = cseId;
        break;
      }
    }

    if (!foundCase) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: `Case ${caseId} not found` }));
      return;
    }

    const cseData = systemData.datasets[foundCseId];
    const exec = analyzeExecutionGaps(cseData.cases, cseData.telemetry);
    const analyzedCase = exec.cases.find(x => x.caseId === caseId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      case: analyzedCase
    }));
    return;
  }

  // GET /api/timeline-compare - Side-by-side demonstration cases
  if (pathname === '/api/timeline-compare' && req.method === 'GET') {
    // Genuine Case from CSE-01 vs Tab-Left-Open Case from CSE-07
    const cse01Data = systemData.datasets['CSE-01'];
    const cse07Data = systemData.datasets['CSE-07'];

    const exec01 = analyzeExecutionGaps(cse01Data.cases, cse01Data.telemetry);
    const exec07 = analyzeExecutionGaps(cse07Data.cases, cse07Data.telemetry);

    const genuineCase = exec01.cases.find(c => c.severity === 'CRITICAL' && c.ies >= 75) || exec01.cases[0];
    const suspiciousCase = exec07.cases.find(c => c.findings.some(f => f.type === 'TAB_LEFT_OPEN')) || exec07.cases[25];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      genuineCase,
      suspiciousCase
    }));
    return;
  }

  // GET /api/report/:id - Generate official NCIIPC Supervisory Audit Dossier
  if (pathname.startsWith('/api/report/') && req.method === 'GET') {
    const cseId = pathname.replace('/api/report/', '').trim().toUpperCase();
    const data = systemData.datasets[cseId];
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: `CSE ${cseId} not found` }));
      return;
    }

    const { peerResults } = computeAllAnalytics();
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    const score = calculateSupervisoryScore(data.cse, exec, neg, peerResults);

    const reportMarkdown = generateSupervisoryMarkdownReport(data.cse, score, exec, neg, peerResults.deviations[cseId]);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      cseId,
      markdown: reportMarkdown,
      jsonSummary: score
    }));
    return;
  }

  // POST /api/upload - Custom CSV/JSON upload
  if (pathname === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const customCseId = payload.cseId || `CSE-CUSTOM-${Date.now().toString().slice(-4)}`;
        
        systemData.cses.push({
          id: customCseId,
          name: payload.cseName || 'Uploaded Custom Enterprise SOC',
          sector: payload.sector || 'Custom Sector',
          totalAssets: (payload.assets || []).length || 50,
          description: 'Uploaded by Examiner for Supervisory Review',
          profile: 'uploaded'
        });

        systemData.datasets[customCseId] = {
          cse: systemData.cses[systemData.cses.length - 1],
          assets: payload.assets || [],
          cases: payload.cases || [],
          telemetry: payload.telemetry || []
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', cseId: customCseId, message: 'Custom SOC data analyzed successfully' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // --- Static File Serving ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

function generateSupervisoryMarkdownReport(cse, score, exec, neg, peerDev) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  return `# NATIONAL CRITICAL INFORMATION INFRASTRUCTURE PROTECTION CENTRE (NCIIPC)
## SUPERVISORY OPERATIONAL ASSESSMENT DOSSIER
**Evaluation Reference ID**: NCIIPC-SA-2026-${cse.id}
**Target Critical Sector Entity**: ${cse.name} (${cse.id})
**Critical Sector Domain**: ${cse.sector}
**Date of Assessment**: ${dateStr}

---

### 1. EXECUTIVE SUPERVISORY DETERMINATION
- **Overall Supervisory Priority**: **${score.priorityLevel} ATTENTION (${score.totalScore}/100)**
- **Audit Recommendation**: ${score.priorityLevel === 'HIGH' ? '🔴 IMMEDIATE ON-SITE AUDIT & INVESTIGATIVE INQUIRY' : score.priorityLevel === 'MEDIUM' ? '🟠 TARGETED FORENSIC SAMPLING & REMEDIATION NOTICE' : '🟢 REGULAR COMPLIANCE MONITORING'}

#### Supervisory Attention Matrix (SAM) Score Breakdown:
- **Pillar 1 - Execution Gap Risk**: ${score.breakdown.executionGapScore} / 45 pts
- **Pillar 2 - Negative Space Blind Spot Risk**: ${score.breakdown.negativeSpaceScore} / 35 pts
- **Pillar 3 - Peer Deviation Anomaly**: ${score.breakdown.peerDeviationScore} / 20 pts

---

### 2. PRIMARY SUPERVISORY FINDINGS & AUDIT JUSTIFICATIONS

${score.auditFindings.map((f, i) => `#### Finding ${i + 1} [${f.severity} - ${f.pillar}]:\n> ${f.text}`).join('\n\n')}

---

### 3. EVIDENCE BACKING & FORENSIC METRICS

#### A. Execution Gap Telemetry Breakdown
- **Total Cases Evaluated**: ${exec.summary.totalCases}
- **Flagged Execution Gap Cases**: ${exec.summary.flaggedCasesCount} (${Math.round(exec.summary.executionGapRatio * 100)}% of total cases)
- **Rapid Closures (< 2 mins on High/Critical)**: ${exec.summary.rapidClosureCount} cases
- **Dormant / Tab-Left-Open Cases (HADR > 10x)**: ${exec.summary.tabOpenCount} cases
- **Unescalated Critical Incidents**: ${exec.summary.unescalatedCritCount} cases
- **Canned / Boilerplate Template Notes**: ${exec.summary.cannedNoteCount} cases
- **Average Investigation Evidence Score (IES)**: ${exec.summary.avgIES} / 100

#### B. Negative Space & Monitoring Coverage Breakdown
- **Total Critical Assets Registered**: ${neg.summary.criticalAssetsCount} / ${neg.summary.totalAssets}
- **Critical Asset Monitoring Blind Spots (Zero Telemetry)**: ${neg.summary.criticalBlindSpotCount} assets (${Math.round(neg.summary.criticalBlindSpotRatio * 100)}% blind spot rate)
- **Cases with Incomplete Forensic Lifecycle**: ${neg.summary.phaseGapCasesCount} cases

#### C. Peer Benchmark Comparison
- **Entity Escalation Rate**: ${peerDev && peerDev.deviations.find(d => d.metric === 'Escalation Rate') ? peerDev.deviations.find(d => d.metric === 'Escalation Rate').cseValue : 'Nominal'}
- **Peer Sector Median**: ${peerDev && peerDev.deviations.find(d => d.metric === 'Escalation Rate') ? peerDev.deviations.find(d => d.metric === 'Escalation Rate').peerMedian : 'Nominal'}

---

### 4. RECOMMENDED SUPERVISORY ACTION ITEMS FOR EXAMINER
1. **Case Sampling**: Request raw SIEM and EDR exports for sample cases flagged with Rapid Closure and Tab-Left-Open.
2. **Asset Telemetry Verification**: Issue inquiry regarding the ${neg.summary.criticalBlindSpotCount} unmonitored critical assets to verify sensor health.
3. **Escalation Policy Audit**: Verify why critical severity incidents were closed locally without Level-2 sectoral CERT transmission.

*Report Generated by NCIIPC Supervisory Analytics Engine (SIH26157 Prototype)*
`;
}

server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`🛡️  NCIIPC Supervisory Analytics Platform (SIH26157)`);
  console.log(`📡  Server active on: http://localhost:${PORT}`);
  console.log(`====================================================\n`);
});
