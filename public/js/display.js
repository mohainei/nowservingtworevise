const displayGrid = document.getElementById("displayGrid");
const noQueueMessage = document.getElementById("noQueueMessage");
const queueSound = document.getElementById("queueSound");
const enableSoundBtn = document.getElementById("enableSound");
const socket = io();

let lastData = {};
let lastSpoken = {};

let availableVoices = [];

function loadVoices() {
  availableVoices = speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();



// ✅ Enable sound manually
enableSoundBtn.addEventListener("click", () => {
  queueSound.play().then(() => {
    queueSound.pause();
    queueSound.currentTime = 0;
    enableSoundBtn.style.display = "none";
    alert("🔊 Sound enabled!");
  });
});


const colorMap = {
  "Business Permit": "#FFD700",      // gold
  "RPT": "#00E5FF",                  // cyan
  "LCR": "#FF6F61",                  // coral
  "Cedula": "#7CFF00",               // neon green
  "Others": "#B388FF",               // violet
  "PUV/PUM": "#FF9800",              // orange
  "Assessment": "#4CAF50",           // green
  "Inquiry/Support": "#03A9F4",      // blue
};


function speakQueue(queueNumber, teller) {
  if (!voiceEnabled) return;
  if (!("speechSynthesis" in window)) return;

  // Prevent overlapping announcements
  speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(
    `Now serving ${queueNumber}. Please proceed to ${teller}.`
  );

  utter.rate = 0.9;
  utter.pitch = 1;
  utter.volume = 1;

  if (availableVoices.length) {
    utter.voice =
      availableVoices.find(v => v.lang.startsWith("en")) ||
      availableVoices[0];
  }

  speechSynthesis.speak(utter);
}

let voiceEnabled = false;

document.getElementById("enableVoice").addEventListener("click", () => {
  const test = new SpeechSynthesisUtterance("Voice enabled");
  speechSynthesis.speak(test);

  voiceEnabled = true;
  alert("🔊 Voice announcements enabled");
});

function renderDisplay(data) {
  displayGrid.innerHTML = "";

  let hasAny = false;
  const rendered = new Set(); // 🔒 prevent duplicates

  for (const [type, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;

    list.forEach(info => {
      const key = `${type}-${info.teller}`;
      if (rendered.has(key)) return; // 🚫 skip duplicate

      rendered.add(key);
      hasAny = true;

      const color = colorMap[type] || "#00ffd0";

      const card = document.createElement("div");
      card.classList.add("teller-card");
      card.style.borderTop = `8px solid ${color}`;

      card.dataset.transaction = type;
      card.dataset.teller = info.teller;
      card.dataset.queue = info.number;

      card.innerHTML = `
        <div class="queue-number" style="color:${color}">
          ${info.number}
        </div>
        <div class="transaction-name" style="color:${color}">
          ${type}
        </div>
        <div class="teller-name">
          ${info.teller}
        </div>
      `;

      displayGrid.appendChild(card);
      setTimeout(() => card.classList.add("show"), 50);
    });
  }

  noQueueMessage.style.display = hasAny ? "none" : "block";
}


socket.on("playSound", () => {
  queueSound.currentTime = 0;
  queueSound.play().catch((err) => console.log("Sound play blocked:", err));
});


socket.on("updateNowServing", (data) => {
  let hasNewQueue = false;

  for (const [type, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;

    list.forEach(info => {
      const key = `${type}-${info.teller}`;

      if (lastSpoken[key] !== info.number) {
        lastSpoken[key] = info.number;
        hasNewQueue = true;

        speakQueue(info.number, info.teller);
      }
    });
  }

  renderDisplay(data);
  lastData = JSON.parse(JSON.stringify(data));

  if (hasNewQueue) {
    queueSound.currentTime = 0;
    queueSound.play().catch(() => {});
  }
});






// 🔁 Teller re-calling number (flashes and sound)


socket.on("callAgain", ({ transaction, teller, number }) => {
  if (!number || !teller) return;

  const cards = document.querySelectorAll(".teller-card");

  const targetCard = Array.from(cards).find(card =>
    card.dataset.transaction === transaction &&
    card.dataset.teller === teller &&
    card.dataset.queue === number
  );

  if (targetCard) {
    targetCard.classList.add("attention");
    setTimeout(() => targetCard.classList.remove("attention"), 1200);
  }

  queueSound.currentTime = 0;
  queueSound.play().catch(() => {});

  speakQueue(number, teller);
});
