import { z } from "zod";

export const DESCRIPTIONS = {
  username: "Sleeper username. Must be provided by the user.",
  leagueName:
    "Name of the league. Must be provided by user unless user specifies something like 'all my leagues' in which case can use the get-league-names-for-user tool",
  week: "The NFL week number to retrieve fantasy matchups for (values 1-18 for regular season). If the user mentions periods like 'quarterfinals' or 'semifinals' instead of a specific week, use get-league-playoff-schedule to determine the corresponding week number. For relative references like 'this week' or 'next week', use get-current-nfl-week as a reference point.",
  year: "Specify years as: '2022' (single year), '2022-2024' (year range), or '2022,2023,2024' (comma-separated list). Using these formats enables more efficient batch processing compared to making multiple separate requests. If omitted, defaults to all available years.",
  requiredYear:
    "Specify years as: '2022' (single year), '2022-2024' (year range), or '2022,2023,2024' (comma-separated list) for efficient batch processing. Defaults to current year.",
  scoreCategory:
    "Which scoring category to retrieve. ('offensive', 'defensive', 'kicking', 'all')",
  opponentUsername:
    "The Sleeper username of the opponent to compare against in head-to-head analysis. Must be provided by the user.",
  trendingType:
    "The types of trending players the user wants details for ('drop', 'add', 'all'). Defaults to 'all' if no argument is provided.",
};

export const FIELDS = {
  username: z.string().describe(DESCRIPTIONS.username),
  leagueName: z.string().describe(DESCRIPTIONS.leagueName),
  week: z
    .number()
    .int()
    .min(1, "Week must be at least 1")
    .max(18, "Week cannot exceed 18"),
  year: z.string().optional().describe(DESCRIPTIONS.year),
  requiredYear: z
    .string()
    .default(() => new Date().getFullYear().toString())
    .describe(DESCRIPTIONS.requiredYear),

  scoreCategory: z
    .enum(["offensive", "defensive", "kicking", "all"])
    .describe(DESCRIPTIONS.scoreCategory)
    .default("all"),
  opponentUsername: z.string().describe(DESCRIPTIONS.opponentUsername),
  trendingType: z
    .enum(["add", "drop", "all"])
    .default("all")
    .describe(DESCRIPTIONS.trendingType),
};

// Different combinations for different needs
export const userLeagueYearShape = {
  username: FIELDS.username,
  leagueName: FIELDS.leagueName,
  year: FIELDS.year,
};

export const userLeagueRequiredYearShape = {
  username: FIELDS.username,
  leagueName: FIELDS.leagueName,
  year: FIELDS.requiredYear,
};

// TODO: dont make year required bc we need to be able to perform historical fetching across all league years (MAYBE?)
export const userLeagueRequiredYearWeekShape = {
  ...userLeagueRequiredYearShape,
  week: FIELDS.week,
};

export const userLeagueYearOpponentShape = {
  ...userLeagueYearShape,
  opponentUsername: FIELDS.opponentUsername,
};

export const userRequiredYearShape = {
  username: FIELDS.username,
  year: FIELDS.requiredYear,
};

export const userYearShape = {
  username: FIELDS.username,
  year: FIELDS.year,
};

export const userLeagueShape = {
  username: FIELDS.username,
  leagueName: FIELDS.leagueName,
};

export const userOnlyShape = {
  username: FIELDS.username,
};

export const trendingShape = {
  trendingType: FIELDS.trendingType,
};

export const userLeagueTrendShape = {
  ...userLeagueShape,
  ...trendingShape,
};
