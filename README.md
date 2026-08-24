# NCIIPC Supervisory Analytics Platform (SIH26157)
**Supervisory Operational Integrity & Forensic Telemetry Audit Engine for Critical Sector Entities (CSEs)**

---

## 🎯 Executive Overview & Core Problem

NCIIPC oversees the cybersecurity posture of India's Critical Sector Entities (Power plants, Banks, Telecom backbones, Airports, Metro rail systems). Currently, entities submit high-level compliance reports and SLA dashboards (e.g. *"98% SLA compliance"*). 

However, high-level dashboards conceal operational vulnerabilities:
1. **The "Tab Left Open" Execution Gap**: A critical alert is marked as open for 90 minutes, but recorded investigation telemetry is virtually zero (a single click, 88 minutes of dormancy, then closed as "False Positive").
2. **Rapid Closures without Triage**: Critical ransomware / C2 beacon alerts closed within 30–60 seconds with boilerplate copy-pasted notes.
3. **Negative Space (Monitoring Blind Spots)**: High-value critical infrastructure assets that should have active logs/alerts but are completely dark (zero telemetry).
4. **Peer Deviations**: An entity handling thousands of critical alerts with an abnormally suppressed escalation rate (e.g., 0.7% vs sector peer median of 24%).

**This platform is not a SOC and does not spy on analysts' webcams or mouse clicks.** It is a **Supervisory Analytics Detective Assistant for NCIIPC Examiners** that ingests raw operational audit logs (SIEM queries, EDR lookups, SOAR case actions) to mathematically reconstruct whether genuine, context-relevant forensic investigations occurred.

---

## 🏛️ The Three Pillars of Supervisory Intelligence

```
                        ┌────────────────────────────────────────┐
                        │       CSE Operational Audit Logs       │
                        │ (Alerts, Cases, Actions, Logs, Assets) │
                        └───────────────────┬────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │       Data Normalization & Sessionizer         │
                    └───────────────────────┬────────────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           ▼                           ▼
    ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
    │ 1. EXECUTION GAP      │   │ 2. NEGATIVE SPACE     │   │ 3. PEER DEVIATION     │
    │ ───────────────────── │   │ ───────────────────── │   │ ───────────────────── │
    │ • IES Evidence Score  │   │ • Dark Asset Discovery│   │ • Cross-CSE Baselines │
    │ • HADR Divergence     │   │ • Telemetry Gaps      │   │ • Escalation Outliers │
    │ • Canned Note Sim.    │   │ • Missing Stages      │   │ • Velocity Anomalies  │
    │ • Unescalated Crits   │   │                       │   │                       │
    └───────────┬───────────┘   └───────────┬───────────┘   └───────────┬───────────┘
                │                           │                           │
                └───────────────────────────┼───────────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │   Supervisory Attention Matrix (SAM)   │
                        │    (Explainable 0-100 Priority Score)  │
                        └───────────────────┬────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │      Interactive Examiner Portal       │
                        │ • Evidence-Backed Leaderboard          │
                        │ • Side-by-Side Timeline Reconstructor  │
                        │ • Asset Blindspot Sensor Grid          │
                        │ • Official NCIIPC Audit Dossier Export │
                        └────────────────────────────────────────┘
```

---

## 🧮 Key Mathematical Formulations

### 1. Investigation Evidence Score ($\text{IES}$)
Calculates the forensic weight of recorded actions per case ($0\text{ to }100$):
$$\text{IES} = w_1 S_{\text{asset}} + w_2 S_{\text{log}} + w_3 S_{\text{ioc}} + w_4 S_{\text{evidence}} + w_5 S_{\text{escalation}} - \text{Penalty}_{\text{irrelevant}}$$

### 2. Handling-to-Activity Divergence Ratio ($\text{HADR}$)
Directly catches the **"tab left open"** pattern:
$$\text{HADR} = \frac{\text{Investigation Duration (minutes)}}{\text{Active Telemetry Span (minutes)} + \epsilon}$$
- **Normal Case**: Open 38 min, active telemetry span 32.5 min $\rightarrow \text{HADR} \approx 1.16\text{x}$ (Active Investigation).
- **Tab-Left-Open Case**: Open 88 min, active telemetry span 0.5 min $\rightarrow \text{HADR} \approx 176\text{x}$ (**Severe Execution Gap Alert**).

### 3. Canned Note Jaccard Similarity Matrix
Detects copy-pasted, boilerplate investigation reasoning across hundreds of closed incidents:
$$J(A, B) = \frac{|A \cap B|}{|A \cup B|} \ge 0.75$$

---

## 🚀 Pre-Loaded Critical Sector Datasets

| Entity ID | Entity Name | Sector Domain | Operational Profile Highlight |
| :--- | :--- | :--- | :--- |
| **CSE-07** | **TelecomHub National** | Telecommunications | **Execution Gap Showcase**: High-volume, 14 rapid closures (<2m), 30 tab-open cases, canned notes, unescalated ransomware. |
| **CSE-12** | **MetroRail Transit Systems** | Transportation | **Negative Space Showcase**: 14 critical train signaling & dispatch servers completely unmonitored (blind spots). |
| **CSE-02** | **National Commercial Bank** | Banking & Finance | **Peer Deviation Showcase**: 0.7% escalation rate vs 24% sector median. |
| **CSE-01** | **PowerGrid Infra Corp** | Energy & Power | **Compliant Baseline**: Comprehensive SIEM/EDR query trails and healthy Level-2 escalation. |
| **CSE-19** | **Airport Authority Logistics**| Civil Aviation | **Standard Baseline**: Nominal operations. |

---

## ⚡ Quick Start & Running the Prototype

### Option 1: Double-Click Launcher (Windows)
Double-click `start.bat` in the project root directory.

### Option 2: Command Line
```powershell
& "C:\Users\Shubham agrawal\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js
```

Open your browser to:
👉 **`http://localhost:3000`**

---

## 🎬 90-Second Killer Demo Script for SIH Judges

1. **The Pitch (15s)**:
   > *"Judges, NCIIPC cannot inspect 500,000 SOC alerts manually. High-level KPI reports say '98% SLA met', but hide operational execution gaps. Our platform acts as an automated detective assistant for examiners, analyzing operational digital footprints."*
2. **Sector Matrix (20s)**:
   > *"On the Sector Supervisory Matrix, notice how CSE-07 (TelecomHub) and CSE-12 (MetroRail) are immediately flagged with High Supervisory Attention, while CSE-01 (PowerGrid) is verified compliant."*
3. **The 'Tab-Left-Open' Demo (30s)**:
   > *"Click 'Live Timeline Demo'. On the left is a genuine investigation with SIEM queries, IOC checks, and evidence dumps. On the right is Case C0025 from CSE-07: open for 88 minutes, but our telemetry shows 87 minutes of complete dormancy and an HADR divergence of 176x. This proves the tab was left open."*
4. **Negative Space (15s)**:
   > *"Switch to the 'Negative Space' tab for MetroRail. Our system discovered 14 critical train-signaling servers with ZERO telemetry over the audit window—a major blind spot."*
5. **Dossier Export (10s)**:
   > *"With one click, the examiner generates an official, legally defensible NCIIPC Supervisory Audit Dossier ready for regulatory inquiry."*
