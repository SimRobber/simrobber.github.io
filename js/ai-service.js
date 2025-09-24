// AI Service for Customer Support Chat using Free AI API
class AIService {
    constructor() {
        this.apiKey = 'free'; // Always free
        this.conversationHistory = [];
        this.maxHistoryLength = 10; // Keep last 10 exchanges
        this.selectedModel = 'o1'; // Default to O1 for better customer support
    }

    async init() {
        // No API key needed for free service
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

    // Get selected AI model
    getSelectedModel() {
        const modelSelect = document.getElementById('ai-model-select');
        if (modelSelect) {
            this.selectedModel = modelSelect.value;
        }
        return this.selectedModel;
    }

    // Set AI model
    setModel(model) {
        this.selectedModel = model;
        const modelSelect = document.getElementById('ai-model-select');
        if (modelSelect) {
            modelSelect.value = model;
        }
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

    // Wait for Puter.js to be ready
    async waitForPuter() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkPuter = () => {
                attempts++;
                if (typeof puter !== 'undefined' && puter.ai) {
                    console.log('Puter.js is ready');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.log('Puter.js not ready after 5 seconds');
                    reject(new Error('Puter.js not ready'));
                } else {
                    setTimeout(checkPuter, 100);
                }
            };
            
            checkPuter();
        });
    }

    // Generate AI response using Free AI API
    async generateResponse(userMessage, retailer = 'our company') {
        try {
            // Add user message to history
            this.addToHistory('user', userMessage);

            // Try to use a free AI service first
            let aiResponse;
            try {
                aiResponse = await this.callFreeAIService(userMessage, retailer);
            } catch (apiError) {
                console.log('Free AI API unavailable, using intelligent fallback');
                aiResponse = this.generateIntelligentResponse(userMessage, retailer);
            }
            
            // Add AI response to history
            this.addToHistory('assistant', aiResponse);

            return aiResponse;

        } catch (error) {
            console.error('AI Service Error:', error);
            // Fallback to rule-based responses
            return this.getFallbackResponse(userMessage, retailer);
        }
    }

    // Call free AI service using Puter.js
    async callFreeAIService(userMessage, retailer) {
        // Wait for Puter.js to be ready
        await this.waitForPuter();
        
        // Check if Puter.js is loaded
        if (typeof puter === 'undefined' || !puter.ai) {
            console.log('Puter.js not loaded, using fallback');
            throw new Error('Puter.js not available');
        }

        // Use Puter.js for free, unlimited OpenAI API access
        const prompt = `You are a professional customer support agent for ${retailer}. Respond to this customer message in a helpful, empathetic way. Keep responses concise but comprehensive (2-3 sentences). Be professional and offer specific solutions when possible.

Customer: ${userMessage}

Agent:`;

        try {
            console.log('Calling Puter.js with prompt:', prompt);
            // Get the selected model
            const selectedModel = this.getSelectedModel();
            console.log('Using model:', selectedModel);
            
            // Use Puter.js with selected model
            const response = await puter.ai.chat(prompt, { 
                model: selectedModel,
                max_tokens: selectedModel === 'o1' ? 300 : 150
            });

            console.log('Puter.js response:', response);
            if (response && response.message && response.message.content) {
                let aiResponse = response.message.content.trim();
                // Clean up the response
                aiResponse = aiResponse.replace(/^Agent:\s*/, '');
                aiResponse = aiResponse.replace(/^Customer:\s*/, '');
                aiResponse = aiResponse.split('\n')[0];
                if (!aiResponse.endsWith('.') && !aiResponse.endsWith('!') && !aiResponse.endsWith('?')) {
                    aiResponse += '.';
                }
                return aiResponse.trim();
            }
        } catch (error) {
            console.log('Puter.js failed:', error.message || error);
        }

        // Try alternative model if first one fails
        try {
            console.log('Trying alternative model...');
            const response = await puter.ai.chat(prompt, { 
                model: "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 150
            });

            console.log('Puter.js alternative response:', response);
            if (response && response.message && response.message.content) {
                let aiResponse = response.message.content.trim();
                // Clean up the response
                aiResponse = aiResponse.replace(/^Agent:\s*/, '');
                aiResponse = aiResponse.replace(/^Customer:\s*/, '');
                aiResponse = aiResponse.split('\n')[0];
                if (!aiResponse.endsWith('.') && !aiResponse.endsWith('!') && !aiResponse.endsWith('?')) {
                    aiResponse += '.';
                }
                console.log('Processed response:', aiResponse);
                return aiResponse.trim();
            } else {
                console.log('No valid response from alternative model');
            }
        } catch (error) {
            console.log('Puter.js alternative model failed:', error.message || error);
        }

        // If all APIs fail, throw error to use fallback
        throw new Error('All free AI services unavailable');
    }

    // Generate intelligent response using local AI
    generateIntelligentResponse(userMessage, retailer) {
        const message = userMessage.toLowerCase();
        const context = this.analyzeMessageContext(userMessage);
        const sentiment = this.analyzeSentiment(userMessage);
        
        // Handle specific patterns with more intelligent responses
        if (context.isGreeting) {
            return this.getRandomResponse(this.getGreetingResponses(), retailer);
        }
        
        if (context.isFarewell) {
            return this.getRandomResponse(this.getFarewellResponses(), retailer);
        }
        
        if (context.isComplaint && sentiment === 'negative') {
            return this.getRandomResponse(this.getComplaintResponses(), retailer);
        }
        
        if (context.isRefund) {
            return this.getRandomResponse(this.getRefundResponses(), retailer);
        }
        
        if (context.isTechnical) {
            return this.getRandomResponse(this.getTechnicalResponses(), retailer);
        }
        
        if (context.isShipping) {
            return this.getRandomResponse(this.getShippingResponses(), retailer);
        }
        
        if (context.isWarranty) {
            return this.getRandomResponse(this.getWarrantyResponses(), retailer);
        }
        
        if (context.isQuestion) {
            return this.getRandomResponse(this.getQuestionResponses(), retailer);
        }
        
        // Generate contextual response based on conversation history
        return this.generateContextualResponse(userMessage, retailer, context, sentiment);
    }

    // Get random response from pattern array
    getRandomResponse(patterns, retailer) {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        return pattern.replace('{retailer}', retailer);
    }

    // Get greeting responses
    getGreetingResponses() {
        return [
            "Hello! Thank you for contacting {retailer} customer service. How can I assist you today?",
            "Hi there! Welcome to {retailer} support. What can I help you with?",
            "Good day! I'm here to help you with any questions or concerns you may have. How can I assist you?",
            "Hello! I'm here to provide you with excellent customer service. What brings you here today?"
        ];
    }

    // Get farewell responses
    getFarewellResponses() {
        return [
            "Thank you for contacting {retailer}! Have a wonderful day, and please don't hesitate to reach out if you need any further assistance.",
            "It was my pleasure to help you today. If you have any other questions, feel free to contact us anytime!",
            "Thank you for choosing {retailer}! I hope I was able to help, and please don't hesitate to reach out if you need anything else."
        ];
    }

    // Get complaint responses
    getComplaintResponses() {
        return [
            "I'm truly sorry for the frustration you're experiencing. I want to make sure we resolve this for you. Can you tell me more about what happened so I can help make this right?",
            "I understand how upsetting this must be, and I sincerely apologize. Let me work with you to find a solution that addresses your concerns.",
            "I'm sorry that we've let you down. Your satisfaction is important to us, and I'm committed to helping you resolve this issue."
        ];
    }

    // Get refund responses
    getRefundResponses() {
        return [
            "I understand you'd like to process a refund. I'd be happy to help you with that. Could you please provide your order number so I can look up your purchase and assist you further?",
            "I can definitely help you with a refund request. To get started, I'll need your order number so I can locate your purchase in our system.",
            "I'm sorry to hear you need to return an item. Let me help you process that refund. Could you share your order number with me?"
        ];
    }

    // Get technical responses
    getTechnicalResponses() {
        return [
            "I'm sorry to hear about the technical issue you're experiencing. That's definitely not what we want for our customers. Can you tell me more about what's happening so I can help you get this resolved?",
            "I understand you're having technical difficulties. Let me help you troubleshoot this issue. What specific problem are you encountering?",
            "I'm here to help resolve any technical issues you're facing. Could you provide more details about what's not working as expected?"
        ];
    }

    // Get shipping responses
    getShippingResponses() {
        return [
            "I can help you with shipping information. Do you have your order number or tracking number available? I can look up the current status and provide you with updates.",
            "Let me check on your shipping status for you. Could you provide your order number or tracking number so I can give you the most accurate information?",
            "I'd be happy to help you track your package. What's your order number or tracking number?"
        ];
    }

    // Get warranty responses
    getWarrantyResponses() {
        return [
            "I'd be happy to help you with warranty information or service options. What product are you asking about, and what specific issue are you experiencing?",
            "I can assist you with warranty claims and service requests. Could you tell me more about the product and the issue you're having?",
            "Let me help you with your warranty inquiry. What product needs service, and what problems are you experiencing?"
        ];
    }

    // Get question responses
    getQuestionResponses() {
        return [
            "That's a great question! Let me help you with that. Could you provide a bit more detail so I can give you the most accurate information?",
            "I'd be happy to answer that for you. To give you the best possible assistance, could you share some additional context?",
            "Excellent question! I want to make sure I provide you with the most helpful answer. What specific aspect would you like me to focus on?"
        ];
    }

    // Analyze message context
    analyzeMessageContext(message) {
        const lowerMessage = message.toLowerCase();
        
        return {
            isGreeting: /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(message),
            isFarewell: /(bye|goodbye|see you|thanks|thank you|have a good)/i.test(message),
            isComplaint: /(angry|frustrated|upset|disappointed|terrible|awful|horrible|worst)/i.test(message),
            isUrgent: /(urgent|asap|immediately|right now|emergency)/i.test(message),
            isQuestion: message.includes('?') || /(how|what|when|where|why|can you|could you|would you)/i.test(message),
            isRefund: /(refund|return|money back|credit|reimburse)/i.test(message),
            isTechnical: /(broken|not working|defective|damaged|error|issue|problem|bug)/i.test(message),
            isShipping: /(shipping|delivery|tracking|shipped|arrived|package)/i.test(message),
            isWarranty: /(warranty|repair|service|fix|replacement)/i.test(message),
            isOrder: /(order|purchase|bought|billing|charge|payment)/i.test(message),
            isPricing: /(price|cost|expensive|cheap|discount|sale)/i.test(message),
            isCancellation: /(cancel|stop|unsubscribe|remove)/i.test(message)
        };
    }

    // Analyze sentiment
    analyzeSentiment(message) {
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'pleased', 'satisfied'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'frustrated', 'disappointed', 'upset', 'annoyed'];
        
        const lowerMessage = message.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    // Generate contextual response
    generateContextualResponse(userMessage, retailer, context, sentiment) {
        // Use conversation history to generate more intelligent responses
        const recentTopics = this.getRecentTopics();
        
        if (sentiment === 'negative') {
            const empatheticResponses = [
                `I understand your concern and I want to help resolve this for you. Can you provide more details about what you're experiencing?`,
                `I'm sorry to hear about this issue. Let me work with you to find a solution that addresses your needs.`,
                `I appreciate you bringing this to my attention. I'm committed to helping you resolve this matter.`
            ];
            return empatheticResponses[Math.floor(Math.random() * empatheticResponses.length)];
        }
        
        if (sentiment === 'positive') {
            const positiveResponses = [
                `I'm glad to hear that! I'm here to help you with whatever you need. What can I assist you with today?`,
                `That's wonderful! I'm happy to help you further. Is there anything else I can do for you?`,
                `Great! I'm here to provide you with the best possible service. What would you like to know?`
            ];
            return positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
        }
        
        // Neutral default responses with context awareness
        const contextualResponses = [
            `I understand your request. Let me help you with that. Could you provide a bit more detail so I can assist you better?`,
            `I want to make sure I understand your needs correctly. Can you tell me more about what you're looking for?`,
            `I'm here to help you resolve this. What additional information can you share so I can provide the best assistance?`,
            `I appreciate you reaching out. Let me see how I can help you with this matter.`,
            `I understand this is important to you. Let me work on finding the best solution for your situation.`
        ];
        
        return contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
    }

    // Get recent conversation topics
    getRecentTopics() {
        const userMessages = this.conversationHistory
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content)
            .slice(-3);
        return userMessages;
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
            // Wait for Puter.js to be ready
            await this.waitForPuter();
            
            // Test Puter.js directly
            console.log('Testing Puter.js connection...');
            const selectedModel = this.getSelectedModel();
            console.log('Testing with model:', selectedModel);
            const testResponse = await puter.ai.chat('Hello, this is a test message.', { 
                model: selectedModel,
                max_tokens: selectedModel === 'o1' ? 100 : 50
            });

            console.log('Test response:', testResponse);
            if (testResponse && testResponse.message && testResponse.message.content) {
                console.log('Test successful, content:', testResponse.message.content);
                return { success: true, response: testResponse.message.content };
            } else {
                console.log('No valid response structure');
                return { success: false, error: 'No response from Puter.js' };
            }
        } catch (error) {
            console.error('Test connection error:', error);
            return { success: false, error: error.message || error };
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