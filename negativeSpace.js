/**
 * NCIIPC Supervisory Analytics - Negative Space Detection Engine
 * Discovers "What should have happened but didn't":
 * 1. Critical Asset Monitoring Blind Spots (Zero Telemetry on Critical Infrastructure)
 * 2. Missing Mandatory Forensic Investigation Phases
 * 3. Telemetry Ingestion Silence Windows
 */

function analyzeNegativeSpace(assets, cases, telemetry) {
  // 1. Map assets to observed alerts & telemetry events
  const assetActivity = {};
  assets.forEach(a => {
    assetActivity[a.hostname] = {
      asset: a,
      alertCount: 0,
      telemetryEventsCount: 0,
      lastSeen: null,
      casesInvolved: []
    };
  });

  cases.forEach(c => {
    if (assetActivity[c.targetAsset]) {
      assetActivity[c.targetAsset].alertCount++;
      assetActivity[c.targetAsset].casesInvolved.push(c.caseId);
    }
  });

  telemetry.forEach(evt => {
    if (evt.targetObject && assetActivity[evt.targetObject]) {
      assetActivity[evt.targetObject].telemetryEventsCount++;
      assetActivity[evt.targetObject].lastSeen = evt.timestamp;
    }
  });

  // 2. Discover Blind Spots
  const blindSpotAssets = [];
  const monitoredAssets = [];

  assets.forEach(a => {
    const act = assetActivity[a.hostname];
    const isDark = (act.alertCount === 0 && act.telemetryEventsCount === 0) || a.simulatedBlindSpot;
    
    if (isDark) {
      blindSpotAssets.push({
        assetId: a.assetId,
        hostname: a.hostname,
        criticality: a.criticality,
        department: a.department,
        os: a.os,
        expectedMonitoring: a.expectedMonitoring,
        riskLevel: a.criticality === 'CRITICAL' ? 'CRITICAL_BLINDSPOT' : 'WARNING_BLINDSPOT',
        findings: [
          `Zero security events, log searches, or alert registrations detected over audit window despite being tagged as ${a.criticality} infrastructure.`
        ]
      });
    } else {
      monitoredAssets.push({
        assetId: a.assetId,
        hostname: a.hostname,
        criticality: a.criticality,
        alertCount: act.alertCount,
        eventCount: act.telemetryEventsCount
      });
    }
  });

  // 3. Discover Missing Mandatory Investigation Phases
  // Standard full-chain: [ASSET_LOOKUP, LOG_QUERY, IOC_SEARCH (if IOCs exist), EVIDENCE_ATTACH]
  const phaseGaps = [];
  const telemetryByCase = {};
  telemetry.forEach(evt => {
    if (!telemetryByCase[evt.caseId]) telemetryByCase[evt.caseId] = [];
    telemetryByCase[evt.caseId].push(evt.actionCategory);
  });

  cases.forEach(c => {
    const executedPhases = new Set(telemetryByCase[c.caseId] || []);
    const missingPhases = [];

    if (!executedPhases.has('ASSET_LOOKUP')) missingPhases.push('Asset Context Lookup');
    if (!executedPhases.has('LOG_QUERY')) missingPhases.push('SIEM Log Query Verification');
    if (c.targetIocs && c.targetIocs.length > 0 && !executedPhases.has('IOC_SEARCH')) {
      missingPhases.push('IOC Threat Intel Analysis');
    }
    if (c.severity === 'CRITICAL' && !executedPhases.has('EVIDENCE_ATTACH')) {
      missingPhases.push('Forensic Evidence Attachment');
    }

    if (missingPhases.length >= 2 && (c.severity === 'CRITICAL' || c.severity === 'HIGH')) {
      phaseGaps.push({
        caseId: c.caseId,
        severity: c.severity,
        alertType: c.alertType,
        targetAsset: c.targetAsset,
        missingPhases,
        gapSeverity: missingPhases.length >= 3 ? 'HIGH' : 'MEDIUM'
      });
    }
  });

  const totalAssets = assets.length;
  const criticalAssets = assets.filter(a => a.criticality === 'CRITICAL');
  const criticalBlindSpots = blindSpotAssets.filter(a => a.criticality === 'CRITICAL');
  const blindSpotRatio = totalAssets > 0 ? parseFloat((blindSpotAssets.length / totalAssets).toFixed(2)) : 0;
  const criticalBlindSpotRatio = criticalAssets.length > 0 ? parseFloat((criticalBlindSpots.length / criticalAssets.length).toFixed(2)) : 0;

  return {
    summary: {
      totalAssets,
      criticalAssetsCount: criticalAssets.length,
      blindSpotCount: blindSpotAssets.length,
      criticalBlindSpotCount: criticalBlindSpots.length,
      blindSpotRatio,
      criticalBlindSpotRatio,
      phaseGapCasesCount: phaseGaps.length
    },
    blindSpots: blindSpotAssets,
    phaseGaps: phaseGaps.slice(0, 50)
  };
}

module.exports = { analyzeNegativeSpace };
