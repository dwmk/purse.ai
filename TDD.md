# Technical Design Document (TDD)
## System: Purse Personal Finance
**Version:** 2.4.0  
**Status:** Production  
**Target Environment:** AI Studio Edge Runtime & Modern Web Browsers  
**Repository Source:** Imported from `dwmk/purse.ai`

---

## 1. Executive Technical Summary

Purse is a decentralized, client-first autonomous personal finance copilot. The system pairs an intelligent avatar agent (**Fiona**) with an in-browser zero-knowledge financial core. Unlike traditional SaaS finance platforms that store user financial statements on remote multi-tenant databases, Purse operates under an **Edge-First Local-First Architectural Paradigm**:
- All financial balances, ledger transactions, budget envelopes, and agent memory graphs reside in local browser persistence (`localStorage`, `CacheStorage`, and an in-browser semantic Vector Database).
- High-reasoning cognitive tasks utilize the user's **currently selected LLM** (Google Gemini 3.8 Flash, OpenAI GPT-4o, DeepSeek Chat, Zhipu GLM-4, or 100% offline Browser Edge LM via `@huggingface/transformers` / WebGPU / ONNX).
- The agent dynamically decides whether a user message is a general knowledge question (answered directly and conversationally as Fiona) or a transactional operational instruction (affecting accounts, cashflow, budgets, bills, or memory rules).
- Multi-asset account topology natively supports **Cash Accounts** (unbanked, physical cash with no bank specified by default), **Crypto Wallets** (Web3, multi-chain networks, public addresses, self-custody), **Traditional Bank Accounts** (Checking, Savings/Vaults), **Credit Cards**, and **Brokerage/Investment Accounts**.

---

## 2. High-Level Architectural Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT APPLICATION                                  |
|                                                                                       |
|  +---------------------+   +---------------------+   +-----------------------------+  |
|  |   3D Fiona Avatar   |   |   Agent Chat View   |   |  Overview / Ledger / Views  |  |
|  | (Three.js / VRM 3.5)|   |  (Streaming UI/Gate)|   | (Multi-Account / Envelopes) |  |
|  +----------+----------+   +----------+----------+   +--------------+--------------+  |
|             |                         |                             |                 |
|             +-------------------------+-----------------------------+                 |
|                                       |                                               |
|                    +------------------v-------------------+                           |
|                    |      FinanceContext (State Core)     |                           |
|                    | - Accounts (Cash, Crypto, Banks)     |                           |
|                    | - Ledger Transactions & Envelopes    |                           |
|                    | - Safe Execution Proposal Gate       |                           |
|                    | - Rollback Stack & Undo Engine       |                           |
|                    +------------------+-------------------+                           |
|                                       |                                               |
|         +-----------------------------+-----------------------------+                 |
|         |                                                           |                 |
|  +------v-----------------------------+              +--------------v--------------+  |
|  |     Agent Engine & Cognition       |              |   In-Browser Vector RAG     |  |
|  | - Intent Classifier & Edge Planner |              | - Semantic Embeddings       |  |
|  | - System Prompt Construction       |              | - Vector Similarity Chunks  |  |
|  | - Action JSON Extraction & Schema  |              | - Ephemeral Index Storage   |  |
|  +------------------+-----------------+              +-----------------------------+  |
|                     |                                                                 |
+---------------------|-----------------------------------------------------------------+
                      |
                      | HTTP / SSE Stream
                      v
+---------------------------------------------------------------------------------------+
|                              SERVERLESS PROXY LAYER (/api/*)                          |
|                                                                                       |
|  +-------------------------+   +------------------------+   +----------------------+  |
|  |       /api/chat         |   | /api/organize-trans... |   |     /api/health      |  |
|  | (Multi-LLM Dispatcher)  |   | (Statement Structuring)|   |  (Liveness Probe)    |  |
|  +------------+------------+   +-----------+------------+   +----------------------+  |
|               |                            |                                          |
+---------------|----------------------------|------------------------------------------+
                |                            |
                v                            v
+---------------------------------------------------------------------------------------+
|                                EXTERNAL AI PROVIDER APIS                              |
|                                                                                       |
|  +-------------------+  +-------------------+  +-------------------+  +------------+  |
|  | Google GenAI SDK  |  |   OpenAI API      |  |   DeepSeek API    |  |  Z.ai GLM  |  |
|  | (Gemini 3.8 Flash)|  |  (GPT-4o Mini)    |  |  (DeepSeek-Chat)  |  | (GLM-4)    |  |
|  +-------------------+  +-------------------+  +-------------------+  +------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 3. Account Subsystem Architecture

### 3.1 Account Data Model
Defined in `src/types/finance.ts`:
```typescript
export type AccountType = 'cash' | 'crypto' | 'checking' | 'savings' | 'credit' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  institution?: string;      // Optional: empty string or omitted for unbanked cash
  network?: string;          // Optional: e.g. 'Solana', 'Ethereum', 'Bitcoin', 'Polygon'
  walletAddress?: string;    // Optional: e.g. '0x71C...3F8' or '9WzD...xyz'
  accountNumberMask: string; // e.g. 'Cash', 'Web3', '•••• 4412'
  lastUpdated: string;
}
```

### 3.2 Account Type Matrix & Defaults

| Account Type | Default Name | Institution Requirement | Key Identifiers | Typical Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **cash** *(Default)* | Physical Cash Wallet | **None** (`""` or omitted) | `accountNumberMask: "Cash"` | Physical pocket cash, envelope cash, cash tips, petty cash |
| **crypto** | Web3 Crypto Wallet | `Self-Custody` or Wallet name | `network`, `walletAddress` | Ethereum, Solana, Bitcoin, hardware wallets, DeFi pools |
| **checking** | Primary Operating Checking | Bank / Credit Union | Masked account number (`•••• 1234`) | Daily operational expenses, payroll direct deposits |
| **savings** | Emergency Savings Vault | Bank / Financial Institution | Masked account number (`•••• 5678`) | Liquidity reserve, zero-income runway floor |
| **credit** | Rewards Credit Card | Credit Card Issuer | Masked card number (`•••• 9012`) | Accrued revolving debt, credit liabilities |
| **investment** | Stock Brokerage | Brokerage Custodian | Masked account number (`•••• 3456`) | ETFs, equities, index funds, long-term capital |

### 3.3 Default Cash Account Philosophy
To remove banking dependency barriers and ensure privacy:
- The system defaults to an unbanked **Physical Cash Wallet** without requiring bank names, routing numbers, or third-party OAuth links.
- Starting balance defaults to `0.00` or user-defined amounts.
- In financial math, cash is immediately treated as liquid assets alongside checking accounts when calculating the **Safe Daily Spend** and **Zero-Income Runway**.

---

## 4. LLM Cognitive Engine & Fiona Persona

### 4.1 Multi-LLM Orchestration Layer
The cognitive core in `src/services/agentEngine.ts` connects seamlessly to:
1. **Google Gemini (Default: `gemini-3.8-flash`)**: Server-side proxy with client API key passthrough or environment fallback, SSE stream processing with token-by-token UI emission.
2. **OpenAI (`gpt-4o-mini` / `gpt-4o`)**: Full REST streaming and completion proxy.
3. **DeepSeek (`deepseek-chat`)**: High-efficiency reasoning.
4. **Z.ai (`glm-4-flash`)**: Multilingual Asian and international reasoning.
5. **Browser Edge LM (`smolLM2-135M-instruct`)**: In-browser client inference using WebGPU / ONNX with zero external API calls.

### 4.2 Generic Query vs. Transactional Operational Logic
Fiona behaves as a knowledgeable, empathetic, human-like personal secretary:

```
                          [User Input Received]
                                   |
                                   v
             [Build RAG Context from In-Browser VectorDB]
                                   |
                                   v
              [Compile System Prompt with Account Ledger,
               Memory Graph, Liquid Totals, Guidelines]
                                   |
                                   v
                  [Invoke Selected LLM Inference]
                                   |
                                   v
                    Does Output Contain `action_json`?
                       /                       \
                     YES                        NO
                     /                            \
       [Parse Structured Payload]       [Return Direct Conversational Response]
       - ADD_TRANSACTION (income/exp/tx) - General knowledge (universities, history)
       - ADD_ACCOUNT (cash/crypto/bank)  - Personal advice, math, chit-chat
       - ADD_BILL (scheduled payments)   - 100% intact persona without deflection
       - UPDATE_MEMORY (rule invariants)
                     |
       [Render Safe Execution Gate]
       (User confirms before commit)
```

### 4.3 Safe Execution Proposal Gate Schema
When the LLM decides to mutate financial accounts or records, it emits an `action_json` code fence:

```json
```action_json
{
  "action": "ADD_TRANSACTION",
  "type": "expense",
  "amount": 25.50,
  "accountId": "acc_cash_01",
  "category": "Dining & Nightlife",
  "merchant": "Blue Bottle Coffee",
  "note": "Afternoon latte"
}
```
```

For new accounts:
```json
```action_json
{
  "action": "ADD_ACCOUNT",
  "name": "Phantom Solana Wallet",
  "type": "crypto",
  "balance": 350.00,
  "currency": "USD",
  "institution": "Self-Custody",
  "network": "Solana",
  "walletAddress": "9WzD...xyz"
}
```
```

For transfers:
```json
```action_json
{
  "action": "ADD_TRANSACTION",
  "type": "transfer",
  "amount": 100.00,
  "fromAccountId": "acc_chk_01",
  "toAccountId": "acc_cash_01",
  "merchant": "ATM Cash Withdrawal",
  "category": "Other",
  "note": "Withdrew cash for weekly spending"
}
```
```

---

## 5. Security & Edge Resilience

1. **Client-Side Data Isolation**: All ledger entries and credentials reside in the user's browser. Serverless functions proxy AI calls without logging payload data.
2. **Deterministic Fallbacks**: If external API connectivity fails or quota limits are encountered, `agentEngine.ts` automatically executes `runEdgeCognition` heuristics to calculate runway, detect subscription leaks, and format responses.
3. **Rollback & Invariant Stack**: Every applied action enters an undo stack. Transactions can be reverted with one click, restoring balances to their exact prior states.
4. **Edge Vectors**: Vector RAG operates client-side with zero external vector hosting costs.

---

## 6. Verification & Build Health
- Full TypeScript compilation passes with zero warnings.
- Serverless API handlers mount properly in `server.ts` and Vite dev server.
- Build system command `npm run build` compiles clean production bundles.
