/**
 * NCIIPC Supervisory Analytics - Execution Gap Detection Engine
 * Evaluates whether genuine, verifiable investigation occurred based on SOC audit telemetry.
 */

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
    if (!telemetryByCase[evt.caseId]) {
      telemetryByCase[evt.caseId] = [];
    }
    telemetryByCase[evt.caseId].push(evt);
  });

  // Calculate note similarity matrix / repetition across cases
  // Focus on boilerplate short strings like "investigated standard log telemetry, no anomaly detected"
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
          if (sim >= 0.88 && cases[i].notes.length < 140) {
            matchCount++;
          }
        }
      }
      if (matchCount >= 8) {
        cannedNoteFlags.add(cases[i].caseId);
      }
    }
  }

  const caseFindings = [];
  let rapidClosureCount = 0;
  let tabOpenCount = 0;
  let unescalatedCritCount = 0;
  let cannedNoteCount = cannedNoteFlags.size;
  let lowEvidenceCount = 0;

  cases.forEach(c => {
    const events = telemetryByCase[c.caseId] || [];
    const findings = [];

    // 1. Action Counts & Relevance
    const assetActions = events.filter(e => e.actionCategory === 'ASSET_LOOKUP');
    const logActions = events.filter(e => e.actionCategory === 'LOG_QUERY');
    const iocActions = events.filter(e => e.actionCategory === 'IOC_SEARCH');
    const evidenceActions = events.filter(e => e.actionCategory === 'EVIDENCE_ATTACH');
    const relevantActions = events.filter(e => e.matchedContext === true);
    const irrelevantActions = events.filter(e => e.matchedContext === false && e.actionCategory !== 'STATUS_UPDATE');

    // 2. Investigation Evidence Score (IES, 0 - 100)
    let sAsset = Math.min(1.0, assetActions.length / 1.0) * 20;
    let sLog = Math.min(1.0, logActions.length / 1.0) * 25;
    let sIoc = c.targetIocs && c.targetIocs.length > 0 ? (Math.min(1.0, iocActions.length / 1.0) * 25) : 25;
    let sEvidence = Math.min(1.0, evidenceActions.length / 1.0) * 20;
    let sEscalation = c.escalated ? 10 : (c.severity === 'CRITICAL' ? 0 : 10);

    let ies = Math.round(sAsset + sLog + sIoc + sEvidence + sEscalation);
    if (irrelevantActions.length > 0) {
      ies = Math.max(5, ies - (irrelevantActions.length * 15));
    }
    if (events.length === 0) {
      ies = 0;
    }

    // 3. Active Telemetry Span & HADR (Handling-to-Activity Divergence Ratio)
    let activeSpanMins = 0;
    if (events.length > 1) {
      const timestamps = events.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
      activeSpanMins = (timestamps[timestamps.length - 1] - timestamps[0]) / 60000;
    } else if (events.length === 1) {
      activeSpanMins = 0.5;
    }
    const hadr = activeSpanMins > 0 ? parseFloat((c.durationMins / activeSpanMins).toFixed(2)) : (c.durationMins > 10 ? 99.0 : 1.0);

    // Gap Checks
    // A. Rapid Closure on High/Critical
    const isRapidClosure = (c.severity === 'CRITICAL' || c.severity === 'HIGH') && c.durationMins < 2.0;
    if (isRapidClosure) {
      rapidClosureCount++;
      findings.push({
        type: 'RAPID_CLOSURE',
        severity: 'CRITICAL',
        label: 'Rapid Closure without Forensic Telemetry',
        detail: `Case closed in ${Math.round(c.durationMins * 60)}s for ${c.severity} alert. Insufficient time for forensic triage.`
      });
    }

    // B. Tab Left Open / Inactive Dormancy
    const isTabLeftOpen = c.durationMins >= 45 && (events.length <= 1 || hadr >= 10);
    if (isTabLeftOpen) {
      tabOpenCount++;
      findings.push({
        type: 'TAB_LEFT_OPEN',
        severity: 'CRITICAL',
        label: 'Potential Dormant / Tab-Left-Open Session',
        detail: `Case open for ${c.durationMins} mins, but recorded active telemetry span was only ${activeSpanMins.toFixed(1)} mins (HADR Divergence: ${hadr}x).`
      });
    }

    // C. Canned / Copied Notes
    const isCanned = cannedNoteFlags.has(c.caseId);
    if (isCanned) {
      findings.push({
        type: 'CANNED_NOTE',
        severity: 'HIGH',
        label: 'Repetitive Boilerplate Investigation Note',
        detail: `Investigation note matches known canned template with zero incident-specific details.`
      });
    }

    // D. Unescalated Critical Incident
    const isUnescalatedCrit = c.severity === 'CRITICAL' && !c.escalated;
    if (isUnescalatedCrit) {
      unescalatedCritCount++;
      findings.push({
        type: 'UNESCALATED_CRITICAL',
        severity: 'HIGH',
        label: 'Unescalated Critical Incident',
        detail: `High-impact threat (${c.alertType}) on asset ${c.targetAsset} was closed locally without Level-2/NCIIPC sectoral escalation.`
      });
    }

    // E. Low Evidence Score
    if (ies < 35 && (c.severity === 'CRITICAL' || c.severity === 'HIGH')) {
      lowEvidenceCount++;
      findings.push({
        type: 'LOW_EVIDENCE',
        severity: 'HIGH',
        label: 'Sub-Baseline Investigation Evidence',
        detail: `Investigation Evidence Score is ${ies}/100. Missing critical forensic stages (SIEM queries, IOC checks, or attached proof).`
      });
    }

    // F. Irrelevant Queries (Fake Activity)
    if (irrelevantActions.length > 0) {
      findings.push({
        type: 'IRRELEVANT_ACTIVITY',
        severity: 'MEDIUM',
        label: 'Context-Divergent Queries Detected',
        detail: `${irrelevantActions.length} log queries performed do not correlate with target asset (${c.targetAsset}) or alert indicators.`
      });
    }

    const hasExecutionGap = findings.length > 0;

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
      hasExecutionGap,
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
      cannedNoteCount,
      lowEvidenceCount
    },
    cases: caseFindings
  };
}

module.exports = { analyzeExecutionGaps, calculateJaccardSimilarity };
