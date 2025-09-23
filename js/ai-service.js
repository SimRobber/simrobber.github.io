// AI Service for Customer Support Chat using Cursor API
class AIService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.cursor.sh/v1';
        this.model = 'gpt-4o-mini'; // Using a cost-effective model
        this.maxTokens = 500;
        this.temperature = 0.7;
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 exchanges
    }

    async init() {
        // Load API key from localStorage
        this.apiKey = localStorage.getItem('cursor_api_key');
        return this.apiKey !== null;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('cursor_api_key', apiKey);
    }

    clearApiKey() {
        this.apiKey = null;
        localStorage.removeItem('cursor_api_key');
        this.conversationHistory = [];
    }

    hasApiKey() {
        return this.apiKey !== null && this.apiKey.trim() !== '';
    }

    // Build system prompt for customer support agent
    buildSystemPrompt(retailer = 'our company') {
        return `You are a professional customer support agent for ${retailer}. Your role is to:

1. Provide helpful, empathetic, and professional assistance to customers
2. Address common issues like refunds, returns, shipping, technical problems, and general inquiries
3. Maintain a friendly and understanding tone, especially when dealing with frustrated customers
4. Ask clarifying questions when needed to better understand the customer's issue
5. Provide specific, actionable solutions when possible
6. Escalate complex issues appropriately by asking for order numbers or account details
7. Keep responses concise but comprehensive (aim for 2-4 sentences)

Guidelines:
- Always be polite and professional
- Show empathy for customer frustrations
- Ask for order numbers when dealing with specific orders
- Offer multiple solutions when possible
- If you don't know something, admit it and offer to find out
- End responses with a question to keep the conversation flowing when appropriate

Current conversation context: ${this.conversationHistory.length > 0 ? 'Ongoing conversation with customer' : 'New conversation starting'}`;
    }

    // Add message to conversation history
    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });
        
        // Keep only the last N exchanges to manage token usage
        if (this.conversationHistory.length > this.maxHistoryLength * 2) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
        }
    }

    // Clear conversation history
    clearHistory() {
        this.conversationHistory = [];
    }

    // Generate AI response using Cursor API
    async generateResponse(userMessage, retailer = 'our company') {
        if (!this.hasApiKey()) {
            throw new Error('API key not configured. Please add your Cursor API key in settings.');
        }

        try {
            // Add user message to history
            this.addToHistory('user', userMessage);

            // Prepare messages for API
            const messages = [
                {
                    role: 'system',
                    content: this.buildSystemPrompt(retailer)
                },
                ...this.conversationHistory
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from AI service');
            }

            const aiResponse = data.choices[0].message.content.trim();
            
            // Add AI response to history
            this.addToHistory('assistant', aiResponse);

            return aiResponse;

        } catch (error) {
            console.error('AI Service Error:', error);
            
            // Return fallback response based on error type
            if (error.message.includes('API key')) {
                throw new Error('Please configure your Cursor API key in settings to use AI chat.');
            } else if (error.message.includes('quota') || error.message.includes('limit')) {
                throw new Error('API quota exceeded. Please check your Cursor API usage limits.');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection and try again.');
            } else {
                throw new Error(`AI service temporarily unavailable: ${error.message}`);
            }
        }
    }

    // Get conversation summary for context
    getConversationSummary() {
        if (this.conversationHistory.length === 0) {
            return 'No conversation history';
        }

        const userMessages = this.conversationHistory
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
            .slice(-3); // Last 3 user messages

        return `Recent topics: ${userMessages.join(', ')}`;
    }

    // Test API connection
    async testConnection() {
        if (!this.hasApiKey()) {
            return { success: false, error: 'No API key configured' };
        }

        try {
            const testResponse = await this.generateResponse('Hello, this is a test message.');
            return { success: true, response: testResponse };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get usage statistics (if available from API)
    async getUsageStats() {
        // This would depend on Cursor API providing usage endpoints
        // For now, return basic info
        return {
            conversationLength: this.conversationHistory.length,
            hasApiKey: this.hasApiKey(),
            lastActivity: this.conversationHistory.length > 0 ? 'Active' : 'None'
        };
    }
}

// Initialize AI service
const aiService = new AIService();
