export enum SeasonType {
  pre = "pre",
  regular = "regular",
  post = "post",
  off = "off",
}

/**
 * Interface representing the NFL season state in Sleeper fantasy football
 */
export interface NFLState {
  /**
   * Current week number
   * 0 during offseason
   */
  week: number;

  /**
   * Week of the regular season (similar to week)
   * 0 during offseason
   */
  leg: number;

  /**
   * Type of season period: "pre" (preseason), "regular", "post" (postseason), or "off" (offseason)
   */
  season_type: SeasonType;

  /**
   * Current NFL season year
   */
  season: string;

  /**
   * Current active season for leagues
   * Can differ from season in certain periods
   */
  league_season: string;

  /**
   * Previous NFL season year
   */
  previous_season: string;

  /**
   * Start date of the regular season
   * Format: YYYY-MM-DD or null during offseason
   */
  season_start_date: string | null;

  /**
   * Which week to display in UI
   * Can be different than the actual week
   */
  display_week: number;

  /**
   * Season to use when creating new leagues
   * Typically flips to next season in December
   */
  league_create_season: string;

  /**
   * Whether the current season has scores available
   * Only present in some responses
   */
  season_has_scores?: boolean;
}
