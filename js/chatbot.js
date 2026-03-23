/* ============================================================
   Cedarville Schools - Rule-Based Chatbot
   NO API or external services. All responses are stored below.
   TODO: Expand the responses object with more school information.
   ============================================================ */
// Our monthly tuition fees are:\n\nCreche (6mo - 2yrs): \u20a650,000/month\nNursery (2 - 4yrs): \u20a645,000/month\nKindergarten (4 - 6yrs): \u20a640,000/month\n\nWe offer flexible payment plans.
const chatbotData = {
  responses: {
    greeting: "Hello! Welcome to Cedarville Private Schools. How can I help you today? You can ask me about our programs, fees, admissions, or facilities.",
    hours: "Our school hours are Monday to Friday, 7:00 AM - 5:00 PM. The Creche program has extended hours until 6:00 PM.",
    fees: " Please contact us for more details: +234 813 745 1764.", 
    admission: "Our admission process:\n1. Schedule a school tour\n2. Submit application form\n3. Assessment & interview\n4. Enrollment confirmation\n\nCall us at +234 813 745 1764 to get started!",
    programs: "We offer three main programs:\n\nCreche: 6 months - 2 years\nNursery: 2 - 4 years\nPrinary: 6 - 11 years\n\nEach program is designed to meet your child's developmental needs.",
    curriculum: "We follow a blended curriculum combining Nigerian educational standards with international best practices. Our approach focuses on play-based learning, STEM activities, and character development.",
    facilities: "Our facilities include:\n\nSpacious, air-conditioned classrooms\nOutdoor playground\nIndoor play area\nLibrary and reading corner\nSick bay with registered nurse\nCCTV monitoring\nNutritious meal service",
    teachers: "All our teachers are certified early childhood educators with a minimum of 5 years experience. They undergo regular training and thorough background checks.",
    location: "We are located in 12 Ogunda street off nuru oniwo, Aguda, Surulere, Lagos. We have safe drop-off and pick-up zones.",
    contact: "You can reach us at:\n\nPhone: +234 813 745 1764\nEmail: cedarvilleprivate@gmail.com\nAddress: 12 Ogunda street off nuru oniwo Aguda, Surulere, Lagos",
    whatsapp: "You can chat with us directly on WhatsApp at +234 813 745 1764.",
    activities: "Yes, we offer a variety of extracurricular activities including:\n\nMusic & dance classes\nArt & craft sessions\nSports & physical education\nSTEM clubs\nField trips \n Swimming lessons \n Robotics and so much more, visit our Contact page to know more.",
    tour: "We would love to show you around! Call us at +234 813 745 1764 or visit the Contact page to schedule your tour.", 
    developer: "The school website developer is Eluwade Peter also know as Peter Lightspeed, check more about him at his website: https://peterlight123.github.io/portfolio/ ",
    founder: "The founder of the school is Mrs Shitta-bey Zainab which was in 2022, to know more about the school history, visit our about page",
    // TODO: Add more responses here as needed
    fallback: "I am not sure about that, but I would love to help! You can ask me about:\n\nSchool hours\nTuition fees\nPrograms\nAdmissions\nFacilities\nOur location\n\nOr call us directly at +234 813 745 1764."
  },

  keywords: {
    greeting: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "greetings", "welcome", "help", "assist", "support", "information", "inquire", "question", "ask", "what can you do", "what do you offer", "what services", "what information"],
    hours: ["hours", "time", "open", "close", "schedule", "when", "working hours", "operating hours", "school hours", "what time", "when are you open", "when do you close", "when are you open?", "when do you close?", "what are your hours", "what are your working hours", "what are your operating hours", "when do you open", "when do you close", "when are you open", "when are you closed"],
    fees: ["fees", "fee", "price", "cost", "tuition", "charge", "how much", "pay", "payment", "tuition fees", "tuition fee", "what are your fees", "what is the fee", "how much do you charge", "how much is tuition", "how much is the tuition", "how much do you charge for tuition", "how much do you charge for tuition?", "what is the cost of tuition", "what is the cost of tuition?", "what are your tuition fees", "what is your tuition fee", "what are your tuition fee", "what is your tuition fees", "what is your tuition fee?", "what are your tuition fees?", "how much do you charge for tuition", "how much do you charge for tuition?", "what is the cost of tuition", "what is the cost of tuition?", "how much do you charge for tuition", "how much do you charge for tuition?", "what is the cost of tuition", "what is the cost of tuition?"],
    admission: ["admission", "admissions", "enroll", "enrolment", "register", "registration", "apply", "application", "join"],
    programs: ["program", "programs", "programme", "class", "classes", "creche", "nursery", "Primary", "curriculum", "syllabus", "subjects", "learning", "teach", "education"],
    curriculum: ["curriculum", "syllabus", "subjects", "learning", "teach", "education", "approach", "method", "teaching method", "teaching approach", "learning approach", "learning method", "what do you teach", "what subjects do you teach", "what is your curriculum", "what is your syllabus", "what is your teaching method", "what is your teaching approach", "what is your learning approach", "what is your learning method"],
    facilities: ["facilities", "facility", "building", "equipment", "classroom", "playground", "lab", "library", "cctv", "sick bay", "nurse", "meals", "meal service", "nutritious meals", "nutritious meal service"],
    teachers: ["teacher", "teachers", "staff", "educator", "educators", "qualified"],
    location: ["location", "address", "where", "find you", "situated", "located"],
    contact: ["contact", "call", "phone", "email", "reach", "number"],
    activities: ["activities", "extracurricular", "clubs", "sports", "music", "art", "field trips", "swimming", "robotics", "dance", "stems", "sports", "physical education", "sports & physical education", "sports and physical education", "sports & pe", "sports and pe", "pe", "physical education", "activity", "activities"],
    whatsapp: ["whatsapp", "chat", "message", "wa", "watsapp"],
    tour: ["tour", "visit", "see the school", "viewing"],
    developer: ["who created the website", "who developed the website", "who is the developer", "who made the website", "who built the website", "who designed the website", "who is the website developer", "who is the website creator, who is the developer of the website", "who is the creator of the website", "who made this website", "who built this website", "who designed this website"],
    founder: ["founder", "who is the founder", "who created the school", "when is the school founded", "when was the school founded", "who started the school", "who established the school", "when was the school established", "when was the school started", "who is the founder of the school", "who is the founder of cedarville", "who is the founder of cedarville private schools", "who is the founder of cedarville private school", "who is the founder of cedarville private schools?", "who is the founder of cedarville private school?", "when was cedarville founded", "when was cedarville private schools founded", "when was cedarville private school founded", "when was cedarville established", "when was cedarville private schools established", "when was cedarville private school established"],
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
