/**
 * NCIIPC Supervisory Analytics - Peer Deviation Engine
 * Compares Critical Sector Entities against sector peers to detect operational outliers.
 */

function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(arr, mean) {
  if (!arr || arr.length <= 1) return 1;
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance) || 1;
}

function analyzePeerDeviations(allCseMetrics) {
  // Collect metric arrays
  const escalationRates = allCseMetrics.map(m => m.escalationRate);
  const medianDurations = allCseMetrics.map(m => m.medianDuration);
  const executionGapRatios = allCseMetrics.map(m => m.executionGapRatio);
  const avgIESs = allCseMetrics.map(m => m.avgIES);
  const blindSpotRatios = allCseMetrics.map(m => m.blindSpotRatio);

  const baselines = {
    escalationRateMedian: calculateMedian(escalationRates),
    durationMedian: calculateMedian(medianDurations),
    executionGapMedian: calculateMedian(executionGapRatios),
    iesMedian: calculateMedian(avgIESs),
    blindSpotMedian: calculateMedian(blindSpotRatios)
  };

  const deviations = {};

  allCseMetrics.forEach(m => {
    const cseDeviations = [];
    let anomalyScore = 0; // 0 to 100

    // 1. Escalation Rate Deviation (e.g. CSE-02 is < 1% vs Peer Median 22%)
    const escDiff = m.escalationRate - baselines.escalationRateMedian;
    if (escDiff < -10) {
      const dropPct = Math.round((Math.abs(escDiff) / (baselines.escalationRateMedian || 1)) * 100);
      anomalyScore += 30;
      cseDeviations.push({
        metric: 'Escalation Rate',
        cseValue: `${m.escalationRate}%`,
        peerMedian: `${baselines.escalationRateMedian}%`,
        direction: 'SIGNIFICANTLY_LOWER',
        severity: 'HIGH',
        explanation: `Escalation rate is ${dropPct}% lower than the sector peer median. Critical alerts may be suppressed or prematurely closed.`
      });
    }

    // 2. Execution Gap Deviation
    const gapDiff = m.executionGapRatio - baselines.executionGapMedian;
    if (gapDiff > 0.20) {
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

    // 3. IES Forensic Evidence Deviation
    const iesDiff = m.avgIES - baselines.iesMedian;
    if (iesDiff < -20) {
      anomalyScore += 25;
      cseDeviations.push({
        metric: 'Forensic Evidence Score (IES)',
        cseValue: `${m.avgIES}/100`,
        peerMedian: `${baselines.iesMedian}/100`,
        direction: 'SIGNIFICANTLY_LOWER',
        severity: 'HIGH',
        explanation: `Recorded investigation telemetry per case is drastically below peer standards.`
      });
    }

    // 4. Blind Spot Ratio Deviation
    const blindDiff = m.blindSpotRatio - baselines.blindSpotMedian;
    if (blindDiff > 0.15) {
      anomalyScore += 30;
      cseDeviations.push({
        metric: 'Asset Blind Spot Ratio',
        cseValue: `${Math.round(m.blindSpotRatio * 100)}%`,
        peerMedian: `${Math.round(baselines.blindSpotMedian * 100)}%`,
        direction: 'SIGNIFICANTLY_HIGHER',
        severity: 'HIGH',
        explanation: `A substantial portion of inventory shows zero monitoring activity, diverging from normal sector baselines.`
      });
    }

    // 5. Handling Velocity Divergence
    if (m.medianDuration < 6.0 && baselines.durationMedian > 18.0) {
      anomalyScore += 20;
      cseDeviations.push({
        metric: 'Handling Duration Velocity',
        cseValue: `${m.medianDuration} min`,
        peerMedian: `${baselines.durationMedian} min`,
        direction: 'ABNORMALLY_FAST',
        severity: 'MEDIUM',
        explanation: `Cases are closed at an unusually high speed compared to peer triage baselines.`
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

module.exports = { analyzePeerDeviations };
