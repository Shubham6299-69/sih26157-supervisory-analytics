/**
 * NCIIPC Supervisory Analytics - Supervisory Attention Scoring Matrix (SAM)
 * Synthesizes Execution Gaps, Negative Space Blind Spots, and Peer Deviations
 * into an explainable 0-100 Supervisory Attention Priority Score with auditable justification.
 */

function calculateSupervisoryScore(cse, executionResults, negativeSpaceResults, peerResults) {
  const gapSumm = executionResults.summary;
  const negSumm = negativeSpaceResults.summary;
  const peerDev = peerResults ? peerResults.deviations[cse.id] : null;

  // 1. Execution Gap Component (Max 45 points)
  let gapScore = 0;
  gapScore += Math.min(15, gapSumm.rapidClosureCount * 1.5);
  gapScore += Math.min(15, gapSumm.tabOpenCount * 1.2);
  gapScore += Math.min(10, gapSumm.cannedNoteCount * 0.4);
  gapScore += Math.min(10, gapSumm.unescalatedCritCount * 1.2);
  if (gapSumm.avgIES < 50) {
    gapScore += Math.round((50 - gapSumm.avgIES) * 0.3);
  }
  gapScore = Math.min(45, Math.round(gapScore));

  // 2. Negative Space Component (Max 35 points)
  let negScore = 0;
  negScore += Math.min(25, negSumm.criticalBlindSpotCount * 2.2);
  negScore += Math.min(10, Math.round(negSumm.blindSpotRatio * 25));
  negScore = Math.min(35, Math.round(negScore));

  // 3. Peer Deviation Component (Max 20 points)
  let peerScore = 0;
  if (peerDev && peerDev.isOutlier) {
    peerScore = Math.min(20, Math.round(peerDev.anomalyScore * 0.25));
  }

  const totalScore = Math.min(100, gapScore + negScore + peerScore);

  let priorityLevel = 'LOW';
  let badgeColor = 'green';
  if (totalScore >= 60) {
    priorityLevel = 'HIGH';
    badgeColor = 'red';
  } else if (totalScore >= 35) {
    priorityLevel = 'MEDIUM';
    badgeColor = 'amber';
  }

  // Construct Explainable Key Audit Findings
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

module.exports = { calculateSupervisoryScore };
