export interface Matchup {
  roster_id: number;

  matchup_id: number;

  points: number;

  custom_points: number | null;

  starters: string[];

  starters_points: number[];

  players: string[];

  players_points: {
    [playerId: string]: number;
  };
}
