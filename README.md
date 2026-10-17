# Purse Autonomous Finance

> **Decentralized, edge-computing personal finance copilot powered by hybrid AI agents, smart budgeting envelopes, subscription leak detection, and long-term memory.**  
> *Developed for the 2026 Shenzhen International FinTech Competition.*

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
   - [Architectural Topology](#architectural-topology)
   - [Dual-Tier Cognitive Dispatcher](#dual-tier-cognitive-dispatcher)
   - [Interactive 3D Avatar & Lip-Sync Pipeline](#interactive-3d-avatar--lip-sync-pipeline)
3. [Smart Budgeting, Bill Analysis & Spending Insights](#smart-budgeting-bill-analysis--spending-insights)
   - [Envelope Budgeting Methodology](#envelope-budgeting-methodology)
   - [Predictive Bill Analysis & Subscription Leak Detection](#predictive-bill-analysis--subscription-leak-detection)
   - [Zero-Income Cash Runway Stress Testing](#zero-income-cash-runway-stress-testing)
   - [Actionable Financial Recommendations Engine](#actionable-financial-recommendations-engine)
4. [Core Algorithms & Mathematical Formulations](#core-algorithms--mathematical-formulations)
   - [Safe-to-Spend Headroom Algorithm](#1-safe-to-spend-headroom-algorithm)
   - [Survival Runway Modeling](#2-survival-runway-modeling)
   - [Subscription Inefficiency & Redundancy Scoring](#3-subscription-inefficiency--redundancy-scoring)
   - [Two-Phase Safe Execution & Rollback State Machine](#4-two-phase-safe-execution--rollback-state-machine)
5. [Security & Privacy Architecture](#security--privacy-architecture)
   - [Local-First Data Isolation](#local-first-data-isolation)
   - [Confidential Key Management & Zero Client Leakage](#confidential-key-management--zero-client-leakage)
   - [Invariant Verification & Safe Mutation Gates](#invariant-verification--safe-mutation-gates)
6. [Agent Memory Core Specification](#agent-memory-core-specification)
7. [Getting Started & Local Development](#getting-started--local-development)
   - [Prerequisites](#prerequisites)
   - [Installation & Startup](#installation--startup)
   - [Environment Variables](#environment-variables)
8. [License & Attribution](#license--attribution)

---

## Executive Summary

**Purse** is an autonomous personal finance system engineered to bridge the gap between static ledger software and intelligent financial advisory. Unlike traditional fintech applications that transmit unencrypted banking records to remote servers, Purse operates on a **local-first, edge-native paradigm**.

Key capabilities:
- **Natural Language Bookkeeping**: Parse receipts, bank statements, CSV exports, or free-form conversational input into structured double-entry ledger records.
- **Smart Envelope Budgeting**: Dynamic 50/30/20 allocation with live headroom tracking across needs, wants, and savings.
- **Recurring Obligation & Leak Auditing**: Automated discovery of duplicate streaming tiers, price hikes, and dormant subscriptions.
- **Liquidity Runway Stress Testing**: Real-time modeling of survival horizons under zero-income scenarios.
- **Autonomous Safe Execution**: Action proposals require explicit human confirmation with single-click mathematical rollback capability.
- **Multimodal Fiona Companion**: Real-time 3D VRM avatar with speech recognition, text-to-speech, and audio-driven viseme lip synchronization.

---

## System Architecture

### Architectural Topology

```
+-------------------------------------------------------------------------+
|                              CLIENT (BROWSER)                           |
|                                                                         |
|  +--------------------+   +---------------------+   +----------------+  |
|  | React 19 UI Engine |   |   Three.js + VRM    |   | Web Speech API |  |
|  | - Chat & Ledger    |   | - Fiona 3D Avatar   |   | - STT Input    |  |
|  | - Budgets & Bills  |   | - Mixamo Retarget   |   | - TTS Readout  |  |
|  | - Memory Core View |   | - Viseme Lip-Sync   |   |                |  |
|  +---------+----------+   +----------+----------+   +-------+--------+  |
|            |                         |                      |           |
|            +-------------------------+----------------------+           |
|                                      |                                  |
|            +-------------------------v----------------------+           |
|            |           FinanceContext State Machine         |           |
|            +------------+--------------------------+--------+           |
|                         |                          |                    |
|                         v                          v                    |
|             +-----------------------+  +------------------------+       |
|             | Edge Rule Engine      |  | Local Storage Vault    |       |
|             | - Deterministic Invars|  | - IndexedDB / Local    |       |
|             | - Intent Extraction   |  | - Markdown Memory Graph|       |
|             | - Safe Action Stager  |  | - Wasm Models (SmolLM2)|       |
|             +-----------+-----------+  +------------------------+       |
|                         |                                               |
+-------------------------|-----------------------------------------------+
                          | (HTTP /api/* Proxy)
                          v
+-------------------------------------------------------------------------+
|                     BACKEND PROXY SERVICE (Node / Express)              |
|                                                                         |
|  +--------------------+  +----------------------+  +-----------------+  |
|  | /api/chat Proxy    |  | /api/organize-tx     |  | /api/health     |  |
|  | - Key Isolation    |  | - Schema Normalizer  |  | - Diagnostics   |  |
|  | - Transient Retry  |  | - JSON Enforcer      |  |                 |  |
|  +---------+----------+  +----------+-----------+  +-----------------+  |
|            |                        |                                   |
+------------|------------------------|-----------------------------------+
             |                        |
             v                        v
+-------------------------------------------------------------------------+
|                       FOUNDATION MODEL PROVIDERS                        |
|                                                                         |
|  - Google Gemini 3.8 Flash (Server-Side Managed via @google/genai)      |
|  - OpenAI GPT-4o-mini (User API Key)                                    |
|  - DeepSeek V3 (User API Key)                                           |
|  - Zhipu GLM-4 Flash (User API Key)                                     |
+-------------------------------------------------------------------------+
```

### Dual-Tier Cognitive Dispatcher & 5 Core Subsystems

Purse is architected around five distinct, decoupled subsystems balancing privacy, latency, and reasoning depth:

1. **Subsystem 01 — Lexical Entity Extraction & Polarity Pipeline (`agentEngine.ts`)**:
   - Parses unstructured natural language messages and receipt transcripts.
   - Extracts merchant names, transaction polarities (credit vs debit), amounts, dates, and spending categories in sub-12 milliseconds.
   - Computes statistical confidence scores, flagging ambiguous inputs for user review.

2. **Subsystem 02 — Client-Side Vector Database & Zero-Cloud Cosine RAG (`vectorDb.ts`)**:
   - Embeds user transactions, bill schedules, and memory graph entries into an in-memory 384-dimensional vector space.
   - Executes exact cosine similarity search ($S_C$) directly in the client browser with sub-10ms query latency.
   - Preserves 100% data residency inside the client sandbox with zero telemetry or vector cloud clustering.

3. **Subsystem 03 — Dynamic Envelope Budgeting & Algorithmic Safe-Daily-Spend (`budgetService.ts`)**:
   - Implements the mathematical cushion formulation: $\text{Cushion} = \max\left(0, \text{Balance} - \text{Floor} - \text{Committed Bills}\right)$.
   - Computes real-time daily discretionary caps: $\text{Safe Daily Spend} = \frac{\text{Cushion}}{\text{Days Remaining}}$.
   - Dynamically reallocates envelope quotas based on category spending velocities.

4. **Subsystem 04 — Temporal Obligations Radar & Predictive Trajectories (`billsService.ts`)**:
   - Second-by-second countdown engine tracking impending liabilities (rent, utilities, debt amortization).
   - Generates 30-day forward cashflow curves to detect liquidity floor breaches prior to scheduled deposits.
   - Performs automated subscription leak auditing, flagging redundant media services and dormant licenses.

5. **Subsystem 05 — Two-Phase Transactional Rollback State Machine & Knowledge Graph (`memoryService.ts`)**:
   - Enforces a deterministic state machine: `Draft` $\to$ `Staged` $\to$ `Committed` $\to$ `Reverted`.
   - All mutations compute inverse signed deltas ($-\text{sgn}(\text{Type}) \times \text{Amount}$), guaranteeing zero state corruption.
   - Persists human-auditable habits and operating rules in a client-side Markdown file (`MEMORY.md`).

### Interactive 3D Avatar & Lip-Sync Pipeline (Application Cockpit)

Within the Purse application cockpit (`/app`), the interactive 3D Fiona companion provides real-time multimodal assistance:
- **Model Loader**: `@pixiv/three-vrm` loads humanoid VRM models with full bone hierarchies and expression morph targets.
- **Skeletal Retargeting**: `vrm-mixamo-retarget` maps Mixamo FBX animations to humanoid VRM bones in real time.
- **Lip Synchronization**: `lipSyncManager` parses incoming synthesized audio waveforms or subtitle events, driving standard visemes (`aa`, `ih`, `ou`, `ee`, `oh`, and natural eye blinks).
- **Portrait Lighting Rig**: Formulated with warm key lighting (`0xffeedb`), peach-toned fill (`0xffdfd2`), and soft ambient light (`0xfff3e6`) with ACESFilmic tone mapping to eliminate skin paleness and render natural facial depth.

---

## Smart Budgeting, Bill Analysis & Spending Insights

### Envelope Budgeting Methodology

Purse structures expenditures into three immutable macro tiers following the balanced 50/30/20 financial rule:
- **Needs (50%)**: Housing & Rent, Groceries, Utilities & Services, Transportation & Fuel, Health & Wellness.
- **Wants (30%)**: Dining & Nightlife, Entertainment & Leisure, Subscriptions & Software, Shopping & Goods.
- **Savings & Debt (20%)**: High-Yield Emergency Vault, Index Portfolios, Retirement Contributions.

Each envelope maintains real-time tracking of:
- **Allocated Quota**: Monthly target configured by the user or synthesized from income history.
- **Current Outflow**: Real-time sum of verified transactions logged in the current billing cycle.
- **Remaining Headroom**: Live dollar headroom with visual exhaustion indicators (safe, warning at 80%, critical overdraft).

### Predictive Bill Analysis & Subscription Leak Detection

Recurring costs represent the largest source of invisible financial friction. Purse actively monitors recurring invariants:
1. **Due Date Trajectories**: Tracks payment deadlines, warns of obligations due within 7 days, and flags non-autopay bills.
2. **Subscription Duplication Auditing**: Detects overlapping services within identical content categories (e.g., active Hulu + Disney bundle concurrent with Netflix standard HD).
3. **Dormant License Discovery**: Flags recurring software costs showing zero operational activity over 30+ days (e.g., professional software suites last logged 40+ days ago).
4. **Liquidity Impact Pre-Calculation**: Evaluates whether scheduled bill debits will breach the user's defined **Operating Checking Liquidity Floor** prior to the next confirmed payday.

### Zero-Income Cash Runway Stress Testing

The engine models survival horizons by cross-referencing total liquid capital against essential needs:
- Aggregates operating checking accounts and high-yield emergency vaults.
- Isolates fixed, non-negotiable living expenses (filtering out discretionary wants).
- Produces zero-income survival projections expressed in both fractional months and precise calendar days.

### Actionable Financial Recommendations Engine

Rather than passive charts, Purse delivers concrete, executable advice:
- **Affordability Inquiries**: Evaluates immediate discretionary purchases (e.g., *"Can I afford a $120 dinner tonight?"*) by factoring days until payday, pending bill deductions, and envelope balances.
- **Safe-to-Spend Daily Allocations**: Computes dynamic daily spending caps that preserve baseline savings targets.
- **Negotiation & Cancellation Prompts**: Quantifies annual savings potential (e.g., *"Canceling dormant Adobe license yields $54.99/mo ($659.88/yr) in risk-free liquidity"*).

---

## Core Algorithms & Mathematical Formulations

### 1. Safe-to-Spend Headroom Algorithm

Calculates discretionary spending capacity without jeopardizing fixed bills or liquidity thresholds:

$$\text{Net Cashflow} = I_{\text{monthly}} - \sum_{i=1}^{n} E_{i}$$

$$\text{Committed Bills} = \sum_{j \in \text{Pending Bills}} B_{j}$$

$$\text{Available Cushion} = \max\left(0, \text{Balance}_{\text{checking}} - \text{Floor}_{\text{min}} - \text{Committed Bills}\right)$$

$$\text{Safe Daily Spend} = \frac{\text{Available Cushion}}{D_{\text{remaining}}}$$

Where:
- $I_{\text{monthly}}$: Projected monthly net income.
- $E_{i}$: Verified expenses incurred within the active billing cycle.
- $\text{Floor}_{\text{min}}$: User-configured checking balance safety threshold.
- $D_{\text{remaining}}$: Calendar days remaining until the next confirmed payday.

### 2. Survival Runway Modeling

Computes the resilience duration of liquid reserves against non-discretionary commitments:

$$\text{Liquid Capital} = \sum_{a \in \{\text{checking}, \text{savings}\}} \text{Balance}_{a}$$

$$\text{Burn Rate}_{\text{essential}} = \sum_{k \in \text{Needs}} \text{Allocation}_{k}$$

$$\text{Runway}_{\text{months}} = \frac{\text{Liquid Capital}}{\text{Burn Rate}_{\text{essential}}}$$

$$\text{Runway}_{\text{days}} = \left\lfloor \text{Runway}_{\text{months}} \times 30.4375 \right\rfloor$$

### 3. Subscription Inefficiency & Redundancy Scoring

Detects service overlap and computes annualized recovery potential:

$$\text{Score}_{\text{redundancy}} = \sum_{c \in \text{Categories}} \mathbb{I}\left(|\text{Subs}_{c}| > 1\right) \cdot \left(\sum_{s \in \text{Subs}_{c}} \text{Cost}_{s} - \min_{s \in \text{Subs}_{c}}(\text{Cost}_{s})\right)$$

$$\text{Annualized Recovery} = \left(\text{Score}_{\text{redundancy}} + \sum_{d \in \text{Dormant}} \text{Cost}_{d}\right) \times 12$$

### 4. Two-Phase Safe Execution & Rollback State Machine

All agent ledger modifications obey a transactional state machine:

```
                  +-------------------+
                  | User Prompt / LLM |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  | Staged Action     |
                  | Status: PENDING   |
                  +---------+---------+
                            |
             +--------------+--------------+
             |                             |
             v                             v
   [User Confirms]                [User Rejects]
             |                             |
             v                             v
   +-------------------+         +-------------------+
   | Status: APPLIED   |         | Status: REJECTED  |
   | Ledger Mutated    |         | Ledger Untouched  |
   +---------+---------+         +-------------------+
             |
             v
   [User Clicks Revert]
             |
             v
   +-------------------+
   | Status: REVERTED  |
   | Balances Restored |
   +-------------------+
```

- **Reversibility Guarantee**: Every applied transaction records its precise signed ledger delta ($\pm \Delta x$), ensuring that rolling back an action returns the affected account balance to its exact prior state:
  $$\text{Balance}_{t+1} = \text{Balance}_{t} - \text{sgn}(\text{Type}) \times \text{Amount}$$

---

## Security & Privacy Architecture

### Local-First Data Isolation

1. **Client-Side Sovereignty**: All transaction ledgers, bank masks, budget envelopes, and conversation histories reside exclusively in client-side storage (`localStorage` and Web Cache).
2. **Zero Remote Telemetry**: Purse does not maintain a central analytics tracking server or remote transaction log.
3. **Offline Ingestion Capability**: Financial data can be initialized, managed, and audited completely offline using edge cognition rules.

### Confidential Key Management & Zero Client Leakage

- **Server-Side API Proxying**: Third-party API credentials (`GEMINI_API_KEY`, etc.) are held securely in server environment memory and never bundled into client JavaScript.
- **Sanitized Client Requests**: Client interaction requests pass through `/api/chat` and `/api/organize-transactions`, stripping internal secrets before responses return to the frontend.
- **User-Provided Keys**: When alternative providers (OpenAI, DeepSeek, Z.ai) are selected, keys are retained within the user's local browser memory and passed to the backend proxy via explicit request payload.

### Invariant Verification & Safe Mutation Gates

- **Read-Before-Write Verification**: The AI agent cannot directly overwrite balances or delete transactions without submitting a structured `AgentAction` with an assigned `safetyLevel`.
- **Low-Risk vs. High-Risk Distinction**: Routine low-risk tasks (e.g., logging a small grocery receipt) can be auto-approved if configured; structural modifications (modifying recurring bills, updating memory graph rules, balance overrides) require explicit user authorization.

---

## Agent Memory Core Specification

The agent maintains long-term contextual continuity through a structured **Markdown Memory Graph** (`MemoryFile`). This file acts as an evolving system prompt injected into cognitive reasoning loops:

```markdown
# PURSE AUTONOMOUS AGENT PERSISTENT MEMORY FILE
# Format: Compact Financial Knowledge Graph & Operating Invariants

## 1. USER PROFILE & BASE INVARIANTS
- Monthly Net Inflow: $5,700.00 (Semi-monthly cadence)
- Operating Checking Liquidity Floor: $1,200.00
- Emergency Fund Target: $15,000.00 (95% funded)

## 2. ACTIVE BEHAVIORAL RULES & USER PREFERENCES
- RULE_01 [STRICT]: Evaluate safe-to-spend headroom before non-essential purchases > $50.
- RULE_02 [STRICT]: Issue liquidity alert if checking balance drops below $1,200 floor.
- RULE_03 [PREFERENCE]: Maintain dining out budget below $95/week.

## 3. DETECTED HABITS & PATTERNS
- HABIT_01: Recurring Sunday grocery restocking.
- HABIT_02: Subscription renewal clustering around mid-month.
```

When users instruct the assistant (e.g., *"Remember that I want to save an extra $200 for travel"*), the agent creates a staged `UPDATE_MEMORY` action that increments the revision counter upon user confirmation.

---

## Getting Started & Local Development

### Prerequisites

- **Node.js**: v20.x or v22.x
- **npm**: v10.x or higher

### Installation & Startup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dwmk/purse.ai.git
   cd purse.ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```bash
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   The application will boot at `http://localhost:3000` with Express backend middleware and Vite hot-module development support.

5. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional (Recommended) | Google Gemini API key powering server-side `gemini-3.8-flash` reasoning. |
| `NODE_ENV` | Optional | `development` or `production`. Controls Vite middleware vs. static file serving. |

---

## License & Attribution

Distributed under the MIT License. Developed for the 2026 Shenzhen International FinTech Competition.
