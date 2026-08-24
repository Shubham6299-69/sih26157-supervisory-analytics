/**
 * Unit and Integration Tests for SIH26157 Supervisory Analytics Platform
 */

const { generateDatasets } = require('../data/generator');
const { analyzeExecutionGaps, calculateJaccardSimilarity } = require('../engine/executionGap');
const { analyzeNegativeSpace } = require('../engine/negativeSpace');
const { analyzePeerDeviations } = require('../engine/peerDeviation');
const { calculateSupervisoryScore } = require('../engine/supervisoryScore');

function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting SIH26157 Supervisory Engine Verification');
  console.log('====================================================');

  // Test 1: Jaccard Similarity Calculation
  const text1 = "Investigated standard log telemetry, no anomaly detected, confirmed false positive.";
  const text2 = "Investigated standard log telemetry, no anomaly detected, confirmed false positive. SOP-4";
  const sim = calculateJaccardSimilarity(text1, text2);
  console.log(`✓ Test 1: Jaccard similarity between canned notes: ${(sim * 100).toFixed(1)}%`);
  if (sim < 0.75) throw new Error('Jaccard similarity failed for near-identical texts');

  // Test 2: Generate multi-CSE synthetic datasets
  const { cses, datasets } = generateDatasets();
  console.log(`✓ Test 2: Generated datasets for ${cses.length} Critical Sector Entities.`);

  // Test 3: Analyze CSE-07 (Execution Gap Profile)
  const cse07Data = datasets['CSE-07'];
  const exec07 = analyzeExecutionGaps(cse07Data.cases, cse07Data.telemetry);
  console.log(`✓ Test 3 (CSE-07 Execution Gaps): Flagged ${exec07.summary.flaggedCasesCount} cases, Rapid closures: ${exec07.summary.rapidClosureCount}, Tab-Left-Open: ${exec07.summary.tabOpenCount}`);
  if (exec07.summary.flaggedCasesCount === 0) throw new Error('Failed to detect execution gaps in CSE-07');

  // Test 4: Analyze CSE-12 (Negative Space Profile)
  const cse12Data = datasets['CSE-12'];
  const neg12 = analyzeNegativeSpace(cse12Data.assets, cse12Data.cases, cse12Data.telemetry);
  console.log(`✓ Test 4 (CSE-12 Negative Space): Discovered ${neg12.summary.criticalBlindSpotCount} critical unmonitored assets (blind spots).`);
  if (neg12.summary.criticalBlindSpotCount === 0) throw new Error('Failed to detect blind spots in CSE-12');

  // Test 5: Peer Deviation Analysis across all 5 CSEs
  const metrics = cses.map(cse => {
    const data = datasets[cse.id];
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    const escCount = data.cases.filter(c => c.escalated).length;
    const durations = data.cases.map(c => c.durationMins).sort((a, b) => a - b);
    const medianDur = durations[Math.floor(durations.length / 2)] || 0;

    return {
      cseId: cse.id,
      escalationRate: Math.round((escCount / data.cases.length) * 100),
      medianDuration: medianDur,
      executionGapRatio: exec.summary.executionGapRatio,
      avgIES: exec.summary.avgIES,
      blindSpotRatio: neg.summary.blindSpotRatio
    };
  });

  const peerResults = analyzePeerDeviations(metrics);
  console.log(`✓ Test 5 (Peer Deviations): Peer median escalation rate = ${peerResults.baselines.escalationRateMedian}%. CSE-02 anomaly detected: ${peerResults.deviations['CSE-02'].isOutlier}`);

  // Test 6: Supervisory Attention Matrix & Priority Ranking
  const allScores = cses.map(cse => {
    const data = datasets[cse.id];
    const exec = analyzeExecutionGaps(data.cases, data.telemetry);
    const neg = analyzeNegativeSpace(data.assets, data.cases, data.telemetry);
    return calculateSupervisoryScore(cse, exec, neg, peerResults);
  });

  console.log('\n--- Supervisory Attention Leaderboard ---');
  allScores.sort((a, b) => b.totalScore - a.totalScore).forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.priorityLevel} ${s.badgeColor === 'red' ? '🔴' : s.badgeColor === 'amber' ? '🟠' : '🟢'}] ${s.cseId} (${s.cseName}): Score ${s.totalScore}/100`);
    console.log(`   Reasons: ${s.auditFindings[0].text}`);
  });

  console.log('\n====================================================');
  console.log('🎉 ALL ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');
}

runTests();
