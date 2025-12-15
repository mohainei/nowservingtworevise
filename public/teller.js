const socket = io();
const tellerSelect = document.getElementById("teller");
const playSoundBtn = document.getElementById("playSoundBtn");
let currentTeller = "";
// Serve next button logic stays the same
// async function serveNext(transaction) {
//   const teller = document.getElementById("teller").value;

//   if (!teller) {
//     alert("Please select a teller before serving a queue.");
//     return;
//   }

//   const res = await fetch("/api/serveNext", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ transaction, teller }),
//   });

//   const data = await res.json();
//   const elementId = transaction.toLowerCase() + "Number";
//   const el = document.getElementById(elementId);

//   if (data.number) {
//     el.textContent = data.number;
//     el.style.animation = "none";
//     el.offsetHeight; // reset animation
//     el.style.animation = "pop 0.6s ease";
//   } else {
//     el.textContent = "No Queue";
//   }
// }

async function serveNext(transaction) {
  const teller = document.getElementById("teller").value;

   if (!teller) {
    alert("Please select a teller before serving a queue.");
    return;
   }

  const res = await fetch("/api/serveNext", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction, teller }),
  });

  const data = await res.json();

  // Map transactions to DOM element IDs
  const idMap = {
    "Business Permit": "businessPermitNumber",
    RPT: "rptNumber",
    LCR: "lcrNumber",
    Cedula: "cedulaNumber",
    Others: "othersNumber",
    "PUV/PUM": "puvNumber",
    Assessment: "assessmentNumber",
    "Inquiry/Support": "inquirySupportNumber",
  };

  const elementId = idMap[transaction];
  const numberElement = document.getElementById(elementId);

  if (!numberElement) {
    console.warn(`❌ Element not found for transaction: ${transaction}`);
    return;
  }

  // ✅ Display the queue number or fallback message
  if (data.number) {
    numberElement.textContent = data.number;
  } else {
    numberElement.textContent = "No Queue";
  }
}

tellerSelect.addEventListener("change", () => {
  currentTeller = tellerSelect.value;
});

// 🔔 Play sound button
document.getElementById("playSoundBtn").addEventListener("click", () => {
  socket.emit("playSound");
});

async function callAgain(transaction) {
  const res = await fetch("/api/callAgain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction }),
  });

  const result = await res.json();
  //alert(result.message);
}

// 🔔 Optional: manual display sound button
document.getElementById("playSoundBtn").addEventListener("click", async () => {
  await fetch("/api/playSound", { method: "POST" });
});

playSoundBtn.addEventListener("click", () => {
  socket.emit("playSoundRequest"); // send signal to server
});
