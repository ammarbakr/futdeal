/**
 * game.js — Strict Draft State Machine
 */

import { CARD_POOL, DRAFT_ORDER, SLOT_POSITION } from "./data.js";

const STATE = {
  draftOrder: DRAFT_ORDER,
  currentIndex: 0,
  team: { GK: null, DF: null, MF: null, AT: null, Manager: null },
  isComplete: false,

  // IDLE: waiting for user to flip a card
  // DECIDING: card flipped, waiting for Keep/Ignore
  // FORCED_PICK: ignore used, next flip is auto-kept
  interactionState: "IDLE",
  ignoreUsedThisRound: false,
};

export function getState() {
  return { ...STATE, team: { ...STATE.team }, draftOrder: [...STATE.draftOrder] };
}

export function resetGame(draftOrder = DRAFT_ORDER) {
  STATE.draftOrder = draftOrder;
  STATE.currentIndex = 0;
  STATE.team = Object.fromEntries(draftOrder.map(key => [key, null]));
  STATE.isComplete = false;
  STATE.interactionState = "IDLE";
  STATE.ignoreUsedThisRound = false;
}

export function restoreState(team, turnIndex, draftOrder = DRAFT_ORDER) {
  STATE.draftOrder = draftOrder;
  const emptyTeam = Object.fromEntries(draftOrder.map(key => [key, null]));
  STATE.team = { ...emptyTeam, ...(team || {}) };
  STATE.currentIndex = turnIndex;
  STATE.isComplete = turnIndex >= draftOrder.length;
  STATE.interactionState = "IDLE";
  STATE.ignoreUsedThisRound = false;
}

export function beginRound(seed, role = 'host') {
  if (STATE.isComplete) return { choices: [] };

  const currentKey = STATE.draftOrder[STATE.currentIndex];
  const currentPos = SLOT_POSITION[currentKey];

  STATE.interactionState = "IDLE";
  STATE.ignoreUsedThisRound = false;

  // Filter out cards already drafted by this player this game
  const pickedIds = new Set(
    Object.values(STATE.team).filter(Boolean).map(c => c.id)
  );
  const pool = CARD_POOL.filter(c => c.position === currentPos && !pickedIds.has(c.id));

  let localSeed = seed + STATE.currentIndex;
  const shuffled = [...pool].sort(() => {
    let x = Math.sin(localSeed++) * 10000;
    return (x - Math.floor(x)) - 0.5;
  });

  const raw = role === 'host' ? shuffled.slice(0, 4) : shuffled.slice(4, 8);
  // Pad with nulls if pool ran low on later picks of the same position
  const choices = raw.length < 4 ? [...raw, ...Array(4 - raw.length).fill(null)] : raw;
  return { choices };
}

export function registerFlip() {
  if (STATE.interactionState === "IDLE") {
    STATE.interactionState = "DECIDING";
  }
}

export function keepCard(card) {
  const currentKey = STATE.draftOrder[STATE.currentIndex];
  STATE.team[currentKey] = card;
  STATE.currentIndex++;
  if (STATE.currentIndex >= STATE.draftOrder.length) {
    STATE.isComplete = true;
  }
}

export function ignoreCard() {
  STATE.ignoreUsedThisRound = true;
  STATE.interactionState = "FORCED_PICK";
}
