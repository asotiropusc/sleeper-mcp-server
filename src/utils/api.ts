import {
  User,
  League,
  Roster,
  Status,
  Matchup,
  NFLState,
  SeasonType,
  PlayoffMatchup,
  PlayerMap,
  PlayerTrend,
  PlayoffRoundType,
} from "../models/index.js";
import {
  buildBracket,
  enhanceMatchupWithPlayerDetails,
  enhanceRosterWithPlayerDetails,
  fetchPlayerMap,
  getUserRosterId,
  mapPlayerDetails,
  normalizeString,
} from "./helpers.js";

export const SLEEPER_API_BASE = "https://api.sleeper.app/v1";

interface LeagueHistoryEntry {
  leagueId: string;
  leagueName: string;
  leagueStatus: Status;
}

interface YearlyPlayoffData {
  year: string;
  leagueName: string;
  placements: Record<string, string[]>;
  missedPlayoffs: string[];
  isIncomplete: boolean;
}

interface Standing {
  placement: string;
  rosterId: string;
}

interface TrendingPlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  playerTrend: string;
  trendType: "add" | "drop";
  trendRank: number;
}

interface MatchupDetails {
  userRoster: EnhancedMatchup;
  opponentRoster: EnhancedMatchup;
  userOwners: string[];
  opponentOwners: string[];
  matchupStatus: "completed" | "in_progress" | "upcoming";
}

type Winner = string[] | "tie" | null;

interface MatchupSummary {
  userTeam: {
    owners: string[];
    score: number;
  };
  opponentTeam: {
    owners: string[];
    score: number;
  };
  winner: Winner;
  matchupId: number;
  week: number;
  status: "completed" | "in_progress" | "upcoming";
}

interface MatchupPlayerBreakdown {
  userTeam: {
    name: string[];
    players: MatchupPlayerDetail[];
    totalPoints: number;
  };
  opponentTeam: {
    name: string[];
    players: MatchupPlayerDetail[];
    totalPoints: number;
  };
  week: number;
  matchupStatus: "completed" | "in_progress" | "upcoming";
}

interface LineupAnalysis {
  starters: MatchupPlayerDetail[];
  bench: MatchupPlayerDetail[];
  worstStarter: MatchupPlayerDetail;
  outperformingBench: MatchupPlayerDetail[];
  missedPoints: number;
  optimalChoices: boolean;
}

interface BenchVsStarterAnalysis {
  userTeam: {
    name: string[];
    analysis: LineupAnalysis;
    hasMissedOpportunities: boolean;
  };
  opponentTeam: {
    name: string[];
    analysis: LineupAnalysis;
    hasMissedOpportunities: boolean;
  };
  week: number;
  matchupStatus: "completed" | "in_progress" | "upcoming";
  summary: {
    userMadeOptimalChoices: boolean;
    opponentMadeOptimalChoices: boolean;
    userMissedPoints: number;
    opponentMissedPoints: number;
    couldHaveChangedOutcome: boolean;
  };
}

export interface PlayerDetail {
  playerId: string;
  name: string;
  position: string;
  team: string;
  rosterSlot?: string;
  points?: number;
}

export type MatchupPlayerDetail = PlayerDetail &
  Required<Pick<PlayerDetail, "rosterSlot" | "points">>;

export interface EnhancedMatchup
  extends Omit<
    Matchup,
    "starters" | "starters_points" | "players" | "players_points"
  > {
  starters: MatchupPlayerDetail[];
  bench: MatchupPlayerDetail[];
}

export async function makeRequest<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error for ${url}! Status: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Sleeper request:", error);
    return null;
  }
}

export async function fetchNFLState(): Promise<{
  currentWeek: number;
  currentSeason: string;
  seasonType: SeasonType;
} | null> {
  const stateUrl = `${SLEEPER_API_BASE}/state/nfl`;
  const state = await makeRequest<NFLState>(stateUrl);
  if (!state) return null;

  return {
    currentWeek: state.display_week,
    currentSeason: state.league_season,
    seasonType: state.season_type,
  };
}

export async function fetchUser(identifier: string): Promise<User | null> {
  const userUrl = `${SLEEPER_API_BASE}/user/${identifier}`;
  return await makeRequest<User>(userUrl);
}

export async function fetchUserId(username: string): Promise<string | null> {
  const userData = await fetchUser(username);
  if (!userData) return null;

  const { user_id } = userData;

  return user_id;
}

export async function fetchLeagueId(
  username: string,
  leagueName: string,
  year: string = new Date().getFullYear().toString()
): Promise<string | null> {
  const userId = await fetchUserId(username);
  if (!userId) return null;

  const leaguesUrl = `${SLEEPER_API_BASE}/user/${userId}/leagues/nfl/${year}`;
  const leagues = await makeRequest<League[]>(leaguesUrl);
  if (!leagues) return null;

  const normalizedName = normalizeString(leagueName);
  const league = leagues.find(
    (l: League) => normalizeString(l.name) === normalizedName
  );
  if (!league) return null;

  return league.league_id;
}

export async function fetchLeagueData(leagueId: string): Promise<League | null>;
export async function fetchLeagueData(
  leagueName: string,
  username: string
): Promise<League | null>;
export async function fetchLeagueData(
  leagueIdentifier: string,
  username?: string
) {
  if (username) {
    const id = await fetchLeagueId(username, leagueIdentifier);
    if (!id) return null;
    leagueIdentifier = id;
  }

  const leagueUrl = `${SLEEPER_API_BASE}/league/${leagueIdentifier}`;
  return await makeRequest<League>(leagueUrl);
}

export async function fetchLeagueRosterPositions(
  leagueId: string
): Promise<string[] | null> {
  const leagueDetails = await fetchLeagueData(leagueId);

  return leagueDetails ? leagueDetails.roster_positions : null;
}

export async function fetchLeagues(
  username: string,
  year: number = new Date().getFullYear()
): Promise<League[] | null> {
  const userId = await fetchUserId(username);
  if (!userId) return null;

  const leaguesUrl = `${SLEEPER_API_BASE}/user/${userId}/leagues/nfl/${year}`;

  const leaguesData = await makeRequest<League[]>(leaguesUrl);

  return leaguesData;
}

export interface EnhancedRoster extends Roster {
  ownerNames: string[];
  ownerIds: string[];
}

export async function fetchLeagueRosters(
  leagueId: string
): Promise<EnhancedRoster[] | null> {
  const rostersUrl = `${SLEEPER_API_BASE}/league/${leagueId}/rosters`;
  const rosters = await makeRequest<Roster[]>(rostersUrl);
  if (!rosters || rosters.length === 0) return null;

  const enhancedRosters = await Promise.all(
    rosters.map(async (roster) => {
      const owners = [roster.owner_id, ...(roster.co_owners || [])];
      const usernames = await Promise.all(
        owners.map(async (id) => {
          const user = await fetchUser(id);
          return user ? user.username : "unknown username";
        })
      );

      return {
        ...roster,
        ownerNames: usernames,
        ownerIds: owners,
      };
    })
  );

  return enhancedRosters;
}

export async function chainLeagueHistory(
  username: string,
  leagueName: string,
  leagueDetails: League,
  leagueHistoryMap: Record<string, LeagueHistoryEntry>
): Promise<boolean> {
  const entry: LeagueHistoryEntry = {
    leagueId: leagueDetails.league_id,
    leagueName: leagueDetails.name,
    leagueStatus: leagueDetails.status,
  };

  leagueHistoryMap[leagueDetails.season] = entry;

  if (!leagueDetails.previous_league_id) return true;

  const newLeague = await fetchLeagueData(leagueDetails.previous_league_id);

  if (!newLeague) return false;

  return await chainLeagueHistory(
    username,
    leagueName,
    newLeague,
    leagueHistoryMap
  );
}

export async function fetchLeagueHistoryMap(
  username: string,
  leagueName: string
): Promise<Record<string, LeagueHistoryEntry> | null> {
  const currentLeague = await fetchLeagueData(leagueName, username);

  if (!currentLeague) return null;

  const historyMap: Record<string, LeagueHistoryEntry> = {};

  const success = await chainLeagueHistory(
    username,
    leagueName,
    currentLeague,
    historyMap
  );

  return historyMap;
}

export async function fetchMatchup(
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
): Promise<MatchupDetails | null> {
  const matchupUrl = `${SLEEPER_API_BASE}/league/${leagueId}/matchups/${week}`;
  const allMatchups = await makeRequest<Matchup[]>(matchupUrl);
  if (!allMatchups) return null;

  const rosters = await fetchLeagueRosters(leagueId);
  if (!rosters) return null;

  const rosterId = getUserRosterId(userId, rosters);
  if (!rosterId) return null;

  const userRoster = allMatchups.find(
    (matchup) => matchup.roster_id === rosterId
  );
  if (!userRoster) return null;

  const opponentRoster = allMatchups.find(
    (matchup) =>
      matchup.matchup_id === userRoster.matchup_id &&
      matchup.roster_id !== userRoster.roster_id
  );
  if (!opponentRoster) return null;

  const userEnhancedRoster = rosters.find((r) => r.roster_id === rosterId);
  const opponentEnhancedRoster = rosters.find(
    (r) => r.roster_id === opponentRoster.roster_id
  );

  if (!userEnhancedRoster || !opponentEnhancedRoster) return null;

  const userOwners = userEnhancedRoster.ownerNames;
  const opponentOwners = opponentEnhancedRoster.ownerNames;

  const nflState = await fetchNFLState();
  if (!nflState) return null; // Stay consistent with error handling

  // Determine matchup status using the provided year parameter and NFL state
  let matchupStatus: "completed" | "in_progress" | "upcoming";

  const { currentWeek, currentSeason } = nflState;

  if (matchupYear < currentSeason) {
    // Past season matchups are always completed
    matchupStatus = "completed";
  } else if (matchupYear > currentSeason) {
    // Future season matchups are always upcoming
    matchupStatus = "upcoming";
  } else {
    // For current season
    if (week < currentWeek) {
      // Past weeks in current season are completed
      matchupStatus = "completed";
    } else if (week === currentWeek) {
      // Current week matchups are in progress
      matchupStatus = "in_progress";
    } else {
      // Future weeks are upcoming
      matchupStatus = "upcoming";
    }
  }

  const rosterPositions = await fetchLeagueRosterPositions(leagueId);
  if (!rosterPositions) return null;

  const playerData = fetchPlayerMap();
  if (!playerData) return null;

  const userEnhancedMatchup = enhanceMatchupWithPlayerDetails(
    userRoster,
    playerData,
    rosterPositions
  );
  const opponentEnhancedMatchup = enhanceMatchupWithPlayerDetails(
    opponentRoster,
    playerData,
    rosterPositions
  );

  return {
    userRoster: userEnhancedMatchup,
    opponentRoster: opponentEnhancedMatchup,
    userOwners,
    opponentOwners,
    matchupStatus,
  };
}

export async function fetchMatchupSummary(
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
): Promise<MatchupSummary | null> {
  const matchupDetails = await fetchMatchup(
    leagueId,
    week,
    userId,
    matchupYear
  );
  if (!matchupDetails) return null;

  const {
    userRoster,
    opponentRoster,
    userOwners,
    opponentOwners,
    matchupStatus,
  } = matchupDetails;

  const userScore = userRoster.points || 0;
  const opponentScore = opponentRoster.points || 0;

  let winner: Winner = null;

  if (matchupStatus === "completed") {
    winner =
      userScore > opponentScore
        ? userOwners
        : opponentScore > userScore
        ? opponentOwners
        : "tie";
  }

  return {
    userTeam: {
      owners: userOwners,
      score: userScore,
    },
    opponentTeam: {
      owners: opponentOwners,
      score: opponentScore,
    },
    winner: winner,
    matchupId: userRoster.matchup_id,
    week: week,
    status: matchupStatus,
  };
}

export async function fetchMatchupStarters(
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
): Promise<MatchupPlayerBreakdown | null> {
  const matchupDetails = await fetchMatchup(
    leagueId,
    week,
    userId,
    matchupYear
  );
  if (!matchupDetails) return null;

  const {
    userRoster,
    opponentRoster,
    userOwners,
    opponentOwners,
    matchupStatus,
  } = matchupDetails;

  return {
    userTeam: {
      name: userOwners,
      players: matchupDetails.userRoster.starters,
      totalPoints: userRoster.points,
    },
    opponentTeam: {
      name: opponentOwners,
      players: matchupDetails.opponentRoster.starters,
      totalPoints: opponentRoster.points,
    },
    week,
    matchupStatus,
  };
}

export async function fetchMatchupBench(
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
): Promise<MatchupPlayerBreakdown | null> {
  const matchupDetails = await fetchMatchup(
    leagueId,
    week,
    userId,
    matchupYear
  );
  if (!matchupDetails) return null;

  const {
    userRoster,
    opponentRoster,
    userOwners,
    opponentOwners,
    matchupStatus,
  } = matchupDetails;

  const userBenchPoints = userRoster.bench.reduce(
    (total, player) => total + player.points,
    0
  );

  const opponentBenchPoints = opponentRoster.bench.reduce(
    (total, player) => total + player.points,
    0
  );

  return {
    userTeam: {
      name: userOwners,
      players: userRoster.bench,
      totalPoints: userBenchPoints,
    },
    opponentTeam: {
      name: opponentOwners,
      players: opponentRoster.bench,
      totalPoints: opponentBenchPoints,
    },
    week,
    matchupStatus,
  };
}

export async function fetchBenchVsStarterAnalysis(
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
): Promise<BenchVsStarterAnalysis | null> {
  const matchupDetails = await fetchMatchup(
    leagueId,
    week,
    userId,
    matchupYear
  );
  if (!matchupDetails) return null;

  const {
    userRoster,
    opponentRoster,
    userOwners,
    opponentOwners,
    matchupStatus,
  } = matchupDetails;

  function analyzeLineup(matchup: EnhancedMatchup): LineupAnalysis {
    const starters = matchup.starters;
    const bench = matchup.bench;

    // Sort starters by points (lowest first)
    starters.sort((a, b) => a.points - b.points);

    // Sort bench by points (highest first)
    bench.sort((a, b) => b.points - a.points);

    // Find bench players outperforming starters
    const worstStarter = starters[0];
    const outperformingBench = bench.filter(
      (bench) => bench.points > worstStarter.points
    );

    // Calculate points left on bench
    const missedPoints = outperformingBench.reduce((total, player) => {
      // Calculate how many more points this bench player would have provided
      const pointDifference = player.points - worstStarter.points;
      return total + pointDifference;
    }, 0);

    return {
      starters: starters,
      bench: bench,
      worstStarter,
      outperformingBench,
      missedPoints,
      optimalChoices: outperformingBench.length === 0,
    };
  }

  const userAnalysis = analyzeLineup(userRoster);
  const opponentAnalysis = analyzeLineup(opponentRoster);

  return {
    userTeam: {
      name: userOwners,
      analysis: userAnalysis,
      hasMissedOpportunities: userAnalysis.outperformingBench.length > 0,
    },
    opponentTeam: {
      name: opponentOwners,
      analysis: opponentAnalysis,
      hasMissedOpportunities: opponentAnalysis.outperformingBench.length > 0,
    },
    week,
    matchupStatus,

    // Summary insights
    summary: {
      userMadeOptimalChoices: userAnalysis.optimalChoices,
      opponentMadeOptimalChoices: opponentAnalysis.optimalChoices,
      userMissedPoints: userAnalysis.missedPoints,
      opponentMissedPoints: opponentAnalysis.missedPoints,
      couldHaveChangedOutcome:
        // Check if adding missed points would have changed the result
        (userRoster.points < opponentRoster.points && // User lost
          userRoster.points + userAnalysis.missedPoints >
            opponentRoster.points) || // But could have won
        (userRoster.points > opponentRoster.points && // User won
          userRoster.points - userAnalysis.missedPoints <
            opponentRoster.points), // But could have lost
    },
  };
}

export async function fetchLeaguePlayoffHistory(
  leagueId: string,
  season: string
): Promise<YearlyPlayoffData | null> {
  // Get the league data to check if it's complete
  const leagueData = await fetchLeagueData(leagueId);
  if (!leagueData) {
    return null;
  }

  if (leagueData.status !== Status.complete) {
    return {
      year: season,
      leagueName: leagueData.name,
      placements: {
        incomplete: ["Season in progress"],
      },
      missedPlayoffs: [],
      isIncomplete: true, // Add a flag to easily identify incomplete seasons
    };
  }

  const yearResult: YearlyPlayoffData = {
    year: season,
    leagueName: leagueData.name,
    placements: {},
    missedPlayoffs: [],
    isIncomplete: false,
  };

  const winnersBracket = await fetchWinnersBracket(leagueId);

  if (!winnersBracket) {
    yearResult.placements[1] = ["Could not fetch playoff data"];
    return yearResult;
  }

  // Process playoff standings
  const lastRound = Math.max(
    ...winnersBracket.map((match: PlayoffMatchup) => match.r)
  );

  const finalRoundMatches = winnersBracket.filter(
    (match: PlayoffMatchup) => match.r === lastRound
  );

  const finalStandings = finalRoundMatches.reduce((standings, match) => {
    if (match.p) {
      standings.push(
        { placement: String(match.p), rosterId: String(match.w) },
        { placement: String(match.p + 1), rosterId: String(match.l) }
      );
    }
    return standings;
  }, [] as Standing[]);

  // Fetch rosters
  const historicalRosters = await fetchLeagueRosters(leagueId);

  if (!historicalRosters || finalStandings.length === 0) {
    yearResult.placements[1] = ["No playoff data available"];
    return yearResult;
  }

  // Determine playoff and non-playoff teams
  const playoffRosterIds = new Set(finalStandings.map((fs) => fs.rosterId));

  // Add non-playoff teams
  for (let id = 1; id <= leagueData.total_rosters; id++) {
    if (!playoffRosterIds.has(String(id))) {
      finalStandings.push({
        placement: "missed_playoffs",
        rosterId: String(id),
      });
    }
  }

  // Process each placement
  for (const standing of finalStandings) {
    const roster = historicalRosters.find(
      (r: Roster) => r.roster_id === Number(standing.rosterId)
    );

    if (!roster) {
      yearResult.placements[standing.placement] = ["Roster not found"];
      continue;
    }

    const usernames = roster.ownerNames;

    if (standing.placement === "missed_playoffs") {
      yearResult.missedPlayoffs.push(...usernames);
    } else {
      yearResult.placements[standing.placement] =
        usernames.length > 0 ? usernames : ["Unknown user"];
    }
  }

  return yearResult;
}

export async function fetchPlayerData(): Promise<PlayerMap | null> {
  const playerDataUrl = `${SLEEPER_API_BASE}/players/nfl`;
  return await makeRequest<PlayerMap>(playerDataUrl);
}

export async function fetchLeaguePlayoffSchedule(leagueId: string): Promise<{
  playoffWeekStart: number;
  playoffTeams: number;
  playoffRoundType: PlayoffRoundType;
  totalWeeks: number;
  rounds: string[];
  roundToWeekMapping: Record<string, number[]>;
} | null> {
  const leagueData = await fetchLeagueData(leagueId);

  if (!leagueData) {
    return null;
  }

  const { playoff_week_start, playoff_teams, playoff_round_type } =
    leagueData.settings;

  let rounds = [];
  if (playoff_teams <= 4) {
    rounds = ["semifinals", "finals"];
  } else {
    rounds = ["quarterfinals", "semifinals", "finals"];
  }

  let weekDurations = [];
  switch (playoff_round_type) {
    case PlayoffRoundType.ONE_WEEK_PER_ROUND:
      weekDurations = rounds.map(() => 1);
      break;
    case PlayoffRoundType.TWO_WEEK_CHAMPIONSHIP:
      weekDurations = rounds.map((round) => (round === "finals" ? 2 : 1));
      break;
    case PlayoffRoundType.TWO_WEEKS_PER_ROUND:
      weekDurations = rounds.map(() => 2);
      break;
    default:
      weekDurations = rounds.map(() => 1);
  }

  const roundToWeekMapping: Record<string, number[]> = {};
  let currentWeek = playoff_week_start;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const duration = weekDurations[i];

    if (duration === 1) {
      // Single week round
      roundToWeekMapping[round] = [currentWeek];
    } else {
      // Multi-week round
      roundToWeekMapping[round] = [currentWeek, currentWeek + 1];
    }

    // Move to the next week based on duration
    currentWeek += duration;
  }

  // Calculate total weeks (currentWeek - 1 because currentWeek is now one past the last week)
  const totalWeeks = currentWeek - 1;

  return {
    playoffWeekStart: playoff_week_start,
    playoffTeams: playoff_teams,
    playoffRoundType: playoff_round_type,
    totalWeeks,
    rounds,
    roundToWeekMapping,
  };
}

export async function fetchSeasonMatchupsBetweenUsers(
  opponentUsername: string,
  leagueId: string,
  userId: string,
  season: string
): Promise<Array<{
  week: number;
  userScore: number;
  opponentScore: number;
}> | null> {
  const opponentId = await fetchUserId(opponentUsername);

  const leagueRosters = await fetchLeagueRosters(leagueId);

  const playoffSchedule = await fetchLeaguePlayoffSchedule(leagueId);

  if (!userId || !opponentId || !leagueRosters || !playoffSchedule) return null;

  const opponentRosterId = getUserRosterId(opponentId, leagueRosters);
  const { totalWeeks } = playoffSchedule;

  const nflState = await fetchNFLState();
  if (!nflState) return null;

  const { currentWeek, currentSeason } = nflState;

  let weeksToProcess: number = totalWeeks;

  if (season === currentSeason) {
    weeksToProcess = currentWeek > 1 ? currentWeek - 1 : 0;
  }

  const matchups = [];
  for (let week = 1; week <= weeksToProcess; week++) {
    const weekMatchup = await fetchMatchup(leagueId, week, userId, season);
    if (!weekMatchup) continue;

    if (opponentRosterId === weekMatchup.opponentRoster.roster_id) {
      matchups.push({
        week,
        userScore: weekMatchup.userRoster.points,
        opponentScore: weekMatchup.opponentRoster.points,
      });
    }
  }

  return matchups;
}

export async function fetchTrendingPlayers(
  trendType: "add" | "drop" | "all"
): Promise<TrendingPlayer[] | null> {
  if (trendType === "all") {
    const [addPlayers, dropPlayers] = await Promise.all([
      fetchTrendingPlayers("add"),
      fetchTrendingPlayers("drop"),
    ]);

    if (!addPlayers || !dropPlayers) return null;

    return [
      ...addPlayers.map((player) => ({ ...player, trendType: "add" as const })),
      ...dropPlayers.map((player) => ({
        ...player,
        trendType: "drop" as const,
      })),
    ];
  }

  const trendingUrl = `${SLEEPER_API_BASE}/players/nfl/trending/${trendType}`;

  const trendingData = await makeRequest<PlayerTrend[]>(trendingUrl);
  const playerData = fetchPlayerMap();

  if (!trendingData || !playerData) return null;

  return trendingData.map((player, index): TrendingPlayer => {
    const playerDetails = mapPlayerDetails(player.player_id, playerData);

    return {
      ...playerDetails,
      playerTrend:
        trendType === "add" ? `+${player.count}` : `-${player.count}`,
      trendType: trendType as "add" | "drop",
      trendRank: index + 1,
    };
  });
}

export async function fetchUserRoster(
  username: string,
  leagueName: string,
  year: string = new Date().getFullYear().toString()
): Promise<{
  starters: PlayerDetail[];
  bench: PlayerDetail[];
  taxi: PlayerDetail[];
  reserve: PlayerDetail[];
} | null> {
  const userId = await fetchUserId(username);
  if (!userId) return null;

  const leagueId = await fetchLeagueId(username, leagueName, year);
  if (!leagueId) return null;

  const rosters = await fetchLeagueRosters(leagueId);
  if (!rosters) return null;

  const userRosterId = getUserRosterId(userId, rosters);
  if (!userRosterId) return null;

  const userRoster = rosters.find(
    (roster) => roster.roster_id === userRosterId
  );
  const playerMap = fetchPlayerMap();

  if (!userRoster || !playerMap) return null;

  return enhanceRosterWithPlayerDetails(userRoster, playerMap);
}

export async function fetchMyTrendingRosterPlayers(
  username: string,
  leagueName: string,
  trendType: "add" | "drop" | "all"
): Promise<TrendingPlayer[] | null> {
  const [trendingPlayers, userRoster] = await Promise.all([
    fetchTrendingPlayers(trendType),
    fetchUserRoster(username, leagueName),
  ]);

  if (!trendingPlayers || !userRoster) return null;

  // Flatten all roster player IDs
  const allRosterPlayerIds = [
    ...userRoster.starters.map((p) => p.playerId),
    ...userRoster.bench.map((p) => p.playerId),
    ...userRoster.taxi.map((p) => p.playerId),
    ...userRoster.reserve.map((p) => p.playerId),
  ];

  return trendingPlayers.filter((player) =>
    allRosterPlayerIds.includes(player.playerId)
  );
}

export async function fetchWinnersBracket(
  leagueId: string
): Promise<PlayoffMatchup[] | null> {
  const winnersBracketUrl = `${SLEEPER_API_BASE}/league/${leagueId}/winners_bracket`;
  return await makeRequest<PlayoffMatchup[]>(winnersBracketUrl);
}

export async function fetchLeaguePlayoffBracket(leagueId: string) {
  const [bracketData, rosters, leagueData] = await Promise.all([
    fetchWinnersBracket(leagueId),
    fetchLeagueRosters(leagueId),
    fetchLeagueData(leagueId),
  ]);

  if (!bracketData || !rosters || !leagueData) return null;

  if (leagueData.status === Status.complete) {
    return buildBracket(bracketData, rosters, "completed");
  }

  const [nflState, playoffSchedule] = await Promise.all([
    fetchNFLState(),
    fetchLeaguePlayoffSchedule(leagueId),
  ]);

  if (!nflState || !playoffSchedule) return null;

  const { currentWeek } = nflState;
  const { playoffWeekStart } = playoffSchedule;

  if (currentWeek < playoffWeekStart) {
    return {
      bracketByRound: {},
      playoffStatus: "not_started" as const,
    };
  }

  return buildBracket(bracketData, rosters, "in_progress");
}
