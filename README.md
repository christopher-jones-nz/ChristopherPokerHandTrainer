# Pre-Flop Range Trainer

A lightweight, zero-dependency flashcard web app for drilling pre-flop Raise First In (RFI) poker ranges across desktop and mobile.

**Live App:** [christopher-jones-nz.github.io/ChristopherPokerHandTrainer](https://christopher-jones-nz.github.io/ChristopherPokerHandTrainer/)

## Features

- **Combo-Weighted Dealing:** Deals two distinct cards from a virtual 52-card deck rather than sampling uniformly from 169 canonical hands, preserving real pre-flop frequencies (12 offsuit, 6 pair, and 4 suited combinations).
- **Decoupled Range Configuration:** Hand ranges live in `ranges.js` using standard poker shorthand (`77+`, `ATs+`, `KQs`, `AQo+`) and expand automatically at runtime.
- **Positional Drills:** Randomizes hands across **Early Position**, **Cutoff**, **Button**, and **Blinds**.
- **Cross-Device Controls:** Responsive touch UI for mobile plus keyboard shortcuts (`F` or `←` to Fold, `R` or `→` to Raise) for fast desktop reps.

## Project Structure

```text
ChristopherPokerHandTrainer/
├── index.html   # App layout, styles, card generator, and range parser
└── ranges.js    # Editable pre-flop range definitions per position
```

## Customizing Ranges

Edit `RAW_RANGES` inside `ranges.js` using standard shorthand notation:

```javascript
const RAW_RANGES = {
  "Early Position": ["77+", "ATs+", "KQs", "AQo+"],
  "Cutoff": ["55+", "A5s+", "K9s+", "Q9s+", "J9s+", "T9s", "98s", "ATo+", "KJo+"],
  "Button": ["22+", "A2s+", "K5s+", "Q7s+", "J7s+", "T7s+", "97s+", "86s+", "75s+", "65s", "54s", "A7o+", "K9o+", "Q9o+", "J9o+", "T9o"],
  "Blinds": ["22+", "A2s+", "K6s+", "Q8s+", "J8s+", "T8s+", "97s+", "87s", "76s", "65s", "A8o+", "KTo+", "QTo+", "JTo"],
};
```

- **`+` suffix:** Includes all stronger hands of the same type (`77+` → `77` through `AA`; `ATs+` → `ATs` through `AKs`).
- **Exact combos:** Omit `+` for single hands (`KQs`, `T9o`).

## Running Locally & Mobile Setup

- **Desktop:** Open `index.html` directly in any browser, or run a local server:
  ```bash
  python3 -m http.server 8000
  ```
- **Mobile (iOS / Android):** Open the GitHub Pages link in Safari or Chrome and select **Add to Home Screen** for full-screen standalone use.

## Planned Extensions

- **Quiz Mode:** Fixed 10-, 20-, and 30-hand drills with post-session missed-hand review.
- **Accuracy Tracking:** Persistent `localStorage` stats broken down by **Today**, **This Month**, and **All-Time**.
- **Interactive Range Editor:** Visual 13×13 starting hand matrix for editing and exporting custom ranges.
