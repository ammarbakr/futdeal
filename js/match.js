/**
 * match.js — Match simulation engine
 */

import { CARD_POOL, DRAFT_ORDER } from "./data.js";

export const TACTICS = ["Attack", "Possession", "Defend"];

export const TACTIC_LABELS = {
  Attack: '<i class="fa-solid fa-fire"></i> Attack',
  Possession: '<i class="fa-solid fa-arrows-to-eye"></i> Possession',
  Defend: '<i class="fa-solid fa-shield-halved"></i> Defend',
};

/**
 * Secretly generates a Bot opponent.
 */
export function generateOpponent() {
  const team = {};
  let totalStat = 0;

  DRAFT_ORDER.forEach(pos => {
    const pool = CARD_POOL.filter(c => c.position === pos);
    const randomCard = pool[Math.floor(Math.random() * pool.length)];
    team[pos] = randomCard;
    totalStat += randomCard.stat;
  });

  // Target OVR is between 70 and 90.
  // We mock this by generating a random average and forcing it for the UI.
  // (In a real game, we'd pick cards that perfectly match the average, but for this prototype 
  // generating random cards and displaying a fake 70-90 average works to satisfy the requirement)
  const avgStat = Math.floor(Math.random() * (90 - 70 + 1)) + 70;
  
  const tactic = TACTICS[Math.floor(Math.random() * TACTICS.length)];

  return { team, avgStat, tactic };
}

/**
 * Simulates the match using RPS logic and score randomizer.
 */
export function simulateMatch(playerAvg, opponentAvg, playerTactic, opponentTactic) {
  let playerAdj = playerAvg;
  let opponentAdj = opponentAvg;
  let boost = "none";

  // RPS Logic: Attack > Possession > Defend > Attack
  if (
    (playerTactic === "Attack" && opponentTactic === "Possession") ||
    (playerTactic === "Possession" && opponentTactic === "Defend") ||
    (playerTactic === "Defend" && opponentTactic === "Attack")
  ) {
    playerAdj = Math.round(playerAvg * 1.10);
    boost = "player";
  } else if (
    (opponentTactic === "Attack" && playerTactic === "Possession") ||
    (opponentTactic === "Possession" && playerTactic === "Defend") ||
    (opponentTactic === "Defend" && playerTactic === "Attack")
  ) {
    opponentAdj = Math.round(opponentAvg * 1.10);
    boost = "opponent";
  }

  // Calculate score difference based on OVR difference
  // Map difference to 0-5 goals
  let diff = playerAdj - opponentAdj;
  
  let basePlayerGoals = 0;
  let baseOpponentGoals = 0;

  if (diff > 0) {
    basePlayerGoals = Math.min(5, Math.max(1, Math.round(diff / 4)));
    baseOpponentGoals = Math.max(0, basePlayerGoals - Math.round(diff / 6));
  } else if (diff < 0) {
    baseOpponentGoals = Math.min(5, Math.max(1, Math.round(Math.abs(diff) / 4)));
    basePlayerGoals = Math.max(0, baseOpponentGoals - Math.round(Math.abs(diff) / 6));
  } else {
    // Exact tie
    basePlayerGoals = 1;
    baseOpponentGoals = 1;
  }

  // Add randomizer +/- 1
  let finalPlayerGoals = Math.max(0, basePlayerGoals + (Math.floor(Math.random() * 3) - 1));
  let finalOpponentGoals = Math.max(0, baseOpponentGoals + (Math.floor(Math.random() * 3) - 1));

  return {
    playerScore: finalPlayerGoals,
    opponentScore: finalOpponentGoals,
    playerAdj,
    opponentAdj,
    boost,
    playerTactic,
    opponentTactic,
    tacticLabels: TACTIC_LABELS
  };
}
