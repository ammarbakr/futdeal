import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, onDisconnect } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { DRAFT_ORDER, DRAFT_ORDER_FULL } from "./data.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCalbjSWfCs0kkb0EdJL8YTSYlros745aM",
  authDomain: "futdeal-f4131.firebaseapp.com",
  projectId: "futdeal-f4131",
  databaseURL: "https://futdeal-f4131-default-rtdb.firebaseio.com/",
  storageBucket: "futdeal-f4131.firebasestorage.app",
  messagingSenderId: "67202330382",
  appId: "1:67202330382:web:bcfbb886de7fa82148715f"
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.error("Firebase initialization failed (check your config):", e);
}

function emptyTeam(mode) {
  const order = mode === 'full' ? DRAFT_ORDER_FULL : DRAFT_ORDER;
  return Object.fromEntries(order.map(key => [key, null]));
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoom(playerName, mode = 'quick') {
  const code = generateRoomCode();
  const roomRef = ref(db, `rooms/${code}`);

  await set(roomRef, {
    status: 'waiting',
    mode,
    seed: Math.floor(Math.random() * 1000000),
    turn: 'host',
    players: {
      host: {
        name: playerName,
        team: emptyTeam(mode),
        turnIndex: 0,
        connected: true,
        tactic: null
      }
    }
  });

  onDisconnect(ref(db, `rooms/${code}/players/host/connected`)).set(false);
  return code;
}

export async function joinRoom(code, playerName) {
  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) throw new Error('Room not found');

  const data = snapshot.val();
  if (data.status !== 'waiting') throw new Error('Room is full or already started');

  const mode = data.mode || 'quick';

  await update(roomRef, {
    status: 'drafting',
    turn: 'host',
    'players/guest': {
      name: playerName,
      team: emptyTeam(mode),
      turnIndex: 0,
      connected: true,
      tactic: null
    }
  });

  onDisconnect(ref(db, `rooms/${code}/players/guest/connected`)).set(false);
  return true;
}

export function watchRoom(code, callback) {
  const roomRef = ref(db, `rooms/${code}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsubscribe;
}

export async function submitPick(code, role, slotKey, card, newTurnIndex) {
  const roomRef = ref(db, `rooms/${code}`);
  const updates = {};
  updates[`players/${role}/team/${slotKey}`] = card;
  updates[`players/${role}/turnIndex`] = newTurnIndex;
  updates['turn'] = role === 'host' ? 'guest' : 'host';
  await update(roomRef, updates);
}

export async function setStatus(code, status) {
  await update(ref(db, `rooms/${code}`), { status });
}

export async function deleteRoom(code) {
  await set(ref(db, `rooms/${code}`), null);
}

export async function restartRoom(code) {
  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);
  const mode = snapshot.exists() ? (snapshot.val().mode || 'quick') : 'quick';

  const team = emptyTeam(mode);
  const updates = {
    status: 'drafting',
    seed: Math.floor(Math.random() * 1000000),
    turn: 'host',
    'players/host/team': team,
    'players/host/turnIndex': 0,
    'players/host/tactic': null,
    'players/guest/team': team,
    'players/guest/turnIndex': 0,
    'players/guest/tactic': null,
  };
  await update(roomRef, updates);
}

export async function submitTactic(code, role, tactic) {
  await update(ref(db, `rooms/${code}/players/${role}`), { tactic });
}

export function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}
