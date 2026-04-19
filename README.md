<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>README — Deadlock Detection Tool</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #060810;
  --surface: #0d1117;
  --surface2: #161b24;
  --border: #1e2635;
  --accent: #e05a2b;
  --accent2: #ff8c55;
  --cyan: #00d4aa;
  --cyan2: #00ffcc;
  --red: #ff4d4d;
  --blue: #4d9fff;
  --amber: #ffb84d;
  --purple: #a855f7;
  --text: #e8edf5;
  --text2: #8090aa;
  --text3: #3d4a60;
  --mono: 'Space Mono', monospace;
  --display: 'Bebas Neue', sans-serif;
  --sans: 'DM Sans', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  overflow-x: hidden;
  cursor: default;
}

/* ── CANVAS BG ── */
#bg-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  opacity: 0.55;
  pointer-events: none;
}

/* ── NOISE OVERLAY ── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
}

/* ── LAYOUT ── */
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 32px;
  position: relative;
  z-index: 1;
}

/* ── HERO ── */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 0 40px;
  position: relative;
}

.hero-eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--cyan);
  margin-bottom: 20px;
  opacity: 0;
  animation: fadeUp 0.6s ease 0.2s forwards;
  display: flex;
  align-items: center;
  gap: 12px;
}
.hero-eyebrow::before {
  content: '';
  display: inline-block;
  width: 32px;
  height: 1px;
  background: var(--cyan);
}

.hero-title {
  font-family: var(--display);
  font-size: clamp(72px, 12vw, 140px);
  line-height: 0.9;
  letter-spacing: 0.02em;
  margin-bottom: 10px;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.35s forwards;
}
.hero-title .line1 { color: var(--text); }
.hero-title .line2 {
  color: transparent;
  -webkit-text-stroke: 1.5px var(--accent);
  display: block;
}
.hero-title .line3 { color: var(--accent); display: block; }

.hero-sub {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text2);
  margin: 28px 0 40px;
  line-height: 1.8;
  max-width: 500px;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.5s forwards;
  border-left: 2px solid var(--border);
  padding-left: 16px;
}

.hero-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  opacity: 0;
  animation: fadeUp 0.7s ease 0.65s forwards;
}
.badge {
  font-family: var(--mono);
  font-size: 10px;
  padding: 5px 12px;
  border-radius: 2px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  border: 1px solid;
}
.badge-cyan { color: var(--cyan); border-color: var(--cyan); background: rgba(0,212,170,0.08); }
.badge-orange { color: var(--accent2); border-color: var(--accent2); background: rgba(255,140,85,0.08); }
.badge-red { color: var(--red); border-color: var(--red); background: rgba(255,77,77,0.08); }
.badge-blue { color: var(--blue); border-color: var(--blue); background: rgba(77,159,255,0.08); }

.scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 0;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text3);
  letter-spacing: 0.15em;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: fadeUp 1s ease 1.2s both;
}
.scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--text3), transparent);
  animation: scrollAnim 2s ease infinite;
}

/* ── SECTIONS ── */
section {
  padding: 80px 0;
  border-top: 1px solid var(--border);
}

.sec-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.sec-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
  max-width: 60px;
}

.sec-title {
  font-family: var(--display);
  font-size: clamp(40px, 7vw, 72px);
  line-height: 1;
  letter-spacing: 0.03em;
  margin-bottom: 40px;
}

/* ── WHAT IS DEADLOCK ── */
.concept-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 40px;
}
@media(max-width: 600px) { .concept-grid { grid-template-columns: 1fr; } }

.concept-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s, transform 0.3s;
  cursor: default;
}
.concept-card:hover {
  border-color: var(--accent);
  transform: translateY(-3px);
}
.concept-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(to right, var(--accent), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.concept-card:hover::before { opacity: 1; }

.concept-num {
  font-family: var(--display);
  font-size: 48px;
  color: var(--border);
  position: absolute;
  top: 12px; right: 16px;
  line-height: 1;
  transition: color 0.3s;
}
.concept-card:hover .concept-num { color: rgba(224,90,43,0.15); }

.concept-icon { font-size: 28px; margin-bottom: 12px; }
.concept-name {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cyan);
  margin-bottom: 8px;
}
.concept-desc {
  font-size: 13px;
  color: var(--text2);
  line-height: 1.7;
}

/* ── ANIMATED DEADLOCK DEMO ── */
.demo-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 32px;
  position: relative;
  overflow: hidden;
}
.demo-box-label {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-bottom: 24px;
}
#demo-canvas {
  width: 100%;
  height: 200px;
  display: block;
}

/* ── IO SECTION ── */
.io-grid {
  display: grid;
  grid-template-columns: 1fr 40px 1fr;
  gap: 0;
  align-items: start;
}
@media(max-width: 600px) {
  .io-grid { grid-template-columns: 1fr; }
  .io-arrow { display: none; }
}

.io-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.io-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}
.io-header.input { color: var(--cyan); }
.io-header.output { color: var(--accent2); }
.io-dot { width: 7px; height: 7px; border-radius: 50%; }
.io-dot.cyan { background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
.io-dot.orange { background: var(--accent2); box-shadow: 0 0 8px var(--accent2); }

.io-list { padding: 16px; list-style: none; }
.io-list li {
  font-size: 13px;
  color: var(--text2);
  padding: 10px 12px;
  border-radius: 3px;
  margin-bottom: 6px;
  background: var(--surface2);
  border-left: 3px solid var(--border);
  line-height: 1.5;
  transition: border-color 0.2s, background 0.2s;
  cursor: default;
}
.io-list li:hover { border-color: var(--cyan); background: rgba(0,212,170,0.05); }
.io-list li:last-child { margin-bottom: 0; }
.io-list li strong {
  font-family: var(--mono);
  font-size: 10px;
  display: block;
  color: var(--cyan);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 3px;
}
.io-list.out li:hover { border-color: var(--accent2); background: rgba(255,140,85,0.05); }
.io-list.out li strong { color: var(--accent2); }

.io-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding-top: 60px;
}
.arrow-svg { width: 30px; opacity: 0.4; }

/* ── ALGORITHM ── */
.algo-steps { display: flex; flex-direction: column; gap: 0; }
.algo-step {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 0;
  position: relative;
}
.algo-step:not(:last-child) .step-line::after {
  content: '';
  position: absolute;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: calc(100% + 1px);
  background: linear-gradient(to bottom, var(--border2, #2e3a50), transparent);
}
.step-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  position: relative;
}
.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text3);
  background: var(--surface);
  transition: all 0.3s;
  cursor: default;
  z-index: 1;
}
.algo-step:hover .step-num {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(224,90,43,0.1);
  box-shadow: 0 0 16px rgba(224,90,43,0.2);
}
.step-connector {
  width: 1px;
  flex: 1;
  background: var(--border);
  margin-top: 4px;
  min-height: 40px;
}
.step-content {
  padding: 14px 0 28px 16px;
}
.step-title {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.step-desc {
  font-size: 13px;
  color: var(--text2);
  line-height: 1.7;
}
.step-code {
  margin-top: 10px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 12px 14px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--cyan);
  line-height: 1.7;
  white-space: pre-wrap;
}
.step-code .kw { color: var(--purple); }
.step-code .fn { color: var(--amber); }
.step-code .cm { color: var(--text3); }

/* ── PRESETS ── */
.presets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media(max-width: 600px) { .presets-grid { grid-template-columns: 1fr; } }

.preset-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 24px;
  cursor: default;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}
.preset-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(224,90,43,0.06), transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.preset-card:hover::after { opacity: 1; }
.preset-card:hover { border-color: rgba(224,90,43,0.35); transform: translateY(-2px); }

.preset-status {
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 2px;
  display: inline-block;
  margin-bottom: 14px;
}
.status-dl { background: rgba(255,77,77,0.15); color: var(--red); border: 1px solid rgba(255,77,77,0.25); }
.status-safe { background: rgba(0,212,170,0.1); color: var(--cyan); border: 1px solid rgba(0,212,170,0.2); }

.preset-name {
  font-family: var(--display);
  font-size: 28px;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}
.preset-desc {
  font-size: 12px;
  color: var(--text2);
  line-height: 1.6;
  margin-bottom: 14px;
}
.preset-chain {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--red);
  background: rgba(255,77,77,0.06);
  border: 1px solid rgba(255,77,77,0.15);
  padding: 8px 12px;
  border-radius: 3px;
  word-break: break-all;
}
.preset-chain.safe { color: var(--cyan); background: rgba(0,212,170,0.05); border-color: rgba(0,212,170,0.15); }

/* ── STRATEGIES ── */
.strategies-list { display: flex; flex-direction: column; gap: 12px; }
.strategy {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px;
  transition: all 0.3s;
  cursor: default;
  align-items: start;
}
.strategy:hover {
  border-color: rgba(0,212,170,0.3);
  background: rgba(0,212,170,0.03);
}
.strategy-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.3s;
}
.strategy:hover .strategy-icon {
  border-color: var(--cyan);
  box-shadow: 0 0 14px rgba(0,212,170,0.2);
}
.strategy-name {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cyan);
  margin-bottom: 6px;
}
.strategy-body {
  font-size: 13px;
  color: var(--text2);
  line-height: 1.7;
}
.strategy-tag {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--amber);
  margin-top: 6px;
  display: inline-block;
}

/* ── TECH STACK ── */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media(max-width: 600px) { .tech-grid { grid-template-columns: 1fr 1fr; } }

.tech-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px 16px;
  text-align: center;
  transition: all 0.3s;
  cursor: default;
}
.tech-card:hover {
  border-color: var(--accent);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.tech-icon { font-size: 28px; margin-bottom: 10px; }
.tech-name {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.tech-role { font-size: 11px; color: var(--text3); line-height: 1.5; }

/* ── COFFMAN SECTION ── */
.coffman-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media(max-width: 600px) { .coffman-grid { grid-template-columns: 1fr; } }

.coffman-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  cursor: default;
}
.coffman-card:hover {
  border-color: rgba(255,77,77,0.4);
  box-shadow: 0 0 24px rgba(255,77,77,0.08);
}
.coffman-num {
  font-family: var(--display);
  font-size: 64px;
  color: rgba(255,77,77,0.06);
  position: absolute;
  bottom: -8px;
  right: 10px;
  line-height: 1;
}
.coffman-title {
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--red);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.coffman-dot-small {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 8px var(--red);
  animation: pulse 2s ease infinite;
}
.coffman-body { font-size: 13px; color: var(--text2); line-height: 1.6; }

/* ── FLOW DIAGRAM ── */
.flow-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 32px;
  overflow-x: auto;
}
.flow {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 600px;
  justify-content: center;
}
.flow-node {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 14px 16px;
  text-align: center;
  min-width: 110px;
  transition: all 0.3s;
  cursor: default;
}
.flow-node:hover {
  border-color: var(--cyan);
  background: rgba(0,212,170,0.05);
  transform: translateY(-2px);
}
.flow-node-label {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 5px;
}
.flow-node-val {
  font-size: 13px;
  color: var(--text2);
  font-weight: 500;
}
.flow-arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--text3);
  padding: 0 8px;
  animation: arrowPulse 1.5s ease infinite;
}
.flow-node.result:hover { border-color: var(--accent2); background: rgba(255,140,85,0.05); }

/* ── FOOTER ── */
footer {
  border-top: 1px solid var(--border);
  padding: 40px 0;
  text-align: center;
}
.footer-title {
  font-family: var(--display);
  font-size: 36px;
  color: var(--text3);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
.footer-sub {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text3);
  letter-spacing: 0.15em;
}
.footer-sub span { color: var(--accent); }

/* ── ANIMATIONS ── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.8); }
}
@keyframes arrowPulse {
  0%, 100% { opacity: 0.3; transform: translateX(0); }
  50%       { opacity: 0.7; transform: translateX(3px); }
}
@keyframes scrollAnim {
  0%, 100% { opacity: 0.4; transform: scaleY(1); }
  50%       { opacity: 1; transform: scaleY(1.1); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes deadlockBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* Scroll-reveal */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── TYPING CURSOR ── */
.blink {
  animation: deadlockBlink 1.1s step-end infinite;
  color: var(--accent);
}
</style>
</head>
<body>

<canvas id="bg-canvas"></canvas>

<div class="container">

  <!-- ── HERO ── -->
  <section class="hero" style="border: none; padding-top: 80px;">
    <div class="hero-eyebrow">README · Automated Deadlock Detection Tool</div>
    <div class="hero-title">
      <span class="line1">DEADLOCK</span>
      <span class="line2">DETECTION</span>
      <span class="line3">TOOL<span class="blink">_</span></span>
    </div>
    <p class="hero-sub">
      A browser-based OS tool that models process-resource dependencies,<br>
      detects circular wait conditions using DFS cycle detection,<br>
      and suggests automated resolution strategies.
    </p>
    <div class="hero-badges">
      <span class="badge badge-cyan">Pure HTML/CSS/JS</span>
      <span class="badge badge-orange">Canvas API</span>
      <span class="badge badge-red">DFS Algorithm</span>
      <span class="badge badge-blue">Wait-For Graph</span>
    </div>
    <div class="scroll-hint">
      <div class="scroll-line"></div>
      Scroll to explore
    </div>
  </section>

  <!-- ── WHAT IS DEADLOCK ── -->
  <section>
    <div class="sec-label reveal">01 · Concept</div>
    <h2 class="sec-title reveal">What Is<br>A Deadlock?</h2>

    <p class="reveal" style="font-size:15px;color:var(--text2);line-height:1.8;max-width:620px;margin-bottom:32px;">
      A <strong style="color:var(--text)">deadlock</strong> is a state in an operating system where two or more processes are permanently blocked — each waiting for a resource that another process holds. No process can proceed. The system is stuck.
    </p>

    <div class="concept-grid reveal">
      <div class="concept-card">
        <div class="concept-icon">🔒</div>
        <div class="concept-num">01</div>
        <div class="concept-name">Mutual Exclusion</div>
        <div class="concept-desc">Only one process can hold a resource at a time. Resources are non-shareable — if P1 holds R1, no one else can use it.</div>
      </div>
      <div class="concept-card">
        <div class="concept-icon">⏳</div>
        <div class="concept-num">02</div>
        <div class="concept-name">Hold &amp; Wait</div>
        <div class="concept-desc">A process holds at least one resource and waits to acquire additional resources currently held by others.</div>
      </div>
      <div class="concept-card">
        <div class="concept-icon">🚫</div>
        <div class="concept-num">03</div>
        <div class="concept-name">No Preemption</div>
        <div class="concept-desc">Resources cannot be forcibly taken from a process. Only the holding process can release them voluntarily.</div>
      </div>
      <div class="concept-card">
        <div class="concept-icon">🔄</div>
        <div class="concept-num">04</div>
        <div class="concept-name">Circular Wait</div>
        <div class="concept-desc">A closed chain of processes: P1 waits for P2, P2 waits for P3, … Pn waits for P1. No one can move.</div>
      </div>
    </div>

    <div class="demo-box reveal">
      <div class="demo-box-label">Live Animation — Classic Deadlock (P1 ↔ P2)</div>
      <canvas id="demo-canvas"></canvas>
    </div>
  </section>

  <!-- ── INPUT / OUTPUT ── -->
  <section>
    <div class="sec-label reveal">02 · Interface</div>
    <h2 class="sec-title reveal">Input &amp;<br>Output</h2>

    <div class="io-grid reveal">
      <div class="io-panel">
        <div class="io-header input">
          <div class="io-dot cyan"></div>
          System Configuration (Input)
        </div>
        <ul class="io-list">
          <li><strong>Processes</strong>Running programs competing for resources. e.g. P1, P2, P3</li>
          <li><strong>Resources</strong>Shared system assets. e.g. R1, R2, Fork1, Fork2</li>
          <li><strong>Allocations</strong>Which resource is currently held by which process. Format: R → P</li>
          <li><strong>Requests</strong>Which process is waiting for which resource. Format: P → R</li>
        </ul>
      </div>

      <div class="io-arrow">
        <svg class="arrow-svg" viewBox="0 0 30 60" fill="none">
          <path d="M15 5 L15 48 M6 38 L15 52 L24 38" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div class="io-panel">
        <div class="io-header output">
          <div class="io-dot orange"></div>
          Detection Results (Output)
        </div>
        <ul class="io-list out">
          <li><strong>RAG Visualization</strong>Interactive canvas drawing processes (circles), resources (rectangles), alloc &amp; request edges</li>
          <li><strong>Deadlock Status</strong>SAFE state or DEADLOCK found badge with cycle count</li>
          <li><strong>Cycle Path</strong>Exact circular wait shown e.g. P1 → P2 → P1</li>
          <li><strong>Resolution Strategies</strong>Process termination, resource preemption, ordering, Banker's algorithm</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ── ALGORITHM ── -->
  <section>
    <div class="sec-label reveal">03 · Algorithm</div>
    <h2 class="sec-title reveal">How It<br>Works</h2>

    <div class="algo-steps reveal">

      <div class="algo-step">
        <div class="step-line">
          <div class="step-num">1</div>
          <div class="step-connector"></div>
        </div>
        <div class="step-content">
          <div class="step-title">Build Wait-For Graph</div>
          <div class="step-desc">For every request edge P → R, find which process Q currently holds R. Add a directed edge P → Q (meaning "P is waiting for Q to release a resource").</div>
          <div class="step-code"><span class="cm">// For each request P→R, find who holds R</span>
<span class="kw">reqs</span>.forEach(({ p, r }) => {
  <span class="kw">const</span> holder = allocs.<span class="fn">find</span>(a => a.r === r);
  <span class="kw">if</span> (holder && holder.p !== p)
    waitFor[p].<span class="fn">push</span>(holder.p); <span class="cm">// P waits for holder</span>
});</div>
        </div>
      </div>

      <div class="algo-step">
        <div class="step-line">
          <div class="step-num">2</div>
          <div class="step-connector"></div>
        </div>
        <div class="step-content">
          <div class="step-title">DFS Cycle Detection</div>
          <div class="step-desc">Run Depth-First Search from every process node. Maintain a "call stack" set. If DFS visits a node already in the current stack → a cycle (deadlock) is found.</div>
          <div class="step-code"><span class="kw">function</span> <span class="fn">dfs</span>(node, path, inStack) {
  inStack.<span class="fn">add</span>(node); path.<span class="fn">push</span>(node);
  <span class="kw">for</span> (<span class="kw">const</span> nb <span class="kw">of</span> waitFor[node]) {
    <span class="kw">if</span> (inStack.<span class="fn">has</span>(nb)) {
      allCycles.<span class="fn">push</span>([...path, nb]); <span class="cm">// 🔴 cycle!</span>
    } <span class="kw">else</span> <span class="fn">dfs</span>(nb, [...path], <span class="kw">new</span> Set(inStack));
  }
}</div>
        </div>
      </div>

      <div class="algo-step">
        <div class="step-line">
          <div class="step-num">3</div>
          <div class="step-connector"></div>
        </div>
        <div class="step-content">
          <div class="step-title">Deduplicate Cycles</div>
          <div class="step-desc">DFS can find the same cycle multiple times starting from different nodes. Cycles are normalized (sorted) and deduplicated using a Set of canonical keys.</div>
          <div class="step-code"><span class="kw">const</span> unique = allCycles.<span class="fn">filter</span>(c => {
  <span class="kw">const</span> key = [...c].<span class="fn">slice</span>(0,-1).<span class="fn">sort</span>().<span class="fn">join</span>('|');
  <span class="kw">if</span> (seen.<span class="fn">has</span>(key)) <span class="kw">return false</span>;
  seen.<span class="fn">add</span>(key); <span class="kw">return true</span>;
});</div>
        </div>
      </div>

      <div class="algo-step">
        <div class="step-line">
          <div class="step-num">4</div>
        </div>
        <div class="step-content">
          <div class="step-title">Mark &amp; Visualize</div>
          <div class="step-desc">All nodes and edges involved in cycles are added to a deadlockNodes/deadlockEdges Set. The canvas redraws them in red with a glowing shadow. Resolution strategies are generated per cycle.</div>
          <div class="step-code"><span class="cm">// Highlight deadlock nodes red on canvas</span>
<span class="kw">if</span> (isDL) { ctx.shadowColor = <span class="fn">'#e24b4a'</span>; ctx.shadowBlur = 18; }
ctx.strokeStyle = isDL ? <span class="fn">'#e24b4a'</span> : <span class="fn">'#4a8fe8'</span>;</div>
        </div>
      </div>

    </div>
  </section>

  <!-- ── PRESETS ── -->
  <section>
    <div class="sec-label reveal">04 · Scenarios</div>
    <h2 class="sec-title reveal">Built-in<br>Presets</h2>

    <div class="presets-grid reveal">
      <div class="preset-card" onmousemove="tiltCard(event,this)">
        <div class="preset-status status-dl">⚠ Deadlock</div>
        <div class="preset-name">Classic (2P)</div>
        <div class="preset-desc">The simplest deadlock. P1 holds R1 and wants R2. P2 holds R2 and wants R1. Neither can proceed.</div>
        <div class="preset-chain">P1 → P2 → P1</div>
      </div>

      <div class="preset-card" onmousemove="tiltCard(event,this)">
        <div class="preset-status status-dl">⚠ Deadlock</div>
        <div class="preset-name">Dining (3P)</div>
        <div class="preset-desc">The Dining Philosophers problem. Each philosopher holds their left fork and waits for the right fork — held by their neighbor.</div>
        <div class="preset-chain">P1 → P2 → P3 → P1</div>
      </div>

      <div class="preset-card" onmousemove="tiltCard(event,this)">
        <div class="preset-status status-dl">⚠ Deadlock</div>
        <div class="preset-name">Chain (4P)</div>
        <div class="preset-desc">Four-process chain deadlock. Each process holds one resource and waits for the next, forming a full circular loop.</div>
        <div class="preset-chain">P1 → P2 → P3 → P4 → P1</div>
      </div>

      <div class="preset-card" onmousemove="tiltCard(event,this)">
        <div class="preset-status status-safe">✓ Safe</div>
        <div class="preset-name">Safe State</div>
        <div class="preset-desc">No deadlock. P3 has no allocation yet, so P2 can eventually get R1, finish, and release. P3 can then proceed.</div>
        <div class="preset-chain safe">No circular wait — all processes can complete</div>
      </div>
    </div>
  </section>

  <!-- ── COFFMAN CONDITIONS ── -->
  <section>
    <div class="sec-label reveal">05 · Theory</div>
    <h2 class="sec-title reveal">Coffman<br>Conditions</h2>
    <p class="reveal" style="font-size:13px;color:var(--text2);margin-bottom:28px;line-height:1.8;max-width:500px;">
      All four must hold simultaneously for a deadlock to occur. Your tool detects and flags all four when a cycle is found.
    </p>
    <div class="coffman-grid reveal">
      <div class="coffman-card">
        <div class="coffman-num">1</div>
        <div class="coffman-title"><div class="coffman-dot-small"></div>Mutual Exclusion</div>
        <div class="coffman-body">Resources are non-shareable. At any moment, exactly one process can use a resource instance.</div>
      </div>
      <div class="coffman-card">
        <div class="coffman-num">2</div>
        <div class="coffman-title"><div class="coffman-dot-small"></div>Hold &amp; Wait</div>
        <div class="coffman-body">A process is holding at least one resource while simultaneously waiting for more resources held by others.</div>
      </div>
      <div class="coffman-card">
        <div class="coffman-num">3</div>
        <div class="coffman-title"><div class="coffman-dot-small"></div>No Preemption</div>
        <div class="coffman-body">Resources cannot be forcibly reclaimed. A process must voluntarily release them after completing its task.</div>
      </div>
      <div class="coffman-card">
        <div class="coffman-num">4</div>
        <div class="coffman-title"><div class="coffman-dot-small"></div>Circular Wait</div>
        <div class="coffman-body">There exists a circular chain P1→P2→…→Pn→P1 where each process waits for the next. Detected by DFS.</div>
      </div>
    </div>
  </section>

  <!-- ── RESOLUTION STRATEGIES ── -->
  <section>
    <div class="sec-label reveal">06 · Recovery</div>
    <h2 class="sec-title reveal">Resolution<br>Strategies</h2>

    <div class="strategies-list reveal">
      <div class="strategy">
        <div class="strategy-icon">💀</div>
        <div>
          <div class="strategy-name">Process Termination</div>
          <div class="strategy-body">Identify and kill the lowest-cost "victim" process to break the deadlock cycle. The Banker's Algorithm can determine the optimal victim. The killed process can be restarted later.</div>
          <span class="strategy-tag">→ Breaks circular wait immediately</span>
        </div>
      </div>
      <div class="strategy">
        <div class="strategy-icon">⚡</div>
        <div>
          <div class="strategy-name">Resource Preemption</div>
          <div class="strategy-body">Forcibly reclaim a held resource from a process and roll that process back to a previously saved checkpoint (safe state). The preempted resource is then granted to the waiting process.</div>
          <span class="strategy-tag">→ Requires checkpoint/rollback support</span>
        </div>
      </div>
      <div class="strategy">
        <div class="strategy-icon">📋</div>
        <div>
          <div class="strategy-name">Prevention — Global Ordering</div>
          <div class="strategy-body">Enforce a fixed global resource ordering (e.g. R1 &lt; R2 &lt; R3). All processes must request resources in this order. This makes circular wait structurally impossible.</div>
          <span class="strategy-tag">→ Eliminates circular wait condition</span>
        </div>
      </div>
      <div class="strategy">
        <div class="strategy-icon">🏦</div>
        <div>
          <div class="strategy-name">Banker's Algorithm</div>
          <div class="strategy-body">Before granting any resource request, simulate the allocation and check if the system can still reach a safe state (where all processes can eventually finish). If unsafe → deny the request and make the process wait.</div>
          <span class="strategy-tag">→ Avoidance strategy (prevents deadlock before it occurs)</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ── FLOW ── -->
  <section>
    <div class="sec-label reveal">07 · Flow</div>
    <h2 class="sec-title reveal">End-to-End<br>Pipeline</h2>

    <div class="flow-wrap reveal">
      <div class="flow">
        <div class="flow-node">
          <div class="flow-node-label">Step 1</div>
          <div class="flow-node-val">Add Processes &amp; Resources</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">
          <div class="flow-node-label">Step 2</div>
          <div class="flow-node-val">Set Allocations &amp; Requests</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">
          <div class="flow-node-label">Step 3</div>
          <div class="flow-node-val">Build Wait-For Graph</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">
          <div class="flow-node-label">Step 4</div>
          <div class="flow-node-val">DFS Cycle Detection</div>
        </div>
        <div class="flow-arrow">→</div>
        <div class="flow-node result">
          <div class="flow-node-label">Output</div>
          <div class="flow-node-val">SAFE / DEADLOCK + Fix</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ── TECH STACK ── -->
  <section>
    <div class="sec-label reveal">08 · Stack</div>
    <h2 class="sec-title reveal">Technologies<br>Used</h2>

    <div class="tech-grid reveal">
      <div class="tech-card">
        <div class="tech-icon">🌐</div>
        <div class="tech-name">HTML5</div>
        <div class="tech-role">UI structure — panels, inputs, canvas element, buttons</div>
      </div>
      <div class="tech-card">
        <div class="tech-icon">🎨</div>
        <div class="tech-name">CSS3</div>
        <div class="tech-role">Dark theme, CSS variables, grid layout, animations, responsive design</div>
      </div>
      <div class="tech-card">
        <div class="tech-icon">⚙️</div>
        <div class="tech-name">JavaScript</div>
        <div class="tech-role">All logic — data management, DFS algorithm, state, event handling</div>
      </div>
      <div class="tech-card">
        <div class="tech-icon">🖼️</div>
        <div class="tech-name">Canvas API</div>
        <div class="tech-role">Draws the RAG — circles, rectangles, arrows, hover glow effects</div>
      </div>
      <div class="tech-card">
        <div class="tech-icon">🔤</div>
        <div class="tech-name">Google Fonts</div>
        <div class="tech-role">JetBrains Mono (monospace) + Syne (headings) for visual identity</div>
      </div>
      <div class="tech-card">
        <div class="tech-icon">📦</div>
        <div class="tech-name">Zero Deps</div>
        <div class="tech-role">No libraries, no frameworks — pure vanilla HTML/CSS/JS only</div>
      </div>
    </div>
  </section>

  <!-- ── FOOTER ── -->
  <footer>
    <div class="footer-title">DEADLOCK DETECTOR</div>
    <div class="footer-sub">Resource Allocation Graph Analyzer · <span>OS Concepts Project</span></div>
  </footer>

</div>

<script>
// ── ANIMATED BACKGROUND ──
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let W, H, nodes = [], edges = [];

function resizeBg() {
  W = bgCanvas.width  = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener('resize', resizeBg);

// Create floating graph nodes
for (let i = 0; i < 18; i++) {
  nodes.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() > 0.5 ? 6 : 5,
    type: Math.random() > 0.5 ? 'proc' : 'res',
    alpha: 0.15 + Math.random() * 0.2
  });
}

function animateBg() {
  bgCtx.clearRect(0, 0, W, H);
  nodes.forEach(n => {
    n.x += n.vx; n.y += n.vy;
    if (n.x < 0) n.x = W;
    if (n.x > W) n.x = 0;
    if (n.y < 0) n.y = H;
    if (n.y > H) n.y = 0;
  });
  // Draw edges between nearby nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < 180) {
        bgCtx.beginPath();
        bgCtx.moveTo(nodes[i].x, nodes[i].y);
        bgCtx.lineTo(nodes[j].x, nodes[j].y);
        bgCtx.strokeStyle = `rgba(224,90,43,${0.04 * (1 - d/180)})`;
        bgCtx.lineWidth = 1;
        bgCtx.stroke();
      }
    }
  }
  nodes.forEach(n => {
    bgCtx.beginPath();
    if (n.type === 'proc') {
      bgCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(74,143,232,${n.alpha})`;
    } else {
      bgCtx.rect(n.x - n.r * 1.2, n.y - n.r * 0.7, n.r * 2.4, n.r * 1.4);
      bgCtx.fillStyle = `rgba(0,212,170,${n.alpha})`;
    }
    bgCtx.fill();
  });
  requestAnimationFrame(animateBg);
}
animateBg();

// ── DEMO CANVAS (Classic Deadlock) ──
const demoCanvas = document.getElementById('demo-canvas');
const demoCtx = demoCanvas.getContext('2d');
let demoT = 0;

function drawDemo() {
  const dpr = window.devicePixelRatio || 1;
  demoCanvas.width  = demoCanvas.clientWidth  * dpr;
  demoCanvas.height = demoCanvas.clientHeight * dpr;
  demoCtx.scale(dpr, dpr);
  const W = demoCanvas.clientWidth, H = demoCanvas.clientHeight;

  demoCtx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const spread = Math.min(W * 0.28, 130);

  const P1 = { x: cx - spread, y: cy };
  const R1 = { x: cx - spread * 0.3, y: cy - spread * 0.7 };
  const P2 = { x: cx + spread, y: cy };
  const R2 = { x: cx + spread * 0.3, y: cy - spread * 0.7 };

  // animated pulse on deadlock edges
  const t = demoT;
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.05);

  // Draw alloc edges (R→P, green)
  drawDemoArrow(demoCtx, R1, P1, `rgba(0,212,170,${0.4 + pulse * 0.4})`, false);
  drawDemoArrow(demoCtx, R2, P2, `rgba(0,212,170,${0.4 + pulse * 0.4})`, false);
  // Draw request edges (P→R, dashed orange/red pulsing)
  drawDemoArrow(demoCtx, P1, R2, `rgba(255,${Math.floor(77 + pulse * 100)},77,${0.5 + pulse * 0.5})`, true);
  drawDemoArrow(demoCtx, P2, R1, `rgba(255,${Math.floor(77 + pulse * 100)},77,${0.5 + pulse * 0.5})`, true);

  // Nodes
  drawDemoNode(demoCtx, P1.x, P1.y, 'P1', true, pulse);
  drawDemoNode(demoCtx, P2.x, P2.y, 'P2', true, pulse);
  drawDemoRect(demoCtx, R1.x, R1.y, 'R1', true, pulse);
  drawDemoRect(demoCtx, R2.x, R2.y, 'R2', true, pulse);

  // Label
  demoCtx.fillStyle = `rgba(255,77,77,${0.3 + pulse * 0.5})`;
  demoCtx.font = `bold ${12}px Space Mono, monospace`;
  demoCtx.textAlign = 'center';
  demoCtx.fillText('⚠ DEADLOCK DETECTED', cx, H - 18);

  demoT++;
  requestAnimationFrame(drawDemo);
}
drawDemo();

function drawDemoArrow(ctx, from, to, color, dashed) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const r = 22;
  const sx = from.x + r * Math.cos(angle);
  const sy = from.y + r * Math.sin(angle);
  const ex = to.x   - r * Math.cos(angle);
  const ey = to.y   - r * Math.sin(angle);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.shadowColor = color; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur = 0;
  // arrowhead
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.translate(ex, ey); ctx.rotate(angle);
  ctx.moveTo(0, 0); ctx.lineTo(-10, -4); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawDemoNode(ctx, x, y, label, isDL, pulse) {
  ctx.save();
  ctx.shadowColor = '#e24b4a'; ctx.shadowBlur = 10 + pulse * 14;
  ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI*2);
  ctx.fillStyle = `rgba(226,75,74,${0.1 + pulse * 0.12})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(226,75,74,${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#f08080'; ctx.font = 'bold 13px Space Mono, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawDemoRect(ctx, x, y, label, isDL, pulse) {
  const w = 52, h = 28;
  ctx.save();
  ctx.shadowColor = '#e24b4a'; ctx.shadowBlur = 10 + pulse * 14;
  ctx.beginPath(); ctx.roundRect(x-w/2, y-h/2, w, h, 4);
  ctx.fillStyle = `rgba(226,75,74,${0.1 + pulse * 0.12})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(226,75,74,${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#f08080'; ctx.font = 'bold 13px Space Mono, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

// ── SCROLL REVEAL ──
const reveals = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      e.target.style.transitionDelay = (i % 4) * 0.08 + 's';
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(r => io.observe(r));

// ── PRESET CARD MOUSE GLOW ──
function tiltCard(e, card) {
  const rect = card.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
  const my = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
  card.style.setProperty('--mx', mx + '%');
  card.style.setProperty('--my', my + '%');
}
</script>
</body>
</html>
