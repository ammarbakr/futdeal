/**
 * ui.js — Pure rendering functions for FutDeal
 */

import { POSITION_LABELS, RARITY_COLORS } from "./data.js";

const RARITY_CLASSES = ["rarity-bronze", "rarity-silver", "rarity-gold", "rarity-elite"];
const SLOT_STATE_CLASSES = ["team-slot--active", "team-slot--filled", "team-slot--done", "team-slot--pulse"];

function rarityClass(rarity) {
  return `rarity-${rarity}`;
}

function swapClasses(el, removeList, addList) {
  el.classList.remove(...removeList);
  for (const c of addList) {
    if (c) el.classList.add(c);
  }
}

function setText(el, text) {
  if (el.firstChild?.nodeType === Node.TEXT_NODE) {
    el.firstChild.data = text;
  } else {
    el.textContent = text;
  }
}

export function initTeamSlots(draftOrder) {
  const container = document.getElementById("squad-list");
  if (!container) return;
  container.innerHTML = "";

  draftOrder.forEach((pos) => {
    const row = document.createElement("div");
    row.className = "squad-list-row";
    row.id = `squad-row-${pos}`;

    const posBadge = document.createElement("div");
    posBadge.className = "squad-list-pos";
    posBadge.textContent = pos === "Manager" ? "MGR" : pos;

    const info = document.createElement("div");
    info.className = "squad-list-info";

    const nameEl = document.createElement("div");
    nameEl.className = "squad-list-name";
    nameEl.setAttribute("data-role", "name");
    nameEl.textContent = "";

    const placeholder = document.createElement("div");
    placeholder.className = "squad-list-placeholder";
    placeholder.setAttribute("data-role", "placeholder");
    placeholder.textContent = "Empty";

    info.appendChild(nameEl);
    info.appendChild(placeholder);

    const statEl = document.createElement("div");
    statEl.className = "squad-list-stat";
    statEl.setAttribute("data-role", "stat");
    statEl.textContent = "";

    row.appendChild(posBadge);
    row.appendChild(info);
    row.appendChild(statEl);
    container.appendChild(row);
  });
}

export function renderTeamSlots(team, draftOrder, currentIndex) {
  let filledCount = 0;

  draftOrder.forEach((pos, idx) => {
    const row = document.getElementById(`squad-row-${pos}`);
    if (!row) return;

    const card = team[pos];
    const isFilled = card !== null;
    const isActive = idx === currentIndex;

    const nameEl = row.querySelector("[data-role='name']");
    const statEl = row.querySelector("[data-role='stat']");
    const placeholder = row.querySelector("[data-role='placeholder']");

    if (isFilled) {
      filledCount++;
      setText(nameEl, card.name); // Full name!
      setText(statEl, String(card.stat));
      
      row.classList.remove(...RARITY_CLASSES);
      row.classList.add(`rarity-${card.rarity}`);
      
      nameEl.style.display = "block";
      statEl.style.display = "block";
      placeholder.style.display = "none";
    } else {
      setText(nameEl, "");
      setText(statEl, "");
      
      row.classList.remove(...RARITY_CLASSES);
      
      nameEl.style.display = "none";
      statEl.style.display = "none";
      placeholder.style.display = "block";
      setText(placeholder, isActive ? "Drafting now..." : "Waiting...");
    }
  });

  // Update Progress Header
  const progressText = document.getElementById("draft-count");
  if (progressText) {
    progressText.textContent = filledCount;
  }
  const progressFill = document.getElementById("draft-progress-fill");
  if (progressFill) {
    const pct = (filledCount / draftOrder.length) * 100;
    progressFill.style.width = `${pct}%`;
  }
}

export function renderChoices(cards, onFlip) {
  const area = document.getElementById("draft-area");
  const frag = document.createDocumentFragment();

  cards.forEach((card, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "card-wrapper";

    if (!card) {
      wrapper.setAttribute("aria-hidden", "true");
      frag.appendChild(wrapper);
      return;
    }

    const cardEl = document.createElement("div");
    cardEl.className = "draft-card draft-card--facedown";
    cardEl.id = `draft-card-${i}`;

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "card-face card-front";

    const logoWrap = document.createElement("div");
    logoWrap.className = "card-back-logo";

    const icon = document.createElement("span");
    icon.className = "card-back-icon";
    icon.innerHTML = '<i class="fa-solid fa-futbol"></i>';

    const brand = document.createElement("span");
    brand.className = "card-back-brand";
    brand.textContent = "FutDeal";

    logoWrap.appendChild(icon);
    logoWrap.appendChild(brand);
    front.appendChild(logoWrap);

    const back = document.createElement("div");
    back.className = "card-face card-back";

    inner.appendChild(front);
    inner.appendChild(back);
    cardEl.appendChild(inner);
    wrapper.appendChild(cardEl);
    frag.appendChild(wrapper);

    cardEl.addEventListener("click", () => {
      if (!cardEl.classList.contains("draft-card--facedown")) return;
      onFlip(cardEl, card);
    });
  });

  area.replaceChildren(frag);
}

export function lockUnflippedCards(locked) {
  document.querySelectorAll(".draft-card").forEach(el => {
    if (el.classList.contains("draft-card--facedown")) {
      if (locked) {
        el.classList.add("draft-card--locked");
      } else {
        el.classList.remove("draft-card--locked");
      }
    }
  });
}

export function hideCard(cardEl) {
  cardEl.parentElement.style.display = "none";
}

export function flipCard(cardEl, card) {
  const back = cardEl.querySelector(".card-back");
  const barPct = Math.round(((card.stat - 60) / 35) * 70 + 30);
  const frag = document.createDocumentFragment();

  const revealed = document.createElement("div");
  revealed.className = `card-revealed ${rarityClass(card.rarity)}`;
  revealed.style.setProperty("--rarity-color", RARITY_COLORS[card.rarity]);

  const posBadge = document.createElement("div");
  posBadge.className = "card-pos-badge";
  posBadge.textContent = card.position === "Manager" ? "MGR" : card.position;

  const statBig = document.createElement("div");
  statBig.className = "card-stat-big";
  statBig.textContent = String(card.stat);

  const nameEl = document.createElement("div");
  nameEl.className = "card-name";
  nameEl.textContent = card.name;

  revealed.appendChild(posBadge);
  revealed.appendChild(statBig);
  revealed.appendChild(nameEl);

  frag.appendChild(revealed);
  back.replaceChildren(frag);

  requestAnimationFrame(() => {
    barFill.style.width = `${barPct}%`;
  });

  cardEl.classList.remove("draft-card--facedown");
  cardEl.classList.add("draft-card--flipped");
}

export function showActionButtons(container, onKeep, onIgnore, ignoreDisabled) {
  const keepBtn = document.createElement("button");
  keepBtn.id = "btn-keep";
  keepBtn.className = "action-btn action-btn--keep";
  keepBtn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:4px;"></i> Keep';
  keepBtn.addEventListener("click", onKeep);

  const ignoreBtn = document.createElement("button");
  ignoreBtn.id = "btn-ignore";
  ignoreBtn.className = "action-btn action-btn--ignore";
  ignoreBtn.innerHTML = '<i class="fa-solid fa-xmark" style="margin-right:4px;"></i> Ignore';
  if (ignoreDisabled) {
    ignoreBtn.style.display = "none";
  } else {
    ignoreBtn.addEventListener("click", onIgnore);
  }

  container.replaceChildren(keepBtn, ignoreBtn);
}

export function clearActionButtons() {
  document.getElementById("action-bar").innerHTML = "";
}

export function highlightActiveSlot(index) {
  document.querySelectorAll(".team-slot").forEach((el, i) => {
    el.classList.toggle("team-slot--pulse", i === index);
  });
}

export function showToast(message, type = "info") {
  document.getElementById("toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  toast.offsetHeight;
  toast.classList.add("toast--visible");
  setTimeout(() => {
    toast.classList.remove("toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 2800);
}

// ─── Screen Visibility Toggling ───────────────────────────────────────────────

function switchScreen(screenId) {
  document.getElementById("draft-board").classList.add("hidden");
  document.getElementById("match-board").classList.add("hidden");
  document.getElementById("result-board").classList.add("hidden");
  document.getElementById(screenId).classList.remove("hidden");
}

export function showDraftBoard() {
  switchScreen("draft-board");
}

export function showMatchScreen(playerTeam, playerAvg, opponentTeam, opponentAvg, tactics, tacticLabels, onTacticChosen) {
  switchScreen("match-board");

  document.getElementById("match-player-avg").textContent = playerAvg;
  document.getElementById("match-opponent-avg").textContent = opponentAvg;

  const h2hList = document.getElementById("match-h2h-list");
  h2hList.innerHTML = Object.keys(playerTeam).map(pos => {
    const pCard = playerTeam[pos];
    const oCard = opponentTeam[pos];
    const posLabel = pos === "Manager" ? "MGR" : pos;
    const pWins = pCard.stat > oCard.stat;
    const oWins = oCard.stat > pCard.stat;
    
    // Normalize rarity name to match CSS vars (e.g. gold -> gold-r)
    const pColorVar = pCard.rarity === 'gold' ? 'gold-r' : pCard.rarity;
    const oColorVar = oCard.rarity === 'gold' ? 'gold-r' : oCard.rarity;

    return `
      <div class="h2h-row">
        <div class="h2h-player ${pWins ? 'h2h-winner' : (oWins ? 'h2h-loser' : '')}">
          <span class="h2h-name">${pCard.name.split(" ").pop()}</span>
          <span class="h2h-stat" style="color:var(--${pColorVar})">${pCard.stat}</span>
        </div>
        <div class="h2h-pos-badge">${posLabel}</div>
        <div class="h2h-opponent ${oWins ? 'h2h-winner' : (pWins ? 'h2h-loser' : '')}">
          <span class="h2h-stat" style="color:var(--${oColorVar})">${oCard.stat}</span>
          <span class="h2h-name">${oCard.name.split(" ").pop()}</span>
        </div>
      </div>
    `;
  }).join("");

  const tacticContainer = document.getElementById("tactic-buttons-container");
  tacticContainer.innerHTML = tactics.map(t => {
    let colorClass = t === 'Attack' ? 'tactic-attack' : (t === 'Possession' ? 'tactic-possession' : 'tactic-defend');
    return `
      <button id="tactic-${t.toLowerCase()}" class="tactic-btn ${colorClass}" data-tactic="${t}">
        ${tacticLabels[t]}
      </button>
    `;
  }).join("");

  tactics.forEach(t => {
    document.getElementById(`tactic-${t.toLowerCase()}`).addEventListener("click", () => onTacticChosen(t));
  });
}

export function showResultScreen(result, onPlayAgain) {
  switchScreen("result-board");
  
  const { playerScore, opponentScore, playerAdj, opponentAdj, boost, playerTactic, opponentTactic, tacticLabels } = result;
  
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;

  const outcomeEl = document.getElementById("result-outcome");
  outcomeEl.innerHTML = isDraw ? "Draw" : playerWon ? '<i class="fa-solid fa-trophy" style="margin-right:6px;"></i> Victory!' : "Defeat";
  outcomeEl.className = `result-outcome ${isDraw ? "result-outcome--draw" : playerWon ? "result-outcome--win" : "result-outcome--loss"}`;

  document.getElementById("result-score-player").textContent = playerScore;
  document.getElementById("result-score-player").className = `result-score-you ${playerWon ? "result-score--winner" : ""}`;
  
  document.getElementById("result-score-opponent").textContent = opponentScore;
  document.getElementById("result-score-opponent").className = `result-score-opp ${!playerWon && !isDraw ? "result-score--winner" : ""}`;

  document.getElementById("result-player-tactic").innerHTML = tacticLabels[playerTactic];
  document.getElementById("result-player-ovr").innerHTML = `${playerAdj}<small>${boost === "player" ? " (+10% tactic boost)" : ""}</small>`;

  document.getElementById("result-opponent-tactic").innerHTML = tacticLabels[opponentTactic];
  document.getElementById("result-opponent-ovr").innerHTML = `${opponentAdj}<small>${boost === "opponent" ? " (+10% tactic boost)" : ""}</small>`;

  // Clear old listeners by replacing node
  const oldBtn = document.getElementById("btn-restart");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  newBtn.addEventListener("click", onPlayAgain);
}
