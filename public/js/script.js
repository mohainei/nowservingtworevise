const datetimeEl = document.getElementById("datetime");
const queueNumber = document.getElementById("queueNumber");
const printBtn = document.getElementById("printBtn");
const boxes = document.querySelectorAll(".transaction-box");

let currentTransaction = null;
let currentNumber = null;

// 🕒 Live Date/Time
setInterval(() => {
  datetimeEl.textContent = new Date().toLocaleString();
}, 1000);

// 🎟️ Handle transaction selection
boxes.forEach(box => {
  box.addEventListener("click", async () => {
    const transaction = box.getAttribute("data-transaction");

    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction }),
    });

    const data = await res.json();
    currentTransaction = data.transaction;
    currentNumber = data.number;

    queueNumber.textContent = data.number;
    printBtn.classList.remove("hidden");
  });
});

// 🖨️ Print the queue ticket
printBtn.addEventListener("click", async () => {
  if (!currentTransaction || !currentNumber) return;

  const now = new Date().toLocaleString();

  const printWindow = window.open("", "", "width=400,height=400");
  printWindow.document.write(`
    <html>
    <head>
      <title>Print Queue</title>
      <style>
     
        @page {
    size: 58mm auto;
    margin: 0;
  }

  body {
    font-family: monospace;
    font-size: 12pt;
    width: 58mm;
    margin: 0;
    padding: 10px 0 40px; /* top / bottom padding for space before cut */
    text-align: center;
  }

  .divider {
    border-top: 1px dashed #000;
    margin: 10px 0;
  }

  .big {
    font-size: 28pt;
    font-weight: bold;
  }
      </style>
    </head>
    <body>
      <h2>CTO-QUEUE TICKET</h2>
      <div class="divider"></div>
      <h3>${currentTransaction}</h3>
      <div class="big">${currentNumber}</div>
      <div class="divider"></div>
      <p>${now}</p>
      <p>Thank you for waiting!</p>
      <script>
        window.print();
        window.onafterprint = () => window.close();
        setTimeout(() => window.close(), 1000); 
      </script>
    </body>
    </html>
  `);
  

  // Notify server for queue assignment
  await fetch("/api/direct-print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number: currentNumber, transaction: currentTransaction }),
  });
});
