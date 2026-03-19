/* ============================================================
   Cedarville Schools - Rule-Based Chatbot
   NO API or external services. All responses are stored below.
   TODO: Expand the responses object with more school information.
   ============================================================ */

const chatbotData = {
  responses: {
    greeting: "Hello! Welcome to Cedarville Private Schools. How can I help you today? You can ask me about our programs, fees, admissions, or facilities.",
    hours: "Our school hours are Monday to Friday, 7:00 AM - 5:00 PM. The Creche program has extended hours until 6:00 PM.",
    fees: "Our monthly tuition fees are:\n\nCreche (6mo - 2yrs): \u20a650,000/month\nNursery (2 - 4yrs): \u20a645,000/month\nKindergarten (4 - 6yrs): \u20a640,000/month\n\nWe offer flexible payment plans. Please contact us for details.",
    admission: "Our admission process:\n1. Schedule a school tour\n2. Submit application form\n3. Assessment & interview\n4. Enrollment confirmation\n\nCall us at +234 803 939 4759 to get started!",
    programs: "We offer three main programs:\n\nCreche: 6 months - 2 years\nNursery: 2 - 4 years\nKindergarten: 4 - 6 years\n\nEach program is designed to meet your child's developmental needs.",
    curriculum: "We follow a blended curriculum combining Nigerian educational standards with international best practices. Our approach focuses on play-based learning, STEM activities, and character development.",
    facilities: "Our facilities include:\n\nSpacious, air-conditioned classrooms\nOutdoor playground\nIndoor play area\nLibrary and reading corner\nSick bay with registered nurse\nCCTV monitoring\nNutritious meal service",
    teachers: "All our teachers are certified early childhood educators with a minimum of 5 years experience. They undergo regular training and thorough background checks.",
    location: "We are located in Aguda, Surulere, Lagos. We have safe drop-off and pick-up zones.",
    contact: "You can reach us at:\n\nPhone: +234 803 939 4759\nEmail: info@cedarvilleschools.com\nAddress: Aguda, Surulere, Lagos",
    whatsapp: "You can chat with us directly on WhatsApp at +234 803 939 4759.",
    tour: "We would love to show you around! Call us at +234 803 939 4759 or visit the Contact page to schedule your tour.",
    // TODO: Add more responses here as needed
    fallback: "I am not sure about that, but I would love to help! You can ask me about:\n\nSchool hours\nTuition fees\nPrograms\nAdmissions\nFacilities\nOur location\n\nOr call us directly at +234 803 939 4759."
  },

  keywords: {
    greeting: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"],
    hours: ["hours", "time", "open", "close", "schedule", "when", "working hours"],
    fees: ["fees", "fee", "price", "cost", "tuition", "charge", "how much", "pay", "payment"],
    admission: ["admission", "admissions", "enroll", "enrolment", "register", "registration", "apply", "application", "join"],
    programs: ["program", "programs", "programme", "class", "classes", "creche", "nursery", "kindergarten"],
    curriculum: ["curriculum", "syllabus", "subjects", "learning", "teach", "education"],
    facilities: ["facilities", "facility", "building", "equipment", "classroom", "playground", "lab", "library"],
    teachers: ["teacher", "teachers", "staff", "educator", "educators", "qualified"],
    location: ["location", "address", "where", "find you", "situated", "located"],
    contact: ["contact", "call", "phone", "email", "reach", "number"],
    whatsapp: ["whatsapp", "chat", "message", "wa", "watsapp"],
    tour: ["tour", "visit", "see the school", "viewing"]
    // TODO: Add more keywords here
  }
};

function matchResponse(userInput) {
  const input = userInput.toLowerCase().trim();

  for (const [category, words] of Object.entries(chatbotData.keywords)) {
    for (const word of words) {
      if (input.includes(word)) {
        return chatbotData.responses[category] || chatbotData.responses.fallback;
      }
    }
  }
  return chatbotData.responses.fallback;
}

function appendMessage(text, sender) {
  const messages = document.getElementById('chatbot-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${sender}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function sendMessage(text) {
  const input = document.getElementById('chatbot-input-field');
  const msg = text || input.value.trim();
  if (!msg) return;

  appendMessage(msg, 'user');
  if (input) input.value = '';

  setTimeout(() => {
    appendMessage(matchResponse(msg), 'bot');
  }, 400);
}

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('chatbot-btn');
  const win = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chatbot-send');
  const inputField = document.getElementById('chatbot-input-field');
  const quickBtns = document.querySelectorAll('.quick-btn');

  if (!btn) return;

  btn.addEventListener('click', function () {
    win.classList.toggle('open');
    if (win.classList.contains('open') && document.getElementById('chatbot-messages').children.length === 0) {
      setTimeout(() => appendMessage(chatbotData.responses.greeting, 'bot'), 200);
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', () => win.classList.remove('open'));

  if (sendBtn) sendBtn.addEventListener('click', () => sendMessage());

  if (inputField) {
    inputField.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  quickBtns.forEach(b => b.addEventListener('click', () => sendMessage(b.dataset.msg)));
});
