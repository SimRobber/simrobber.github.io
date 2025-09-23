// AI Service for Customer Support Chat using Hugging Face Free API
class AIService {
    constructor() {
        this.apiKey = null; // Not needed for free tier
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.model = 'microsoft/DialoGPT-medium'; // Free conversational AI model
        this.maxTokens = 500;
        this.temperature = 0.7;
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 exchanges
    }

    async init() {
        // No API key needed for free Hugging Face API
        this.apiKey = 'free';
        return true;
    }

    setApiKey(apiKey) {
        // No API key needed for free tier
        this.apiKey = 'free';
    }

    clearApiKey() {
        // No API key to clear for free tier
        this.apiKey = 'free';
        this.conversationHistory = [];
    }

    hasApiKey() {
        // Always available for free tier
        return true;
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

    // Generate AI response using Hugging Face Free API
    async generateResponse(userMessage, retailer = 'our company') {
        try {
            // Add user message to history
            this.addToHistory('user', userMessage);

            // Build context from conversation history
            const context = this.buildConversationContext();
            const prompt = `${this.buildSystemPrompt(retailer)}\n\n${context}Customer: ${userMessage}\nAgent:`;

            const response = await fetch(`${this.baseUrl}/${this.model}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: this.maxTokens,
                        temperature: this.temperature,
                        return_full_text: false,
                        do_sample: true
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data || !Array.isArray(data) || !data[0] || !data[0].generated_text) {
                throw new Error('Invalid response format from AI service');
            }

            let aiResponse = data[0].generated_text.trim();
            
            // Clean up the response
            aiResponse = this.cleanResponse(aiResponse);
            
            // Add AI response to history
            this.addToHistory('assistant', aiResponse);

            return aiResponse;

        } catch (error) {
            console.error('AI Service Error:', error);
            
            // Return fallback response based on error type
            if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection and try again.');
            } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else {
                // Fallback to rule-based responses
                return this.getFallbackResponse(userMessage, retailer);
            }
        }
    }

    // Build conversation context from history
    buildConversationContext() {
        if (this.conversationHistory.length === 0) {
            return '';
        }

        let context = '';
        for (let i = Math.max(0, this.conversationHistory.length - 6); i < this.conversationHistory.length; i++) {
            const msg = this.conversationHistory[i];
            const role = msg.role === 'user' ? 'Customer' : 'Agent';
            context += `${role}: ${msg.content}\n`;
        }
        return context;
    }

    // Clean up AI response
    cleanResponse(response) {
        // Remove any remaining prompt text
        response = response.replace(/^Agent:\s*/, '');
        response = response.replace(/^Customer:\s*/, '');
        
        // Remove any incomplete sentences at the end
        response = response.replace(/\n.*$/, '');
        
        // Ensure it ends properly
        if (!response.endsWith('.') && !response.endsWith('!') && !response.endsWith('?')) {
            response += '.';
        }
        
        return response.trim();
    }

    // Fallback response system
    getFallbackResponse(userMessage, retailer) {
        const message = userMessage.toLowerCase();
        
        // Enhanced fallback responses with more intelligence
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return `Hello! Thank you for contacting ${retailer} customer service. How can I assist you today?`;
        }
        
        if (message.includes('refund') || message.includes('return')) {
            return `I understand you'd like to process a refund. I'd be happy to help you with that. Could you please provide your order number so I can look up your purchase?`;
        }
        
        if (message.includes('broken') || message.includes('defective') || message.includes('not working') || message.includes('damaged')) {
            return `I'm sorry to hear about the issue with your product. That's definitely not what we want for our customers. Can you tell me more about what's happening so I can help you get this resolved?`;
        }
        
        if (message.includes('shipping') || message.includes('delivery') || message.includes('tracking')) {
            return `I can help you with shipping information. Do you have your order number or tracking number available? I can look up the current status for you.`;
        }
        
        if (message.includes('warranty') || message.includes('repair') || message.includes('service')) {
            return `I'd be happy to help you with warranty information or service options. What product are you asking about, and what specific issue are you experiencing?`;
        }
        
        if (message.includes('order') || message.includes('purchase') || message.includes('bought')) {
            return `I can help you with your order. Could you provide your order number so I can look up the details and assist you better?`;
        }
        
        if (message.includes('price') || message.includes('cost') || message.includes('expensive') || message.includes('cheap')) {
            return `I understand you have questions about pricing. Let me help you with that. What specific product or service are you asking about?`;
        }
        
        if (message.includes('cancel') || message.includes('stop') || message.includes('unsubscribe')) {
            return `I can help you with cancellation requests. Could you tell me what you'd like to cancel and provide your account information so I can assist you?`;
        }
        
        if (message.includes('complaint') || message.includes('angry') || message.includes('frustrated') || message.includes('upset')) {
            return `I'm truly sorry for any frustration you're experiencing. I want to make sure we resolve this for you. Can you tell me more about what happened so I can help make this right?`;
        }
        
        if (message.includes('thank') || message.includes('thanks')) {
            return `You're very welcome! I'm glad I could help. Is there anything else I can assist you with today?`;
        }
        
        if (message.includes('bye') || message.includes('goodbye') || message.includes('see you')) {
            return `Thank you for contacting ${retailer}! Have a wonderful day, and please don't hesitate to reach out if you need any further assistance.`;
        }
        
        // Enhanced default responses with more variety and intelligence
        const responses = [
            `I understand your concern. Let me help you with that. Could you provide a bit more detail so I can assist you better?`,
            `I want to make sure I understand your request correctly. Can you tell me more about what you need help with?`,
            `I'm here to help you resolve this issue. What additional information can you share so I can provide the best assistance?`,
            `I appreciate you bringing this to my attention. Let me see how I can help you with this matter.`,
            `I understand this is important to you. Let me work on finding the best solution for your situation.`,
            `I'm committed to helping you resolve this. Could you provide more details about what you're experiencing?`,
            `I want to make sure I give you the best possible assistance. What specific information can you share?`,
            `I'm here to help you with whatever you need. Can you tell me more about your situation?`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
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
