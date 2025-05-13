export interface TradedPick {
  /**
   * Draft round of the pick (1st round, 2nd round, etc.)
   */
  round: number;

  /**
   * Season year the draft pick belongs to (e.g., "2025")
   */
  season: string;

  /**
   * The roster_id of the original owner of the pick
   * This represents the team the pick originally belonged to
   */
  roster_id: number;

  /**
   * The roster_id of the new/current owner of the pick
   */
  owner_id: number;

  /**
   * The roster_id of the previous owner of the pick
   * In a direct trade, this would be the same as roster_id
   * In case of multiple trades, this tracks the most recent owner
   */
  previous_owner_id: number;
}
