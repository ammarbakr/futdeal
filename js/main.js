/**
 * main.js — Initialization and Event Binding with Online Multiplayer
 */

import {
  getState,
  resetGame,
  restoreState,
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
      
      sessionStorage.setItem('futdeal_roomCode', currentRoomCode);
      sessionStorage.setItem('futdeal_playerRole', playerRole);
      
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
      
      sessionStorage.setItem('futdeal_roomCode', currentRoomCode);
      sessionStorage.setItem('futdeal_playerRole', playerRole);
      sessionStorage.setItem('futdeal_playerName', name);
      document.getElementById("score-you-name").textContent = name;
      
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
    
    // Update opponent live stats
    if (document.getElementById("lobby-board").classList.contains("hidden")) {
      const oppRole = playerRole === 'host' ? 'guest' : 'host';
      const oppData = state.players[oppRole];
      if (oppData) {
        const draftedCards = Object.values(oppData.team).filter(c => c !== null);
        const oppAvg = draftedCards.length > 0 
          ? Math.round(draftedCards.reduce((sum, c) => sum + c.stat, 0) / draftedCards.length) 
          : 0;
        
        document.getElementById("score-opp-ovr").textContent = oppAvg > 0 ? oppAvg : "--";
        const oppDots = document.getElementById("score-opp-dots").querySelectorAll(".dot");
        oppDots.forEach((dot, i) => {
          if (i < oppData.turnIndex) dot.classList.add("filled");
          else dot.classList.remove("filled");
        });
      }
    }
    
    // First time we transition to drafting, or if we just reconnected to an already drafting room
    if (state.status === 'drafting' && (!prevState || prevState.status === 'waiting' || (prevState && !document.getElementById("lobby-board").classList.contains("hidden")))) {
      startGame();
    }
    
    if (state.status === 'drafting') {
      checkTurnState();
    }
    
    if (state.status === 'matching' && (!prevState || prevState.status === 'drafting' || (prevState && !document.getElementById("lobby-board").classList.contains("hidden")))) {
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
    // Use .children.length === 0 instead of .innerHTML === "" to ignore whitespaces
    if (!state.isComplete && !activeCardEl && document.getElementById("action-bar").children.length === 0) {
      startRound();
    }
  } else {
    // Not my turn
    clearActionButtons();
    const area = document.getElementById("draft-area");
    area.innerHTML = `<div style="text-align:center; padding: 40px; grid-column: span 2; color: var(--slate); font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7;">Waiting for Opponent to pick...</div>`;
    document.getElementById("score-current-pos").textContent = "WAITING...";
  }
}

/**
 * Syncs the top team slots UI with the current game state.
 */
function updateTopSlots() {
  const state = getState();
  renderTeamSlots(state.team, DRAFT_ORDER, state.currentIndex);
  
  const teamArray = Object.values(state.team).filter(c => c !== null);
  const myAvg = teamArray.length > 0 ? Math.round(teamArray.reduce((sum, c) => sum + c.stat, 0) / teamArray.length) : 0;
  document.getElementById("score-you-ovr").textContent = myAvg > 0 ? myAvg : "--";
  
  const myDots = document.getElementById("score-you-dots").querySelectorAll(".dot");
  myDots.forEach((dot, i) => {
    if (i < state.currentIndex) dot.classList.add("filled");
    else dot.classList.remove("filled");
  });

  if (!state.isComplete) {
    highlightActiveSlot(state.currentIndex);
    let pos = DRAFT_ORDER[state.currentIndex];
    if (pos === "Manager") pos = "MGR";
    document.getElementById("score-current-pos").textContent = pos;
  } else {
    document.getElementById("score-current-pos").textContent = "READY";
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
    
    // If guest is also done, or host is done, check if both done
    const opponentRole = playerRole === 'host' ? 'guest' : 'host';
    if (roomState.players[opponentRole].turnIndex === 5) {
      // Both done
      await online.setStatus(currentRoomCode, 'matching');
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
  
  const { currentIndex } = getState();
  const { choices } = beginRound(roomState.seed, playerRole);
  
  renderChoices(choices, handleCardFlip);
  
  showToast(`Your turn: Pick ${POSITION_LABELS[DRAFT_ORDER[currentIndex]]}`, "info");
}

/**
 * Transitions from Draft to Match screen.
 */
function transitionToMatch() {
  document.getElementById("lobby-board").classList.add("hidden");
  
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
  
  // Check if we already picked a tactic before reconnecting
  const myTactic = roomState.players[playerRole].tactic;
  if (myTactic) {
    document.querySelectorAll('.tactic-btn').forEach(btn => {
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
    });
    const tacticBtn = document.getElementById(`tactic-${myTactic.toLowerCase()}`);
    if (tacticBtn) {
      tacticBtn.style.opacity = "1";
      tacticBtn.style.boxShadow = "0 0 20px rgba(255,255,255,0.5)";
    }
    document.querySelector('.tactic-hint').textContent = "Waiting for opponent...";
  }
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
  const host = roomState.players.host;
  const guest = roomState.players.guest;
  
  const hostAvg = Math.round(
    Object.values(host.team).reduce((sum, c) => sum + c.stat, 0) / Object.values(host.team).length
  );
  const guestAvg = Math.round(
    Object.values(guest.team).reduce((sum, c) => sum + c.stat, 0) / Object.values(guest.team).length
  );

  // We use room seed so both get the same match outcome randomizer
  // Override Math.random temporarily
  const originalRandom = Math.random;
  let matchSeed = roomState.seed + 1000;
  Math.random = function() {
    let x = Math.sin(matchSeed++) * 10000;
    return x - Math.floor(x);
  };
  
  // ALWAYS simulate from the perspective of the Host
  // This ensures the order of Math.random() calls is identical for both clients
  const hostMatchResult = simulateMatch(
    hostAvg,
    guestAvg,
    host.tactic,
    guest.tactic
  );
  
  Math.random = originalRandom;

  // Map result to current player's perspective
  let myResult;
  if (playerRole === 'host') {
    myResult = hostMatchResult;
  } else {
    myResult = {
      playerScore: hostMatchResult.opponentScore,
      opponentScore: hostMatchResult.playerScore,
      playerAdj: hostMatchResult.opponentAdj,
      opponentAdj: hostMatchResult.playerAdj,
      boost: hostMatchResult.boost === 'player' ? 'opponent' : (hostMatchResult.boost === 'opponent' ? 'player' : 'none'),
      playerTactic: hostMatchResult.opponentTactic,
      opponentTactic: hostMatchResult.playerTactic,
      tacticLabels: hostMatchResult.tacticLabels
    };
  }

  showResultScreen(myResult, () => {
    sessionStorage.removeItem('futdeal_roomCode');
    sessionStorage.removeItem('futdeal_playerRole');
    window.location.reload();
  });
}

/**
 * Starts/Restarts the game and sets up Draft board.
 */
function startGame() {
  // Hide lobby, show draft board
  document.getElementById("lobby-board").classList.add("hidden");
  showDraftBoard();
  
  // Restore state from roomState (useful for reconnecting)
  const myData = roomState.players[playerRole];
  if (myData) {
    restoreState(myData.team, myData.turnIndex);
  } else {
    resetGame();
  }
  
  activeCardEl = null;
  activeCardData = null;
  
  initTeamSlots(DRAFT_ORDER);
  updateTopSlots();
  
  checkTurnState();
}

// ─── Squad Drawer Logic ───────────────────────────────────────────────────────
function setupDrawer() {
  const toggleBtn = document.getElementById("btn-toggle-squad");
  const drawer = document.getElementById("squad-drawer");

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener("click", () => {
      const isClosed = drawer.classList.contains("drawer-closed");
      if (isClosed) {
        drawer.classList.remove("drawer-closed");
        toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      } else {
        drawer.classList.add("drawer-closed");
        toggleBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i>';
      }
    });

    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) {
        drawer.classList.add("drawer-closed");
        toggleBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i>';
      }
    });
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupDrawer();
  initLobby();
  
  // Try to restore session
  const savedCode = sessionStorage.getItem('futdeal_roomCode');
  const savedRole = sessionStorage.getItem('futdeal_playerRole');
  if (savedCode && savedRole) {
    currentRoomCode = savedCode;
    playerRole = savedRole;
    const savedName = sessionStorage.getItem('futdeal_playerName');
    if (savedName) document.getElementById("score-you-name").textContent = savedName;
    
    document.getElementById("lobby-status").classList.remove("hidden");
    document.getElementById("lobby-status-text").textContent = "Reconnecting...";
    document.querySelector(".lobby-actions").style.display = "none";
    document.querySelectorAll(".lobby-actions")[1].style.display = "none";
    document.querySelector(".lobby-divider").style.display = "none";
    document.getElementById("room-code-input").parentElement.style.display = "none";
    
    startWatchingRoom();
  }
});
