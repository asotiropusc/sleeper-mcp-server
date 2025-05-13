import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { NFLState, SeasonType } from "./models/NFLState.js";
import { League, LeagueScoringSettings } from "./models/League.js";
import { User } from "./models/User.js";
import { Roster } from "./models/Roster.js";

import { promises as fs } from "fs";
import path from "path";

const SLEEPER_API_BASE = "https://api.sleeper.app/v1";

// Initialize with null (no user)
const userCache = new Map<string, string>();
const leagueCache = new Map<string, string>();

// User resource URI
interface Counter {
  [key: string]: number;
}

function getPositionLabel(position: string): string {
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

function getLeagueStatus(status: string): string {
  switch (status) {
    case "in_season":
      return "draft completed";
    default:
      return status;
  }
}

function getWaiverType(type: number): string {
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

function getWaiverTypeDescription(type: number): string {
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

function getDayOfWeek(day: number) {
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
function formatOffensiveScoring(scoring: LeagueScoringSettings): string {
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
function formatKickingScoring(scoring: LeagueScoringSettings): string {
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
function formatDefensiveScoring(scoring: LeagueScoringSettings): string {
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

async function makeRequest<T>(url: string): Promise<T | null> {
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

async function fetchUserId(username: string): Promise<string | null> {
  const cached = userCache.get(username);
  if (cached) return cached;

  const userIdUrl = `${SLEEPER_API_BASE}/user/${username}`;

  const userData = await makeRequest<User>(userIdUrl);

  if (!userData) return null;

  const { user_id } = userData;
  userCache.set(username, user_id);

  return user_id;
}

async function fetchLeagueId(
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

  const league = leagues.find(
    (l: League) => l.name.toLowerCase() === leagueName.toLowerCase()
  );
  if (!league) return null;

  leagueCache.set(cacheKey, league.league_id);
  return league.league_id;
}

async function fetchLeagueData(
  username: string,
  leagueName: string,
  leagueId?: string
): Promise<League | null> {
  const id = leagueId ?? (await fetchLeagueId(username, leagueName));
  if (!id) return null;

  const leagueUrl = `${SLEEPER_API_BASE}/league/${id}`;
  return await makeRequest<League>(leagueUrl);
}

async function fetchLeagueRosters(
  username: string,
  leagueName: string,
  leagueId?: string
): Promise<Roster[] | null> {
  const id = leagueId ?? (await fetchLeagueId(username, leagueName));
  if (!id) return null;

  const rostersUrl = `${SLEEPER_API_BASE}/league/${id}/rosters`;
  return await makeRequest<Roster[]>(rostersUrl);
}

async function fetchUser(identifier: string): Promise<User | null> {
  const userUrl = `${SLEEPER_API_BASE}/user/${identifier}`;
  return await makeRequest<User>(userUrl);
}

const mcpServer = new McpServer({
  name: "sleeper",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

mcpServer.tool(
  "get-nfl-state",
  "Gets information about the current state of the nfl",
  async () => {
    const nflStateUrl = `${SLEEPER_API_BASE}/state/nfl`;

    const nflStateData = await makeRequest<NFLState>(nflStateUrl);

    if (!nflStateData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve NFL state data",
          },
        ],
        isError: true,
      };
    }

    const { season_type } = nflStateData;

    if (season_type === SeasonType.off) {
      return {
        content: [
          {
            type: "text",
            text: "The NFL is not in season. No details available.",
          },
        ],
      };
    }

    const formattedNFLState = [
      `Season: ${nflStateData.season}`,
      `Week: ${nflStateData.week}`,
      `Season Type: ${nflStateData.season_type}`,
      `League Season: ${nflStateData.league_season}`,
      `Display Week: ${nflStateData.display_week}`,
      `League Create Season: ${nflStateData.league_create_season}`,
      nflStateData.season_start_date
        ? `Season Start Date: ${nflStateData.season_start_date}`
        : null,
      nflStateData.season_has_scores !== undefined
        ? `Season Has Scores: ${nflStateData.season_has_scores}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: formattedNFLState,
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-all-leagues-for-user",
  "Gets all the leagues for the user. Must have user id which can be retrieved with the user's username",
  {
    username: z.string().describe("Sleeper username"),
    season: z
      .string()
      .length(4)
      .describe("Four-number Year in format YYYY")
      .default(() => new Date().getFullYear().toString()),
  },
  async ({ username, season }) => {
    const userId = await fetchUserId(username);

    const leaguesUrl = `${SLEEPER_API_BASE}/user/${userId}/leagues/nfl/${season}`;

    const leaguesData = await makeRequest<League[]>(leaguesUrl);

    if (!leaguesData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve data for all user leagues",
          },
        ],
        isError: true,
      };
    }

    const formattedLeague = leaguesData.map((league: League) => {
      const isSuperFlex = league.roster_positions.includes("SUPER_FLEX");
      const receptionPoints = league.scoring_settings.rec;

      let scoringType = "Standard";

      if (receptionPoints === 1) {
        scoringType = "PPR";
      } else if (receptionPoints === 0.5) {
        scoringType = "Half PPR";
      }

      const leagueType = `${scoringType} ${isSuperFlex ? "Super Flex" : ""}`;

      return [
        `League Name: ${league.name}`,
        `Total Teams: ${league.total_rosters}`,
        `Last League Winner Roster ID: ${league.metadata.latest_league_winner_roster_id}`,
        `League Type: ${leagueType}`,
        `League Status: ${getLeagueStatus(league.status)}`,
        "---",
      ].join("\n");
    });

    const leaguesText = `Fantasy Football Leagues for User ID: ${userId}, Season: ${season}\n\n${formattedLeague.join(
      "\n\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: leaguesText,
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-league-settings",
  "Gets the general settings and configuration for a league",
  {
    username: z.string().describe("Sleeper username"),
    leagueName: z.string().describe("Name of the league"),
  },
  async ({ username, leagueName }) => {
    const leagueData = await fetchLeagueData(username, leagueName);

    if (!leagueData) {
      return {
        content: [
          {
            type: "text",
            text: "Could not find the data for this league. Ensure username and league name are valid",
          },
        ],
        isError: true,
      };
    }

    const { settings } = leagueData;

    const formattedSettings = [
      `League Settings for ${leagueData.name}`,
      "",
      "General Settings:",
      `- Waiver Budget: $${settings.waiver_budget}`,
      `- Trade Deadline: Week ${settings.trade_deadline}`,
      `- Number of Rounds in Draft: ${settings.draft_rounds}`,
      `- Injured Reserve Slots: ${settings.reserve_slots}`,
      "",
      "Playoff Settings:",
      `- Playoff Teams: ${settings.playoff_teams}`,
      `- Playoff Start: Week ${settings.playoff_week_start}`,
      "",
      "Waiver Settings:",
      `- Waiver Type: ${getWaiverType(settings.waiver_type)}`,
      `- Waiver Type Description: ${getWaiverTypeDescription(
        settings.waiver_type
      )}`,
      `- Waivers Clear: ${getDayOfWeek(settings.waiver_day_of_week)}`,
      `- Beginning Waiver Budget: $${settings.waiver_budget}`,
    ];

    if (settings.taxi_slots > 0) {
      formattedSettings.push(
        "Taxi Settings:",
        `- Taxi Slots: ${settings.taxi_slots}`,
        `- Deadline to set Taxi Spots: Week ${settings.taxi_deadline}`,
        `- Maximum time on taxi squad: ${settings.taxi_years} years`,
        ""
      );
    }

    return {
      content: [{ type: "text", text: formattedSettings.join("\n") }],
    };
  }
);

mcpServer.tool(
  "get-league-scoring-settings",
  "Gets the detailed scoring settings for a league",
  {
    username: z.string().describe("Sleeper username"),
    leagueName: z.string().describe("Name of the league"),
    category: z
      .enum(["offensive", "defensive", "kicking", "all"])
      .describe("Which scoring category to retrieve")
      .default("all"),
  },
  async ({ username, leagueName, category }) => {
    const leagueData = await fetchLeagueData(username, leagueName);
    if (!leagueData) {
      return {
        content: [
          {
            type: "text",
            text: "Could not find the data for this league. Ensure username and league name are valid",
          },
        ],
        isError: true,
      };
    }

    if (
      category === "defensive" &&
      !leagueData.roster_positions.includes("DEF")
    ) {
      return {
        content: [
          {
            type: "text",
            text: "This league does not have a defense roster slot. No defense scoring available",
          },
        ],
      };
    }

    if (category === "kicking" && !leagueData.roster_positions.includes("K")) {
      return {
        content: [
          {
            type: "text",
            text: "This league does not have a kicker roster slot. No kicker scoring available",
          },
        ],
      };
    }

    const { scoring_settings } = leagueData;
    const formattedScoring = [
      `${
        category.charAt(0).toUpperCase() + category.slice(1)
      } League Scoring Settings for ${leagueData.name}`,
      "",
    ];

    if (category === "all" || category === "offensive") {
      formattedScoring.push(
        "=== OFFENSIVE SCORING ===",
        "",
        formatOffensiveScoring(scoring_settings),
        ""
      );
    }
    if (category === "all" || category === "defensive") {
      formattedScoring.push(
        "=== DEFENSIVE SCORING ===",
        "",
        formatDefensiveScoring(scoring_settings),
        ""
      );
    }
    if (category === "all" || category === "kicking") {
      formattedScoring.push(
        "=== KICKING SCORING ===",
        "",
        formatKickingScoring(scoring_settings)
      );
    }

    return {
      content: [{ type: "text", text: formattedScoring.join("\n") }],
    };
  }
);

mcpServer.tool(
  "get-league-roster-settings",
  "Retrieves the roster details for the league (i.e. How many starting roster slots and the type of those roster slots.).",
  {
    username: z.string().describe("Sleeper username"),
    leagueName: z.string().describe("Name of the league"),
  },
  async ({ username, leagueName }) => {
    const leagueData = await fetchLeagueData(username, leagueName);

    if (!leagueData) {
      return {
        content: [
          {
            type: "text",
            text: "Could not find the data for this league. Ensure username and league name are valid",
          },
        ],
        isError: true,
      };
    }

    const { roster_positions } = leagueData;

    const rosterCounts: Counter = roster_positions.reduce(
      (acc: Counter, curr: string) => {
        acc[curr] = (acc[curr] || 0) + 1;

        return acc;
      },
      {}
    );

    const formattedRoster: string[] = Object.entries(rosterCounts).map(
      ([pos, count]) => `${getPositionLabel(pos)}: ${count}`
    );

    return {
      content: [
        {
          type: "text",
          text: formattedRoster.join("\n"),
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-last-league-winner",
  "Gets the last winner for the league. Please request the user's sleeper username before calling this.",
  {
    username: z.string().describe("Sleeper username."),
    leagueName: z.string().describe("Name of the league"),
  },
  async ({ username, leagueName }) => {
    const leagueData = await fetchLeagueData(username, leagueName);

    if (!leagueData) {
      return {
        content: [
          {
            type: "text",
            text: "Could not find the data for this league. Ensure username and league name are valid",
          },
        ],
        isError: true,
      };
    }

    const leagueRosters = await fetchLeagueRosters(
      username,
      leagueName,
      leagueData.league_id
    );

    if (!leagueRosters) {
      return {
        content: [
          {
            type: "text",
            text: "Unable to fetch league rosters.",
          },
        ],
        isError: true,
      };
    }

    const { latest_league_winner_roster_id } = leagueData.metadata;

    const lastWinningRoster = leagueRosters.find(
      (roster: Roster) =>
        roster.roster_id === Number(latest_league_winner_roster_id)
    );

    if (!lastWinningRoster) {
      return {
        content: [
          {
            type: "text",
            text: "Roster Id mismatch. Unable to find the last winning roster.",
          },
        ],
        isError: true,
      };
    }

    const winnerIds = [lastWinningRoster.owner_id];

    if (lastWinningRoster.co_owners) {
      lastWinningRoster.co_owners.forEach((co_owner) => {
        winnerIds.push(co_owner);
      });
    }

    const winners = [];

    for (const winnerId of winnerIds) {
      const userDetails = await fetchUser(winnerId);

      if (!userDetails) {
        return {
          content: [
            {
              type: "text",
              text: "Unable to fetch details of the winning user.",
            },
          ],
          isError: true,
        };
      }

      winners.push(userDetails.username);
    }

    const formattedWinnerDetails =
      winners.length > 1
        ? `Co-owner Winners: ${winners.join(", ")}`
        : `Winner: ${winners[0]}`;

    return {
      content: [
        {
          type: "text",
          text: `Last winning user: ${formattedWinnerDetails}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Sleeper Fantasy Football MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
