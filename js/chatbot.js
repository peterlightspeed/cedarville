/* ============================================================
   Cedarville Schools - Rule-Based Chatbot
   NO API or external services. Loads its knowledge base from
   /data/chatbot-responses.json so non-developers can edit
   responses without touching this file. See README.md.
   ============================================================ */

let chatbotData = null;
let lastFallbackIndex = -1;

async function loadChatbotData() {
  // Same source resolution as cms.js: API first when configured, static folder
  // as the safety net. Both serve an identical JSON shape.
  const apiBase = (window.CEDARVILLE_DATA_BASE
    || document.documentElement.getAttribute('data-api-base')
    || '').replace(/\/$/, '');
  const sources = apiBase ? [`${apiBase}/chatbot-responses.json`, 'data/chatbot-responses.json']
                          : ['data/chatbot-responses.json'];

  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      chatbotData = await res.json();
      return;
    } catch (err) {
      console.warn('Chatbot: could not load ' + url + ' (' + err.message + ')');
    }
  }

  console.warn('Chatbot: using minimal built-in fallback.');
  chatbotData = {
    responses: {
      greeting: "Hello! Welcome to Cedarville Private Schools. How can I help you today?",
      fallback: "I'm having trouble reaching my knowledge base right now. Please call us at +234 813 745 1764."
    },
    keywords: { greeting: ["hello", "hi", "hey"] }
  };
}

function pickResponse(value) {
  if (Array.isArray(value)) {
    // Avoid repeating the exact same line twice in a row for topics with variants
    let idx = Math.floor(Math.random() * value.length);
    if (value.length > 1 && idx === lastFallbackIndex) idx = (idx + 1) % value.length;
    lastFallbackIndex = idx;
    return value[idx];
  }
  return value;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match on whole words/phrases instead of raw substrings. The old version used
// input.includes(word), so "hi" matched "this"/"which", "fee" matched "feedback",
// and the first category in the file always won regardless of specificity.
function matchResponse(userInput) {
  const input = userInput.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!chatbotData) return "One moment, still loading...";

  let bestCategory = null;
  let bestScore = 0;

  for (const [category, words] of Object.entries(chatbotData.keywords)) {
    for (const word of words) {
      const phrase = word.toLowerCase().trim();
      if (!phrase) continue;
      // \b works for alphanumeric edges; phrases are matched with flexible whitespace.
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase).replace(/\\ /g, '\\s+')}([^a-z0-9]|$)`, 'i');
      if (pattern.test(input)) {
        // Longer, more specific keywords win ("school fees" over "fee",
        // "new branch" over "new school").
        const score = phrase.length;
        if (score > bestScore) {
          bestScore = score;
          bestCategory = category;
        }
      }
    }
  }

  if (bestCategory) {
    return pickResponse(chatbotData.responses[bestCategory] || chatbotData.responses.fallback);
  }
  return pickResponse(chatbotData.responses.fallback);
}

function appendMessage(text, sender) {
  const messages = document.getElementById('chatbot-messages');
  if (!messages) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${sender}`;
  // Preserve intentional line breaks in bot responses (e.g. numbered lists)
  text.split('\n').forEach((line, i) => {
    if (i > 0) div.appendChild(document.createElement('br'));
    div.appendChild(document.createTextNode(line));
  });
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showTypingIndicator() {
  const messages = document.getElementById('chatbot-messages');
  if (!messages) return null;
  const div = document.createElement('div');
  div.className = 'chat-msg bot chat-typing';
  div.setAttribute('aria-label', 'Cedarville assistant is typing');
  div.innerHTML = '<span></span><span></span><span></span>';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function sendMessage(text) {
  const input = document.getElementById('chatbot-input-field');
  const msg = text || (input ? input.value.trim() : '');
  if (!msg) return;

  appendMessage(msg, 'user');
  if (input) input.value = '';

  if (!chatbotData) await loadChatbotData();

  const typingEl = showTypingIndicator();
  const delay = 350 + Math.random() * 350;
  setTimeout(() => {
    if (typingEl) typingEl.remove();
    appendMessage(matchResponse(msg), 'bot');
  }, delay);
}

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('chatbot-btn');
  const win = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const inputField = document.getElementById('chatbot-input-field');
  const quickBtns = document.querySelectorAll('.quick-btn');
  const messagesEl = document.getElementById('chatbot-messages');

  if (messagesEl) messagesEl.setAttribute('aria-live', 'polite');

  loadChatbotData();

  if (!btn) return;

  btn.addEventListener('click', async function () {
    win.classList.toggle('open');
    if (win.classList.contains('open') && messagesEl && messagesEl.children.length === 0) {
      if (!chatbotData) await loadChatbotData();
      setTimeout(() => appendMessage(pickResponse(chatbotData.responses.greeting), 'bot'), 200);
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', () => win.classList.remove('open'));
  if (sendBtn) sendBtn.addEventListener('click', () => sendMessage());

  if (inputField) {
    inputField.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  quickBtns.forEach((b) => b.addEventListener('click', () => sendMessage(b.dataset.msg)));
});
