import {
  fetchLeagueData,
  fetchLeaguePlayoffHistory,
  fetchMatchupSummary,
} from "./api.js";
import {
  formatDefensiveScoring,
  formatKickingScoring,
  formatOffensiveScoring,
  getDayOfWeek,
  getPlayoffRoundTypeDescription,
  getPositionLabel,
  getWaiverType,
  getWaiverTypeDescription,
  PlayoffRoundType,
} from "./helpers.js";

export interface Processor<T> {
  (
    username: string,
    leagueName: string,
    currYear: string,
    leagueId: string,
    ...args: any[]
  ): Promise<T>;
}

interface Counter {
  [key: string]: number;
}

export const processLeagueSettings: Processor<string> = async (
  username: string,
  leagueName: string,
  currYear: string,
  leagueId: string
) => {
  const leagueData = await fetchLeagueData(username, leagueName, leagueId);

  if (!leagueData) {
    return `Year ${currYear}:\n  Error: Could not fetch data for this year`;
  }

  const { settings } = leagueData;

  const yearSettings = [
    `Year ${currYear}:`,
    "  General Settings:",
    `  • Waiver Budget: $${settings.waiver_budget}`,
    `  • Trade Deadline: Week ${settings.trade_deadline}`,
    `  • Number of Rounds in Draft: ${settings.draft_rounds}`,
    `  • Injured Reserve Slots: ${settings.reserve_slots}`,
    "",
    "  Waiver Settings:",
    `  • Waiver Type: ${getWaiverType(settings.waiver_type)}`,
    `  • Waiver Type Description: ${getWaiverTypeDescription(
      settings.waiver_type
    )}`,
    `  • Waivers Clear: ${getDayOfWeek(settings.waiver_day_of_week)}`,
    `  • Beginning Waiver Budget: $${settings.waiver_budget}`,
  ];

  if (settings.taxi_slots > 0) {
    yearSettings.push(
      "",
      "  Taxi Settings:",
      `  • Taxi Slots: ${settings.taxi_slots}`,
      `  • Deadline to set Taxi Spots: Week ${settings.taxi_deadline}`,
      `  • Maximum time on taxi squad: ${settings.taxi_years} years`
    );
  }

  return yearSettings.join("\n");
};

export const processPlayoffSchedule: Processor<string> = async (
  username: string,
  leagueName: string,
  currYear: string,
  leagueId: string
) => {
  const leagueData = await fetchLeagueData(username, leagueName, leagueId);

  if (!leagueData) {
    return `Year ${currYear}:\n  Error: Could not fetch data for this year`;
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

  const formattedWeeks = Object.entries(roundToWeekMapping)
    .map(([round, weeks]) => {
      const weeksFormat =
        weeks.length > 1 ? `Weeks ${weeks.join(" and ")}` : `Week ${weeks[0]}`;
      return `${round}: ${weeksFormat}`;
    })
    .join("\n");

  const yearSummary = [
    `Year ${currYear}:`,
    `  • Playoff Teams: ${playoff_teams}`,
    `  • Playoff Start Week: ${playoff_week_start}`,
    `  • Format: ${getPlayoffRoundTypeDescription(playoff_round_type)}`,
    `  • Rounds:`,
    `	 ${formattedWeeks}`,
  ].join("\n");

  return yearSummary;
};

export const processScoringSettings: Processor<string> = async (
  username: string,
  leagueName: string,
  currYear: string,
  leagueId: string,
  category: string
) => {
  const leagueData = await fetchLeagueData(username, leagueName, leagueId);

  if (!leagueData) {
    return `Year ${currYear}:\n  Error: Could not fetch data for this year`;
  }

  if (
    category === "defensive" &&
    !leagueData.roster_positions.includes("DEF")
  ) {
    return `Year ${currYear}:\n  No defense roster slot - Defense scoring not available`;
  }

  if (category === "kicking" && !leagueData.roster_positions.includes("K")) {
    return `Year ${currYear}:\n  No kicker roster slot - Kicker scoring not available`;
  }

  const { scoring_settings } = leagueData;
  const yearSections = [];

  if (category === "all" || category === "offensive") {
    yearSections.push(
      "  === OFFENSIVE SCORING ===",
      formatOffensiveScoring(scoring_settings)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
    );
  }

  if (category === "all" || category === "defensive") {
    if (yearSections.length > 0) yearSections.push("");
    yearSections.push(
      "  === DEFENSIVE SCORING ===",
      formatDefensiveScoring(scoring_settings)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
    );
  }

  if (category === "all" || category === "kicking") {
    if (yearSections.length > 0) yearSections.push("");
    yearSections.push(
      "  === KICKING SCORING ===",
      formatKickingScoring(scoring_settings)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
    );
  }

  return `Year ${currYear}:\n${yearSections.join("\n")}`;
};

export const processRosterSettings: Processor<string> = async (
  username: string,
  leagueName: string,
  currYear: string,
  leagueId: string
) => {
  const leagueData = await fetchLeagueData(username, leagueName, leagueId);

  if (!leagueData) {
    return `Year ${currYear}:\n  Error: Could not fetch data for this year`;
  }

  const { roster_positions } = leagueData;

  const rosterCounts: Counter = roster_positions.reduce(
    (acc: Counter, curr: string) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    },
    {}
  );

  const formattedRoster: string = Object.entries(rosterCounts)
    .map(([pos, count]) => `${getPositionLabel(pos)}: ${count}`)
    .join("\n");

  return `Year ${currYear}: \n${formattedRoster}`;
};

export const processMatchupDetails: Processor<string> = async (
  username: string,
  leagueName: string,
  currYear: string,
  leagueId: string,
  week: number,
  userId: string
) => {
  const matchupData = await fetchMatchupSummary(
    username,
    leagueName,
    leagueId,
    week,
    userId,
    currYear
  );

  if (!matchupData) {
    return `Year ${currYear}:\n  Error: Could not fetch matchup data for this year`;
  }

  const { userTeam, opponentTeam, winner, status } = matchupData;

  let matchupSummary =
    `Year ${currYear}, Week ${week}:\n` +
    `   ${userTeam.owners} vs ${opponentTeam.owners}`;

  const scoreFormat = `${userTeam.score.toFixed(
    2
  )} - ${opponentTeam.score.toFixed(2)}`;

  switch (status) {
    case "completed":
      const resultPhrase =
        winner === "tie"
          ? "The matchup ended in a tie"
          : `${winner} won the matchup`;

      matchupSummary +=
        `   Result: ${resultPhrase}\n` + `   Score: ${scoreFormat}`;
      break;
    case "in_progress":
      matchupSummary +=
        `   Status: Matchup in progress\n` + `   Current Score: ${scoreFormat}`;
      break;
    case "upcoming":
      matchupSummary +=
        `Year ${currYear}, Week ${week}:\n` + `   Status: Upcoming matchup`;
      break;
  }

  return matchupSummary;
};

export const processPlayoffHistory: Processor<string> = async (
  username: string,
  leagueName: string,
  currYear: string,
  leagueId: string
) => {
  const yearData = await fetchLeaguePlayoffHistory(
    username,
    leagueName,
    leagueId,
    currYear
  );

  if (!yearData) {
    return `Year ${currYear}:\n  Error: Could not fetch playoff data for this year`;
  }

  if (yearData.isIncomplete) {
    return `Year ${currYear}:\n  Season is currently in progress - playoff data not yet available`;
  }

  const placementText = Object.entries(yearData.placements)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([placement, owners]) => {
      const ownerText =
        owners.length > 1 ? `Co-owners: ${owners.join(", ")}` : owners[0];
      return `  ${placement}. ${ownerText}`;
    })
    .join("\n");

  let yearText = `${yearData.year} - ${yearData.leagueName}:\n${placementText}`;

  if (yearData.missedPlayoffs.length > 0) {
    yearText += `\n  Missed playoffs: ${yearData.missedPlayoffs.join(", ")}`;
  }

  return yearText;
};
