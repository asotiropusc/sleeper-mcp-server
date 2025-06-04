import { LeagueScoringSettings } from "../models/League.js";
import {
  fetchBenchVsStarterAnalysis,
  fetchLeagueData,
  fetchLeaguePlayoffBracket,
  fetchLeaguePlayoffHistory,
  fetchLeaguePlayoffSchedule,
  fetchLeagueRosterPositions,
  fetchMatchupBench,
  fetchMatchupStarters,
  fetchMatchupSummary,
  fetchSeasonMatchupsBetweenUsers,
} from "./api.js";
import {
  formatDefensiveScoring,
  formatKickingScoring,
  formatMatchup,
  formatOffensiveScoring,
  getDayOfWeek,
  getPlayoffRoundTypeDescription,
  getPositionLabel,
  getRoundName,
  getWaiverType,
  getWaiverTypeDescription,
} from "./helpers.js";

export interface Processor<T> {
  (
    userId: string,
    leagueId: string,
    currYear: string,
    ...args: any[]
  ): Promise<T>;
}

interface Counter {
  [key: string]: number;
}

export const processLeagueSettings: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string
) => {
  const leagueData = await fetchLeagueData(leagueId);

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
  userId: string,
  leagueId: string,
  currYear: string
) => {
  const scheduleData = await fetchLeaguePlayoffSchedule(leagueId);

  if (!scheduleData) {
    return `Year ${currYear}:\n  Error: Could not fetch data for this year`;
  }

  const {
    playoffWeekStart,
    playoffTeams,
    playoffRoundType,
    roundToWeekMapping,
  } = scheduleData;

  const formattedWeeks = Object.entries(roundToWeekMapping)
    .map(([round, weeks]) => {
      const weeksFormat =
        weeks.length > 1 ? `Weeks ${weeks.join(" and ")}` : `Week ${weeks[0]}`;
      return `${round}: ${weeksFormat}`;
    })
    .join("\n");

  const yearSummary = [
    `Year ${currYear}:`,
    `  • Playoff Teams: ${playoffTeams}`,
    `  • Playoff Start Week: ${playoffWeekStart}`,
    `  • Format: ${getPlayoffRoundTypeDescription(playoffRoundType)}`,
    `  • Rounds:`,
    `    ${formattedWeeks}`,
  ].join("\n");

  return yearSummary;
};

export const processScoringSettings: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string,
  category: string
) => {
  const leagueData = await fetchLeagueData(leagueId);

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

  let { scoring_settings } = leagueData;

  scoring_settings = Object.fromEntries(
    Object.entries(scoring_settings).map(([key, val]) => [
      key,
      Number(val.toFixed(2)),
    ])
  ) as LeagueScoringSettings;

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
  userId: string,
  leagueId: string,
  currYear: string
) => {
  const rosterPositions = await fetchLeagueRosterPositions(leagueId);

  if (!rosterPositions) {
    return `Year ${currYear}:\n  Error: Could not fetch roster positions for this year`;
  }

  const rosterCounts: Counter = rosterPositions.reduce(
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
  userId: string,
  leagueId: string,
  currYear: string,
  week: number
) => {
  const matchupData = await fetchMatchupSummary(
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
  userId: string,
  leagueId: string,
  currYear: string
) => {
  const yearData = await fetchLeaguePlayoffHistory(leagueId, currYear);

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

export const processMatchupStarters: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string,
  week: number
) => {
  const starterData = await fetchMatchupStarters(
    leagueId,
    week,
    userId,
    currYear
  );

  if (!starterData) {
    return `Year ${currYear}, Week ${week}:\n  Error: Could not fetch starter data for this matchup`;
  }

  const { userTeam, opponentTeam, matchupStatus } = starterData;

  // Format the output based on matchup status
  if (matchupStatus === "upcoming") {
    return `Year ${currYear}, Week ${week}:\n  Status: Upcoming matchup - starter data not yet available`;
  }

  // Format user starters
  const userStarters = userTeam.starters
    .map((starter) => {
      return `    ${starter.position}: ${
        starter.name
      } - ${starter.points.toFixed(2)} points`;
    })
    .join("\n");

  const opponentStarters = opponentTeam.starters
    .map((starter) => {
      return `    ${starter.position}: ${
        starter.name
      } - ${starter.points.toFixed(2)} points`;
    })
    .join("\n");

  // Create the final output
  const output = [
    `Year ${currYear}, Week ${week} (${matchupStatus}):`,
    `  ${userTeam.name}'s Starters:`,
    userStarters,
    `  Total: ${userTeam.totalStarterPoints?.toFixed(2)} points`,
    "",
    `  ${opponentTeam.name}'s Starters:`,
    opponentStarters,
    `  Total: ${opponentTeam.totalStarterPoints?.toFixed(2)} points`,
  ].join("\n");

  return output;
};

export const processMatchupBench: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string,
  week: number
) => {
  const benchData = await fetchMatchupBench(leagueId, week, userId, currYear);

  if (!benchData) {
    return `Year ${currYear}, Week ${week}:\n  Error: Could not fetch bench data for this matchup`;
  }

  const { userTeam, opponentTeam, matchupStatus } = benchData;

  // Format the output based on matchup status
  if (matchupStatus === "upcoming") {
    return `Year ${currYear}, Week ${week}:\n  Status: Upcoming matchup - bench data not yet available`;
  }

  // Format user bench players
  const userBenchPlayers = userTeam.benchPlayers
    .map((player, index) => {
      return `    Player ${index + 1}: ${player.name} - ${player.points.toFixed(
        2
      )} points`;
    })
    .join("\n");

  // Format opponent bench players
  const opponentBenchPlayers = opponentTeam.benchPlayers
    .map((player, index) => {
      return `    Player ${index + 1}: ${player.name} - ${player.points.toFixed(
        2
      )} points`;
    })
    .join("\n");

  // Create the final output
  const output = [
    `Year ${currYear}, Week ${week} (${matchupStatus}):`,
    `  ${userTeam.name}'s Bench:`,
    userBenchPlayers.length > 0 ? userBenchPlayers : "    No bench players",
    `  Total Bench Points: ${userTeam.totalBenchPoints.toFixed(2)}`,
    "",
    `  ${opponentTeam.name}'s Bench:`,
    opponentBenchPlayers.length > 0
      ? opponentBenchPlayers
      : "    No bench players",
    `  Total Bench Points: ${opponentTeam.totalBenchPoints.toFixed(2)}`,
  ].join("\n");

  return output;
};

export const processBenchVsStarterAnalysis: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string,
  week: number
) => {
  const analysisData = await fetchBenchVsStarterAnalysis(
    leagueId,
    week,
    userId,
    currYear
  );

  if (!analysisData) {
    return `Year ${currYear}, Week ${week}:\n  Error: Could not fetch lineup analysis data for this matchup`;
  }

  const { userTeam, opponentTeam, matchupStatus, summary } = analysisData;

  // Format the output based on matchup status
  if (matchupStatus === "upcoming") {
    return `Year ${currYear}, Week ${week}:\n  Status: Upcoming matchup - lineup analysis not yet available`;
  }

  // Helper function to format analysis for a team
  function formatTeamAnalysis(team: typeof userTeam) {
    const { name, analysis, hasMissedOpportunities } = team;

    let teamOutput = [`  ${name}'s Lineup Analysis:`];

    if (analysis.optimalChoices) {
      teamOutput.push("    Made optimal lineup choices");
    } else {
      teamOutput.push("    Could have made better lineup choices");
      teamOutput.push(
        `    Worst Starter: ${
          analysis.worstStarter.name
        } (${analysis.worstStarter.points.toFixed(2)} pts)`
      );

      if (analysis.outperformingBench.length > 0) {
        teamOutput.push("    Better Bench Options:");
        analysis.outperformingBench.forEach((player) => {
          const pointDiff = player.points - analysis.worstStarter.points;
          teamOutput.push(
            `      ${player.name}: ${player.points.toFixed(
              2
            )} pts (+${pointDiff.toFixed(2)})`
          );
        });
      }

      teamOutput.push(
        `    Total Missed Points: ${analysis.missedPoints.toFixed(2)}`
      );
    }

    return teamOutput.join("\n");
  }

  // Format both teams' analyses
  const userAnalysisOutput = formatTeamAnalysis(userTeam);
  const opponentAnalysisOutput = formatTeamAnalysis(opponentTeam);

  // Summary section
  const summaryOutput = [
    "  Match Summary:",
    `    ${userTeam.name} optimal choices: ${
      summary.userMadeOptimalChoices ? "Yes" : "No"
    }`,
    `    ${opponentTeam.name} optimal choices: ${
      summary.opponentMadeOptimalChoices ? "Yes" : "No"
    }`,
  ];

  if (summary.couldHaveChangedOutcome) {
    summaryOutput.push(
      "    Better lineup decisions could have changed the outcome!"
    );
  } else {
    summaryOutput.push(
      "    Lineup decisions would not have changed the outcome"
    );
  }

  // Create the final output
  const output = [
    `Year ${currYear}, Week ${week} Lineup Analysis (${matchupStatus}):`,
    userAnalysisOutput,
    "",
    opponentAnalysisOutput,
    "",
    summaryOutput.join("\n"),
  ].join("\n");

  return output;
};

export const processSeasonMatchupsBetweenUsers: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string,
  username: string,
  opponentUsername: string
) => {
  const matchupData = await fetchSeasonMatchupsBetweenUsers(
    opponentUsername,
    leagueId,
    userId,
    currYear
  );

  if (!matchupData) {
    return `Year ${currYear}:\n  Error: Could not fetch head-to-head data between ${username} and ${opponentUsername}`;
  }

  if (matchupData.length === 0) {
    return `Year ${currYear}:\n  ${username} and ${opponentUsername} did not play each other this season`;
  }

  // Calculate win/loss record
  let userWins = 0;
  let opponentWins = 0;
  let ties = 0;

  const matchupDetails = matchupData.map((matchup) => {
    const { week, userScore, opponentScore } = matchup;

    if (userScore > opponentScore) {
      userWins++;
      return `    Week ${week}: ${username} ${userScore.toFixed(
        2
      )} - ${opponentScore.toFixed(2)} ${opponentUsername} (W)`;
    } else if (opponentScore > userScore) {
      opponentWins++;
      return `    Week ${week}: ${username} ${userScore.toFixed(
        2
      )} - ${opponentScore.toFixed(2)} ${opponentUsername} (L)`;
    } else {
      ties++;
      return `    Week ${week}: ${username} ${userScore.toFixed(
        2
      )} - ${opponentScore.toFixed(2)} ${opponentUsername} (T)`;
    }
  });

  // Calculate total points
  const userTotalPoints = matchupData.reduce((sum, m) => sum + m.userScore, 0);
  const opponentTotalPoints = matchupData.reduce(
    (sum, m) => sum + m.opponentScore,
    0
  );

  // Build the record string
  let recordString = `${userWins}-${opponentWins}`;
  if (ties > 0) {
    recordString += `-${ties}`;
  }

  const output = [
    `Year ${currYear} Head-to-Head: ${username} vs ${opponentUsername}`,
    `  Record: ${username} ${recordString}`,
    `  Total Games: ${matchupData.length}`,
    `  Total Points: ${username} ${userTotalPoints.toFixed(
      2
    )} - ${opponentTotalPoints.toFixed(2)} ${opponentUsername}`,
    "",
    `  Game Results:`,
    ...matchupDetails,
  ].join("\n");

  return output;
};

export const processPlayoffBracket: Processor<string> = async (
  userId: string,
  leagueId: string,
  currYear: string
) => {
  const bracketData = await fetchLeaguePlayoffBracket(leagueId);

  if (!bracketData) {
    return `Year ${currYear}:\n  Error: Could not fetch playoff bracket data for this year`;
  }

  const { bracketByRound, playoffStatus } = bracketData;

  // Handle different playoff statuses
  if (playoffStatus === "not_started") {
    return `Year ${currYear} Playoff Bracket:\n  Playoffs have not started yet`;
  }

  if (Object.keys(bracketByRound).length === 0) {
    return `Year ${currYear} Playoff Bracket:\n  No bracket data available`;
  }

  // Build the bracket display
  const output = [`Year ${currYear} Playoff Bracket (${playoffStatus}):`];

  // Process each round
  const rounds = Object.keys(bracketByRound)
    .map(Number)
    .sort((a, b) => a - b);

  rounds.forEach((roundNumber) => {
    const roundName = getRoundName(roundNumber, rounds.length);
    output.push(`\n  ${roundName}:`);

    const matchups = bracketByRound[roundNumber];
    matchups.forEach((matchup) => {
      let matchupLine = formatMatchup(matchup);
      output.push(`    ${matchupLine}`);
    });
  });

  return output.join("\n");
};
