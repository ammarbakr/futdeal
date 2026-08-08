/**
 * ui.js — Pure rendering functions for FutDeal
 */

import { POSITION_LABELS, RARITY_COLORS, SLOT_POSITION } from "./data.js";

const RARITY_CLASSES = ["rarity-bronze", "rarity-silver", "rarity-gold", "rarity-elite"];

function rarityClass(rarity) {
  return `rarity-${rarity}`;
}

function hexToRgbString(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
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

  draftOrder.forEach((key) => {
    const pos = SLOT_POSITION[key] || key;
    const row = document.createElement("div");
    row.className = "squad-list-row";
    row.id = `squad-row-${key}`;

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

  draftOrder.forEach((key, idx) => {
    const row = document.getElementById(`squad-row-${key}`);
    if (!row) return;

    const card = team[key];
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
    brand.textContent = "FUTDEAL";

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

export function rejectCard(cardEl) {
  cardEl.classList.add("draft-card--rejected");
}

export function flipCard(cardEl, card) {
  const back = cardEl.querySelector(".card-back");
  const frag = document.createDocumentFragment();

  const revealed = document.createElement("div");
  revealed.className = `card-revealed ${rarityClass(card.rarity)}`;
  revealed.style.setProperty("--rarity-color", RARITY_COLORS[card.rarity]);
  revealed.style.setProperty("--rarity-color-rgb", hexToRgbString(RARITY_COLORS[card.rarity]));

  const topRow = document.createElement("div");
  topRow.className = "card-top-row";

  const posBadge = document.createElement("div");
  posBadge.className = "card-pos-badge";
  posBadge.textContent = card.position === "Manager" ? "MGR" : card.position;

  const rarityTag = document.createElement("div");
  rarityTag.className = "card-rarity-tag";
  rarityTag.textContent = card.rarity;

  topRow.appendChild(posBadge);
  topRow.appendChild(rarityTag);

  const statBig = document.createElement("div");
  statBig.className = "card-stat-big";
  statBig.textContent = String(card.stat);

  const nameRule = document.createElement("div");
  nameRule.className = "card-name-rule";

  const nameEl = document.createElement("div");
  nameEl.className = "card-name";
  nameEl.textContent = card.name;
  nameRule.appendChild(nameEl);

  revealed.appendChild(topRow);
  revealed.appendChild(statBig);
  revealed.appendChild(nameRule);

  const stamp = document.createElement("div");
  stamp.className = "card-rejected-stamp";
  stamp.innerHTML = "<span>Passed</span>";

  frag.appendChild(revealed);
  frag.appendChild(stamp);
  back.replaceChildren(frag);

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

export function showToast(message, type = "info") {
  document.getElementById("toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `toast toast--${type}`;
  
  let icon = "fa-circle-info";
  if (type === "error") icon = "fa-circle-xmark";
  if (type === "warn") icon = "fa-triangle-exclamation";
  if (type === "success") icon = "fa-circle-check";
  
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  
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
  document.getElementById("lobby-board")?.classList.add("hidden");
  document.getElementById("draft-board").classList.add("hidden");
  document.getElementById("match-board").classList.add("hidden");
  document.getElementById("result-board").classList.add("hidden");
  document.getElementById(screenId).classList.remove("hidden");

  const header = document.getElementById("main-header");
  if (header) {
    header.style.display = screenId === "lobby-board" ? "" : "none";
  }
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
    const rawPos = SLOT_POSITION[pos] || pos;
    const posLabel = rawPos === "Manager" ? "MGR" : rawPos;
    const pWins = pCard.stat > oCard.stat;
    const oWins = oCard.stat > pCard.stat;

    const pColor = RARITY_COLORS[pCard.rarity];
    const oColor = RARITY_COLORS[oCard.rarity];

    return `
      <div class="h2h-row">
        <div class="h2h-player ${pWins ? 'h2h-winner' : (oWins ? 'h2h-loser' : '')}">
          <span class="h2h-name">${pCard.name.split(" ").pop()}</span>
          <span class="h2h-stat">${pCard.stat}</span>
          <span class="h2h-rarity-dot" style="--rarity-color:${pColor}"></span>
        </div>
        <div class="h2h-pos-badge">${posLabel}</div>
        <div class="h2h-opponent ${oWins ? 'h2h-winner' : (pWins ? 'h2h-loser' : '')}">
          <span class="h2h-rarity-dot" style="--rarity-color:${oColor}"></span>
          <span class="h2h-stat">${oCard.stat}</span>
          <span class="h2h-name">${oCard.name.split(" ").pop()}</span>
        </div>
      </div>
    `;
  }).join("");

  const tacticContainer = document.getElementById("tactic-buttons-container");
  tacticContainer.innerHTML = tactics.map(t => {
    return `
      <button id="tactic-${t.toLowerCase()}" class="tactic-btn" data-tactic="${t}">
        ${tacticLabels[t]}
      </button>
    `;
  }).join("");

  tactics.forEach(t => {
    document.getElementById(`tactic-${t.toLowerCase()}`).addEventListener("click", () => onTacticChosen(t));
  });
}

function animateScoreCount(el, to, duration = 650) {
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * to);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = to;
  }
  requestAnimationFrame(tick);
}

function buildResultFx(outcome) {
  const fx = document.getElementById("result-fx");
  if (!fx) return;
  fx.innerHTML = "";

  if (outcome === "draw") return;

  const ring = document.createElement("div");
  ring.className = outcome === "win" ? "result-fx-ring" : "result-fx-ring result-fx-ring--loss";
  fx.appendChild(ring);

  if (outcome === "win") {
    const colors = ["var(--paper-0)", "var(--paper-2)", "var(--signal-bright)"];
    for (let i = 0; i < 16; i++) {
      const shard = document.createElement("span");
      shard.className = "result-shard";
      const left = Math.random() * 100;
      const delay = Math.random() * 0.35;
      const dur = 1.1 + Math.random() * 0.6;
      const rot = Math.round(Math.random() * 360);
      const drift = Math.round((Math.random() - 0.5) * 70);
      shard.style.cssText = `left:${left}%; background:${colors[i % colors.length]}; animation-delay:${delay}s; animation-duration:${dur}s; --rot:${rot}deg; --drift:${drift}px;`;
      fx.appendChild(shard);
    }
  } else {
    const flash = document.createElement("div");
    flash.className = "result-fx-flash";
    fx.appendChild(flash);
  }
}

export function showResultScreen(result, onPlayAgain, isHost) {
  switchScreen("result-board");

  const { playerScore, opponentScore, playerAdj, opponentAdj, boost, playerTactic, opponentTactic, tacticLabels } = result;

  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;
  const outcome = isDraw ? "draw" : playerWon ? "win" : "loss";

  const outcomeEl = document.getElementById("result-outcome");
  outcomeEl.innerHTML = isDraw ? "Draw" : playerWon ? '<i class="fa-solid fa-trophy" style="margin-right:6px;"></i> Victory!' : "Defeat";
  // Reset + reflow so the entrance animation replays even if the previous
  // match ended in the exact same outcome (className alone won't restart it).
  outcomeEl.className = "";
  void outcomeEl.offsetWidth;
  outcomeEl.className = `result-outcome ${isDraw ? "result-outcome--draw" : playerWon ? "result-outcome--win" : "result-outcome--loss"}`;

  const contentEl = document.querySelector(".result-screen-content");
  contentEl.classList.remove("result-shake");
  void contentEl.offsetWidth;
  if (outcome === "loss") contentEl.classList.add("result-shake");

  buildResultFx(outcome);

  const playerScoreEl = document.getElementById("result-score-player");
  const opponentScoreEl = document.getElementById("result-score-opponent");
  playerScoreEl.className = `result-score-you ${playerWon ? "result-score--winner" : ""}`;
  opponentScoreEl.className = `result-score-opp ${!playerWon && !isDraw ? "result-score--winner" : ""}`;
  animateScoreCount(playerScoreEl, playerScore);
  animateScoreCount(opponentScoreEl, opponentScore);

  document.getElementById("result-player-tactic").innerHTML = tacticLabels[playerTactic];
  document.getElementById("result-player-ovr").innerHTML = `${playerAdj}<small>${boost === "player" ? " (+10% tactic boost)" : ""}</small>`;

  document.getElementById("result-opponent-tactic").innerHTML = tacticLabels[opponentTactic];
  document.getElementById("result-opponent-ovr").innerHTML = `${opponentAdj}<small>${boost === "opponent" ? " (+10% tactic boost)" : ""}</small>`;

  // Clear old listeners by replacing node
  const oldBtn = document.getElementById("btn-restart");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);

  // Only the host can actually restart the room — the button must say so,
  // instead of showing an identical "Draft Again" CTA for both roles.
  if (isHost) {
    newBtn.className = "action-btn action-btn--keep btn-restart";
    newBtn.innerHTML = '<i class="fa-solid fa-rotate-right" style="margin-right: 6px;"></i> Draft Again';
  } else {
    newBtn.className = "lobby-btn lobby-btn-secondary btn-restart";
    newBtn.innerHTML = '<i class="fa-solid fa-hourglass-half" style="margin-right: 6px;"></i> Waiting for Host…';
  }

  newBtn.addEventListener("click", onPlayAgain);
}

// Builds a card element already in its revealed state — used by the opponent pick overlay.
function buildRevealedCardEl(card) {
  const cardEl = document.createElement("div");
  cardEl.className = "draft-card draft-card--flipped";

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const front = document.createElement("div");
  front.className = "card-face card-front";

  const back = document.createElement("div");
  back.className = "card-face card-back";

  const revealed = document.createElement("div");
  revealed.className = `card-revealed ${rarityClass(card.rarity)}`;
  revealed.style.setProperty("--rarity-color", RARITY_COLORS[card.rarity]);
  revealed.style.setProperty("--rarity-color-rgb", hexToRgbString(RARITY_COLORS[card.rarity]));

  const topRow = document.createElement("div");
  topRow.className = "card-top-row";

  const posBadge = document.createElement("div");
  posBadge.className = "card-pos-badge";
  posBadge.textContent = card.position === "Manager" ? "MGR" : card.position;

  const rarityTag = document.createElement("div");
  rarityTag.className = "card-rarity-tag";
  rarityTag.textContent = card.rarity;

  topRow.appendChild(posBadge);
  topRow.appendChild(rarityTag);

  const statBig = document.createElement("div");
  statBig.className = "card-stat-big";
  statBig.textContent = String(card.stat);

  const nameRule = document.createElement("div");
  nameRule.className = "card-name-rule";
  const nameEl = document.createElement("div");
  nameEl.className = "card-name";
  nameEl.textContent = card.name;
  nameRule.appendChild(nameEl);

  revealed.appendChild(topRow);
  revealed.appendChild(statBig);
  revealed.appendChild(nameRule);

  back.appendChild(revealed);
  inner.appendChild(front);
  inner.appendChild(back);
  cardEl.appendChild(inner);
  return cardEl;
}

export function showOpponentPick(card, opponentName, onComplete) {
  const overlay = document.getElementById("opp-pick-overlay");
  const slot = document.getElementById("opp-pick-card-slot");
  const label = document.getElementById("opp-pick-label");

  if (!overlay || !slot) { onComplete?.(); return; }

  slot.innerHTML = "";
  slot.appendChild(buildRevealedCardEl(card));
  if (label) label.textContent = `${opponentName || "Opponent"} picked`;

  // Reflow-restart the animation in case the overlay was recently shown
  overlay.classList.remove("opp-pick-overlay--active");
  void overlay.offsetWidth;
  overlay.classList.add("opp-pick-overlay--active");

  setTimeout(() => {
    overlay.classList.remove("opp-pick-overlay--active");
    onComplete?.();
  }, 2600);
}

export function showModal(message, onCancel) {
  const modal = document.getElementById("global-modal");
  const statusText = document.getElementById("modal-status-text");
  const cancelBtn = document.getElementById("btn-modal-cancel");
  const confirmBtn = document.getElementById("btn-modal-confirm");
  const spinner = document.getElementById("modal-spinner");

  if (!modal || !statusText || !cancelBtn) return;

  statusText.textContent = message;
  if (spinner) spinner.style.display = "flex";
  if (confirmBtn) confirmBtn.classList.add("hidden");
  
  // Clean up old listener
  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  newCancelBtn.textContent = "Cancel";
  
  if (onCancel) {
    newCancelBtn.style.display = "block";
    newCancelBtn.addEventListener("click", onCancel);
  } else {
    newCancelBtn.style.display = "none";
  }

  modal.classList.remove("hidden");
}

export function hideModal() {
  const modal = document.getElementById("global-modal");
  const spinner = document.getElementById("modal-spinner");
  if (modal) {
    modal.classList.add("hidden");
  }
  if (spinner) {
    spinner.style.display = "flex";
  }
}

export function showConfirmModal(message, onConfirm) {
  const modal = document.getElementById("global-modal");
  const statusText = document.getElementById("modal-status-text");
  const cancelBtn = document.getElementById("btn-modal-cancel");
  const confirmBtn = document.getElementById("btn-modal-confirm");
  const spinner = document.getElementById("modal-spinner");

  if (!modal || !statusText || !cancelBtn || !confirmBtn) return;

  statusText.textContent = message;
  if (spinner) spinner.style.display = "none";
  
  // Clean up old listener
  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  newCancelBtn.style.display = "block";
  newCancelBtn.textContent = "No";
  newCancelBtn.addEventListener("click", () => {
    hideModal();
    if (spinner) spinner.style.display = "flex";
  });

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.classList.remove("hidden");
  newConfirmBtn.style.display = "block";
  newConfirmBtn.textContent = "Yes";
  newConfirmBtn.addEventListener("click", () => {
    hideModal();
    if (spinner) spinner.style.display = "flex";
    if (onConfirm) onConfirm();
  });

  modal.classList.remove("hidden");
}
