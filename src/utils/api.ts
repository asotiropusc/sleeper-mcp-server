import {
  User,
  League,
  Roster,
  Status,
  Matchup,
  NFLState,
  SeasonType,
  PlayoffMatchup,
} from "../models/index.js";
import {
  getUserIdsFromRosterId,
  getUserRosterId,
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

interface StarterWithPosition {
  id: string;
  points: number;
  position: string;
}

export interface MatchupFormatted
  extends Omit<Matchup, "starters" | "starters_points"> {
  starters: StarterWithPosition[];
}

const userCache = new Map<string, string>();
const leagueCache = new Map<string, string>();

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
  const cached = userCache.get(username);
  if (cached) return cached;

  const userData = await fetchUser(username);

  if (!userData) return null;

  const { user_id } = userData;
  userCache.set(username, user_id);

  return user_id;
}

export async function fetchLeagueId(
  username: string,
  leagueName: string,
  year: string = new Date().getFullYear().toString()
): Promise<string | null> {
  const userId = await fetchUserId(username);
  if (!userId) return null;

  const cacheKey = `${userId}-${leagueName}`;
  const cached = leagueCache.get(cacheKey);
  if (cached) return cached;

  const leaguesUrl = `${SLEEPER_API_BASE}/user/${userId}/leagues/nfl/${year}`;
  const leagues = await makeRequest<League[]>(leaguesUrl);
  if (!leagues) return null;

  const normalizedName = normalizeString(leagueName);

  const league = leagues.find(
    (l: League) => normalizeString(l.name) === normalizedName
  );
  if (!league) return null;

  leagueCache.set(cacheKey, league.league_id);
  return league.league_id;
}

export async function fetchLeagueData(
  username?: string,
  leagueName?: string,
  leagueId?: string
): Promise<League | null> {
  const id =
    leagueId ??
    (username && leagueName && (await fetchLeagueId(username, leagueName)));
  if (!id) return null;

  const leagueUrl = `${SLEEPER_API_BASE}/league/${id}`;
  return await makeRequest<League>(leagueUrl);
}

export async function fetchLeagueRosterPositions(
  username?: string,
  leagueName?: string,
  leagueId?: string
): Promise<string[] | null> {
  const leagueDetails = await fetchLeagueData(username, leagueName, leagueId);

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

export async function fetchLeagueRosters(
  username?: string,
  leagueName?: string,
  leagueId?: string
): Promise<Roster[] | null> {
  const id =
    leagueId ??
    (username && leagueName && (await fetchLeagueId(username, leagueName)));
  if (!id) return null;

  const rostersUrl = `${SLEEPER_API_BASE}/league/${id}/rosters`;
  return await makeRequest<Roster[]>(rostersUrl);
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

  const newLeague = await fetchLeagueData(
    username,
    leagueName,
    leagueDetails.previous_league_id
  );

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
  const currentLeague = await fetchLeagueData(username, leagueName);

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
  username: string,
  leagueName: string,
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
): Promise<{
  userRoster: Matchup;
  opponentRoster: Matchup;
  userOwners: string;
  opponentOwners: string;
  matchupStatus: "completed" | "in_progress" | "upcoming";
} | null> {
  const matchupUrl = `${SLEEPER_API_BASE}/league/${leagueId}/matchups/${week}`;
  const allMatchups = await makeRequest<Matchup[]>(matchupUrl);
  if (!allMatchups) return null;

  const rosters = await fetchLeagueRosters(username, leagueName, leagueId);
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

  // Get owner IDs for both teams
  const userOwnerIds = getUserIdsFromRosterId(rosterId, rosters);
  const opponentOwnerIds = getUserIdsFromRosterId(
    opponentRoster.roster_id,
    rosters
  );

  const getUsernames = async (ownerIds: string[]): Promise<string> => {
    const names = await Promise.all(
      ownerIds.map(async (ownerId) => {
        const ownerData = await fetchUser(ownerId);
        return ownerData?.username || "Unknown Manager";
      })
    );
    return names.length === 1 ? names[0] : names.join(" & ");
  };

  const [userOwners, opponentOwners] = await Promise.all([
    getUsernames(userOwnerIds),
    getUsernames(opponentOwnerIds),
  ]);

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

  return {
    userRoster,
    opponentRoster,
    userOwners,
    opponentOwners,
    matchupStatus,
  };
}

export async function fetchMatchupSummary(
  username: string,
  leagueName: string,
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
) {
  const matchupDetails = await fetchMatchup(
    username,
    leagueName,
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

  let winner = null;

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
  username: string,
  leagueName: string,
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
) {
  const matchupDetails = await fetchMatchup(
    username,
    leagueName,
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

  const rosterPositions = await fetchLeagueRosterPositions(
    username,
    leagueName,
    leagueId
  );
  if (!rosterPositions) return null;

  function mapStarters(matchup: Matchup, rosterPositions: string[]) {
    const starters = matchup.starters || [];
    const starterPoints = matchup.starters_points || [];

    const starterPositions = rosterPositions?.slice(0, starters.length);

    return starters.map((playerId, index) => ({
      playerId,
      points: starterPoints[index] || 0,
      position: starterPositions[index] || "UNKNOWN",
    }));
  }

  const userStarterDetails = mapStarters(userRoster, rosterPositions);
  const opponentStarterDetails = mapStarters(opponentRoster, rosterPositions);

  return {
    userTeam: {
      name: userOwners,
      starters: userStarterDetails,
      totalStarterPoints: userRoster.points,
    },
    opponentTeam: {
      name: opponentOwners,
      starters: opponentStarterDetails,
      totalStarterPoints: opponentRoster.points,
    },
    week,
    matchupStatus,
  };
}

export async function fetchMatchupBench(
  username: string,
  leagueName: string,
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
) {
  const matchupDetails = await fetchMatchup(
    username,
    leagueName,
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

  function mapBenchPlayers(matchup: Matchup) {
    const allPlayers = matchup.players || [];
    const starters = matchup.starters || [];
    const playersPoints = matchup.players_points || {};

    const benchPlayerIds = allPlayers.filter(
      (playerId) => !starters.includes(playerId)
    );

    return benchPlayerIds.map((playerId) => ({
      playerId,
      points: playersPoints[playerId] || 0,
    }));
  }

  const userBenchDetails = mapBenchPlayers(userRoster);
  const opponentBenchDetails = mapBenchPlayers(opponentRoster);

  const userBenchPoints = userBenchDetails.reduce(
    (total, player) => total + player.points,
    0
  );

  const opponentBenchPoints = opponentBenchDetails.reduce(
    (total, player) => total + player.points,
    0
  );

  return {
    userTeam: {
      name: userOwners,
      benchPlayers: userBenchDetails,
      totalBenchPoints: userBenchPoints,
    },
    opponentTeam: {
      name: opponentOwners,
      benchPlayers: opponentBenchDetails,
      totalBenchPoints: opponentBenchPoints,
    },
    week,
    matchupStatus,
  };
}

export async function fetchBenchVsStarterAnalysis(
  username: string,
  leagueName: string,
  leagueId: string,
  week: number,
  userId: string,
  matchupYear: string
) {
  const matchupDetails = await fetchMatchup(
    username,
    leagueName,
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

  function analyzeLineup(matchup: Matchup) {
    const allPlayers = matchup.players || [];
    const starters = matchup.starters || [];
    const playersPoints = matchup.players_points || {};

    // Map starters with their points
    const starterDetails = starters.map((playerId) => ({
      playerId,
      points: playersPoints[playerId] || 0,
    }));

    // Sort starters by points (lowest first)
    starterDetails.sort((a, b) => a.points - b.points);

    // Get bench players
    const benchPlayerIds = allPlayers.filter(
      (playerId) => !starters.includes(playerId)
    );

    // Map bench players with their points
    const benchDetails = benchPlayerIds.map((playerId) => ({
      playerId,
      points: playersPoints[playerId] || 0,
    }));

    // Sort bench by points (highest first)
    benchDetails.sort((a, b) => b.points - a.points);

    // Find bench players outperforming starters
    const worstStarter = starterDetails[0];
    const outperformingBench = benchDetails.filter(
      (bench) => bench.points > worstStarter.points
    );

    // Calculate points left on bench
    const missedPoints = outperformingBench.reduce((total, player) => {
      // Calculate how many more points this bench player would have provided
      const pointDifference = player.points - worstStarter.points;
      return total + pointDifference;
    }, 0);

    return {
      starters: starterDetails,
      bench: benchDetails,
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
  username: string,
  leagueName: string,
  leagueId: string,
  season: string
): Promise<YearlyPlayoffData | null> {
  // Get the league data to check if it's complete
  const leagueData = await fetchLeagueData(username, leagueName, leagueId);
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

  // Fetch the winners bracket
  const winnersBracketUrl = `${SLEEPER_API_BASE}/league/${leagueId}/winners_bracket`;
  const winnersBracket = await makeRequest<PlayoffMatchup[]>(winnersBracketUrl);

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
  const historicalRosters = await fetchLeagueRosters(
    username,
    leagueName,
    leagueId
  );

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

    // Get all owner IDs and fetch usernames
    const ownerIds = [roster.owner_id, ...(roster.co_owners || [])];
    const usernames: string[] = [];

    for (const ownerId of ownerIds) {
      const userDetails = await fetchUser(ownerId);
      if (userDetails) {
        usernames.push(userDetails.username);
      }
    }

    if (standing.placement === "missed_playoffs") {
      yearResult.missedPlayoffs.push(...usernames);
    } else {
      yearResult.placements[standing.placement] =
        usernames.length > 0 ? usernames : ["Unknown user"];
    }
  }

  return yearResult;
}

// TODO: fetchMatchupHistory
