document.addEventListener('DOMContentLoaded', function() {
    
    const chatbotTrigger = document.getElementById('chatbotTrigger');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotMessages = document.getElementById('chatbotMessages');
    
    if (!chatbotTrigger) return;
    
    let isOpen = false;
    let isTyping = false;
    
    // API Key storage (for future AI integration)
    let apiKey = localStorage.getItem('cedarville_chatbot_api_key') || '';
    
    // Get FAQ responses from content module or use defaults
    function getFaqResponses() {
        if (typeof CedarvilleContent !== 'undefined') {
            return CedarvilleContent.getChatbotResponses();
        }
        // Fallback if content module not loaded
        return [];
    }
    
    function toggleChatbot() {
        isOpen = !isOpen;
        if (isOpen) {
            chatbotWindow.classList.add('active');
            chatbotTrigger.style.display = 'none';
            chatbotInput.focus();
        } else {
            chatbotWindow.classList.remove('active');
            chatbotTrigger.style.display = 'flex';
        }
    }
    
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${isUser ? 'user-message' : 'bot-message'}`;
        
        const time = new Date().toLocaleTimeString('en-NG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-bubble">
                <p>${message.replace(/\n/g, '<br>')}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chatbot-message bot-message typing-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        return typingDiv;
    }
    
    function findBestMatch(userMessage) {
        const message = userMessage.toLowerCase();
        const faqResponses = getFaqResponses();
        
        // Try to find a matching FAQ
        for (const faq of faqResponses) {
            const keywords = faq.keywords || [];
            for (const keyword of keywords) {
                if (message.includes(keyword.toLowerCase())) {
                    return faq.response;
                }
            }
        }
        
        // Default response if no match found
        return "I'm not sure how to answer that. You can ask me about:\n\n• School hours and schedule\n• Admissions and enrollment\n• Programs (Creche, Nursery, Kindergarten)\n• Fees and payment\n• Facilities and activities\n• Lunch and meals\n• Transportation\n• Contact information\n\nWhat would you like to know?";
    }
    
    function getBotResponse(userMessage) {
        return findBestMatch(userMessage);
    }
    
    function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message || isTyping) return;
        
        addMessage(message, true);
        chatbotInput.value = '';
        
        isTyping = true;
        const typingIndicator = showTypingIndicator();
        
        setTimeout(() => {
            typingIndicator.remove();
            const response = getBotResponse(message);
            addMessage(response);
            isTyping = false;
            
            const badge = chatbotTrigger.querySelector('.chatbot-badge');
            if (badge) {
                badge.textContent = '1';
            }
        }, 1000);
    }
    
    // API Key functions (for future AI integration)
    window.setChatbotApiKey = function(key) {
        apiKey = key;
        localStorage.setItem('cedarville_chatbot_api_key', key);
        console.log('API key saved successfully');
    };
    
    window.getChatbotApiKey = function() {
        return apiKey;
    };
    
    chatbotTrigger.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', toggleChatbot);
    chatbotSend.addEventListener('click', sendMessage);
    
    chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    const chatbotQuickReplies = document.getElementById('chatbotQuickReplies');
    if (chatbotQuickReplies) {
        const quickReplyButtons = chatbotQuickReplies.querySelectorAll('.quick-reply');
        
        quickReplyButtons.forEach(button => {
            button.addEventListener('click', function() {
                chatbotInput.value = this.textContent.trim();
                sendMessage();
            });
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            toggleChatbot();
        }
    });
    
    setTimeout(() => {
        const badge = chatbotTrigger.querySelector('.chatbot-badge');
        if (badge) {
            badge.textContent = '1';
        }
    }, 3000);
    
    console.log('Cedarville Schools - Chatbot JS loaded successfully');
});
