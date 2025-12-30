const socket = io();
const tellerSelect = document.getElementById("teller");
const playSoundBtn = document.getElementById("playSoundBtn");

let currentTeller = "";

// --------------------
// Serve Next
// --------------------
async function serveNext(transaction) {
  const teller = tellerSelect.value;

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

  const numberElement = document.getElementById(idMap[transaction]);
  if (!numberElement) return;

  numberElement.textContent = data.number || "No Queue";
}

// --------------------
// Teller selection
// --------------------
tellerSelect.addEventListener("change", () => {
  currentTeller = tellerSelect.value;
});

// --------------------
// Call Again (RECALL)
// --------------------
async function callAgain(transaction) {
  const teller = tellerSelect.value;

  if (!teller) {
    alert("Please select a teller first");
    return;
  }

  const res = await fetch("/api/callAgain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction, teller })
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Nothing to recall");
  }
}

