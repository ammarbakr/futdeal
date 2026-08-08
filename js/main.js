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
  lockUnflippedCards,
  rejectCard,
  showDraftBoard,
  showMatchScreen,
  showResultScreen,
  showOpponentPick,
  showToast,
  showModal,
  hideModal,
  showConfirmModal,
} from "./ui.js";

import { DRAFT_ORDER, DRAFT_ORDER_FULL, SLOT_POSITION } from "./data.js";
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

// Overlay state — blocks round start while showing opponent's card
let overlayShowing = false;

// Mode
let currentMode = 'quick';
let activeDraftOrder = DRAFT_ORDER;

function getDraftOrder(mode) {
  return mode === 'full' ? DRAFT_ORDER_FULL : DRAFT_ORDER;
}

/**
 * Marks a room abandoned then deletes it.
 */
async function closeRoom(code) {
  if (!code) return;
  try {
    await online.setStatus(code, 'abandoned');
    await online.deleteRoom(code);
  } catch (e) {
    console.error("Failed to close room:", e);
  }
}

/**
 * Common exit path — cancel, leave, or post-match escape.
 */
async function leaveAndReload() {
  if (unsubscribeRoom) unsubscribeRoom();
  await closeRoom(currentRoomCode);
  sessionStorage.removeItem('futdeal_roomCode');
  sessionStorage.removeItem('futdeal_playerRole');
  sessionStorage.removeItem('futdeal_mode');
  window.location.reload();
}

/**
 * Renders the room code as individually-animated letter cells.
 */
function renderRoomCode(code) {
  const codeEl = document.getElementById("display-code");
  codeEl.innerHTML = "";
  code.split("").forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "code-letter";
    span.style.animationDelay = `${0.15 + i * 0.09}s`;
    span.textContent = ch;
    codeEl.appendChild(span);
  });
}

/**
 * Hides the lobby's create/join UI cluster once a room has been created.
 */
function hideJoinSection() {
  document.getElementById("join-divider").style.display = "none";
  document.getElementById("join-input-group").style.display = "none";
  document.getElementById("code-input-label").style.display = "none";
  document.getElementById("lobby-subtitle").style.display = "none";
  document.getElementById("mode-selector").style.display = "none";
}

/**
 * Initialises the scoreboard progress dots for the current draft length.
 */
function initScoreDots(count) {
  ['score-you-dots', 'score-opp-dots'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `score-dots${count > 5 ? ' score-dots--full' : ''}`;
    el.innerHTML = Array(count).fill('<div class="dot"></div>').join('');
  });
}

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

  // Mode selector
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("mode-btn--active"));
      btn.classList.add("mode-btn--active");
      currentMode = btn.dataset.mode;
      activeDraftOrder = getDraftOrder(currentMode);
    });
  });

  document.getElementById("btn-cancel-lobby").addEventListener("click", leaveAndReload);

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
      currentRoomCode = await online.createRoom(name, currentMode);
      playerRole = 'host';

      sessionStorage.setItem('futdeal_roomCode', currentRoomCode);
      sessionStorage.setItem('futdeal_playerRole', playerRole);
      sessionStorage.setItem('futdeal_playerName', name);
      sessionStorage.setItem('futdeal_mode', currentMode);
      document.getElementById("score-you-name").textContent = name;

      renderRoomCode(currentRoomCode);
      document.getElementById("room-code-display").classList.remove("hidden");

      hideJoinSection();
      document.getElementById("btn-cancel-lobby").classList.remove("hidden");

      startWatchingRoom();
    } catch (e) {
      showToast("Failed to create room: " + e.message, "error");
      btnCreate.innerHTML = '<i class="fa-solid fa-plus"></i> Create Room';
      btnCreate.style.pointerEvents = "";
      btnCreate.style.opacity = "";
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

      // Show what the opponent just picked before starting our round
      const _oppRole = playerRole === 'host' ? 'guest' : 'host';
      const prevOppIdx = prevState?.players?.[_oppRole]?.turnIndex ?? -1;
      const newOppIdx  = state.players?.[_oppRole]?.turnIndex ?? 0;
      if (
        state.status === 'drafting' &&
        prevOppIdx >= 0 &&
        newOppIdx > prevOppIdx &&
        state.turn === playerRole &&
        !overlayShowing
      ) {
        const slotKey = activeDraftOrder[newOppIdx - 1];
        const pickedCard = state.players[_oppRole]?.team?.[slotKey];
        if (pickedCard) {
          overlayShowing = true;
          showOpponentPick(pickedCard, state.players[_oppRole]?.name, () => {
            overlayShowing = false;
            if (roomState?.status === 'drafting' && roomState?.turn === playerRole) {
              const gs = getState();
              if (!gs.isComplete && !activeCardEl && document.getElementById("action-bar").children.length === 0) {
                startRound();
              }
            }
          });
          return; // don't run checkTurnState yet — overlay will trigger startRound
        }
      }

      // Sync mode from room (important for the guest and for reconnects)
      if (state.mode && state.mode !== currentMode) {
        currentMode = state.mode;
        activeDraftOrder = getDraftOrder(currentMode);
        sessionStorage.setItem('futdeal_mode', currentMode);
      }

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

/**
 * Highlights whichever scoreboard side currently has the turn.
 */
function updateTurnIndicator() {
  const leftEl = document.querySelector('.score-left');
  const rightEl = document.querySelector('.score-right');
  if (!leftEl || !rightEl) return;

  if (!roomState || roomState.status !== 'drafting') {
    leftEl.classList.remove('score-side--active');
    rightEl.classList.remove('score-side--active');
    return;
  }

  const myDone = getState().isComplete;
  const oppRole = playerRole === 'host' ? 'guest' : 'host';
  const oppData = roomState.players[oppRole];
  const oppDone = !!(oppData && oppData.turnIndex >= activeDraftOrder.length);

  leftEl.classList.toggle('score-side--active', roomState.turn === playerRole && !myDone);
  rightEl.classList.toggle('score-side--active', roomState.turn === oppRole && !oppDone);
}

function checkTurnState() {
  if (!roomState || roomState.status !== 'drafting') return;
  if (overlayShowing) return;

  updateTurnIndicator();

  const isMyTurn = roomState.turn === playerRole;

  if (isMyTurn) {
    const state = getState();
    if (!state.isComplete && !activeCardEl && document.getElementById("action-bar").children.length === 0) {
      startRound();
    }
  } else {
    clearActionButtons();
    const area = document.getElementById("draft-area");
    area.innerHTML = `
      <div class="waiting-container">
        <div class="beautiful-spinner"></div>
        <div class="waiting-text">Waiting for opponent...</div>
      </div>
    `;

    const opponentData = roomState.players[roomState.turn];
    if (opponentData && opponentData.turnIndex < activeDraftOrder.length) {
      const posKey = activeDraftOrder[opponentData.turnIndex];
      const pos = SLOT_POSITION[posKey] || posKey;
      document.getElementById("score-current-pos").textContent = pos === "Manager" ? "MGR" : pos;
    } else {
      document.getElementById("score-current-pos").textContent = "---";
    }
  }
}

/**
 * Syncs the scoreboard slots with current game state.
 */
function updateTopSlots() {
  const state = getState();
  renderTeamSlots(state.team, activeDraftOrder, state.currentIndex);

  const teamArray = Object.values(state.team).filter(c => c !== null);
  const myAvg = teamArray.length > 0 ? Math.round(teamArray.reduce((sum, c) => sum + c.stat, 0) / teamArray.length) : 0;
  document.getElementById("score-you-ovr").textContent = myAvg > 0 ? myAvg : "--";

  const myDots = document.getElementById("score-you-dots").querySelectorAll(".dot");
  myDots.forEach((dot, i) => {
    if (i < state.currentIndex) dot.classList.add("filled");
    else dot.classList.remove("filled");
  });

  if (!state.isComplete) {
    const posKey = activeDraftOrder[state.currentIndex];
    const pos = SLOT_POSITION[posKey] || posKey;
    document.getElementById("score-current-pos").textContent = pos === "Manager" ? "MGR" : pos;
  } else {
    document.getElementById("score-current-pos").textContent = "READY";
  }
}

async function handleKeep() {
  if (!activeCardData) return;

  const card = activeCardData;
  const slotKey = activeDraftOrder[getState().currentIndex];

  keepCard(activeCardData);

  activeCardEl = null;
  activeCardData = null;
  clearActionButtons();

  const area = document.getElementById("draft-area");
  area.innerHTML = `
    <div class="waiting-container">
      <div class="beautiful-spinner"></div>
      <div class="waiting-text">Waiting for opponent...</div>
    </div>
  `;

  const state = getState();
  updateTopSlots();

  await online.submitPick(currentRoomCode, playerRole, slotKey, card, state.currentIndex);

  if (state.isComplete) {
    const opponentRole = playerRole === 'host' ? 'guest' : 'host';
    if (roomState.players[opponentRole].turnIndex === activeDraftOrder.length) {
      await online.setStatus(currentRoomCode, 'matching');
    }
  }
}

function handleIgnore() {
  if (!activeCardEl) return;

  ignoreCard();
  rejectCard(activeCardEl);
  clearActionButtons();
  lockUnflippedCards(false);

  activeCardEl = null;
  activeCardData = null;
}

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
    lockUnflippedCards(true);

    activeCardEl = cardEl;
    activeCardData = card;
    setTimeout(handleKeep, 1400);
  }
}

function startRound() {
  updateTopSlots();
  clearActionButtons();

  const { choices } = beginRound(roomState.seed, playerRole);
  renderChoices(choices, handleCardFlip);
}

function transitionToMatch() {
  document.getElementById("lobby-board").classList.add("hidden");

  const { team } = getState();

  const playerCards = Object.values(team).filter(c => c !== null);
  const playerAvg = Math.round(playerCards.reduce((sum, c) => sum + c.stat, 0) / playerCards.length);

  const opponentRole = playerRole === 'host' ? 'guest' : 'host';
  const opponentTeam = roomState.players[opponentRole].team;
  const opponentCards = Object.values(opponentTeam).filter(c => c !== null);
  const opponentAvg = Math.round(opponentCards.reduce((sum, c) => sum + c.stat, 0) / opponentCards.length);

  showMatchScreen(
    team,
    playerAvg,
    opponentTeam,
    opponentAvg,
    TACTICS,
    TACTIC_LABELS,
    handleTacticChosen
  );

  const myTactic = roomState.players[playerRole].tactic;
  if (myTactic) {
    document.querySelectorAll('.tactic-btn').forEach(btn => btn.classList.add('is-dimmed'));
    const tacticBtn = document.getElementById(`tactic-${myTactic.toLowerCase()}`);
    if (tacticBtn) {
      tacticBtn.classList.remove('is-dimmed');
      tacticBtn.classList.add('is-selected');
    }
    document.querySelector('.tactic-hint').textContent = "Waiting for opponent...";
  } else {
    document.querySelector('.tactic-hint').textContent = "Pick a tactic to play";
  }
}

async function handleTacticChosen(tactic) {
  document.querySelectorAll('.tactic-btn').forEach(btn => btn.classList.add('is-dimmed'));

  const chosenBtn = document.getElementById(`tactic-${tactic.toLowerCase()}`);
  chosenBtn.classList.remove('is-dimmed');
  chosenBtn.classList.add('is-selected');

  document.querySelector('.tactic-hint').textContent = "Waiting for opponent...";

  await online.submitTactic(currentRoomCode, playerRole, tactic);
}

function resolveMatch() {
  const host = roomState.players.host;
  const guest = roomState.players.guest;

  const hostCards = Object.values(host.team).filter(c => c !== null);
  const guestCards = Object.values(guest.team).filter(c => c !== null);
  const hostAvg = Math.round(hostCards.reduce((sum, c) => sum + c.stat, 0) / hostCards.length);
  const guestAvg = Math.round(guestCards.reduce((sum, c) => sum + c.stat, 0) / guestCards.length);

  const originalRandom = Math.random;
  let matchSeed = roomState.seed + 1000;
  Math.random = function() {
    let x = Math.sin(matchSeed++) * 10000;
    return x - Math.floor(x);
  };

  const hostMatchResult = simulateMatch(hostAvg, guestAvg, host.tactic, guest.tactic);

  Math.random = originalRandom;

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
      showModal("Restarting room...", leaveAndReload);
      await online.restartRoom(currentRoomCode);
    } else {
      showModal("Waiting for host to restart...", leaveAndReload);
    }
  }, playerRole === 'host');
}

function startGame() {
  document.getElementById("lobby-board").classList.add("hidden");
  showDraftBoard();

  // Mode must be synced from roomState before this runs (done in startWatchingRoom)
  activeDraftOrder = getDraftOrder(currentMode);

  const myData = roomState.players[playerRole];
  if (myData) {
    restoreState(myData.team, myData.turnIndex, activeDraftOrder);
  } else {
    resetGame(activeDraftOrder);
  }

  activeCardEl = null;
  activeCardData = null;

  initScoreDots(activeDraftOrder.length);
  initTeamSlots(activeDraftOrder);
  updateTopSlots();

  checkTurnState();
}

// ─── Squad Drawer ─────────────────────────────────────────────────────────────
function setupDrawer() {
  const toggleBtn = document.getElementById("btn-toggle-squad");
  const drawer = document.getElementById("squad-drawer");

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener("click", () => {
      const isClosed = drawer.classList.contains("drawer-closed");
      if (isClosed) {
        drawer.classList.remove("drawer-closed");
        drawer.setAttribute("aria-hidden", "false");
        toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      } else {
        drawer.classList.add("drawer-closed");
        drawer.setAttribute("aria-hidden", "true");
        toggleBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i>';
      }
    });

    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("drawer-closed") &&
          !drawer.contains(e.target) &&
          !toggleBtn.contains(e.target)) {
        drawer.classList.add("drawer-closed");
        drawer.setAttribute("aria-hidden", "true");
        toggleBtn.innerHTML = '<i class="fa-solid fa-list-ul"></i>';
      }
    });
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupDrawer();
  initLobby();

  document.getElementById("btn-leave-room").addEventListener("click", () => {
    showConfirmModal("Are you sure you want to leave the room?", leaveAndReload);
  });

  // Try to restore session
  const savedCode = sessionStorage.getItem('futdeal_roomCode');
  const savedRole = sessionStorage.getItem('futdeal_playerRole');
  if (savedCode && savedRole) {
    currentRoomCode = savedCode;
    playerRole = savedRole;

    const savedMode = sessionStorage.getItem('futdeal_mode');
    if (savedMode) {
      currentMode = savedMode;
      activeDraftOrder = getDraftOrder(currentMode);
    }

    const savedName = sessionStorage.getItem('futdeal_playerName');
    if (savedName) document.getElementById("score-you-name").textContent = savedName;

    showModal("Reconnecting...", () => {
      sessionStorage.removeItem('futdeal_roomCode');
      sessionStorage.removeItem('futdeal_playerRole');
      sessionStorage.removeItem('futdeal_mode');
      window.location.reload();
    });

    document.getElementById("btn-create-room").style.display = "none";
    hideJoinSection();
    document.getElementById("btn-leave-room").classList.remove("hidden");

    startWatchingRoom();
  }
});
