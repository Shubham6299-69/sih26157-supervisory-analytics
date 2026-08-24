/**
 * NCIIPC Supervisory Analytics - Synthetic Data Generator
 * Generates realistic SOC operational telemetry, cases, alerts, and assets for 5 CSEs.
 */

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

  // Canned notes for CSE-07 execution gap simulation
  const cannedTemplates = [
    "Investigated standard log telemetry, no anomaly detected, confirmed false positive. Closing case as per standard operating procedure.",
    "Investigated standard log telemetry, no anomaly detected, confirmed false positive. Closing case as per standard procedure SOP-4.",
    "Investigated standard logs, no anomaly detected. Closing case as false positive as per standard operating procedure.",
    "Investigated standard log telemetry, no anomaly found, confirmed false positive. Closed."
  ];

  // For negative_space, monitoredPool excludes the blind spot assets (assets 5 to 18)
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
        // Pattern 1: Rapid Closure (< 2 min) on Critical alerts
        durationMins = Math.floor(Math.random() * 80 + 25) / 60; // 0.4 to 1.7 mins
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
        // Pattern 2: Tab Left Open (HADR > 15) - Open for 70-110 min, 1 action in first minute
        durationMins = Math.floor(Math.random() * 40 + 70); // 70-110 mins
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
        // Pattern 3: Critical Ransomware / C2 alert closed with NO ESCALATION & Canned notes
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
        // Normal case
        durationMins = Math.floor(Math.random() * 25 + 15);
        closedTime = new Date(openedTime.getTime() + durationMins * 60000);
        notes = `Investigated host ${assetObj.hostname} for ${alertMeta.type}. Queried perimeter firewall and verified authentication logs. No lateral movement found.`;
        resolution = 'Closed - Handled';
        escalated = alertMeta.sev === 'CRITICAL' && Math.random() > 0.4;
        escalationTarget = escalated ? 'NCIIPC / CERT-In Level 2 IR' : null;
        generateLegitTelemetry(caseTelemetry, cse.id, i, caseId, analyst, openedTime, assetObj, alertMeta, escalated);
      }
    } else if (cse.profile === 'negative_space') {
      // MetroRail
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
      // NationalBank
      durationMins = Math.floor(Math.random() * 12 + 4);
      closedTime = new Date(openedTime.getTime() + durationMins * 60000);
      escalated = (i === 12);
      escalationTarget = escalated ? 'RBI-CSITE' : null;
      notes = `Fast triage applied for ${alertMeta.type}. Account/Asset ${assetObj.hostname} verified in core banking segment.`;
      resolution = 'Closed - Triage Complete';
      generateLegitTelemetry(caseTelemetry, cse.id, i, caseId, analyst, openedTime, assetObj, alertMeta, escalated, 0.5);
    } else {
      // Compliant / Baseline (CSE-01, CSE-19)
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
    
    // For CSE-12: assets 5 to 18 are Critical Train Signaling servers that are completely dark (blind spots)
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

  // 1. Asset Analysis
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

  // 2. Log Analysis (SIEM SPL / KQL)
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

  // 3. IOC Analysis (if any IOCs)
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

  // 4. Evidence Attachment
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

  // 5. Escalation Event
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

module.exports = { generateDatasets };
