/**
 * Interface for player metadata
 */
export interface PlayerMetadata {
  /** Sleeper channel ID associated with the player */
  channel_id?: string;

  /** Any additional metadata fields */
  [key: string]: any;
}

/**
 * Interface for a single player in Sleeper fantasy football
 */
export interface Player {
  /** Player's last name in lowercase for search purposes */
  search_last_name: string;

  /** NFL GSIS ID (Game Stats Information System) */
  gsis_id: string | null;

  /** Additional information about injuries */
  injury_notes: string | null;

  /** Sportradar's unique identifier for the player */
  sportradar_id: string | null;

  /** Additional metadata for the player */
  metadata: PlayerMetadata | null;

  /** Current NFL team abbreviation (e.g., "LAR") or null if not on a team */
  team: string | null;

  /** Timestamp when the player changed teams */
  team_changed_at: number | null;

  /** Sport the player plays (always "nfl" for NFL players) */
  sport: string;

  /** Whether the player is active */
  active: boolean;

  /** Fantasy positions the player is eligible for */
  fantasy_positions: string[];

  /** Player's last name */
  last_name: string;

  /** Sleeper's unique identifier for the player */
  player_id: string;

  /** Player's hashtag identifier */
  hashtag: string;

  /** Player's order on their team's depth chart (null if unknown) */
  depth_chart_order: number | null;

  /** Body part that is injured */
  injury_body_part: string | null;

  /** Timestamp when news about the player was last updated */
  news_updated: number | null;

  /** Player's jersey number */
  number: number | null;

  /** Yahoo's unique identifier for the player */
  yahoo_id: number | null;

  /** Player's injury status (e.g., "Questionable", "Out") */
  injury_status: string | null;

  /** Player's weight in pounds */
  weight: string | null;

  /** Player's search ranking (for search relevancy) */
  search_rank: number;

  /** Abbreviated team name */
  team_abbr: string | null;

  /** Player's status (e.g., "Active", "Inactive") */
  status: string;

  /** ESPN's unique identifier for the player */
  espn_id: number | null;

  /** Player's position on the depth chart */
  depth_chart_position: string | null;

  /** FantasyData's unique identifier for the player */
  fantasy_data_id: number | null;

  /** Player's country of birth */
  birth_country: string | null;

  /** Player's full name */
  full_name: string;

  /** Player's first name in lowercase for search purposes */
  search_first_name: string;

  /** Player's height in inches */
  height: string | null;

  /** Player's college */
  college: string | null;

  /** Player's first name */
  first_name: string;

  /** Player's full name in lowercase for search purposes */
  search_full_name: string;

  /** Rotoworld's unique identifier for the player */
  rotoworld_id: number | null;

  /** Date the injury started */
  injury_start_date: string | null;

  /** List of competitions the player is part of */
  competitions: any[];

  /** Player's birth date in "YYYY-MM-DD" format */
  birth_date: string | null;

  /** OddsJam's unique identifier for the player */
  oddsjam_id: number | null;

  /** Description of practice participation */
  practice_description: string | null;

  /** Player's birth state */
  birth_state: string | null;

  /** Swish's unique identifier for the player */
  swish_id: number | null;

  /** Stats.com unique identifier for the player */
  stats_id: number | null;

  /** Player's position */
  position: string;

  /** Opta's unique identifier for the player */
  opta_id: number | null;

  /** PandaScore's unique identifier for the player */
  pandascore_id: number | null;

  /** Player's city of birth */
  birth_city: string | null;

  /** RotoWire's unique identifier for the player */
  rotowire_id: number | null;

  /** Player's high school */
  high_school: string | null;

  /** Number of years of experience in the NFL */
  years_exp: number | null;

  /** Player's age */
  age: number | null;

  /** Player's practice participation status */
  practice_participation: string | null;
}

/**
 * Type for the player entry, where keys are player IDs and values are Player objects
 */
export type PlayerEntry = {
  [playerId: string]: Player;
};
