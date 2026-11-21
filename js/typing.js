// ---------- Word bank ----------
const WORDS = [
    "function", "variable", "array", "loop", "string", "object", "return", "const",
    "class", "import", "export", "async", "await", "promise", "event", "click",
    "style", "grid", "flex", "color", "border", "server", "client", "database",
    "query", "syntax", "debug", "compile", "build", "deploy", "commit", "branch",
    "merge", "token", "module", "package", "script", "button", "input", "output",
    "number", "boolean", "index", "value", "key", "map", "filter", "reduce",
    "sort", "stack", "queue", "pointer", "memory", "thread", "cache", "route",
    "layout", "render", "state", "hook", "test", "error", "fix", "code", "logic",
    "data", "file", "path", "node", "tree", "graph", "list", "set", "type",
    "scope", "closure", "callback", "parse", "format", "method", "field", "vector"
];

// ---------- Elements ----------
const wordsEl = document.getElementById("words");
const inputEl = document.getElementById("input");
const boxEl = document.getElementById("box");
const timeEl = document.getElementById("time");
const wpmEl = document.getElementById("wpm");
const accEl = document.getElementById("acc");
const bestEl = document.getElementById("best");
const resultEl = document.getElementById("result");
const modeButtons = document.querySelectorAll(".mode");

// ---------- State ----------
let duration = 30;
let target = "";
let spans = [];
let started = false;
let finished = false;
let startTime = 0;
let timerId = null;
let totalKeys = 0;
let wrongKeys = 0;

// ---------- Best score (saved per duration) ----------
function loadBest() {
    try { return JSON.parse(localStorage.getItem("typingBest") || "{}"); }
    catch { return {}; }
}
function saveBest(best) {
    try { localStorage.setItem("typingBest", JSON.stringify(best)); }
    catch { /* storage unavailable: ignore */ }
}
function showBest() {
    const value = loadBest()[duration];
    bestEl.textContent = value ? value : "–";
}

// ---------- Text generation ----------
function randomWords(count) {
    const out = [];
    let previous = "";
    while (out.length < count) {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        if (word !== previous) { out.push(word); previous = word; }
    }
    return out.join(" ");
}

function appendText(text) {
    for (const ch of text) {
        const span = document.createElement("span");
        span.className = "ch";
        span.textContent = ch;
        wordsEl.append(span);
        spans.push(span);
        target += ch;
    }
}

// ---------- Rendering ----------
function render() {
    const typed = inputEl.value;

    spans.forEach((span, i) => {
        let cls = "ch";
        if (i < typed.length) cls += typed[i] === target[i] ? " ok" : " bad";
        else if (i === typed.length) cls += " cur";
        span.className = cls;
    });

    // keep the text from ever running out
    if (typed.length > target.length - 60) appendText(randomWords(30) + " ");

    // scroll so the current line stays in the middle of the box
    const current = spans[typed.length];
    if (current) {
        const lineHeight = parseFloat(getComputedStyle(wordsEl).lineHeight);
        wordsEl.scrollTop = Math.max(0, current.offsetTop - lineHeight);
    }
}

// ---------- Stats ----------
function correctChars() {
    const typed = inputEl.value;
    let n = 0;
    for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) n++;
    return n;
}

function accuracy() {
    return totalKeys ? Math.round(((totalKeys - wrongKeys) / totalKeys) * 100) : 100;
}

function wpmAt(seconds) {
    const minutes = Math.max(seconds, 1) / 60;   // avoids huge numbers in the first second
    return Math.round(correctChars() / 5 / minutes);
}

function updateStats() {
    const elapsed = (performance.now() - startTime) / 1000;
    timeEl.textContent = Math.max(0, Math.ceil(duration - elapsed));
    wpmEl.textContent = wpmAt(elapsed);
    accEl.textContent = accuracy() + "%";
}

// ---------- Flow ----------
function start() {
    started = true;
    startTime = performance.now();
    timerId = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= duration) finish();
        else updateStats();
    }, 100);
}

function finish() {
    finished = true;
    clearInterval(timerId);
    inputEl.disabled = true;
    boxEl.classList.add("unfocused");

    const wpm = wpmAt(duration);
    const acc = accuracy();

    timeEl.textContent = 0;
    wpmEl.textContent = wpm;
    accEl.textContent = acc + "%";

    // best score
    const best = loadBest();
    const previous = best[duration] || 0;
    const isNewBest = wpm > previous;
    if (isNewBest) { best[duration] = wpm; saveBest(best); }
    showBest();

    document.getElementById("r-wpm").textContent = wpm;
    document.getElementById("r-acc").textContent = acc + "%";
    document.getElementById("r-chars").textContent = correctChars();
    document.getElementById("r-note").textContent = isNewBest && wpm > 0
        ? `New best for ${duration} seconds.`
        : `Your best for ${duration} seconds is ${Math.max(previous, wpm)} WPM.`;
    resultEl.hidden = false;
}

function reset() {
    clearInterval(timerId);
    started = false;
    finished = false;
    totalKeys = 0;
    wrongKeys = 0;
    target = "";
    spans = [];
    wordsEl.innerHTML = "";
    wordsEl.scrollTop = 0;

    inputEl.disabled = false;
    inputEl.value = "";
    resultEl.hidden = true;

    timeEl.textContent = duration;
    wpmEl.textContent = 0;
    accEl.textContent = "100%";
    showBest();

    appendText(randomWords(60) + " ");
    render();
    inputEl.focus();
}

// ---------- Events ----------
inputEl.addEventListener("input", e => {
    if (finished) return;
    if (!started) start();

    // count every typed character for accuracy (corrected mistakes still count)
    if (e.inputType === "insertText" && e.data) {
        const typed = inputEl.value;
        for (let k = 0; k < e.data.length; k++) {
            const index = typed.length - e.data.length + k;
            totalKeys++;
            if (typed[index] !== target[index]) wrongKeys++;
        }
    }

    render();
    updateStats();
});

inputEl.addEventListener("paste", e => e.preventDefault());
inputEl.addEventListener("focus", () => boxEl.classList.remove("unfocused"));
inputEl.addEventListener("blur", () => boxEl.classList.add("unfocused"));
boxEl.addEventListener("click", () => { if (!finished) inputEl.focus(); });

document.getElementById("restart").addEventListener("click", reset);
document.addEventListener("keydown", e => { if (e.key === "Escape") reset(); });

modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        modeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        duration = Number(btn.dataset.time);
        reset();
    });
});

reset();