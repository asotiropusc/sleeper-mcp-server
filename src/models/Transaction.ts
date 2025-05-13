/**
 * Interface for a draft pick in a transaction
 */
export interface SleeperTransactionDraftPick {
  /** The season this draft pick belongs to (e.g., "2019") */
  season: string;

  /** Which round this draft pick is */
  round: number;

  /** Original owner's roster_id */
  roster_id: number;

  /** Previous owner's roster_id (in this trade) */
  previous_owner_id: number;

  /** The new owner of this pick after the trade */
  owner_id: number;
}

/**
 * Interface for FAAB budget transfers in a transaction
 */
export interface SleeperWaiverBudgetTransfer {
  /** The roster_id of the sender */
  sender: number;

  /** The roster_id of the receiver */
  receiver: number;

  /** The amount of FAAB dollars transferred */
  amount: number;
}

/**
 * Interface for waiver bid settings
 */
export interface SleeperWaiverSettings {
  /** The amount bid on this waiver claim */
  waiver_bid?: number;

  /** Any other settings properties */
  [key: string]: any;
}

/**
 * Interface for a transaction in Sleeper
 */
export interface SleeperTransaction {
  /** Type of transaction: "trade", "free_agent", or "waiver" */
  type: "trade" | "free_agent" | "waiver";

  /** Unique identifier for this transaction */
  transaction_id: string;

  /** Timestamp when the status was last updated */
  status_updated: number;

  /** Current status of the transaction */
  status: "complete" | "pending" | "failed" | string;

  /** Settings for the transaction, primarily used for waiver claims */
  settings: SleeperWaiverSettings | null;

  /** Array of roster_ids involved in this transaction */
  roster_ids: number[];

  /** Additional metadata about the transaction */
  metadata: any | null;

  /** The week in which this transaction occurred */
  leg: number;

  /** Map of player_id to roster_id for players dropped in this transaction */
  drops: { [playerId: string]: number } | null;

  /** Array of draft picks involved in this transaction */
  draft_picks: SleeperTransactionDraftPick[];

  /** User ID who initiated the transaction */
  creator: string;

  /** Timestamp when the transaction was created */
  created: number;

  /** Array of roster_ids of users who agreed to this transaction */
  consenter_ids: number[];

  /** Map of player_id to roster_id for players added in this transaction */
  adds: { [playerId: string]: number } | null;

  /** Array of FAAB budget transfers involved in this transaction */
  waiver_budget: SleeperWaiverBudgetTransfer[];
}
