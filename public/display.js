const displayGrid = document.getElementById("displayGrid");
const noQueueMessage = document.getElementById("noQueueMessage");
const queueSound = document.getElementById("queueSound");
const enableSoundBtn = document.getElementById("enableSound");
const socket = io();

let lastData = {};

const iconMap = {
  "Business Permit": "🏢",
  RPT: "💰",
  LCR: "📜",
  Cedula: "🧾",
  Others: "🗂️",
  "PUV/PUM": "📄",
  Assessment: "🧮",
  "Inquiry/Support": "💬",
};

// ✅ Enable sound manually
enableSoundBtn.addEventListener("click", () => {
  queueSound.play().then(() => {
    queueSound.pause();
    queueSound.currentTime = 0;
    enableSoundBtn.style.display = "none";
    alert("🔊 Sound enabled!");
  });
});

// 🎨 Render beautiful teller cards
function renderDisplay(data) {
  displayGrid.innerHTML = "";

  const entries = Object.entries(data);
  if (entries.length === 0) {
    noQueueMessage.style.display = "block";
    return;
  }

  noQueueMessage.style.display = "none";

  for (const [type, info] of entries) {
    if (info) {
      const icon = iconMap[type] || "🪙"; // ✅ fallback icon
      const card = document.createElement("div");
      card.classList.add("teller-card");
      card.innerHTML = `
        <div class="icon" style="font-size: 3rem; margin-bottom: 10px;">${icon}</div>
        <div class="queue-number">${info.number || "---"}</div>
        <div class="teller-info">${type} <br><small>Served by: ${
        info.teller
      }</small></div>
      `;
      displayGrid.appendChild(card);
      setTimeout(() => card.classList.add("show"), 50);
    }
  }
}

socket.on("playSound", () => {
  queueSound.currentTime = 0;
  queueSound.play().catch((err) => console.log("Sound play blocked:", err));
});

// 🔔 Listen for updates from server
socket.on("updateNowServing", (data) => {
  let hasNewQueue = false;

  for (const [type, info] of Object.entries(data)) {
    if (!lastData[type] || lastData[type]?.number !== info?.number) {
      hasNewQueue = true;
    }
  }

  renderDisplay(data);
  lastData = JSON.parse(JSON.stringify(data));

  if (hasNewQueue) {
    queueSound.currentTime = 0;
    queueSound.play().catch(() => console.log("Sound play blocked"));
  }
});

// 🔁 Teller re-calling number (flashes and sound)
socket.on("callAgain", ({ transaction }) => {
  const cards = document.querySelectorAll(".teller-card");
  const targetCard = Array.from(cards).find((card) =>
    card.textContent.includes(transaction)
  );

  if (targetCard) {
    targetCard.style.boxShadow = "0 0 25px 5px rgba(0,255,200,0.8)";
    setTimeout(() => (targetCard.style.boxShadow = ""), 1000);
  }

  queueSound.currentTime = 0;
  queueSound.play().catch(() => console.log("Sound play blocked"));
});
