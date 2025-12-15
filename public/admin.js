const socket = io();
const queueGrid = document.getElementById("queueGrid");

function renderQueues(data) {
  queueGrid.innerHTML = "";

  const { queues, nowServing } = data;

  Object.entries(queues).forEach(([type, list]) => {
    const card = document.createElement("div");
    card.classList.add("queue-card");

    const current = nowServing[type]?.number || "---";
    const teller = nowServing[type]?.teller || "—";

    card.innerHTML = `
      <h2>${type}</h2>
      <div class="now-serving">Now Serving: <strong>${current}</strong> (${teller})</div>
      <h3>Waiting List:</h3>
      <ul>
        ${list.length > 0
          ? list.map(num => `<li>${num}</li>`).join("")
          : "<li>No waiting customers</li>"}
      </ul>
    `;

    queueGrid.appendChild(card);
  });
}

socket.on("updateQueues", renderQueues);

// Load initial data from API
fetch("/api/queues")
  .then(res => res.json())
  .then(renderQueues)
  .catch(err => console.error("Failed to load queue data:", err));
