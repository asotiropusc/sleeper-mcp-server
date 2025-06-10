interface RosterMetadata {
  record: string; // String of W/L results (e.g., "WLWWWWLWWWLLWWLLLLLWWWWWLLLL")
  streak: string; // Current streak (e.g., "4L" for 4 losses in a row)
  [key: string]: string;
}

interface RosterSettings {
  fpts: number;
  fpts_against: number;
  fpts_against_decimal: number;
  fpts_decimal: number;
  losses: number;
  ppts: number;
  ppts_decimal: number;
  ties: number;
  total_moves: number;
  waiver_budget_used: number;
  waiver_position: number;
  wins: number;

  [key: string]: number;
}

export interface Roster {
  roster_id: number;
  owner_id: string;
  league_id: string;

  players: string[];
  starters: string[];
  reserve: string[] | null;
  taxi: string[] | null;

  settings: RosterSettings;
  metadata: RosterMetadata;

  co_owners: string[] | null;
  keepers: string[] | null;
  player_map: any | null;
}
