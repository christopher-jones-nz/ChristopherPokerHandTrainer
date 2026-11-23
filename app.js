if (typeof RAW_RANGES === "undefined") {
  document.getElementById("feedback").textContent =
    "Error: ranges.js failed to load.";
  document.getElementById("feedback").style.color = "#ff8787";
  throw new Error(
    "RAW_RANGES is undefined. Ensure ranges.js is in the same directory.",
  );
}

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = [
  { key: "s", symbol: "♠", name: "spades" },
  { key: "h", symbol: "♥", name: "hearts" },
  { key: "d", symbol: "♦", name: "diamonds" },
  { key: "c", symbol: "♣", name: "clubs" },
];

function parseHandPart(part) {
  return {
    r1: RANKS.indexOf(part[0]),
    r2: RANKS.indexOf(part[1]),
    type: part.slice(2),
  };
}

function expandRange(tokens) {
  const set = new Set();

  for (const rawToken of tokens) {
    const token = rawToken.trim();

    if (/os\+?$|so\+?$/.test(token)) {
      const expanded = expandRange([
        token.replace(/os|so/, "o"),
        token.replace(/os|so/, "s"),
      ]);
      expanded.forEach((h) => set.add(h));
      continue;
    }

    const isPlus = token.endsWith("+");
    const clean = isPlus ? token.slice(0, -1) : token;

    if (clean.includes("-")) {
      const [startStr, endStr] = clean.split("-");
      const start = parseHandPart(startStr);
      const end = parseHandPart(endStr);
      const type = start.type || end.type;

      if (start.r1 < 0 || start.r2 < 0 || end.r1 < 0 || end.r2 < 0) {
        console.warn(`Invalid range token: ${rawToken}`);
        continue;
      }

      const d1 = end.r1 - start.r1;
      const d2 = end.r2 - start.r2;

      if (start.r1 === start.r2 && end.r1 === end.r2) {
        const step = Math.sign(d1) || 1;
        for (
          let i = start.r1;
          step > 0 ? i <= end.r1 : i >= end.r1;
          i += step
        ) {
          set.add(RANKS[i] + RANKS[i]);
        }
      } else if (d1 === 0) {
        const step = Math.sign(d2) || 1;
        for (
          let i = start.r2;
          step > 0 ? i <= end.r2 : i >= end.r2;
          i += step
        ) {
          set.add(RANKS[start.r1] + RANKS[i] + type);
        }
      } else if (d1 === d2) {
        const steps = Math.abs(d1);
        const step = Math.sign(d1);
        for (let k = 0; k <= steps; k++) {
          set.add(
            RANKS[start.r1 + k * step] + RANKS[start.r2 + k * step] + type,
          );
        }
        if (isPlus) {
          let up1 = start.r1 - 1;
          let up2 = start.r2 - 1;
          while (up1 >= 0 && up2 >= 0) {
            set.add(RANKS[up1] + RANKS[up2] + type);
            up1--;
            up2--;
          }
        }
      } else {
        console.warn(`Unsupported dash range format: ${rawToken}`);
      }
      continue;
    }

    const { r1, r2, type } = parseHandPart(clean);
    if (r1 < 0 || r2 < 0) {
      console.warn(`Invalid hand token: ${rawToken}`);
      continue;
    }

    if (!isPlus) {
      set.add(clean);
      continue;
    }

    if (r1 === r2) {
      for (let i = r1; i >= 0; i--) set.add(RANKS[i] + RANKS[i]);
    } else {
      for (let i = r2; i > r1; i--) set.add(RANKS[r1] + RANKS[i] + type);
    }
  }

  return set;
}

const RANGES = Object.fromEntries(
  Object.entries(RAW_RANGES).map(([pos, tokens]) => [pos, expandRange(tokens)]),
);
const POSITIONS = Object.keys(RANGES);
const MODES = ["Random", ...POSITIONS];

// Sound Effects (Web Audio API)
const soundBtnEl = document.getElementById("soundBtn");
let isSoundEnabled = localStorage.getItem("soundEnabled") !== "false";
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSuccessSound() {
  if (!isSoundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 987.77, start: 0, duration: 0.16 }, // B5
    { freq: 1318.51, start: 0.08, duration: 0.34 }, // E6 ("cha-ching" chime)
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.linearRampToValueAtTime(0.18, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });
}

function playErrorSound() {
  if (!isSoundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(550, now);
  filter.connect(ctx.destination);

  // "Womp" 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(196.0, now);
  osc1.frequency.linearRampToValueAtTime(185.0, now + 0.2);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.14, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  osc1.connect(gain1);
  gain1.connect(filter);
  osc1.start(now);
  osc1.stop(now + 0.22);

  // "Womp" 2 (descending slide)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(174.61, now + 0.24);
  osc2.frequency.exponentialRampToValueAtTime(130.81, now + 0.62);

  gain2.gain.setValueAtTime(0.001, now + 0.24);
  gain2.gain.linearRampToValueAtTime(0.15, now + 0.26);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.64);

  osc2.connect(gain2);
  gain2.connect(filter);
  osc2.start(now + 0.24);
  osc2.stop(now + 0.64);
}

function applySoundState() {
  soundBtnEl.classList.toggle("active", isSoundEnabled);
}

soundBtnEl.addEventListener("click", () => {
  isSoundEnabled = !isSoundEnabled;
  localStorage.setItem("soundEnabled", String(isSoundEnabled));
  applySoundState();
  if (isSoundEnabled) playSuccessSound();
});

applySoundState();

// 4-Color Deck Preference
const fourColorBtnEl = document.getElementById("fourColorBtn");
let isFourColor = localStorage.getItem("fourColorDeck") === "true";

function applyFourColorState() {
  document.body.classList.toggle("four-color", isFourColor);
  fourColorBtnEl.classList.toggle("active", isFourColor);
}

fourColorBtnEl.addEventListener("click", () => {
  isFourColor = !isFourColor;
  localStorage.setItem("fourColorDeck", String(isFourColor));
  applyFourColorState();
});

applyFourColorState();

// Navigation State
let activePage = "trainer";
let selectedChartPos = POSITIONS[0];

const tabTrainerEl = document.getElementById("tabTrainer");
const tabChartsEl = document.getElementById("tabCharts");
const pageTrainerEl = document.getElementById("pageTrainer");
const pageChartsEl = document.getElementById("pageCharts");
const trainerModeBarEl = document.getElementById("trainerModeBar");
const posToggleBarEl = document.getElementById("posToggleBar");
const matrixGridEl = document.getElementById("matrixGrid");
const rangeStatsEl = document.getElementById("rangeStats");

function switchPage(page) {
  activePage = page;
  const isTrainer = page === "trainer";
  tabTrainerEl.classList.toggle("active", isTrainer);
  tabChartsEl.classList.toggle("active", !isTrainer);
  pageTrainerEl.classList.toggle("hidden", !isTrainer);
  pageChartsEl.classList.toggle("hidden", isTrainer);

  if (!isTrainer) {
    renderChartView();
  }
}

tabTrainerEl.addEventListener("click", () => switchPage("trainer"));
tabChartsEl.addEventListener("click", () => switchPage("charts"));

function initChartToggles() {
  posToggleBarEl.innerHTML = POSITIONS.map(
    (pos) => `
    <button class="pos-toggle-btn ${pos === selectedChartPos ? "active" : ""}" data-pos="${pos}">
      ${pos}
    </button>
  `,
  ).join("");

  posToggleBarEl.querySelectorAll(".pos-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedChartPos = btn.dataset.pos;
      renderChartView();
    });
  });
}

function renderChartView() {
  posToggleBarEl.querySelectorAll(".pos-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.pos === selectedChartPos);
  });

  const activeSet = RANGES[selectedChartPos];
  let combos = 0;
  const cellsHtml = [];

  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      let label = "";
      let cellCombos = 0;

      if (r === c) {
        label = RANKS[r] + RANKS[c];
        cellCombos = 6;
      } else if (r < c) {
        label = RANKS[r] + RANKS[c] + "s";
        cellCombos = 4;
      } else {
        label = RANKS[c] + RANKS[r] + "o";
        cellCombos = 12;
      }

      const inRange = activeSet.has(label);
      if (inRange) combos += cellCombos;

      cellsHtml.push(
        `<div class="matrix-cell ${inRange ? "in-range" : ""}">${label}</div>`,
      );
    }
  }

  matrixGridEl.innerHTML = cellsHtml.join("");
  const pct = ((combos / 1326) * 100).toFixed(1);
  rangeStatsEl.textContent = `${pct}% (${combos} combos)`;
}

// Independent Puzzle State per Mode
let selectedMode = "Random";
const puzzleStates = Object.fromEntries(
  MODES.map((mode) => [
    mode,
    {
      streak: 0,
      highScore: 0,
      prevScore: null,
      mistakes: [],
      isReplaying: false,
    },
  ]),
);

function getState() {
  return puzzleStates[selectedMode];
}

let currentHand = "";
let currentCards = [];
let currentPos = "";
let locked = false;
let nextTimer = null;

const boardEl = document.getElementById("board");
const posEl = document.getElementById("position");
const cardsContainerEl = document.getElementById("cardsContainer");
const feedbackEl = document.getElementById("feedback");
const streakEl = document.getElementById("streak");
const highScoreEl = document.getElementById("highScore");
const prevScoreEl = document.getElementById("prevScore");
const replayBannerEl = document.getElementById("replayBanner");
const replayBtnEl = document.getElementById("replayBtn");
const mistakeCountEl = document.getElementById("mistakeCount");
const mistakeListEl = document.getElementById("mistakeList");

function initTrainerModes() {
  trainerModeBarEl.innerHTML = MODES.map(
    (mode) => `
    <button class="mode-btn ${mode === selectedMode ? "active" : ""}" data-mode="${mode}">
      ${mode}
    </button>
  `,
  ).join("");

  trainerModeBarEl.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectTrainerMode(btn.dataset.mode);
    });
  });
}

function selectTrainerMode(mode) {
  if (selectedMode === mode) return;
  clearTimeout(nextTimer);
  selectedMode = mode;

  trainerModeBarEl.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === selectedMode);
  });

  updateScoreboard();
  nextCard();
}

function updateScoreboard() {
  const state = getState();
  streakEl.textContent = state.streak;
  highScoreEl.textContent = state.highScore;
  prevScoreEl.textContent = state.prevScore === null ? "-" : state.prevScore;
}

function renderMistakes() {
  const state = getState();
  mistakeCountEl.textContent = state.mistakes.length;
  replayBtnEl.disabled = state.mistakes.length === 0 && !state.isReplaying;

  if (state.isReplaying) {
    replayBtnEl.textContent = "Exit Replay";
    replayBtnEl.classList.add("active");
  } else {
    replayBtnEl.textContent = "Replay Mistakes";
    replayBtnEl.classList.remove("active");
  }

  if (state.mistakes.length === 0) {
    mistakeListEl.innerHTML =
      '<div class="mistake-empty">No mistakes yet</div>';
    return;
  }

  mistakeListEl.innerHTML = state.mistakes
    .map((m, idx) => {
      const isCurrent = state.isReplaying && idx === 0;
      return `
        <div class="mistake-item ${isCurrent ? "current" : ""}">
          <span class="mistake-hand">${m.hand}</span>
          <span class="mistake-pos">${m.pos}</span>
        </div>
      `;
    })
    .join("");
}

function toggleReplay() {
  const state = getState();
  clearTimeout(nextTimer);
  if (state.isReplaying) {
    state.isReplaying = false;
    nextCard();
    return;
  }
  if (state.mistakes.length === 0) return;
  state.isReplaying = true;
  nextCard();
}

function dealHand() {
  const c1 = Math.floor(Math.random() * 52);
  let c2 = Math.floor(Math.random() * 51);
  if (c2 >= c1) c2++;

  const r1 = c1 % 13;
  const s1 = Math.floor(c1 / 13);
  const r2 = c2 % 13;
  const s2 = Math.floor(c2 / 13);

  const highFirst = r1 <= r2;
  const highIdx = highFirst ? r1 : r2;
  const lowIdx = highFirst ? r2 : r1;
  const highSuit = highFirst ? SUITS[s1] : SUITS[s2];
  const lowSuit = highFirst ? SUITS[s2] : SUITS[s1];

  const canonical =
    highIdx === lowIdx
      ? RANKS[highIdx] + RANKS[lowIdx]
      : RANKS[highIdx] + RANKS[lowIdx] + (s1 === s2 ? "s" : "o");

  return {
    canonical,
    cards: [
      { rank: RANKS[highIdx], suit: highSuit },
      { rank: RANKS[lowIdx], suit: lowSuit },
    ],
  };
}

function canonicalToCards(canonical) {
  const r1 = canonical[0];
  const r2 = canonical[1];
  const type = canonical[2];
  const s1Idx = Math.floor(Math.random() * 4);
  let s2Idx = s1Idx;

  if (type !== "s") {
    s2Idx = (s1Idx + 1 + Math.floor(Math.random() * 3)) % 4;
  }

  return [
    { rank: r1, suit: SUITS[s1Idx] },
    { rank: r2, suit: SUITS[s2Idx] },
  ];
}

function renderCards(cards) {
  cardsContainerEl.innerHTML = cards
    .map(({ rank, suit }) => {
      const displayRank = rank === "T" ? "10" : rank;
      return `
        <div class="playing-card suit-${suit.key}" aria-label="${displayRank} of ${suit.name}">
          <div class="card-corner top-left">
            <span class="card-rank">${displayRank}</span>
            <span class="card-suit-small">${suit.symbol}</span>
          </div>
          <div class="card-suit-center">${suit.symbol}</div>
          <div class="card-corner bottom-right">
            <span class="card-rank">${displayRank}</span>
            <span class="card-suit-small">${suit.symbol}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function nextCard() {
  const state = getState();
  locked = false;
  boardEl.className = "board";
  feedbackEl.textContent = "";

  if (state.isReplaying) {
    if (state.mistakes.length === 0) {
      state.isReplaying = false;
    } else {
      const item = state.mistakes[0];
      currentPos = item.pos;
      currentHand = item.hand;
      currentCards = item.cards || canonicalToCards(item.hand);
      posEl.textContent = currentPos;
      renderCards(currentCards);
      replayBannerEl.style.display = "block";
      renderMistakes();
      return;
    }
  }

  replayBannerEl.style.display = "none";
  renderMistakes();

  const dealt = dealHand();
  currentPos =
    selectedMode === "Random"
      ? POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
      : selectedMode;
  currentHand = dealt.canonical;
  currentCards = dealt.cards;

  posEl.textContent = currentPos;
  renderCards(currentCards);
}

function submitAnswer(action) {
  if (locked || activePage !== "trainer") return;
  locked = true;

  const state = getState();
  const shouldRaise = RANGES[currentPos].has(currentHand);
  const isCorrect = (action === "raise") === shouldRaise;

  if (isCorrect) {
    playSuccessSound();
  } else {
    playErrorSound();
  }

  if (state.isReplaying) {
    if (isCorrect) {
      state.mistakes.shift();
      boardEl.classList.add("correct");
      feedbackEl.textContent =
        state.mistakes.length > 0
          ? `Correct — removed (${state.mistakes.length} left)`
          : "Correct — all mistakes cleared!";
      feedbackEl.style.color = "#69db7c";
    } else {
      if (state.mistakes.length > 1) {
        state.mistakes.push(state.mistakes.shift());
      }
      boardEl.classList.add("wrong");
      feedbackEl.textContent = `Wrong — ${currentHand} from ${currentPos} is a ${shouldRaise ? "RAISE" : "FOLD"}`;
      feedbackEl.style.color = "#ff8787";
    }
    renderMistakes();
    nextTimer = setTimeout(nextCard, isCorrect ? 450 : 1200);
    return;
  }

  if (isCorrect) {
    state.streak++;
    if (state.streak > state.highScore) {
      state.highScore = state.streak;
    }
    boardEl.classList.add("correct");
    feedbackEl.textContent = `Correct (${shouldRaise ? "Raise" : "Fold"})`;
    feedbackEl.style.color = "#69db7c";
  } else {
    state.prevScore = state.streak;
    state.streak = 0;
    const alreadyInStack = state.mistakes.some(
      (m) => m.pos === currentPos && m.hand === currentHand,
    );
    if (!alreadyInStack) {
      state.mistakes.unshift({
        pos: currentPos,
        hand: currentHand,
        cards: currentCards,
      });
    }
    renderMistakes();
    boardEl.classList.add("wrong");
    feedbackEl.textContent = `Wrong — ${currentHand} from ${currentPos} is a ${shouldRaise ? "RAISE" : "FOLD"}`;
    feedbackEl.style.color = "#ff8787";
  }

  updateScoreboard();
  nextTimer = setTimeout(nextCard, isCorrect ? 450 : 1200);
}

replayBtnEl.addEventListener("click", toggleReplay);
document
  .getElementById("foldBtn")
  .addEventListener("click", () => submitAnswer("fold"));
document
  .getElementById("raiseBtn")
  .addEventListener("click", () => submitAnswer("raise"));

document.addEventListener("keydown", (e) => {
  if (activePage !== "trainer") return;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f")
    submitAnswer("fold");
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "r")
    submitAnswer("raise");
});

initTrainerModes();
initChartToggles();
updateScoreboard();
nextCard();
