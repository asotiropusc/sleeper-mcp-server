export enum SeasonType {
  pre = "pre",
  regular = "regular",
  post = "post",
  off = "off",
}

export interface NFLState {
  week: number;
  leg: number;

  /**
   * Type of season period: "pre" (preseason), "regular", "post" (postseason), or "off" (offseason)
   */
  season_type: SeasonType;
  season: string;
  league_season: string;
  previous_season: string;
  season_start_date: string | null;
  display_week: number;
  league_create_season: string;
  season_has_scores?: boolean;
}
