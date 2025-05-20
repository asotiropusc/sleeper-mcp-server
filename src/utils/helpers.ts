import { League, LeagueScoringSettings, Roster } from "../models/index.js";

export enum PlayoffRoundType {
  ONE_WEEK_PER_ROUND,
  TWO_WEEK_CHAMPIONSHIP,
  TWO_WEEKS_PER_ROUND,
}

export function getPlayoffRoundTypeDescription(
  roundType: PlayoffRoundType
): string {
  const descriptions = {
    [PlayoffRoundType.ONE_WEEK_PER_ROUND]: "One week per playoff round",
    [PlayoffRoundType.TWO_WEEK_CHAMPIONSHIP]:
      "One week per round with two-week championship",
    [PlayoffRoundType.TWO_WEEKS_PER_ROUND]: "Two weeks per playoff round",
  };

  return roundType in descriptions
    ? descriptions[roundType]
    : "Unknown playoff structure";
}

export function normalizeString(str: string): string {
  return (
    str
      .toLowerCase()
      // Replace curly quotes with straight quotes
      .replace(/[\u2018\u2019]/g, "'") // Single quotes
      .replace(/[\u201C\u201D]/g, '"') // Double quotes
      // Also handle common variations
      .replace(/'/g, "'") // Right single quotation mark
      .replace(/"/g, '"') // Various double quotes
      .trim()
  );
}

export function getPositionLabel(position: string): string {
  switch (position) {
    case "QB":
      return "Quarterback";
    case "RB":
      return "Running back";
    case "WR":
      return "Wide Receiver";
    case "TE":
      return "Tight End";
    case "FLEX":
      return "Flex";
    case "SUPER_FLEX":
      return "Super Flex";
    case "DEF":
      return "Defense";
    case "BN":
      return "Bench";
    default:
      return "";
  }
}

export function getLeagueStatus(status: string): string {
  switch (status) {
    case "in_season":
      return "draft completed";
    default:
      return status;
  }
}

export function getWaiverType(type: number): string {
  switch (type) {
    case 0:
      return "Rolling Waivers";
    case 1:
      return "Reverse Standings";
    case 2:
      return "FAAB";
    default:
      return "Unknown";
  }
}

export function getWaiverTypeDescription(type: number): string {
  switch (type) {
    case 0:
      return "Continuous and last person to waiver a player is placed last into waiver priority";
    case 1:
      return "Lower placed teams in the current standings will get highest waiver priority at the beginning of each week.";
    case 2:
      return "Each manager is given a budget to bid on unclaimed players that are on waivers.";
    default:
      return "Unknown";
  }
}

export function getDayOfWeek(day: number) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return days[day] || "Unknown";
}

// Function to format offensive scoring settings
export function formatOffensiveScoring(scoring: LeagueScoringSettings): string {
  // Group offensive scoring settings
  const passingScoring = [
    `Passing yards: ${scoring.pass_yd} points per yard`,
    `Passing TD: ${scoring.pass_td} points`,
    `Passing TD 40+ yards: +${scoring.pass_td_40p} points`,
    `Passing TD 50+ yards: +${scoring.pass_td_50p} points`,
    `Interception: ${scoring.pass_int} points`,
    `2PT conversion pass: ${scoring.pass_2pt} points`,
    `300+ passing yard bonus: ${scoring.bonus_pass_yd_300} points`,
    `400+ passing yard bonus: ${scoring.bonus_pass_yd_400} points`,
  ].join("\n  - ");

  const rushingScoring = [
    `Rushing attempt: ${scoring.rush_att} points`,
    `Rushing yards: ${scoring.rush_yd} points per yard`,
    `Rushing TD: ${scoring.rush_td} points`,
    `Rushing TD 40+ yards: +${scoring.rush_td_40p} points`,
    `Rushing TD 50+ yards: +${scoring.rush_td_50p} points`,
    `2PT conversion rush: ${scoring.rush_2pt} points`,
    `100+ rushing yard bonus: ${scoring.bonus_rush_yd_100} points`,
    `200+ rushing yard bonus: ${scoring.bonus_rush_yd_200} points`,
  ].join("\n  - ");

  const receivingScoring = [
    `Reception: ${scoring.rec} point`,
    `Receiving yards: ${scoring.rec_yd} points per yard`,
    `Receiving TD: ${scoring.rec_td} points`,
    `Receiving TD 40+ yards: +${scoring.rec_td_40p} points`,
    `Receiving TD 50+ yards: +${scoring.rec_td_50p} points`,
    `2PT conversion reception: ${scoring.rec_2pt} points`,
    `100+ receiving yard bonus: ${scoring.bonus_rec_yd_100} points`,
    `200+ receiving yard bonus: ${scoring.bonus_rec_yd_200} points`,
  ].join("\n  - ");

  const miscOffensiveScoring = [
    `Fumble lost: ${scoring.fum_lost} points`,
    `Combined 200+ rush/rec yards bonus: ${scoring.bonus_rush_rec_yd_200} points`,
  ].join("\n  - ");

  return [
    "Passing:",
    `  - ${passingScoring}`,
    "\nRushing:",
    `  - ${rushingScoring}`,
    "\nReceiving:",
    `  - ${receivingScoring}`,
    "\nMiscellaneous:",
    `  - ${miscOffensiveScoring}`,
  ].join("\n");
}

// Function to format kicking scoring settings
export function formatKickingScoring(scoring: LeagueScoringSettings): string {
  return [
    `FG 0-19 yards: ${scoring.fgm_0_19} points`,
    `FG 20-29 yards: ${scoring.fgm_20_29} points`,
    `FG 30-39 yards: ${scoring.fgm_30_39} points`,
    `FG 40-49 yards: ${scoring.fgm_40_49} points`,
    `FG 50+ yards: ${scoring.fgm_50p} points`,
    `Missed FG: ${scoring.fgmiss} point`,
    `Extra point made: ${scoring.xpm} point`,
    `Missed extra point: ${scoring.xpmiss} point`,
  ].join("\n  - ");
}

// Function to format defensive scoring settings
export function formatDefensiveScoring(scoring: LeagueScoringSettings): string {
  // Group defensive scoring settings
  const idpScoring = [
    `Sack: ${scoring.sack} point`,
    `Interception: ${scoring.int} points`,
    `Forced fumble: ${scoring.ff} point`,
    `Fumble recovery: ${scoring.fum_rec} points`,
    `Fumble recovery TD: ${scoring.fum_rec_td} points`,
    `Safety: ${scoring.safe} points`,
  ].join("\n  - ");

  const teamDefenseScoring = [
    `Defensive TD: ${scoring.def_td} points`,
    `Defensive/ST TD: ${scoring.def_st_td} points`,
    `Special teams TD: ${scoring.st_td} points`,
    `Defensive/ST fumble recovery: ${scoring.def_st_fum_rec} point`,
    `Defensive/ST forced fumble: ${scoring.def_st_ff} point`,
    `ST fumble recovery: ${scoring.st_fum_rec} point`,
    `ST forced fumble: ${scoring.st_ff} point`,
    `Blocked kick: ${scoring.blk_kick} points`,
  ].join("\n  - ");

  const pointsAllowedScoring = [
    `0 points allowed: ${scoring.pts_allow_0} points`,
    `1-6 points allowed: ${scoring.pts_allow_1_6} points`,
    `7-13 points allowed: ${scoring.pts_allow_7_13} points`,
    `14-20 points allowed: ${scoring.pts_allow_14_20} points`,
    `21-27 points allowed: ${scoring.pts_allow_21_27} points`,
    `28-34 points allowed: ${scoring.pts_allow_28_34} points`,
    `35+ points allowed: ${scoring.pts_allow_35p} points`,
  ].join("\n  - ");

  return [
    "Individual Defensive Player (IDP):",
    `  - ${idpScoring}`,
    "\nTeam Defense & Special Teams:",
    `  - ${teamDefenseScoring}`,
    "\nPoints Allowed (Team Defense):",
    `  - ${pointsAllowedScoring}`,
  ].join("\n");
}

export const parseYearParameter = (
  year: string | undefined,
  availableYears: string[]
): { requestedYears: string[]; yearsToProcess: string[] } => {
  let requestedYears: string[] = [];
  let yearsToProcess: string[] = [];

  if (!year) {
    // No year specified - process all available years
    requestedYears = availableYears;
    yearsToProcess = [...availableYears].sort(
      (a, b) => parseInt(b) - parseInt(a)
    );
  } else if (year.includes("-")) {
    // Range format: "2022-2024"
    const [start, end] = year.split("-").map((y) => parseInt(y.trim()));
    for (let y = start; y <= end; y++) {
      requestedYears.push(y.toString());
      if (availableYears.includes(y.toString())) {
        yearsToProcess.push(y.toString());
      }
    }
  } else if (year.includes(",")) {
    // List format: "2022,2023,2024"
    requestedYears = year.split(",").map((y) => y.trim());
    yearsToProcess = requestedYears.filter((y) => availableYears.includes(y));
  } else {
    // Single year
    requestedYears = [year];
    yearsToProcess = availableYears.includes(year) ? [year] : [];
  }

  return { requestedYears, yearsToProcess };
};

export function determineLeagueType(league: League): string {
  const isSuperFlex = league.roster_positions.includes("SUPER_FLEX");
  const receptionPoints = league.scoring_settings.rec;

  let scoringType = "Standard";
  if (receptionPoints === 1) {
    scoringType = "PPR";
  } else if (receptionPoints === 0.5) {
    scoringType = "Half PPR";
  }

  return `${scoringType}${isSuperFlex ? " Super Flex" : ""}`;
}

export function getUserRosterId(
  userId: string,
  rosters: Roster[]
): number | null {
  const rosterMatch = rosters.find(
    (roster) => roster.owner_id === userId || roster.co_owners?.includes(userId)
  );

  return rosterMatch ? rosterMatch.roster_id : null;
}

export function getUserIdsFromRosterId(
  rosterId: number,
  rosters: Roster[]
): string[] {
  const rosterMatch = rosters.find((roster) => roster.roster_id === rosterId);
  if (!rosterMatch) return [];

  return [rosterMatch.owner_id, ...(rosterMatch.co_owners ?? [])];
}
