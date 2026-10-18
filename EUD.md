# End-User Documentation (EUD)
## User Guide: Purse Autonomous Personal Finance
**Release:** 2.4.0  
**Companion Character:** Fiona  
**Applicability:** Web & Progressive Web App (PWA)

---

## 1. Welcome to Purse

**Purse** is your private, intelligent financial copilot and digital ledger. With Fiona—your friendly, knowledgeable financial secretary—you can manage your money, budget envelopes, cash flow, and crypto wallets without surrendering your private bank credentials to third-party cloud servers.

Everything you log in Purse stays on your device in your browser's private local storage.

---

## 2. Getting Started & Account Setup

When you first open Purse, you can choose between two easy setup options:

### Option A: Start from Scratch (Default Cash Account)
1. Click **Start from Scratch** in the initialization screen.
2. By default, Purse configures a **Physical Cash Wallet** (`type: cash`) that requires **no bank or institution**.
3. Enter your initial starting cash balance (e.g. `$250.00`).
4. Click **Create CASH Account & Enter Purse**.

### Option B: Add Crypto Wallets & Bank Accounts
You can add unlimited accounts across multiple asset classes:
- **Cash Accounts**: Unbanked physical cash, envelope cash, cash pockets, petty cash.
- **Crypto Wallets**: Web3 digital wallets (e.g. Phantom on Solana, MetaMask on Ethereum, Bitcoin cold storage). Specify the **Network** (e.g., *Solana*, *Ethereum*, *Bitcoin*) and optional public address.
- **Checking Accounts**: High-volume operational bank accounts for payroll and debit cards.
- **Savings Vaults**: Emergency cash reserves and high-yield savings (HYSA).
- **Credit Cards**: Revolving credit lines and rewards cards.
- **Investment Accounts**: Brokerages and equity holdings.

> **Tip:** You can create new accounts anytime from the **Overview** dashboard by clicking **+ Add Account** on the account selector strip, or by simply asking Fiona in chat!

### Option C: Import Statements with AI
1. Select **Import with AI** in the ledger setup modal.
2. Drag and drop a bank CSV export, statement file, or paste raw transaction text.
3. Choose your AI reasoning engine (e.g. Gemini 3.8 Flash).
4. Click **Analyze & Organize**. The AI will automatically normalize merchants, assign categories, and separate income from expenses.

---

## 3. Chatting with Fiona

Fiona is not a rigid automated phone-tree robot. She is a sharp, conversational secretary powered by state-of-the-art language models.

### Asking General Knowledge & Advice
Fiona knows about far more than just money! You can ask her any generic question, and she will answer thoroughly and conversationally:
- *"Tell me what you know about BRAC University."*
- *"What is the difference between an index fund and a mutual fund?"*
- *"Can you explain how compound interest works with a quick example?"*
- *"How is the weather today?"* or *"Good morning Fiona!"*

She will never deflect or force the conversation back to your bank balance when you ask a general question.

### Operating on Your Accounts & Ledger
When you want to record money, transfer funds, or track an expense, tell Fiona in natural language:
- **Logging Cash Spending:**
  - *"I spent $14 in cash at Joe's Diner for lunch."*
  - *"I found $40 in cash in my coat pocket, add it to my cash wallet."*
- **Logging Crypto Transactions:**
  - *"Record a 50 USDC purchase on Solana for digital tools."*
- **Creating a New Account:**
  - *"Add a Phantom crypto wallet on Solana with a $350 balance."*
  - *"Create a Vacation Cash Envelope with $200."*
- **Inter-Account Transfers:**
  - *"Transfer $100 from my checking account to my cash wallet for weekend spending."*
- **Budgeting Questions:**
  - *"Can I afford a $120 dinner tonight?"*
  - *"What is my zero-income cash runway right now?"*

### The Safe Execution Proposal Gate
To protect you from unintended modifications, **Fiona never mutates your ledger behind your back**:
1. When Fiona recognizes an instruction to add a transaction, create an account, or schedule a bill, she generates a visual **Safe Execution Proposal Card**.
2. The card shows the proposed account, amount, merchant, and category.
3. You review the card and click **Approve & Execute** to commit the entry, or **Decline** to cancel.

---

## 4. Dashboard & Navigation

### 1. Overview Dashboard
- **Luxury Account Card**: Switch between your Cash, Crypto, Checking, and Savings accounts with one tap. Displays available balance, institution, network, and mask.
- **Safe To Spend Today**: Real-time daily discretionary allowance calculated after all fixed housing, bills, and emergency savings are reserved.
- **Emergency Cash Runway**: The number of months you could survive with zero incoming revenue, pooling all liquid cash and checking accounts.
- **Agent Mutation Stack (Safe Rollback)**: Made a mistake? Click **Undo** next to any recently applied action to instantly revert it.

### 2. General Ledger
- High-density transaction table displaying date, payee, account, category, notes, and amount.
- Filter records instantly by **Account** (e.g. view only your *Cash Wallet* or *Crypto Wallet*), **Category**, or **Type** (*Expenses*, *Income*, *Transfers*).
- Export your entire ledger to standard CSV anytime, or import past logs.

### 3. Envelopes & Budgets
- View allocated monthly envelopes across Needs, Wants, and Savings.
- Real-time progress bars highlight budget health and warn when spending nears limits.

### 4. Scheduled Bills
- Track recurring software subscriptions, utilities, and rent.
- Alerts highlight upcoming due dates and identify potential duplicate subscription leaks.

### 5. Memory Core
- Fiona's long-term operational guidelines and financial invariants.
- Rules like *"Always maintain at least $1,000 checking balance"* or *"Never invest in illiquid assets without 3 months emergency runway"* are stored here and respected during future chats.

---

## 5. Voice Interaction & 3D Avatar

- **Speaking to Fiona**: Click the microphone button in the chat input bar to speak. Purse uses the browser's native Web Speech API for low-latency recognition.
- **Listening Aloud**: Click **Listen aloud** below any of Fiona's replies to hear her speak with natural text-to-speech.
- **3D Mode**: Click the **3D** toggle in the top bar to expand Fiona into a waist-height 3D companion with animated gestures and mouth lip-sync.

---

## 6. AI Models & Privacy Settings

Open the **Settings** view (or click the model pill at the top of Chat) to configure your AI reasoning engine:
- **Google Gemini (Default: `gemini-3.8-flash`)**: High-speed, high-reasoning multimodal engine.
- **OpenAI (`gpt-4o-mini`)**: OpenAI's flagship conversational model.
- **DeepSeek (`deepseek-chat`)**: Cost-effective reasoning.
- **Z.ai (`glm-4-flash`)**: Fast multilingual engine.
- **Browser Edge LM (`smolLM2-135M-instruct`)**: 100% offline, local browser inference running via WebGPU / ONNX with zero external API calls.

All API keys are saved strictly in your local device storage and are never uploaded to any remote analytics service.

---

## 7. Frequently Asked Questions (FAQ)

**Q: Do I need a bank account to use Purse?**  
A: No! Purse defaults to a Physical Cash Wallet that requires no bank, credit union, or financial institution. You can use Purse exclusively for cash, crypto, or traditional banking.

**Q: Where is my financial data stored?**  
A: On your device. Purse stores your accounts, transactions, bills, and vector memory inside your browser's persistent local storage and cache storage.

**Q: Can I undo a transaction if the AI made an error?**  
A: Yes! Fiona will always prompt you before committing any transaction. Additionally, any committed transaction can be undone with a single click using the **Undo** button on the Overview dashboard.
