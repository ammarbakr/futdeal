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
  showModal,
  hideModal,
  showConfirmModal,
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
  const headerUsername = document.getElementById("header-username");
  const userProfile = document.getElementById("user-profile");
  const nicknameModal = document.getElementById("nickname-modal");
  const btnSaveNickname = document.getElementById("btn-save-nickname");
  const modalPlayerName = document.getElementById("modal-player-name");

  let savedName = localStorage.getItem('futdeal_username');
  if (savedName) {
    headerUsername.textContent = savedName;
  } else {
    nicknameModal.classList.remove("hidden");
  }

  userProfile.addEventListener("click", () => {
    modalPlayerName.value = localStorage.getItem('futdeal_username') || "";
    nicknameModal.classList.remove("hidden");
    modalPlayerName.focus();
  });

  btnSaveNickname.addEventListener("click", () => {
    const val = modalPlayerName.value.trim();
    if (!val) {
      showToast("Please enter a nickname", "warn");
      return;
    }
    localStorage.setItem('futdeal_username', val);
    headerUsername.textContent = val;
    nicknameModal.classList.add("hidden");
  });

  document.getElementById("btn-cancel-lobby").addEventListener("click", async () => {
    if (unsubscribeRoom) unsubscribeRoom();
    if (currentRoomCode) await online.setStatus(currentRoomCode, 'abandoned');
    sessionStorage.removeItem('futdeal_roomCode');
    sessionStorage.removeItem('futdeal_playerRole');
    window.location.reload();
  });

  document.getElementById("btn-create-room").addEventListener("click", async () => {
    const name = localStorage.getItem('futdeal_username');
    if (!name) {
      nicknameModal.classList.remove("hidden");
      return showToast("Enter your nickname first", "warn");
    }
    
    const btnCreate = document.getElementById("btn-create-room");
    btnCreate.innerHTML = '<div class="beautiful-spinner beautiful-spinner--sm"></div> Waiting for opponent...';
    btnCreate.style.pointerEvents = "none";
    btnCreate.style.opacity = "0.8";
    try {
      currentRoomCode = await online.createRoom(name);
      playerRole = 'host';
      
      sessionStorage.setItem('futdeal_roomCode', currentRoomCode);
      sessionStorage.setItem('futdeal_playerRole', playerRole);
      sessionStorage.setItem('futdeal_playerName', name);
      document.getElementById("score-you-name").textContent = name;
      
      document.getElementById("display-code").textContent = currentRoomCode;
      document.getElementById("room-code-display").classList.remove("hidden");
      
      // Hide the join section
      document.getElementById("join-divider").style.display = "none";
      document.getElementById("join-input-group").style.display = "none";
      
      document.getElementById("btn-cancel-lobby").classList.remove("hidden");
      
      startWatchingRoom();
    } catch (e) {
      showToast("Failed to create room: " + e.message, "error");
    }
  });
  const codeInputs = document.querySelectorAll(".code-char");

  codeInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(-1);
      if (input.value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      } else if (input.value && index === codeInputs.length - 1) {
        const fullCode = Array.from(codeInputs).map(i => i.value).join('');
        if (fullCode.length === 4) attemptJoinRoom(fullCode);
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        codeInputs[index - 1].focus();
      }
    });

    input.addEventListener("focus", () => {
      const firstEmptyIndex = Array.from(codeInputs).findIndex(i => !i.value);
      if (firstEmptyIndex !== -1 && firstEmptyIndex < index) {
        codeInputs[firstEmptyIndex].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/[^a-zA-Z]/g, '').toUpperCase();
      for (let i = 0; i < codeInputs.length; i++) {
        if (pasted[i]) {
          codeInputs[i].value = pasted[i];
          if (i < codeInputs.length - 1) codeInputs[i + 1].focus();
          else codeInputs[i].focus();
        }
      }
      const fullCode = Array.from(codeInputs).map(i => i.value).join('');
      if (fullCode.length === 4) attemptJoinRoom(fullCode);
    });
  });

  const attemptJoinRoom = async (code) => {
    const name = localStorage.getItem('futdeal_username');
    if (!name) {
      nicknameModal.classList.remove("hidden");
      return showToast("Enter your nickname first", "warn");
    }
    if (!code) return showToast("Enter room code", "warn");
    
    const clearCodeInputs = () => {
      codeInputs.forEach(i => i.value = "");
      codeInputs[0].focus();
    };
    
    try {
      await online.joinRoom(code, name);
      clearCodeInputs();
      currentRoomCode = code;
      playerRole = 'guest';
      
      sessionStorage.setItem('futdeal_roomCode', currentRoomCode);
      sessionStorage.setItem('futdeal_playerRole', playerRole);
      sessionStorage.setItem('futdeal_playerName', name);
      document.getElementById("score-you-name").textContent = name;
      
      showModal("Joining...", () => {
        sessionStorage.removeItem('futdeal_roomCode');
        sessionStorage.removeItem('futdeal_playerRole');
        window.location.reload();
      });
      

      
      startWatchingRoom();
    } catch (e) {
      showToast("Failed to join room: " + e.message, "error");
      clearCodeInputs();
    }
  };
}

function startWatchingRoom() {
  if (unsubscribeRoom) unsubscribeRoom();
  unsubscribeRoom = online.watchRoom(currentRoomCode, (state) => {
    try {
      if (!state) {
        if (!document.getElementById("result-board").classList.contains("hidden")) return;
        showToast("The room was closed.", "error");
        sessionStorage.removeItem('futdeal_roomCode');
        sessionStorage.removeItem('futdeal_playerRole');
        setTimeout(() => window.location.reload(), 2500);
        return;
      }
      
      if (state.status === 'abandoned') {
        showToast("The other player has left the game.", "error");
        sessionStorage.removeItem('futdeal_roomCode');
        sessionStorage.removeItem('futdeal_playerRole');
        setTimeout(() => window.location.reload(), 2500);
        return;
      }
      
      const prevState = roomState;
      roomState = state;
      
      // Update opponent live stats
      const oppRole = playerRole === 'host' ? 'guest' : 'host';
      const oppData = state.players[oppRole];
      if (oppData) {
        if (oppData.name) {
          document.getElementById("score-opp-name").textContent = oppData.name;
        }
        const draftedCards = Object.values(oppData.team || {}).filter(c => c !== null);
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
      
      // First time we transition to drafting, or if we just reconnected to an already drafting room, or restarted
      if (state.status === 'drafting' && (!prevState || prevState.status === 'waiting' || prevState.status === 'finished' || prevState.status === 'matching' || (prevState && !document.getElementById("lobby-board").classList.contains("hidden")))) {
        hideModal();
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
    } catch (e) {
      console.error("watchRoom error:", e);
      showToast("Error: " + e.message, "error");
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
    area.innerHTML = `
      <div class="waiting-container">
        <div class="beautiful-spinner"></div>
        <div class="waiting-text">Waiting for opponent...</div>
      </div>
    `;
    
    const opponentData = roomState.players[roomState.turn];
    if (opponentData && opponentData.turnIndex < DRAFT_ORDER.length) {
      let pos = DRAFT_ORDER[opponentData.turnIndex];
      if (pos === "Manager") pos = "MGR";
      document.getElementById("score-current-pos").textContent = pos;
    } else {
      document.getElementById("score-current-pos").textContent = "---";
    }
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
  
  // Immediately show waiting container to feel responsive
  const area = document.getElementById("draft-area");
  area.innerHTML = `
    <div class="waiting-container">
      <div class="beautiful-spinner"></div>
      <div class="waiting-text">Waiting for opponent...</div>
    </div>
  `;
  
  const state = getState();
  
  // Immediately update the squad drawer and ratings locally
  updateTopSlots();
  
  // Submit pick to Firebase
  await online.submitPick(currentRoomCode, playerRole, currentPos, card, state.currentIndex);
  
  if (state.isComplete) {
    showToast(`${keptName} locked in. Squad complete! 🏆`, "success");
    
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

  showResultScreen(myResult, async () => {
    if (playerRole === 'host') {
      showModal("Restarting room...", null);
      await online.restartRoom(currentRoomCode);
    } else {
      showModal("Waiting for host to restart...", null);
    }
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

    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("drawer-closed") && 
          !drawer.contains(e.target) && 
          !toggleBtn.contains(e.target)) {
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
  
  // Setup Leave button
  document.getElementById("btn-leave-room").addEventListener("click", () => {
    showConfirmModal("Are you sure you want to leave the room?", async () => {
      if (unsubscribeRoom) unsubscribeRoom();
      if (currentRoomCode) {
        await online.setStatus(currentRoomCode, 'abandoned');
      }
      sessionStorage.removeItem('futdeal_roomCode');
      sessionStorage.removeItem('futdeal_playerRole');
      window.location.reload();
    });
  });
  
  // Try to restore session
  const savedCode = sessionStorage.getItem('futdeal_roomCode');
  const savedRole = sessionStorage.getItem('futdeal_playerRole');
  if (savedCode && savedRole) {
    currentRoomCode = savedCode;
    playerRole = savedRole;
    const savedName = sessionStorage.getItem('futdeal_playerName');
    if (savedName) document.getElementById("score-you-name").textContent = savedName;
    
    showModal("Reconnecting...", () => {
      // Cancel reconnection
      sessionStorage.removeItem('futdeal_roomCode');
      sessionStorage.removeItem('futdeal_playerRole');
      window.location.reload();
    });
    
    document.getElementById("btn-create-room").style.display = "none";
    document.getElementById("join-divider").style.display = "none";
    document.getElementById("join-input-group").style.display = "none";
    document.getElementById("btn-leave-room").classList.remove("hidden");
    
    startWatchingRoom();
  }
});
