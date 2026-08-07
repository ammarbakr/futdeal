import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, onDisconnect, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// 🔴 IMPORTANT: Replace this with your actual Firebase project config
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

export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoom(playerName) {
  const code = generateRoomCode();
  const roomRef = ref(db, `rooms/${code}`);

  await set(roomRef, {
    status: 'waiting',
    seed: Math.floor(Math.random() * 1000000), // Random seed to generate same random outcomes
    turn: 'host', // 'host' or 'guest'
    players: {
      host: { 
        name: playerName, 
        team: {GK:null, DF:null, MF:null, AT:null, Manager:null}, 
        turnIndex: 0,
        connected: true,
        tactic: null
      }
    }
  });

  // Handle disconnect
  onDisconnect(ref(db, `rooms/${code}/players/host/connected`)).set(false);

  return code;
}

export async function joinRoom(code, playerName) {
  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const data = snapshot.val();
  if (data.status !== 'waiting') {
    throw new Error('Room is full or already started');
  }

  await update(roomRef, {
    status: 'drafting',
    turn: 'host', // host goes first
    'players/guest': { 
      name: playerName, 
      team: {GK:null, DF:null, MF:null, AT:null, Manager:null}, 
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

export async function submitPick(code, role, position, card, newTurnIndex) {
  const roomRef = ref(db, `rooms/${code}`);
  const updates = {};
  updates[`players/${role}/team/${position}`] = card;
  updates[`players/${role}/turnIndex`] = newTurnIndex;

  // Pass turn to the other player if they haven't finished, or keep it if they have.
  // Actually, turn logic can be simple: toggle to the other person.
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
  const updates = {
    status: 'drafting',
    seed: Math.floor(Math.random() * 1000000),
    turn: 'host',
    'players/host/team': {GK:null, DF:null, MF:null, AT:null, Manager:null},
    'players/host/turnIndex': 0,
    'players/host/tactic': null,
    'players/guest/team': {GK:null, DF:null, MF:null, AT:null, Manager:null},
    'players/guest/turnIndex': 0,
    'players/guest/tactic': null,
  };
  await update(roomRef, updates);
}

export async function submitTactic(code, role, tactic) {
  await update(ref(db, `rooms/${code}/players/${role}`), { tactic });
}

// Simple seeded random to keep choices consistent
export function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}
