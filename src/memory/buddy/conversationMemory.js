/**
 * Travel AI Buddy — Step 7: Short-Term Conversation & Topic Memory
 * 
 * Tracks recent conversation topics, queries, and decisions with automatic
 * FIFO pruning to keep AI prompts lightweight and focused.
 */
(function (global) {
    const _memoryStore = (typeof global.memoryStore !== 'undefined')
        ? global.memoryStore
        : require('./memoryStore').memoryStore;

    class ConversationMemory {
        constructor(store = _memoryStore, maxTurns = 8) {
            this.store = store;
            this.maxTurns = maxTurns;
            this.history = this.loadHistory();
            this.lastTopic = 'general_travel';
        }

        loadHistory() {
            return this.store.get('conversation_history', []);
        }

        /**
         * Record a conversation turn
         * @param {string} userMessage 
         * @param {string} buddyResponse 
         * @param {string} [intent='general'] 
         */
        recordTurn(userMessage, buddyResponse, intent = 'general') {
            this.history.push({
                user: String(userMessage || '').trim(),
                buddy: String(buddyResponse || '').trim(),
                intent: intent,
                timestamp: Date.now()
            });

            // FIFO trimming
            if (this.history.length > this.maxTurns) {
                this.history = this.history.slice(-this.maxTurns);
            }

            this.lastTopic = intent;
            this.store.set('conversation_history', this.history);
        }

        getRecentTurns(count = 4) {
            return this.history.slice(-count);
        }

        getLastTopic() {
            return this.lastTopic;
        }

        clear() {
            this.history = [];
            this.lastTopic = 'general_travel';
            this.store.remove('conversation_history');
        }
    }

    const conversationMemory = new ConversationMemory();

    global.ConversationMemory = ConversationMemory;
    global.conversationMemory = conversationMemory;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ConversationMemory, conversationMemory };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
