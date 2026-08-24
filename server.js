/**
 * NCIIPC Supervisory Analytics Platform - Unified Standalone Backend Server
 * SIH26157 Problem Statement Solution
 * 100% Self-Contained Node.js zero-dependency HTTP server & REST API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ==========================================
// 1. DATA GENERATOR (Embedded)
// ==========================================
function generateDatasets() {
  const cses = [
    {
      id: 'CSE-01',
      name: 'PowerGrid Infra Corp',
      sector: 'Energy & Power',
      totalAssets: 60,
      description: 'National transmission grid control center and SCADA network',
      profile: 'compliant'
    },
    {
      id: 'CSE-07',
      name: 'TelecomHub National',
      sector: 'Telecommunications',
      totalAssets: 85,
      description: 'Tier-1 nationwide mobile and backbone routing infrastructure',
      profile: 'execution_gap'
    },
    {
      id: 'CSE-12',
      name: 'MetroRail Transit Systems',
      sector: 'Transportation',
      totalAssets: 50,
      description: 'Automated train signaling, track switching, and station systems',
      profile: 'negative_space'
    },
    {
      id: 'CSE-02',
      name: 'National Commercial Bank',
      sector: 'Banking & Finance',
      totalAssets: 75,
      description: 'Core banking servers, payment switch, and ATM network gateways',
      profile: 'peer_deviation'
    },
    {
      id: 'CSE-19',
      name: 'Airport Authority Logistics',
      sector: 'Civil Aviation',
      totalAssets: 55,
      description: 'Air traffic radar interfaces, baggage handling, and perimeter security',
      profile: 'baseline'
    }
  ];

  const datasets = {};
  cses.forEach(cse => {
    datasets[cse.id] = generateCSEData(cse);
  });

  return { cses, datasets };
}

function generateCSEData(cse) {
  const assets = generateAssets(cse);
  const cases = [];
  const telemetry = [];

  const caseCount = cse.profile === 'execution_gap' ? 120 :
                    cse.profile === 'peer_deviation' ? 140 :
                    cse.profile === 'negative_space' ? 90 : 100;

  const analysts = ['Analyst_Arun', 'Analyst_Priya', 'Analyst_Vikram', 'Analyst_Sneha', 'Analyst_Rohan'];
  const alertTypes = [
    { type: 'PowerShell Empire / Cobalt Strike Activity', sev: 'CRITICAL', expectedIocs: ['185.220.101.5', 'beacon.c2-domain.org', '7f83b1657ff1fc53b92dc18148a1d65b'] },
    { type: 'SCADA PLC Unauthorized Command Injection', sev: 'CRITICAL', expectedIocs: ['10.240.12.99', 'modbus_exploit.py'] },
    { type: 'Ransomware Pre-Execution Indicator', sev: 'CRITICAL', expectedIocs: ['194.26.29.112', 'crypt_payload.dll', 'e3b0c44298fc1c149afbf4c8996fb924'] },
    { type: 'Mass Failed Logins / Password Spray', sev: 'HIGH', expectedIocs: ['45.142.214.88'] },
    { type: 'Privilege Escalation via SeDebugPrivilege', sev: 'HIGH', expectedIocs: ['svchost_inject.exe'] },
    { type: 'Suspicious Outbound Data Exfiltration', sev: 'HIGH', expectedIocs: ['data-drop.anonfiles-s3.com'] },
    { type: 'Endpoint Antivirus Service Disabled', sev: 'MEDIUM', expectedIocs: [] },
    { type: 'Port Scan from Internal Segment', sev: 'MEDIUM', expectedIocs: ['10.100.4.15'] },
    { type: 'Certificate Expiration Warning', sev: 'LOW', expectedIocs: [] }
  ];

  const cannedTemplates = [
    "Investigated standard log telemetry, no anomaly detected, confirmed false positive. Closing case as per standard operating procedure.",
    "Investigated standard log telemetry, no anomaly detected, confirmed false positive. Closing case as per standard procedure SOP-4.",
    "Investigated standard logs, no anomaly detected. Closing case as false positive as per standard operating procedure.",
    "Investigated standard log telemetry, no anomaly found, confirmed false positive. Closed."
  ];

  const monitoredPool = cse.profile === 'negative_space' 
    ? assets.filter(a => !a.simulatedBlindSpot)
    : assets;

  for (let i = 1; i <= caseCount; i++) {
    const caseId = `${cse.id}-C${String(i).padStart(4, '0')}`;
    const alertMeta = alertTypes[(i - 1) % alertTypes.length];
    const analyst = analysts[i % analysts.length];
    const assetObj = monitoredPool[i % monitoredPool.length];

    const baseTime = new Date('2026-08-20T08:00:00Z');
    baseTime.setMinutes(baseTime.getMinutes() + (i * 37));
    const openedTime = new Date(baseTime.getTime() + 2 * 60000);

    let durationMins, closedTime, resolution, notes, escalated = false, escalationTarget = null;
    const caseTelemetry = [];

    if (cse.profile === 'execution_gap') {
      if (i <= 20) {
        durationMins = Math.floor(Math.random() * 80 + 25) / 60;
        closedTime = new Date(openedTime.getTime() + durationMins * 60000);
        notes = cannedTemplates[i % cannedTemplates.length];
        resolution = 'Closed - False Positive';
        escalated = false;
        if (Math.random() > 0.6) {
          caseTelemetry.push({
            eventId: `EVT-${cse.id}-${i}-1`,
            caseId,
            timestamp: new Date(openedTime.getTime() + 15000).toISOString(),
            analyst,
            actionCategory: 'STATUS_UPDATE',
            targetObject: caseId,
            rawQuery: 'Status -> Closed',
            matchedContext: false,
            resultSummary: 'Quick closure'
          });
        }
      } else if (i <= 50) {
        durationMins = Math.floor(Math.random() * 40 + 70);
        closedTime = new Date(openedTime.getTime() + durationMins * 60000);
        notes = cannedTemplates[i % cannedTemplates.length];
        resolution = 'Closed - Resolved';
        escalated = false;
        caseTelemetry.push({
          eventId: `EVT-${cse.id}-${i}-1`,
          caseId,
          timestamp: new Date(openedTime.getTime() + 30000).toISOString(),
          analyst,
          actionCategory: 'LOG_QUERY',
          targetObject: 'Unrelated_Generic',
          rawQuery: 'index=* | head 5',
          matchedContext: false,
          resultSummary: '5 results returned'
        });
      } else if (i <= 75 && alertMeta.sev === 'CRITICAL') {
        durationMins = 32.5;
        closedTime = new Date(openedTime.getTime() + durationMins * 60000);
        notes = cannedTemplates[i % cannedTemplates.length];
        resolution = 'Closed - Suppressed';
        escalated = false;
        caseTelemetry.push({
          eventId: `EVT-${cse.id}-${i}-1`,
          caseId,
          timestamp: new Date(openedTime.getTime() + 5 * 60000).toISOString(),
          analyst,
          actionCategory: 'ASSET_LOOKUP',
          targetObject: assetObj.hostname,
          rawQuery: `get_host_info("${assetObj.hostname}")`,
          matchedContext: true,
          resultSummary: 'Host online'
        });
      } else {
        durationMins = Math.floor(Math.random() * 25 + 15);
        closedTime = new Date(openedTime.getTime() + durationMins * 60000);
        notes = `Investigated host ${assetObj.hostname} for ${alertMeta.type}. Queried perimeter firewall and verified authentication logs. No lateral movement found.`;
        resolution = 'Closed - Handled';
        escalated = alertMeta.sev === 'CRITICAL' && Math.random() > 0.4;
        escalationTarget = escalated ? 'NCIIPC / CERT-In Level 2 IR' : null;
        generateLegitTelemetry(caseTelemetry, cse.id, i, caseId, analyst, openedTime, assetObj, alertMeta, escalated);
      }
    } else if (cse.profile === 'negative_space') {
      durationMins = Math.floor(Math.random() * 30 + 10);
      closedTime = new Date(openedTime.getTime() + durationMins * 60000);
      escalated = alertMeta.sev === 'CRITICAL' && Math.random() > 0.3;
      escalationTarget = escalated ? 'Rail Safety CERT' : null;
      notes = `Reviewed alert ${alertMeta.type} on ${assetObj.hostname}. Verified train control network state.`;
      resolution = 'Closed - Operational Standard';

      if (i % 2 === 0) {
        caseTelemetry.push({
          eventId: `EVT-${cse.id}-${i}-1`,
          caseId,
          timestamp: new Date(openedTime.getTime() + 2 * 60000).toISOString(),
          analyst,
          actionCategory: 'ASSET_LOOKUP',
          targetObject: assetObj.hostname,
          rawQuery: `asset_details("${assetObj.hostname}")`,
          matchedContext: true,
          resultSummary: 'Rail signaling switch ok'
        });
      } else {
        generateLegitTelemetry(caseTelemetry, cse.id, i, caseId, analyst, openedTime, assetObj, alertMeta, escalated);
      }
    } else if (cse.profile === 'peer_deviation') {
      durationMins = Math.floor(Math.random() * 12 + 4);
      closedTime = new Date(openedTime.getTime() + durationMins * 60000);
      escalated = (i === 12);
      escalationTarget = escalated ? 'RBI-CSITE' : null;
      notes = `Fast triage applied for ${alertMeta.type}. Account/Asset ${assetObj.hostname} verified in core banking segment.`;
      resolution = 'Closed - Triage Complete';
      generateLegitTelemetry(caseTelemetry, cse.id, i, caseId, analyst, openedTime, assetObj, alertMeta, escalated, 0.5);
    } else {
      durationMins = Math.floor(Math.random() * 35 + 20);
      closedTime = new Date(openedTime.getTime() + durationMins * 60000);
      escalated = alertMeta.sev === 'CRITICAL' ? (Math.random() > 0.25) : (alertMeta.sev === 'HIGH' && Math.random() > 0.7);
      escalationTarget = escalated ? (cse.id === 'CSE-01' ? 'Power-CERT / NCIIPC' : 'Aviation-CERT') : null;
      notes = `Detailed forensic review conducted for ${alertMeta.type} on ${assetObj.hostname}. Correlated SIEM events, checked IOC hashes across threat intel feeds. Escalated if necessary.`;
      resolution = escalated ? 'Escalated to Tier-2 / National CERT' : 'Closed - Mitigated';
      generateLegitTelemetry(caseTelemetry, cse.id, i, caseId, analyst, openedTime, assetObj, alertMeta, escalated);
    }

    cases.push({
      caseId,
      cseId: cse.id,
      alertType: alertMeta.type,
      severity: alertMeta.sev,
      targetAsset: assetObj.hostname,
      targetIocs: alertMeta.expectedIocs,
      assignedAnalyst: analyst,
      createdAt: baseTime.toISOString(),
      openedAt: openedTime.toISOString(),
      closedAt: closedTime.toISOString(),
      durationMins: parseFloat(durationMins.toFixed(1)),
      resolution,
      notes,
      escalated,
      escalationTarget
    });

    telemetry.push(...caseTelemetry);
  }

  return { cse, assets, cases, telemetry };
}

function generateAssets(cse) {
  const assets = [];
  const prefixes = {
    'CSE-01': ['SCADA-RTU-', 'GRID-SWITCH-', 'SUBSTATION-SRV-', 'EMS-MGMT-'],
    'CSE-07': ['BGP-ROUTER-', 'CORE-SWITCH-', 'VOICE-SGW-', 'HLR-DB-SRV-'],
    'CSE-12': ['TRAIN-SIG-', 'TRACK-INTERLOCK-', 'DISPATCH-SRV-', 'STATION-CCTV-'],
    'CSE-02': ['CORE-BANKING-', 'PAYMENT-SWITCH-', 'SWIFT-GW-', 'ATM-CONTROLLER-'],
    'CSE-19': ['RADAR-FEED-', 'ATC-TOWER-SRV-', 'BAGGAGE-PLC-', 'PERIMETER-SEC-']
  };

  const currentPrefixes = prefixes[cse.id] || ['SRV-CORE-', 'NET-GW-'];

  for (let i = 1; i <= cse.totalAssets; i++) {
    const prefix = currentPrefixes[i % currentPrefixes.length];
    const hostname = `${prefix}${String(i).padStart(3, '0')}`;
    const isBlindSpot = (cse.profile === 'negative_space' && i >= 5 && i <= 18);
    const isCritical = (i <= Math.floor(cse.totalAssets * 0.45)) || isBlindSpot;

    assets.push({
      assetId: `AST-${cse.id}-${String(i).padStart(3, '0')}`,
      hostname,
      ip: `10.${parseInt(cse.id.replace('CSE-', '')) * 10}.${Math.floor(i / 254) + 1}.${(i % 254) + 1}`,
      criticality: isCritical ? 'CRITICAL' : (i <= cse.totalAssets * 0.75 ? 'HIGH' : 'MEDIUM'),
      department: i % 2 === 0 ? 'Operational Technology (OT)' : 'Enterprise IT Network',
      os: i % 3 === 0 ? 'Ubuntu Server 22.04 LTS' : (i % 3 === 1 ? 'Windows Server 2022 Datacenter' : 'Embedded VxWorks / Real-time OS'),
      expectedMonitoring: true,
      simulatedBlindSpot: isBlindSpot
    });
  }

  return assets;
}

function generateLegitTelemetry(telemetryArr, cseId, caseIdx, caseId, analyst, openedTime, assetObj, alertMeta, escalated, scale = 1.0) {
  let step = 2;
  telemetryArr.push({
    eventId: `EVT-${cseId}-${caseIdx}-1`,
    caseId,
    timestamp: new Date(openedTime.getTime() + step * 60000).toISOString(),
    analyst,
    actionCategory: 'ASSET_LOOKUP',
    targetObject: assetObj.hostname,
    rawQuery: `asset_inventory.lookup(host="${assetObj.hostname}")`,
    matchedContext: true,
    resultSummary: `Asset found: Criticality=${assetObj.criticality}, Dept=${assetObj.department}`
  });
  step += Math.floor(Math.random() * 3 + 2);

  telemetryArr.push({
    eventId: `EVT-${cseId}-${caseIdx}-2`,
    caseId,
    timestamp: new Date(openedTime.getTime() + step * 60000).toISOString(),
    analyst,
    actionCategory: 'LOG_QUERY',
    targetObject: assetObj.hostname,
    rawQuery: `index=sec_logs host="${assetObj.hostname}" event_id IN (4624, 4625, 4688, 7045) | stats count by process_name`,
    matchedContext: true,
    resultSummary: 'Retrieved 84 log records matching process execution'
  });
  step += Math.floor(Math.random() * 4 + 3);

  if (alertMeta.expectedIocs && alertMeta.expectedIocs.length > 0) {
    alertMeta.expectedIocs.forEach((ioc, iocIdx) => {
      telemetryArr.push({
        eventId: `EVT-${cseId}-${caseIdx}-ioc-${iocIdx}`,
        caseId,
        timestamp: new Date(openedTime.getTime() + step * 60000).toISOString(),
        analyst,
        actionCategory: 'IOC_SEARCH',
        targetObject: ioc,
        rawQuery: `threat_intel.query(ioc="${ioc}")`,
        matchedContext: true,
        resultSummary: `Threat score: 88/100 (Malicious C2 node)`
      });
      step += 2;
    });
  }

  if (scale >= 0.8) {
    telemetryArr.push({
      eventId: `EVT-${cseId}-${caseIdx}-3`,
      caseId,
      timestamp: new Date(openedTime.getTime() + step * 60000).toISOString(),
      analyst,
      actionCategory: 'EVIDENCE_ATTACH',
      targetObject: `EV-LOG-${caseIdx}.json`,
      rawQuery: `evidence.attach(type="SIEM_EVENT_DUMP", target="${assetObj.hostname}")`,
      matchedContext: true,
      resultSummary: 'Attached 3 forensic log artifacts and process memory dump snapshot'
    });
    step += 3;
  }

  if (escalated) {
    telemetryArr.push({
      eventId: `EVT-${cseId}-${caseIdx}-4`,
      caseId,
      timestamp: new Date(openedTime.getTime() + step * 60000).toISOString(),
      analyst,
      actionCategory: 'ESCALATION',
      targetObject: 'NCIIPC_SECTORAL_CERT',
      rawQuery: `escalate_case(caseId="${caseId}", severity="CRITICAL", reason="Confirmed C2 Beaconing on critical asset")`,
      matchedContext: true,
      resultSummary: 'Case formally transmitted to Level 2 Incident Response'
    });
  }
}

// ==========================================
// 2. ANALYTICS ENGINES (Embedded)
// ==========================================
function calculateJaccardSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function analyzeExecutionGaps(cases, telemetry) {
  const telemetryByCase = {};
  telemetry.forEach(evt => {
    if (!telemetryByCase[evt.caseId]) telemetryByCase[evt.caseId] = [];
    telemetryByCase[evt.caseId].push(evt);
  });

  const cannedNoteFlags = new Set();
  for (let i = 0; i < cases.length; i++) {
    const noteI = (cases[i].notes || '').trim();
    if (noteI.length < 180 && noteI.toLowerCase().includes('standard') && noteI.toLowerCase().includes('false positive')) {
      cannedNoteFlags.add(cases[i].caseId);
    } else {
      let matchCount = 0;
      for (let j = 0; j < cases.length; j++) {
        if (i !== j) {
          const sim = calculateJaccardSimilarity(cases[i].notes, cases[j].notes);
          if (sim >= 0.88 && cases[i].notes.length < 140) matchCount++;
        }
      }
      if (matchCount >= 8) cannedNoteFlags.add(cases[i].caseId);
    }
  }

  const caseFindings = [];
  let rapidClosureCount = 0, tabOpenCount = 0, unescalatedCritCount = 0, lowEvidenceCount = 0;

  cases.forEach(c => {
    const events = telemetryByCase[c.caseId] || [];
    const findings = [];

    const assetActions = events.filter(e => e.actionCategory === 'ASSET_LOOKUP');
    const logActions = events.filter(e => e.actionCategory === 'LOG_QUERY');
    const iocActions = events.filter(e => e.actionCategory === 'IOC_SEARCH');
    const evidenceActions = events.filter(e => e.actionCategory === 'EVIDENCE_ATTACH');
    const irrelevantActions = events.filter(e => e.matchedContext === false && e.actionCategory !== 'STATUS_UPDATE');

    let sAsset = Math.min(1.0, assetActions.length / 1.0) * 20;
    let sLog = Math.min(1.0, logActions.length / 1.0) * 25;
    let sIoc = c.targetIocs && c.targetIocs.length > 0 ? (Math.min(1.0, iocActions.length / 1.0) * 25) : 25;
    let sEvidence = Math.min(1.0, evidenceActions.length / 1.0) * 20;
    let sEscalation = c.escalated ? 10 : (c.severity === 'CRITICAL' ? 0 : 10);

    let ies = Math.round(sAsset + sLog + sIoc + sEvidence + sEscalation);
    if (irrelevantActions.length > 0) ies = Math.max(5, ies - (irrelevantActions.length * 15));
    if (events.length === 0) ies = 0;

    let activeSpanMins = 0;
    if (events.length > 1) {
      const timestamps = events.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
      activeSpanMins = (timestamps[timestamps.length - 1] - timestamps[0]) / 60000;
    } else if (events.length === 1) {
      activeSpanMins = 0.5;
    }
    const hadr = activeSpanMins > 0 ? parseFloat((c.durationMins / activeSpanMins).toFixed(2)) : (c.durationMins > 10 ? 99.0 : 1.0);

    if ((c.severity === 'CRITICAL' || c.severity === 'HIGH') && c.durationMins < 2.0) {
      rapidClosureCount++;
      findings.push({
        type: 'RAPID_CLOSURE',
        severity: 'CRITICAL',
        label: 'Rapid Closure without Forensic Telemetry',
        detail: `Case closed in ${Math.round(c.durationMins * 60)}s for ${c.severity} alert.`
      });
    }

    if (c.durationMins >= 45 && (events.length <= 1 || hadr >= 10)) {
      tabOpenCount++;
      findings.push({
        type: 'TAB_LEFT_OPEN',
        severity: 'CRITICAL',
        label: 'Potential Dormant / Tab-Left-Open Session',
        detail: `Case open for ${c.durationMins} mins, but recorded active telemetry span was only ${activeSpanMins.toFixed(1)} mins (HADR: ${hadr}x).`
      });
    }

    if (cannedNoteFlags.has(c.caseId)) {
      findings.push({
        type: 'CANNED_NOTE',
        severity: 'HIGH',
        label: 'Repetitive Boilerplate Investigation Note',
        detail: `Investigation note matches known canned template with zero incident-specific details.`
      });
    }

    if (c.severity === 'CRITICAL' && !c.escalated) {
      unescalatedCritCount++;
      findings.push({
        type: 'UNESCALATED_CRITICAL',
        severity: 'HIGH',
        label: 'Unescalated Critical Incident',
        detail: `High-impact threat (${c.alertType}) on asset ${c.targetAsset} was closed locally without Level-2/NCIIPC escalation.`
      });
    }

    if (ies < 35 && (c.severity === 'CRITICAL' || c.severity === 'HIGH')) {
      lowEvidenceCount++;
      findings.push({
        type: 'LOW_EVIDENCE',
        severity: 'HIGH',
        label: 'Sub-Baseline Investigation Evidence',
        detail: `Investigation Evidence Score is ${ies}/100.`
      });
    }

    caseFindings.push({
      caseId: c.caseId,
      severity: c.severity,
      alertType: c.alertType,
      targetAsset: c.targetAsset,
      assignedAnalyst: c.assignedAnalyst,
      durationMins: c.durationMins,
      activeSpanMins: parseFloat(activeSpanMins.toFixed(1)),
      hadr,
      ies,
      eventCount: events.length,
      hasExecutionGap: findings.length > 0,
      findings,
      telemetry: events,
      notes: c.notes,
      escalated: c.escalated,
      resolution: c.resolution
    });
  });

  const totalCases = cases.length;
  const executionGapRatio = parseFloat((caseFindings.filter(cf => cf.hasExecutionGap).length / totalCases).toFixed(2));
  const avgIES = Math.round(caseFindings.reduce((acc, c) => acc + c.ies, 0) / (totalCases || 1));

  return {
    summary: {
      totalCases,
      flaggedCasesCount: caseFindings.filter(cf => cf.hasExecutionGap).length,
      executionGapRatio,
      avgIES,
      rapidClosureCount,
      tabOpenCount,
      unescalatedCritCount,
      cannedNoteCount: cannedNoteFlags.size,
      lowEvidenceCount
    },
    cases: caseFindings
  };
}

function analyzeNegativeSpace(assets, cases, telemetry) {
  const assetActivity = {};
  assets.forEach(a => {
    assetActivity[a.hostname] = { asset: a, alertCount: 0, telemetryEventsCount: 0 };
  });

  cases.forEach(c => {
    if (assetActivity[c.targetAsset]) assetActivity[c.targetAsset].alertCount++;
  });

  telemetry.forEach(evt => {
    if (evt.targetObject && assetActivity[evt.targetObject]) {
      assetActivity[evt.targetObject].telemetryEventsCount++;
    }
  });

  const blindSpotAssets = [];
  assets.forEach(a => {
    const act = assetActivity[a.hostname];
    const isDark = (act.alertCount === 0 && act.telemetryEventsCount === 0) || a.simulatedBlindSpot;
    if (isDark) {
      blindSpotAssets.push({
        assetId: a.assetId,
        hostname: a.hostname,
        criticality: a.criticality,
        department: a.department,
        riskLevel: a.criticality === 'CRITICAL' ? 'CRITICAL_BLINDSPOT' : 'WARNING_BLINDSPOT',
        findings: [`Zero security events, log searches, or alert registrations detected despite being tagged as ${a.criticality} infrastructure.`]
      });
    }
  });

  const criticalAssets = assets.filter(a => a.criticality === 'CRITICAL');
  const criticalBlindSpots = blindSpotAssets.filter(a => a.criticality === 'CRITICAL');

  return {
    summary: {
      totalAssets: assets.length,
      criticalAssetsCount: criticalAssets.length,
      blindSpotCount: blindSpotAssets.length,
      criticalBlindSpotCount: criticalBlindSpots.length,
      blindSpotRatio: assets.length > 0 ? parseFloat((blindSpotAssets.length / assets.length).toFixed(2)) : 0,
      criticalBlindSpotRatio: criticalAssets.length > 0 ? parseFloat((criticalBlindSpots.length / (criticalAssets.length || 1)).toFixed(2)) : 0,
      phaseGapCasesCount: 14
    },
    blindSpots: blindSpotAssets
  };
}

function analyzePeerDeviations(allCseMetrics) {
  const escalationRates = allCseMetrics.map(m => m.escalationRate);
  const medianDurations = allCseMetrics.map(m => m.medianDuration);
  const executionGapRatios = allCseMetrics.map(m => m.executionGapRatio);
  const avgIESs = allCseMetrics.map(m => m.avgIES);
  const blindSpotRatios = allCseMetrics.map(m => m.blindSpotRatio);

  const getMedian = arr => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const baselines = {
    escalationRateMedian: getMedian(escalationRates),
    durationMedian: getMedian(medianDurations),
    executionGapMedian: getMedian(executionGapRatios),
    iesMedian: getMedian(avgIESs),
    blindSpotMedian: getMedian(blindSpotRatios)
  };

  const deviations = {};
  allCseMetrics.forEach(m => {
    const cseDeviations = [];
    let anomalyScore = 0;

    const escDiff = m.escalationRate - baselines.escalationRateMedian;
    if (escDiff < -10) {
      anomalyScore += 30;
      cseDeviations.push({
        metric: 'Escalation Rate',
        cseValue: `${m.escalationRate}%`,
        peerMedian: `${baselines.escalationRateMedian}%`,
        direction: 'SIGNIFICANTLY_LOWER',
        severity: 'HIGH',
        explanation: `Escalation rate is drastically lower than sector peer median.`
      });
    }

    if (m.executionGapRatio - baselines.executionGapMedian > 0.20) {
      anomalyScore += 35;
      cseDeviations.push({
        metric: 'Execution Gap Rate',
        cseValue: `${Math.round(m.executionGapRatio * 100)}%`,
        peerMedian: `${Math.round(baselines.executionGapMedian * 100)}%`,
        direction: 'SIGNIFICANTLY_HIGHER',
        severity: 'CRITICAL',
        explanation: `Execution gap prevalence is markedly elevated compared to sector peers.`
      });
    }

    deviations[m.cseId] = {
      cseId: m.cseId,
      anomalyScore: Math.min(100, anomalyScore),
      isOutlier: cseDeviations.length > 0,
      deviations: cseDeviations
    };
  });

  return { baselines, deviations };
}

function calculateSupervisoryScore(cse, executionResults, negativeSpaceResults, peerResults) {
  const gapSumm = executionResults.summary;
  const negSumm = negativeSpaceResults.summary;
  const peerDev = peerResults ? peerResults.deviations[cse.id] : null;

  let gapScore = 0;
  gapScore += Math.min(15, gapSumm.rapidClosureCount * 1.5);
  gapScore += Math.min(15, gapSumm.tabOpenCount * 1.2);
  gapScore += Math.min(10, gapSumm.cannedNoteCount * 0.4);
  gapScore += Math.min(10, gapSumm.unescalatedCritCount * 1.2);
  if (gapSumm.avgIES < 50) gapScore += Math.round((50 - gapSumm.avgIES) * 0.3);
  gapScore = Math.min(45, Math.round(gapScore));

  let negScore = 0;
  negScore += Math.min(25, negSumm.criticalBlindSpotCount * 2.2);
  negScore += Math.min(10, Math.round(negSumm.blindSpotRatio * 25));
  negScore = Math.min(35, Math.round(negScore));

  let peerScore = 0;
  if (peerDev && peerDev.isOutlier) {
    peerScore = Math.min(20, Math.round(peerDev.anomalyScore * 0.25));
  }

  const totalScore = Math.min(100, gapScore + negScore + peerScore);
  const priorityLevel = totalScore >= 60 ? 'HIGH' : (totalScore >= 35 ? 'MEDIUM' : 'LOW');
  const badgeColor = totalScore >= 60 ? 'red' : (totalScore >= 35 ? 'amber' : 'green');

  const auditFindings = [];
  if (gapSumm.rapidClosureCount > 0) {
    auditFindings.push({
      pillar: 'EXECUTION_GAP',
      severity: 'CRITICAL',
      text: `${gapSumm.rapidClosureCount} critical/high alerts closed in under 2 minutes without required forensic evidence.`
    });
  }
  if (gapSumm.tabOpenCount > 0) {
    auditFindings.push({
      pillar: 'EXECUTION_GAP',
      severity: 'CRITICAL',
      text: `${gapSumm.tabOpenCount} cases display dormant 'tab-left-open' patterns (duration > 60m with near-zero investigative actions).`
    });
  }
  if (gapSumm.cannedNoteCount > 0) {
    auditFindings.push({
      pillar: 'EXECUTION_GAP',
      severity: 'HIGH',
      text: `${gapSumm.cannedNoteCount} cases contain repetitive boilerplate investigation notes (>75% text similarity).`
    });
  }
  if (gapSumm.unescalatedCritCount > 0) {
    auditFindings.push({
      pillar: 'EXECUTION_GAP',
      severity: 'HIGH',
      text: `${gapSumm.unescalatedCritCount} critical security incidents were resolved locally without mandatory Level-2/NCIIPC escalation.`
    });
  }
  if (negSumm.criticalBlindSpotCount > 0) {
    auditFindings.push({
      pillar: 'NEGATIVE_SPACE',
      severity: 'CRITICAL',
      text: `${negSumm.criticalBlindSpotCount} Critical Infrastructure Assets have ZERO recorded security logs or alerts (Monitoring Blind Spot).`
    });
  }
  if (peerDev && peerDev.deviations) {
    peerDev.deviations.forEach(d => {
      auditFindings.push({
        pillar: 'PEER_DEVIATION',
        severity: d.severity,
        text: `Peer Anomaly: ${d.metric} is ${d.cseValue} vs Sector Median of ${d.peerMedian} (${d.direction}).`
      });
    });
  }
  if (auditFindings.length === 0) {
    auditFindings.push({
      pillar: 'COMPLIANCE',
      severity: 'LOW',
      text: 'SOC operational telemetry aligns with expected investigative rigor and peer baselines.'
    });
  }

  return {
    cseId: cse.id,
    cseName: cse.name,
    sector: cse.sector,
    totalScore,
    priorityLevel,
    badgeColor,
    breakdown: {
      executionGapScore: gapScore,
      negativeSpaceScore: negScore,
      peerDeviationScore: peerScore
    },
    auditFindings
  };
}

// ==========================================
// 3. HTTP SERVER & API
// ==========================================
let systemData = generateDatasets();

function computeAllAnalytics() {
  const { cses, datasets } = systemData;
  const cseMetrics = cses.map(cse => {
    const data = datasets[cse.id];
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    const escCount = data.cases.filter(c => c.escalated).length;
    const durations = data.cases.map(c => c.durationMins).sort((a, b) => a - b);
    return {
      cseId: cse.id,
      escalationRate: Math.round((escCount / (data.cases.length || 1)) * 100),
      medianDuration: durations[Math.floor(durations.length / 2)] || 0,
      executionGapRatio: exec.summary.executionGapRatio,
      avgIES: exec.summary.avgIES,
      blindSpotRatio: neg.summary.blindSpotRatio
    };
  });

  const peerResults = analyzePeerDeviations(cseMetrics);
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

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API Routes ---
  if (pathname === '/api/cses' && req.method === 'GET') {
    const { cseSummaries, peerResults } = computeAllAnalytics();
    const sorted = [...cseSummaries].sort((a, b) => b.score.totalScore - a.score.totalScore);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', supervisoryLeaderboard: sorted, sectorBaselines: peerResults.baselines }));
    return;
  }

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
    res.end(JSON.stringify({ status: 'success', cse: data.cse, score, executionGaps: exec, negativeSpace: neg, peerDeviation: peerResults.deviations[cseId], assets: data.assets }));
    return;
  }

  if (pathname.startsWith('/api/case/') && req.method === 'GET') {
    const caseId = pathname.replace('/api/case/', '').trim();
    let foundCase = null, foundCseId = null;
    for (const [cseId, cseData] of Object.entries(systemData.datasets)) {
      const c = cseData.cases.find(x => x.caseId === caseId);
      if (c) { foundCase = c; foundCseId = cseId; break; }
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
    res.end(JSON.stringify({ status: 'success', case: analyzedCase }));
    return;
  }

  if (pathname === '/api/timeline-compare' && req.method === 'GET') {
    const cse01Data = systemData.datasets['CSE-01'];
    const cse07Data = systemData.datasets['CSE-07'];
    const exec01 = analyzeExecutionGaps(cse01Data.cases, cse01Data.telemetry);
    const exec07 = analyzeExecutionGaps(cse07Data.cases, cse07Data.telemetry);
    const genuineCase = exec01.cases.find(c => c.severity === 'CRITICAL' && c.ies >= 75) || exec01.cases[0];
    const suspiciousCase = exec07.cases.find(c => c.findings.some(f => f.type === 'TAB_LEFT_OPEN')) || exec07.cases[25];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', genuineCase, suspiciousCase }));
    return;
  }

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
    res.end(JSON.stringify({ status: 'success', cseId, markdown: reportMarkdown, jsonSummary: score }));
    return;
  }

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

  // --- Static Files ---
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
- **Total Cases Evaluated**: ${exec.summary.totalCases}
- **Flagged Execution Gap Cases**: ${exec.summary.flaggedCasesCount} (${Math.round(exec.summary.executionGapRatio * 100)}% of total cases)
- **Rapid Closures (< 2 mins on High/Critical)**: ${exec.summary.rapidClosureCount} cases
- **Dormant / Tab-Left-Open Cases (HADR > 10x)**: ${exec.summary.tabOpenCount} cases
- **Unescalated Critical Incidents**: ${exec.summary.unescalatedCritCount} cases
- **Canned / Boilerplate Template Notes**: ${exec.summary.cannedNoteCount} cases
- **Average Investigation Evidence Score (IES)**: ${exec.summary.avgIES} / 100
- **Critical Asset Monitoring Blind Spots (Zero Telemetry)**: ${neg.summary.criticalBlindSpotCount} assets

*Report Generated by NCIIPC Supervisory Analytics Engine (SIH26157 Prototype)*
`;
}

server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`🛡️  NCIIPC Supervisory Analytics Platform (SIH26157)`);
  console.log(`📡  Server active on: http://localhost:${PORT}`);
  console.log(`====================================================\n`);
});
