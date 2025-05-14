export enum Status {
  pre_draft = "pre_draft",
  drafting = "drafting",
  in_season = "in_season",
  complete = "complete",
}

export interface LeagueScoringSettings {
  // Passing
  pass_yd: number;
  pass_td: number;
  pass_int: number;
  pass_2pt: number;

  // Rushing
  rush_yd: number;
  rush_td: number;
  rush_2pt: number;

  // Receiving
  rec: number;
  rec_yd: number;
  rec_td: number;
  rec_2pt: number;

  // Kicking
  fgm_0_19: number;
  fgm_20_29: number;
  fgm_30_39: number;
  fgm_40_49: number;
  fgm_50_59: number;
  fgm_60p: number;
  fgmiss: number;
  xpm: number;
  xpmiss: number;

  // Defense & Special Teams
  def_td: number;
  st_td: number;
  st_ff: number;
  st_fum_rec: number;
  def_st_td: number;
  def_st_ff: number;
  def_st_fum_rec: number;
  blk_kick: number;
  sack: number;
  int: number;
  ff: number;
  safe: number;

  // Points Allowed
  pts_allow_0: number;
  pts_allow_1_6: number;
  pts_allow_7_13: number;
  pts_allow_14_20: number;
  pts_allow_21_27: number;
  pts_allow_28_34: number;
  pts_allow_35p: number;

  // Fumbles
  fum: number;
  fum_lost: number;
  fum_rec: number;
  fum_rec_td: number;

  [key: string]: number;
}

export interface LeagueMetadata {
  auto_continue: string;
  keeper_deadline: string;
  latest_league_winner_roster_id: string;

  [key: string]: string;
}

export interface LeagueSettings {
  // Team and Schedule Settings
  num_teams: number;
  start_week: number;
  playoff_week_start: number;
  league_average_match: number;
  last_scored_leg: number;
  leg: number;

  // Playoffs Settings
  playoff_teams: number;
  playoff_type: number;
  playoff_seed_type: number;
  playoff_round_type: number;

  // Roster Settings
  reserve_slots: number;
  bench_lock: number;
  taxi_slots: number;
  taxi_years: number;
  taxi_allow_vets: number;
  taxi_deadline: number;
  capacity_override: number;

  // Transaction Settings
  waiver_type: number;
  waiver_day_of_week: number;
  waiver_clear_days: number;
  waiver_budget: number;
  waiver_bid_min: number;
  disable_adds: number;
  trade_deadline: number;
  trade_review_days: number;
  disable_trades: number;
  pick_trading: number;
  max_keepers: number;
  type: number;
  offseason_adds: number;
  veto_votes_needed: number;
  veto_auto_poll: number;
  veto_show_votes: number;

  // Miscellaneous Settings
  best_ball: number;
  daily_waivers: number;
  daily_waivers_days: number;
  daily_waivers_hour: number;
  daily_waivers_last_ran: number;
  commissioner_direct_invite: number;
  last_report: number;
  max_subs: number;
  sub_start_time_eligibility: number;

  // Reserve Settings
  reserve_allow_out: number;
  reserve_allow_doubtful: number;
  reserve_allow_na: number;
  reserve_allow_sus: number;
  reserve_allow_cov: number;
  reserve_allow_dnr: number;

  // Draft Settings
  draft_rounds: number;

  [key: string]: number;
}

export interface League {
  // League Identification
  league_id: string;
  name: string;
  season: string;
  sport: string;
  status: Status;
  season_type: string;

  // Related IDs
  draft_id: string;
  bracket_id: number;
  loser_bracket_id: number;
  previous_league_id: null | string;
  group_id: null | string;
  company_id: null | string;
  shard: number;

  // Nested Objects
  scoring_settings: LeagueScoringSettings;
  settings: LeagueSettings;
  metadata: LeagueMetadata;

  // League Structure
  total_rosters: number;
  roster_positions: string[];

  // Optional IDs that can be null
  bracket_overrides_id: null | string;
  loser_bracket_overrides_id: null | string;

  // League Chat & Activity
  last_message_id: string;
  last_message_time: number;
  last_message_text_map: null | any;
  last_message_attachment: null | any;
  last_read_id: string;
  last_author_id: string;
  last_author_display_name: string;
  last_author_avatar: null | string;
  last_author_is_bot: boolean;
  last_pinned_message_id: null | string;
  last_transaction_id: number;

  // Display Settings
  avatar: null | string;
  display_order: number;
}
