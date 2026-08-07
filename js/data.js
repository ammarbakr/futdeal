/**
 * data.js — Card pool for FutDeal
 * Exactly 25 cards, 5 per position. Stats 60-95.
 */

export const CARD_POOL = [
  // ── Goalkeepers (10) ───────────────────────────────────────────────────────────
  { id: "gk_01", name: "Alonso Vargas",    position: "GK", stat: 88, rarity: "gold"   },
  { id: "gk_02", name: "Femi Okonkwo",     position: "GK", stat: 82, rarity: "silver" },
  { id: "gk_03", name: "Lukas Bauer",      position: "GK", stat: 76, rarity: "silver" },
  { id: "gk_04", name: "Tariq Mansoori",   position: "GK", stat: 70, rarity: "bronze" },
  { id: "gk_05", name: "Pablo Noriega",    position: "GK", stat: 65, rarity: "bronze" },
  { id: "gk_06", name: "Ivan Petrov",      position: "GK", stat: 87, rarity: "gold"   },
  { id: "gk_07", name: "Carlos Silva",     position: "GK", stat: 81, rarity: "silver" },
  { id: "gk_08", name: "David Johnson",    position: "GK", stat: 75, rarity: "silver" },
  { id: "gk_09", name: "Ahmed Ali",        position: "GK", stat: 71, rarity: "bronze" },
  { id: "gk_10", name: "Samir K",          position: "GK", stat: 66, rarity: "bronze" },

  // ── Defenders (10) ─────────────────────────────────────────────────────────────
  { id: "df_01", name: "Marcus Thiele",    position: "DF", stat: 92, rarity: "elite"  },
  { id: "df_02", name: "Javier Castaño",   position: "DF", stat: 85, rarity: "gold"   },
  { id: "df_03", name: "Emeka Eze",        position: "DF", stat: 80, rarity: "silver" },
  { id: "df_04", name: "Soren Lindqvist",  position: "DF", stat: 74, rarity: "silver" },
  { id: "df_05", name: "Kosta Petridis",   position: "DF", stat: 68, rarity: "bronze" },
  { id: "df_06", name: "Liam O'Connor",    position: "DF", stat: 90, rarity: "elite"  },
  { id: "df_07", name: "Diego Rossi",      position: "DF", stat: 84, rarity: "gold"   },
  { id: "df_08", name: "Ali Hassan",       position: "DF", stat: 79, rarity: "silver" },
  { id: "df_09", name: "Chen Wei",         position: "DF", stat: 75, rarity: "silver" },
  { id: "df_10", name: "Tom Smith",        position: "DF", stat: 69, rarity: "bronze" },

  // ── Midfielders (10) ───────────────────────────────────────────────────────────
  { id: "mf_01", name: "Rodrigo Viana",    position: "MF", stat: 89, rarity: "gold"   },
  { id: "mf_02", name: "Yusuf Osman",      position: "MF", stat: 84, rarity: "gold"   },
  { id: "mf_03", name: "Dmitri Volkov",    position: "MF", stat: 78, rarity: "silver" },
  { id: "mf_04", name: "Callum Frazer",    position: "MF", stat: 73, rarity: "silver" },
  { id: "mf_05", name: "Noa Ben-David",    position: "MF", stat: 67, rarity: "bronze" },
  { id: "mf_06", name: "Enzo Fernandez",   position: "MF", stat: 88, rarity: "gold"   },
  { id: "mf_07", name: "Lucas Moura",      position: "MF", stat: 85, rarity: "gold"   },
  { id: "mf_08", name: "Mateo Kovacic",    position: "MF", stat: 79, rarity: "silver" },
  { id: "mf_09", name: "John Doe",         position: "MF", stat: 72, rarity: "silver" },
  { id: "mf_10", name: "Jack Wilson",      position: "MF", stat: 68, rarity: "bronze" },

  // ── Attackers (10) ─────────────────────────────────────────────────────────────
  { id: "at_01", name: "Léon Mbappé",      position: "AT", stat: 94, rarity: "elite"  },
  { id: "at_02", name: "Cristóbal Ureña",  position: "AT", stat: 86, rarity: "gold"   },
  { id: "at_03", name: "Haruto Tanaka",    position: "AT", stat: 79, rarity: "silver" },
  { id: "at_04", name: "Ezra Mensah",      position: "AT", stat: 72, rarity: "silver" },
  { id: "at_05", name: "Baran Yıldız",     position: "AT", stat: 66, rarity: "bronze" },
  { id: "at_06", name: "Alex Hunter",      position: "AT", stat: 93, rarity: "elite"  },
  { id: "at_07", name: "Marco Polo",       position: "AT", stat: 87, rarity: "gold"   },
  { id: "at_08", name: "Kenji Sato",       position: "AT", stat: 80, rarity: "silver" },
  { id: "at_09", name: "Oliver Twist",     position: "AT", stat: 73, rarity: "silver" },
  { id: "at_10", name: "Omar Tariq",       position: "AT", stat: 65, rarity: "bronze" },

  // ── Managers (10) ──────────────────────────────────────────────────────────────
  { id: "mg_01", name: "Sir Alistair",     position: "Manager", stat: 90, rarity: "elite"  },
  { id: "mg_02", name: "Héctor Rueda",     position: "Manager", stat: 83, rarity: "gold"   },
  { id: "mg_03", name: "Joachim Steiner",  position: "Manager", stat: 77, rarity: "silver" },
  { id: "mg_04", name: "Oumar Kouyaté",    position: "Manager", stat: 71, rarity: "silver" },
  { id: "mg_05", name: "Park Ji-won",      position: "Manager", stat: 64, rarity: "bronze" },
  { id: "mg_06", name: "Don Carlo",        position: "Manager", stat: 91, rarity: "elite"  },
  { id: "mg_07", name: "Pep G.",           position: "Manager", stat: 89, rarity: "gold"   },
  { id: "mg_08", name: "Jurgen K.",        position: "Manager", stat: 85, rarity: "gold"   },
  { id: "mg_09", name: "Jose M.",          position: "Manager", stat: 80, rarity: "silver" },
  { id: "mg_10", name: "Erik T.",          position: "Manager", stat: 75, rarity: "silver" },
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
  bronze: "#cd7f32",
  silver: "#a8a9ad",
  gold:   "#FFD700",
  elite:  "#00E676",
};
