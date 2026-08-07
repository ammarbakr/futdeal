/**
 * main.js — Initialization and Event Binding with Online Multiplayer
 */

import {
  getState,
  resetGame,
  beginRound,
  registerFlip,
  keepCard,
  ignoreCard,
} from "./game.js";

import {
  initTeamSlots,
  renderTeamSlots,
  renderChoices,
  flipCard,
  showActionButtons,
  clearActionButtons,
  highlightActiveSlot,
  lockUnflippedCards,
  hideCard,
  showDraftBoard,
  showMatchScreen,
  showResultScreen,
  showToast,
} from "./ui.js";

import { DRAFT_ORDER, POSITION_LABELS } from "./data.js";
import { TACTICS, TACTIC_LABELS, simulateMatch } from "./match.js";
import * as online from "./online.js";

const actionBar = document.getElementById("action-bar");

function getPosLabel() {
  return document.getElementById("current-pos-label");
}

let activeCardEl = null;
let activeCardData = null;

// Multiplayer State
let currentRoomCode = null;
let playerRole = null; // 'host' or 'guest'
let roomState = null;
let unsubscribeRoom = null;

/**
 * Lobby UI Logic
 */
function initLobby() {
  document.getElementById("btn-create-room").addEventListener("click", async () => {
    const name = document.getElementById("player-name").value.trim() || "Host";
    try {
      currentRoomCode = await online.createRoom(name);
      playerRole = 'host';
      
      document.getElementById("display-code").textContent = currentRoomCode;
      document.getElementById("room-code-display").classList.remove("hidden");
      document.getElementById("lobby-status").classList.remove("hidden");
      document.getElementById("lobby-status-text").textContent = "Waiting for opponent...";
      
      // Hide buttons
      document.querySelector(".lobby-actions").style.display = "none";
      document.querySelectorAll(".lobby-actions")[1].style.display = "none";
      document.querySelector(".lobby-divider").style.display = "none";
      document.getElementById("room-code-input").parentElement.style.display = "none";
      
      startWatchingRoom();
    } catch (e) {
      alert("Failed to create room: " + e.message);
    }
  });

  document.getElementById("btn-join-room").addEventListener("click", async () => {
    const code = document.getElementById("room-code-input").value.trim().toUpperCase();
    const name = document.getElementById("player-name").value.trim() || "Guest";
    if (!code) return alert("Enter room code");
    
    try {
      await online.joinRoom(code, name);
      currentRoomCode = code;
      playerRole = 'guest';
      
      document.getElementById("lobby-status").classList.remove("hidden");
      document.getElementById("lobby-status-text").textContent = "Joining...";
      
      startWatchingRoom();
    } catch (e) {
      alert("Failed to join room: " + e.message);
    }
  });
}

function startWatchingRoom() {
  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = online.watchRoom(currentRoomCode, (state) => {
    if (!state) return;
    
    const prevState = roomState;
    roomState = state;
    
    if (state.status === 'drafting' && (!prevState || prevState.status === 'waiting')) {
      // Transition to draft
      startGame();
    }
    
    if (state.status === 'drafting') {
      checkTurnState();
    }
    
    if (state.status === 'matching' && (!prevState || prevState.status === 'drafting')) {
      transitionToMatch();
    }
    
    // Check if both have picked tactics
    if (state.status === 'matching') {
      if (state.players.host.tactic && state.players.guest.tactic && document.getElementById("result-board").classList.contains("hidden")) {
        resolveMatch();
      }
    }
  });
}

function checkTurnState() {
  if (!roomState || roomState.status !== 'drafting') return;
  
  const isMyTurn = roomState.turn === playerRole;
  
  if (isMyTurn) {
    // If I haven't completed my draft, start a round
    const state = getState();
    if (!state.isComplete && !activeCardEl && document.getElementById("action-bar").innerHTML === "") {
      startRound();
    }
  } else {
    // Not my turn
    clearActionButtons();
    const area = document.getElementById("draft-area");
    area.innerHTML = `<div style="text-align:center; padding: 40px; grid-column: span 2; color: var(--slate); font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7;">Waiting for Opponent to pick...</div>`;
    getPosLabel().textContent = "WAITING...";
  }
}

/**
 * Syncs the top team slots UI with the current game state.
 */
function updateTopSlots() {
  const state = getState();
  renderTeamSlots(state.team, DRAFT_ORDER, state.currentIndex);

  if (!state.isComplete) {
    highlightActiveSlot(state.currentIndex);
    getPosLabel().textContent = POSITION_LABELS[DRAFT_ORDER[state.currentIndex]];
  }
}

/**
 * Handles Keep action.
 */
async function handleKeep() {
  if (!activeCardData) return;
  
  const keptName = activeCardData.name.split(" ").pop();
  const card = activeCardData;
  const currentPos = DRAFT_ORDER[getState().currentIndex];
  
  keepCard(activeCardData);
  
  activeCardEl = null;
  activeCardData = null;
  clearActionButtons();
  
  const state = getState();
  
  // Submit pick to Firebase
  await online.submitPick(currentRoomCode, playerRole, currentPos, card, state.currentIndex);
  
  if (state.isComplete) {
    showToast(`${keptName} locked in. Squad complete! 🏆`, "success");
    updateTopSlots();
    getPosLabel().textContent = "Squad Ready";
    
    // If guest is also done, or host is done, check if both done
    // Wait for the roomState to catch up, or trigger status change if I'm the last one
    const opponentRole = playerRole === 'host' ? 'guest' : 'host';
    if (roomState.players[opponentRole].turnIndex === 5) {
      // Both done
      await online.setStatus(currentRoomCode, 'matching');
    } else {
       // Just wait, pass turn is handled by submitPick
       getPosLabel().textContent = "Waiting for Opponent to finish...";
    }
  } else {
    showToast(`${keptName} locked in.`, "success");
    // Round over, wait for other player (submitPick passed the turn)
  }
}

/**
 * Handles Ignore action.
 */
function handleIgnore() {
  if (!activeCardEl) return;
  
  ignoreCard();
  hideCard(activeCardEl);
  clearActionButtons();
  
  lockUnflippedCards(false);
  
  activeCardEl = null;
  activeCardData = null;
  
  showToast("Card ignored. Pick your final choice.", "warn");
}

/**
 * Handles a card flip event.
 */
function handleCardFlip(cardEl, card) {
  const state = getState();
  
  flipCard(cardEl, card);
  
  if (state.interactionState === "IDLE") {
    registerFlip();
    lockUnflippedCards(true);
    
    activeCardEl = cardEl;
    activeCardData = card;
    
    showActionButtons(actionBar, handleKeep, handleIgnore, state.ignoreUsedThisRound);
    
  } else if (state.interactionState === "FORCED_PICK") {
    activeCardEl = cardEl;
    activeCardData = card;
    setTimeout(handleKeep, 400);
  }
}

/**
 * Kicks off a single drafting round.
 */
function startRound() {
  updateTopSlots();
  clearActionButtons();
  
  const { choices } = beginRound(roomState.seed, playerRole);
  renderChoices(choices, handleCardFlip);
  
  const { currentIndex } = getState();
  showToast(`Your turn: Pick ${POSITION_LABELS[DRAFT_ORDER[currentIndex]]}`, "info");
}

/**
 * Transitions from Draft to Match screen.
 */
function transitionToMatch() {
  const { team } = getState();
  
  // Calculate average
  const playerAvg = Math.round(
    Object.values(team).reduce((sum, c) => sum + c.stat, 0) / Object.values(team).length
  );
  
  const opponentRole = playerRole === 'host' ? 'guest' : 'host';
  const opponentTeam = roomState.players[opponentRole].team;
  const opponentAvg = Math.round(
    Object.values(opponentTeam).reduce((sum, c) => sum + c.stat, 0) / Object.values(opponentTeam).length
  );

  showMatchScreen(
    team,
    playerAvg,
    opponentTeam,
    opponentAvg,
    TACTICS,
    TACTIC_LABELS,
    handleTacticChosen
  );
}

/**
 * Handles tactic selection on the Match screen.
 */
async function handleTacticChosen(tactic) {
  // Disable buttons visually
  document.querySelectorAll('.tactic-btn').forEach(btn => {
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
  });
  
  document.getElementById(`tactic-${tactic.toLowerCase()}`).style.opacity = "1";
  document.getElementById(`tactic-${tactic.toLowerCase()}`).style.boxShadow = "0 0 20px rgba(255,255,255,0.5)";
  
  document.querySelector('.tactic-hint').textContent = "Waiting for opponent...";
  
  await online.submitTactic(currentRoomCode, playerRole, tactic);
}

function resolveMatch() {
  const player = roomState.players[playerRole];
  const opponentRole = playerRole === 'host' ? 'guest' : 'host';
  const opponent = roomState.players[opponentRole];
  
  const playerAvg = Math.round(
    Object.values(player.team).reduce((sum, c) => sum + c.stat, 0) / Object.values(player.team).length
  );
  const opponentAvg = Math.round(
    Object.values(opponent.team).reduce((sum, c) => sum + c.stat, 0) / Object.values(opponent.team).length
  );

  // We use room seed so both get the same match outcome randomizer
  // Override Math.random temporarily
  const originalRandom = Math.random;
  let matchSeed = roomState.seed + 1000;
  Math.random = function() {
    let x = Math.sin(matchSeed++) * 10000;
    return x - Math.floor(x);
  };
  
  const matchResult = simulateMatch(
    playerAvg,
    opponentAvg,
    player.tactic,
    opponent.tactic
  );
  
  Math.random = originalRandom;

  showResultScreen(matchResult, () => {
    window.location.reload();
  });
}

/**
 * Starts/Restarts the game.
 */
function startGame() {
  // Hide lobby, show draft board
  document.getElementById("lobby-board").classList.add("hidden");
  showDraftBoard();
  
  resetGame();
  
  activeCardEl = null;
  activeCardData = null;
  
  initTeamSlots(DRAFT_ORDER);
  
  checkTurnState();
}

// ─── Squad Drawer Logic ───────────────────────────────────────────────────────
function setupDrawer() {
  const toggleBtn = document.getElementById("btn-toggle-squad");
  const drawer = document.getElementById("squad-drawer");
  const header = document.getElementById("progress-header");

  if (toggleBtn && drawer && header) {
    toggleBtn.addEventListener("click", () => {
      const isClosed = drawer.classList.contains("drawer-closed");
      if (isClosed) {
        drawer.classList.remove("drawer-closed");
        header.classList.add("drawer-open");
        toggleBtn.innerHTML = 'Squad <i class="fa-solid fa-chevron-up"></i>';
      } else {
        drawer.classList.add("drawer-closed");
        header.classList.remove("drawer-open");
        toggleBtn.innerHTML = 'Squad <i class="fa-solid fa-chevron-down"></i>';
      }
    });

    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) {
        drawer.classList.add("drawer-closed");
        header.classList.remove("drawer-open");
        toggleBtn.innerHTML = 'Squad <i class="fa-solid fa-chevron-down"></i>';
      }
    });
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupDrawer();
  initLobby();
});
