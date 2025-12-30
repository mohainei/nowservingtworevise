// Pretty URLs for main pages
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const db = require("./database");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());


app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/teller', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teller.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

// === Queue Data ===
let queues = {
  "Business Permit": [],
  RPT: [],
  LCR: [],
  Cedula: [],
  Others: [],
  "PUV/PUM": [],
  Assessment: [],
  "Inquiry/Support": [],
};

let nowServing = {
  "Business Permit": null,
  RPT: null,
  LCR: null,
  Cedula: null,
  Others: null,
  "PUV/PUM": null,
  Assessment: null,
  "Inquiry/Support": null,
};

const prefixMap = {
  "Business Permit": "BP",
  RPT: "RPT",
  LCR: "LR",
  Cedula: "C",
  Others: "O",
  "PUV/PUM": "PU",
  Assessment: "AS",
  "Inquiry/Support": "IS",
};

let queueCounters = {
  "Business Permit": 0,
  RPT: 0,
  LCR: 0,
  Cedula: 0,
  Others: 0,
  "PUV/PUM": 0,
  Assessment: 0,
  "Inquiry/Support": 0,
};

let lastResetDate = null;

// === Customer requests a new queue number ===

async function restoreTodayQueues() {
  try {
    const [rows] = await db.query(
      `SELECT queue_number, transaction_type 
       FROM queues 
       WHERE status = 'WAITING'
       AND DATE(created_at) = CURDATE()
       ORDER BY id ASC`
    );

    for (const key in queues) queues[key] = [];

    for (const row of rows) {
      queues[row.transaction_type].push(row.queue_number);
    }

    console.log("✅ Queues restored from database");
  } catch (err) {
    console.error("❌ Restore error:", err);
  }
}

async function restoreQueueCounters() {
  try {
    const [rows] = await db.query(`
      SELECT transaction_type, queue_number
      FROM queues
      WHERE DATE(created_at) = CURDATE()
      ORDER BY id DESC
    `);

    // Reset counters first
    for (const key in queueCounters) {
      queueCounters[key] = 0;
    }

    const processed = new Set();

    for (const row of rows) {
      const { transaction_type, queue_number } = row;

      // Skip if already restored for this transaction
      if (processed.has(transaction_type)) continue;

      // Extract numeric part (e.g. BP-023 → 23)
      const num = parseInt(queue_number.split("-")[1], 10);

      if (!isNaN(num)) {
        queueCounters[transaction_type] = num;
        processed.add(transaction_type);
      }
    }

    console.log("✅ Queue counters restored:", queueCounters);
  } catch (err) {
    console.error("❌ Counter restore error:", err);
  }
}

async function restoreNowServing() {
  const [rows] = await db.query(
    `SELECT transaction_type, queue_number, teller
     FROM queues
     WHERE status='SERVING'
     AND DATE(created_at)=CURDATE()`
  );

  rows.forEach((r) => {
    nowServing[r.transaction_type] = {
      number: r.queue_number,
      teller: r.teller,
    };
  });

  console.log("✅ Now serving restored");
}

async function expireOldQueues() {
  await db.query(
    "UPDATE queues SET status='EXPIRED' WHERE DATE(created_at) < CURDATE()"
  );
}

app.post("/api/queue", async (req, res) => {
  try {
    const { transaction } = req.body;

    // Validate transaction type
    if (!queues.hasOwnProperty(transaction)) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    // Increment counter
    queueCounters[transaction]++;

    // Get prefix
    const prefix = prefixMap[transaction] || transaction[0];

    // Generate formatted queue number
    const formatted = `${prefix}-${String(queueCounters[transaction]).padStart(
      3,
      "0"
    )}`;

    // Save to MySQL
    await db.query(
      "INSERT INTO queues (transaction_type, queue_number, status) VALUES (?, ?, 'waiting')",
      [transaction, formatted]
    );

    // Save to in-memory list
    queues[transaction].push(formatted);

    // Notify teller/admin screens
    io.emit("updateQueues", { queues, nowServing });

    // Response to button page
    res.json({ number: formatted, transaction });
  } catch (err) {
    console.error("Error saving queue:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// === Teller serves the next customer ===
app.post("/api/serveNext", async (req, res) => {
  try {
    const { transaction, teller } = req.body;

    if (!teller) {
      return res.status(400).json({ error: "Teller is required" });
    }

    if (!queues[transaction] || queues[transaction].length === 0) {
      return res.json({ message: "No queue waiting", number: null });
    }

    // 1️⃣ Get next queue from memory
    const next = queues[transaction].shift();

    // 2️⃣ Mark queue as DONE in database
    await db.query(
      `UPDATE queues 
       SET status = 'DONE', teller = ?
       WHERE queue_number = ?
       AND transaction_type = ?
       AND DATE(created_at) = CURDATE()`,
      [teller, next, transaction]
    );

    // 3️⃣ Update now serving
    // nowServing[transaction] = {
    //   number: next,
    //   teller,
    // };

    // if (!nowServing[transaction]) {
    //   nowServing[transaction] = [];
    // }

    // nowServing[transaction].push({
    //   number: next,
    //   teller
    // });


     if (!nowServing[transaction]) {
    nowServing[transaction] = [];
  }

  nowServing[transaction] = nowServing[transaction].filter(
    q => q.teller !== teller
  );

  nowServing[transaction].push({ number: next, teller });



    // 4️⃣ Notify clients
    io.emit("updateNowServing", nowServing);
    io.emit("updateQueues", { queues, nowServing });

    setTimeout(() => {
    nowServing[transaction] = nowServing[transaction].filter(q => q.teller !== teller);
    io.emit("updateNowServing", nowServing);
  }, 200000);

    res.json({ number: next, teller });
  } catch (err) {
    console.error("ServeNext error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


setInterval(async () => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (
    now.getHours() === 0 &&
    now.getMinutes() === 0 &&
    lastResetDate !== today
  ) {
    // Reset counters
    for (const key in queueCounters) queueCounters[key] = 0;

    // Clear in-memory queues (optional)
    for (const key in queues) queues[key] = [];

    // Expire old queues in DB
    try {
      await db.query(
        "UPDATE queues SET status = 'EXPIRED' WHERE DATE(created_at) < CURDATE()"
      );
      console.log("✅ Daily queues expired in DB");
    } catch (err) {
      console.error("❌ Error expiring old queues:", err);
    }

    lastResetDate = today;
    console.log("🔄 Daily counters reset");
  }
}, 60000);

// === Admin API: Get all queues ===
app.get("/api/queues", (req, res) => {
  res.json({ queues, nowServing });
});

app.get("/api/cleanup", (req, res) => {
  for (const [type, list] of Object.entries(queues)) {
    if (list.length === 0) {
      nowServing[type] = null;
    }
  }
  io.emit("updateNowServing", nowServing);
  res.json({ message: "Cleaned up empty queues." });
});

app.post("/api/callAgain", (req, res) => {
  const { transaction, teller } = req.body;

  const list = nowServing[transaction];
  if (!Array.isArray(list)) {
    return res.status(404).json({ error: "No active serving queue" });
  }

  const current = list.find(q => q.teller === teller);

  if (!current) {
    return res.status(404).json({ error: "Nothing to recall" });
  }

  // 🔔 Notify displays
  io.emit("callAgain", {
    transaction,
    teller,
    number: current.number
  });

  res.json({ success: true });
});


app.post("/api/playSound", (req, res) => {
  io.emit("playSound");
  res.json({ message: "Sound played on display." });
});


io.on("connection", (socket) => {
  console.log("🟢 A client connected");

  // Send initial data on connection (only once)
  socket.emit("updateNowServing", nowServing);
  socket.emit("updateQueues", { queues, nowServing });

  // When teller triggers sound
  socket.on("playSoundRequest", () => {
    console.log("🔔 Play sound request received from teller");
    io.emit("playSound"); // Broadcast to all display clients
  });

  socket.on("disconnect", () => {
    console.log("🔴 A client disconnected");
  });
});

setInterval(() => {
  for (const [type, list] of Object.entries(queues)) {
    if (list.length === 0) {
      nowServing[type] = null;
    }
  }
  io.emit("updateNowServing", nowServing);
}, 100000); // every 10 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  await restoreQueueCounters();
  await restoreTodayQueues();
  await expireOldQueues();
  await restoreNowServing();
});





// Teller manually plays sound on display

