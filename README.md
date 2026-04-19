# 🔒 Automated Deadlock Detection Tool

A browser-based tool to simulate, detect, and resolve **deadlock conditions** in operating system processes using Resource Allocation Graph analysis and DFS-based cycle detection.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Tech](https://img.shields.io/badge/built%20with-HTML%20%7C%20CSS%20%7C%20JavaScript-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📌 Overview

The **Automated Deadlock Detection Tool** is a single-file, zero-dependency web application that lets you model an OS-like system with processes and resources, then automatically detects whether a deadlock exists. It visualizes the **Resource Allocation Graph (RAG)** in real time and suggests resolution strategies when circular wait conditions are found.

---

## 🎯 Features

- ✅ Add/remove **Processes** and **Resources** dynamically
- ✅ Define **Allocations** (resource held by process) and **Requests** (process waiting for resource)
- ✅ Automatic **deadlock detection** using DFS cycle detection on a Wait-For Graph
- ✅ Real-time **Resource Allocation Graph** rendered on HTML5 Canvas
- ✅ Color-coded graph — blue (processes), green (resources), red (deadlocked nodes)
- ✅ Displays exact **circular wait cycle path** (e.g., `P1 → P2 → P3 → P1`)
- ✅ Shows all four **Coffman Conditions** when deadlock is found
- ✅ Suggests **resolution strategies** (termination, preemption, ordering, Banker's Algorithm)
- ✅ Built-in **preset scenarios** for quick demo
- ✅ Fully responsive, works on any modern browser — no install required

---

## 🚀 Getting Started

### Run Locally

```bash
# Clone the repository
git clone https://github.com/Deepak17kb/Automated-Deadlock-Detection-Tool.git

# Open the file in your browser
open deadlock-detector.html
```

No server, no npm, no dependencies — just open the `.html` file directly in any browser.

---

## 🖥️ How to Use

1. **Add Processes** — Enter process names like `P1`, `P2`, `P3` and click **+ Add**
2. **Add Resources** — Enter resource names like `R1`, `R2`, `Fork1` and click **+ Add**
3. **Add Allocations** — Select which resource is currently **held by** which process (e.g., `R1 → P1`)
4. **Add Requests** — Select which process is currently **waiting for** which resource (e.g., `P1 → R2`)
5. Click **⬡ Run Deadlock Detection**
6. View results in the graph and results panel

---

## 📥 Input & 📤 Output

| Input | Description |
|---|---|
| Processes | Running programs competing for resources (e.g., P1, P2) |
| Resources | Shared system assets (e.g., R1, R2, Fork1) |
| Allocations | Resource currently held by a process (R1 → P1) |
| Requests | Process currently waiting for a resource (P1 → R2) |

| Output | Description |
|---|---|
| Resource Allocation Graph | Live canvas with color-coded nodes and arrows |
| SAFE / DEADLOCK badge | Instant system status |
| Cycle path | Exact deadlock chain (e.g., P1 → P2 → P1) |
| Coffman Conditions | Confirms all 4 deadlock conditions |
| Resolution strategies | Actionable steps to break the deadlock |

---

## 🎛️ Preset Scenarios

| Preset | Processes | Resources | Result |
|---|---|---|---|
| Classic (2P) | P1, P2 | R1, R2 | 🔴 Deadlock |
| Dining Philosophers (3P) | P1, P2, P3 | Fork1, Fork2, Fork3 | 🔴 Deadlock |
| Chain (4P) | P1, P2, P3, P4 | R1, R2, R3, R4 | 🔴 Deadlock |
| Safe State | P1, P2, P3 | R1, R2 | ✅ Safe |

---

## ⚙️ Algorithm

```
1. Build Wait-For Graph from allocations + requests
   → If P waits for R, and R is held by Q → add edge P → Q

2. Run DFS on every process node
   → If a node is revisited on the current path → CYCLE FOUND = DEADLOCK

3. Deduplicate all found cycles

4. Mark deadlocked nodes/edges red on the canvas

5. Generate resolution strategies for each cycle
```

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Page structure and layout |
| CSS3 | Dark theme, responsive grid, animations |
| Vanilla JavaScript | Core logic — DFS algorithm, graph management |
| HTML5 Canvas API | Real-time RAG visualization |
| Google Fonts | JetBrains Mono + Syne typography |

---

## 📚 Concepts Covered

- Deadlock and the four **Coffman Conditions** (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait)
- **Resource Allocation Graph (RAG)** construction and interpretation
- **Wait-For Graph** derivation
- **DFS-based Cycle Detection**
- **Deadlock Prevention, Avoidance, and Recovery**
- **Banker's Algorithm** for safe state verification
- **Dining Philosophers Problem**

---

## 📁 Project Structure

```
Automated-Deadlock-Detection-Tool/
│
└── deadlock-detector.html     # Complete single-file application
└── README.md                  # Project documentation
```

---

## 👨‍💻 Author

**Deepak** — [@Deepak17kb](https://github.com/Deepak17kb)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
