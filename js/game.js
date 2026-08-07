/**
 * game.js — Strict Draft State Machine
 */

import { CARD_POOL, DRAFT_ORDER } from "./data.js";

const STATE = {
  currentIndex: 0,
  team: { GK: null, DF: null, MF: null, AT: null, Manager: null },
  isComplete: false,
  
  // Interaction states:
  // IDLE: Waiting for user to click a face-down card
  // DECIDING: User flipped one card, waiting for Keep/Ignore
  // FORCED_PICK: User ignored a card, next flip is auto-keep
  interactionState: "IDLE",
  ignoreUsedThisRound: false,
};

/**
 * Returns a read-only copy of the game state.
 */
export function getState() {
  return { ...STATE, team: { ...STATE.team } };
}

/**
 * Resets the draft state for a new game.
 */
export function resetGame() {
  STATE.currentIndex = 0;
  STATE.team = { GK: null, DF: null, MF: null, AT: null, Manager: null };
  STATE.isComplete = false;
  STATE.interactionState = "IDLE";
  STATE.ignoreUsedThisRound = false;
}

/**
 * Restores the draft state from remote data (for reconnecting)
 */
export function restoreState(team, turnIndex) {
  STATE.team = { GK: null, DF: null, MF: null, AT: null, Manager: null, ...(team || {}) };
  STATE.currentIndex = turnIndex;
  STATE.isComplete = turnIndex >= DRAFT_ORDER.length;
  STATE.interactionState = "IDLE";
  STATE.ignoreUsedThisRound = false;
}

/**
 * Starts a round. Returns 4 cards for the current position.
 * Uses a seed so both players get a predictable pool, but gives different cards to host/guest.
 */
export function beginRound(seed, role = 'host') {
  if (STATE.isComplete) return { choices: [] };

  const currentPos = DRAFT_ORDER[STATE.currentIndex];
  
  // Reset round-specific interaction state
  STATE.interactionState = "IDLE";
  STATE.ignoreUsedThisRound = false;

  const pool = CARD_POOL.filter(c => c.position === currentPos);
  
  // Simple seeded shuffle
  let localSeed = seed + STATE.currentIndex;
  const shuffled = [...pool].sort(() => {
    let x = Math.sin(localSeed++) * 10000;
    return (x - Math.floor(x)) - 0.5;
  });

  // Give host the first 4 cards, give guest the next 4 cards.
  // Since they are shuffled, they are random but deterministic.
  // Their average stat might be slightly different, but over 5 rounds it balances out.
  // (In a production game, we would actively balance the averages).
  if (role === 'host') {
    return { choices: shuffled.slice(0, 4) };
  } else {
    return { choices: shuffled.slice(4, 8) };
  }
}

/**
 * Called when a card is flipped. 
 * Enforces interaction state transitions.
 */
export function registerFlip() {
  if (STATE.interactionState === "IDLE") {
    STATE.interactionState = "DECIDING";
  } else if (STATE.interactionState === "FORCED_PICK") {
    // We stay in FORCED_PICK, main.js will auto-keep it
  }
}

/**
 * Locks the chosen card into the team slot and advances the draft.
 */
export function keepCard(card) {
  const currentPos = DRAFT_ORDER[STATE.currentIndex];
  STATE.team[currentPos] = card;
  
  STATE.currentIndex++;
  if (STATE.currentIndex >= DRAFT_ORDER.length) {
    STATE.isComplete = true;
  }
  
  // Reset state for next round (handled by beginRound when called)
}

/**
 * Marks that ignore has been used this round.
 * Sets state to FORCED_PICK so next flip auto-keeps.
 */
export function ignoreCard() {
  STATE.ignoreUsedThisRound = true;
  STATE.interactionState = "FORCED_PICK";
}
