interface BracketReference {
  /**
   * The match ID of the winning team that advances to this matchup
   */
  w?: number;

  /**
   * The match ID of the losing team that advances to this matchup
   */
  l?: number;
}

export interface PlayoffMatchup {
  /**
   * The round for this matchup (1st, 2nd, 3rd round, etc.)
   */
  r: number;

  /**
   * The match ID of the matchup, unique for all matchups within a bracket
   */
  m: number;

  /**
   * The roster_id of a team in this matchup
   * OR null if determined by bracket progression
   */
  t1: number | null;

  /**
   * The roster_id of the other team in this matchup
   * OR null if determined by bracket progression
   */
  t2: number | null;

  /**
   * The roster_id of the winning team, if the match has been played
   * null if the match hasn't been played or completed
   */
  w: number | null;

  /**
   * The roster_id of the losing team, if the match has been played
   * null if the match hasn't been played or completed
   */
  l: number | null;

  /**
   * Where t1 comes from, either winner or loser of a previous match
   * Only present in later rounds where teams advance from previous matchups
   */
  t1_from?: BracketReference;

  /**
   * Where t2 comes from, either winner or loser of a previous match
   * Only present in later rounds where teams advance from previous matchups
   */
  t2_from?: BracketReference;

  /**
   * The position/placement this matchup determines
   * Present in championship/placement games
   */
  p?: number;
}
