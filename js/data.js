/**
 * data.js — Card pool for FutDeal
 * 50 cards total, 10 per position. Stats 68-91.
 */

export const CARD_POOL = [
  // ── Goalkeepers (10) ───────────────────────────────────────────────────────────
  { id: "gk_01", name: "Thibaut Courtois",    position: "GK", stat: 90, rarity: "elite"  },
  { id: "gk_02", name: "Alisson Becker",      position: "GK", stat: 89, rarity: "gold"   },
  { id: "gk_03", name: "M. ter Stegen",       position: "GK", stat: 89, rarity: "gold"   },
  { id: "gk_04", name: "Emiliano Martínez",   position: "GK", stat: 85, rarity: "gold"   },
  { id: "gk_05", name: "Jordan Pickford",     position: "GK", stat: 82, rarity: "silver" },
  { id: "gk_06", name: "Kepa Arrizabalaga",   position: "GK", stat: 81, rarity: "silver" },
  { id: "gk_07", name: "Rui Patrício",        position: "GK", stat: 79, rarity: "silver" },
  { id: "gk_08", name: "Loris Karius",        position: "GK", stat: 74, rarity: "bronze" },
  { id: "gk_09", name: "Scott Carson",        position: "GK", stat: 70, rarity: "bronze" },
  { id: "gk_10", name: "Lee Grant",           position: "GK", stat: 68, rarity: "bronze" },

  // ── Defenders (10) ─────────────────────────────────────────────────────────────
  { id: "df_01", name: "Virgil van Dijk",     position: "DF", stat: 90, rarity: "elite"  },
  { id: "df_02", name: "Rúben Dias",          position: "DF", stat: 90, rarity: "elite"  },
  { id: "df_03", name: "Marquinhos",          position: "DF", stat: 87, rarity: "gold"   },
  { id: "df_04", name: "T. Alexander-Arnold", position: "DF", stat: 86, rarity: "gold"   },
  { id: "df_05", name: "Harry Maguire",       position: "DF", stat: 81, rarity: "silver" },
  { id: "df_06", name: "Eric Dier",           position: "DF", stat: 79, rarity: "silver" },
  { id: "df_07", name: "Victor Lindelöf",     position: "DF", stat: 78, rarity: "silver" },
  { id: "df_08", name: "Jonny Evans",         position: "DF", stat: 74, rarity: "bronze" },
  { id: "df_09", name: "Phil Jones",          position: "DF", stat: 72, rarity: "bronze" },
  { id: "df_10", name: "Nat Phillips",        position: "DF", stat: 71, rarity: "bronze" },

  // ── Midfielders (10) ───────────────────────────────────────────────────────────
  { id: "mf_01", name: "Kevin De Bruyne",     position: "MF", stat: 91, rarity: "elite"  },
  { id: "mf_02", name: "Rodri",               position: "MF", stat: 90, rarity: "elite"  },
  { id: "mf_03", name: "Jude Bellingham",     position: "MF", stat: 88, rarity: "gold"   },
  { id: "mf_04", name: "Luka Modrić",         position: "MF", stat: 87, rarity: "gold"   },
  { id: "mf_05", name: "Scott McTominay",     position: "MF", stat: 80, rarity: "silver" },
  { id: "mf_06", name: "Kalvin Phillips",     position: "MF", stat: 79, rarity: "silver" },
  { id: "mf_07", name: "Donny van de Beek",   position: "MF", stat: 78, rarity: "silver" },
  { id: "mf_08", name: "Jonjo Shelvey",       position: "MF", stat: 74, rarity: "bronze" },
  { id: "mf_09", name: "Harry Winks",         position: "MF", stat: 73, rarity: "bronze" },
  { id: "mf_10", name: "Tom Cleverley",       position: "MF", stat: 71, rarity: "bronze" },

  // ── Attackers (10) ─────────────────────────────────────────────────────────────
  { id: "at_01", name: "Kylian Mbappé",       position: "AT", stat: 91, rarity: "elite"  },
  { id: "at_02", name: "Erling Haaland",      position: "AT", stat: 91, rarity: "elite"  },
  { id: "at_03", name: "Lionel Messi",        position: "AT", stat: 90, rarity: "elite"  },
  { id: "at_04", name: "Vinícius Jr.",        position: "AT", stat: 89, rarity: "gold"   },
  { id: "at_05", name: "Mohamed Salah",       position: "AT", stat: 89, rarity: "gold"   },
  { id: "at_06", name: "Richarlison",         position: "AT", stat: 80, rarity: "silver" },
  { id: "at_07", name: "Anthony Martial",     position: "AT", stat: 79, rarity: "silver" },
  { id: "at_08", name: "Neal Maupay",         position: "AT", stat: 74, rarity: "bronze" },
  { id: "at_09", name: "Wout Weghorst",       position: "AT", stat: 74, rarity: "bronze" },
  { id: "at_10", name: "Rhian Brewster",      position: "AT", stat: 70, rarity: "bronze" },

  // ── Managers (10) ──────────────────────────────────────────────────────────────
  { id: "mg_01", name: "Pep Guardiola",       position: "Manager", stat: 91, rarity: "elite"  },
  { id: "mg_02", name: "Carlo Ancelotti",     position: "Manager", stat: 90, rarity: "elite"  },
  { id: "mg_03", name: "Jürgen Klopp",        position: "Manager", stat: 89, rarity: "gold"   },
  { id: "mg_04", name: "Mikel Arteta",        position: "Manager", stat: 86, rarity: "gold"   },
  { id: "mg_05", name: "Xabi Alonso",         position: "Manager", stat: 85, rarity: "gold"   },
  { id: "mg_06", name: "Erik ten Hag",        position: "Manager", stat: 81, rarity: "silver" },
  { id: "mg_07", name: "Sean Dyche",          position: "Manager", stat: 79, rarity: "silver" },
  { id: "mg_08", name: "Sam Allardyce",       position: "Manager", stat: 74, rarity: "bronze" },
  { id: "mg_09", name: "Wayne Rooney",        position: "Manager", stat: 72, rarity: "bronze" },
  { id: "mg_10", name: "Frank Lampard",       position: "Manager", stat: 71, rarity: "bronze" },
];

export const DRAFT_ORDER = ["GK", "DF", "MF", "AT", "Manager"];

export const POSITION_LABELS = {
  GK:      "Goalkeeper",
  DF:      "Defender",
  MF:      "Midfielder",
  AT:      "Attacker",
  Manager: "Manager",
};

export const RARITY_COLORS = {
  bronze: "#93765A",
  silver: "#ADAAA2",
  gold:   "#C9A24A",
  elite:  "#4E6E93",
};
