/**
 * In-Browser Vector Database & RAG Retrieval Engine for Purse.
 * 
 * Provides local semantic embeddings, persistent vector indexing, and cosine-similarity
 * retrieval for transactions, recurring bills, budget envelopes, operational invariants,
 * and conversation memory—entirely stored in browser persistent storage.
 */

export interface VectorDocument {
  id: string;
  text: string;
  metadata: {
    type: 'transaction' | 'bill' | 'budget' | 'rule' | 'habit' | 'goal' | 'account' | 'conversation';
    title?: string;
    date?: string;
    amount?: number;
    category?: string;
    [key: string]: any;
  };
  vector: number[];
}

export interface RetrievalResult {
  document: VectorDocument;
  score: number;
}

const STORAGE_KEY = 'purse_vector_db_v1';
const VECTOR_DIM = 64; // High-efficiency compact embedding dimension for instant browser cosine search

/**
 * Deterministic, subword-hashing embedding vectorizer.
 * Generates continuous L2-normalized 64-dimensional feature vectors from text,
 * capturing semantic n-grams, financial vocabulary, numbers, and categories.
 */
export function generateLocalEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const vector = new Float32Array(VECTOR_DIM);

  if (!normalized) return Array.from(vector);

  // Financial keyword semantic clusters mapping to dedicated vector regions
  const semanticWeights: Record<string, number[]> = {
    income: [0, 1, 2],
    salary: [0, 1, 2],
    deposit: [0, 1, 3],
    food: [4, 5, 6],
    groceries: [4, 5, 7],
    dining: [8, 9, 10],
    restaurant: [8, 9, 11],
    coffee: [8, 10, 12],
    housing: [13, 14, 15],
    rent: [13, 14, 16],
    mortgage: [13, 14, 17],
    utilities: [18, 19, 20],
    internet: [18, 19, 21],
    electric: [18, 20, 22],
    bill: [23, 24, 25],
    subscription: [26, 27, 28],
    streaming: [26, 27, 29],
    netflix: [26, 28, 30],
    software: [26, 29, 31],
    savings: [32, 33, 34],
    emergency: [32, 34, 35],
    invest: [36, 37, 38],
    vanguard: [36, 38, 39],
    health: [40, 41, 42],
    gym: [40, 42, 43],
    transportation: [44, 45, 46],
    uber: [44, 46, 47],
    fuel: [44, 45, 48],
    gas: [44, 45, 48],
    rule: [49, 50, 51],
    limit: [49, 51, 52],
    budget: [53, 54, 55],
    headroom: [53, 55, 56],
    safe: [57, 58, 59],
    runway: [60, 61, 62]
  };

  // 1. Semantic keyword weighting
  for (const [kw, indices] of Object.entries(semanticWeights)) {
    if (normalized.includes(kw)) {
      indices.forEach(idx => {
        vector[idx] += 1.8;
      });
    }
  }

  // 2. Character trigram hashing for out-of-vocabulary and merchant names
  const words = normalized.replace(/[^a-z0-9$.,\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.slice(i, i + 3);
        let hash = 0;
        for (let j = 0; j < trigram.length; j++) {
          hash = (hash << 5) - hash + trigram.charCodeAt(j);
          hash |= 0;
        }
        const bucket = Math.abs(hash) % VECTOR_DIM;
        vector[bucket] += 0.45;
      }
    } else {
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
      }
      vector[Math.abs(hash) % VECTOR_DIM] += 0.35;
    }
  }

  // 3. Dollar value awareness
  const amountMatch = normalized.match(/\$?\b([0-9]+(?:\.[0-9]{2})?)\b/);
  if (amountMatch) {
    const val = parseFloat(amountMatch[1]);
    const magnitudeBucket = Math.min(VECTOR_DIM - 1, 55 + Math.floor(Math.log10(Math.max(1, val))));
    vector[magnitudeBucket] += 0.8;
  }

  // 4. L2 Normalization
  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Cosine similarity between two unit-normalized vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

class BrowserVectorDatabase {
  private documents: Map<string, VectorDocument> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.documents.clear();
          for (const doc of parsed) {
            if (doc.id && doc.vector) {
              this.documents.set(doc.id, doc);
            }
          }
        }
      }
      this.isLoaded = true;
    } catch (e) {
      console.warn('[VectorDB] Storage load notice:', e);
      this.documents.clear();
      this.isLoaded = true;
    }
  }

  public saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const docsArray = Array.from(this.documents.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docsArray));
    } catch (e) {
      console.warn('[VectorDB] Storage save notice:', e);
    }
  }

  public upsert(doc: Omit<VectorDocument, 'vector'> & { vector?: number[] }) {
    const vector = doc.vector || generateLocalEmbedding(doc.text);
    const fullDoc: VectorDocument = {
      ...doc,
      vector
    };
    this.documents.set(doc.id, fullDoc);
    this.saveToStorage();
  }

  public upsertBatch(docs: Array<Omit<VectorDocument, 'vector'> & { vector?: number[] }>) {
    for (const doc of docs) {
      const vector = doc.vector || generateLocalEmbedding(doc.text);
      this.documents.set(doc.id, { ...doc, vector });
    }
    this.saveToStorage();
  }

  public delete(id: string) {
    this.documents.delete(id);
    this.saveToStorage();
  }

  public count(): number {
    return this.documents.size;
  }

  /**
   * Semantic vector similarity search
   */
  public search(query: string, topK = 5, filterType?: string): RetrievalResult[] {
    if (!this.isLoaded) this.loadFromStorage();
    if (this.documents.size === 0) return [];

    const queryVec = generateLocalEmbedding(query);
    const results: RetrievalResult[] = [];

    for (const doc of this.documents.values()) {
      if (filterType && doc.metadata.type !== filterType) {
        continue;
      }
      const score = cosineSimilarity(queryVec, doc.vector);
      results.push({ document: doc, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Sync and index all ledger items into the local browser vector database
   */
  public syncLedgerContext(data: {
    accounts?: any[];
    transactions?: any[];
    bills?: any[];
    budgets?: any[];
    memory?: any;
  }) {
    const batch: Array<Omit<VectorDocument, 'vector'>> = [];

    // 1. Index Accounts
    if (data.accounts) {
      for (const acc of data.accounts) {
        batch.push({
          id: `vec_acc_${acc.id}`,
          text: `Account: ${acc.name} (${acc.type}). Current balance: $${acc.balance.toFixed(2)} ${acc.currency}. Mask: ${acc.accountNumberMask}.`,
          metadata: {
            type: 'account',
            title: acc.name,
            amount: acc.balance,
            category: acc.type
          }
        });
      }
    }

    // 2. Index Budget Envelopes
    if (data.budgets) {
      for (const b of data.budgets) {
        batch.push({
          id: `vec_budget_${b.id}`,
          text: `Budget Envelope: ${b.category} (${b.type} tier). Monthly allocated quota: $${b.allocated.toFixed(2)}.`,
          metadata: {
            type: 'budget',
            category: b.category,
            amount: b.allocated
          }
        });
      }
    }

    // 3. Index Bills & Recurring Invariants
    if (data.bills) {
      for (const bill of data.bills) {
        batch.push({
          id: `vec_bill_${bill.id}`,
          text: `Recurring Bill: ${bill.name} for $${bill.amount.toFixed(2)} (${bill.category}), due on ${bill.dueDate}. Autopay is ${bill.isAutopay ? 'active' : 'manual'}.${bill.potentialSavingsNotice ? ` Notice: ${bill.potentialSavingsNotice}` : ''}`,
          metadata: {
            type: 'bill',
            title: bill.name,
            amount: bill.amount,
            category: bill.category,
            dueDate: bill.dueDate
          }
        });
      }
    }

    // 4. Index Recent Transactions
    if (data.transactions) {
      for (const tx of data.transactions.slice(0, 30)) {
        batch.push({
          id: `vec_tx_${tx.id}`,
          text: `Transaction on ${tx.date}: ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)} at ${tx.merchant || 'Unknown'} (${tx.category}). ${tx.note || ''}`,
          metadata: {
            type: 'transaction',
            date: tx.date,
            amount: tx.amount,
            category: tx.category,
            merchant: tx.merchant
          }
        });
      }
    }

    // 5. Index Memory Invariants & Lifestyle Preferences
    if (data.memory?.rules) {
      data.memory.rules.forEach((rule: string, i: number) => {
        batch.push({
          id: `vec_rule_${i}`,
          text: `User Invariant & Operating Rule: ${rule}`,
          metadata: {
            type: 'rule',
            rule
          }
        });
      });
    }

    if (data.memory?.habits) {
      data.memory.habits.forEach((habit: string, i: number) => {
        batch.push({
          id: `vec_habit_${i}`,
          text: `Detected Habit & Pattern: ${habit}`,
          metadata: {
            type: 'habit',
            habit
          }
        });
      });
    }

    if (batch.length > 0) {
      this.upsertBatch(batch);
    }
  }

  /**
   * Builds an enriched RAG context string from the vector database for a given user query
   */
  public buildRagContext(query: string, limit = 4): string {
    const hits = this.search(query, limit);
    if (hits.length === 0) return '';

    const lines = hits.map((hit, idx) => `[Context Chunk ${idx + 1}] (${hit.document.metadata.type}): ${hit.document.text}`);
    return `RELEVANT MEMORY & LEDGER CHUNKS (Retrieved via Browser Vector DB):\n${lines.join('\n')}`;
  }
}

export const vectorDb = new BrowserVectorDatabase();
