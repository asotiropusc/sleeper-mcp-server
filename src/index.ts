import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SeasonType } from "./models/NFLState.js";
import { League } from "./models/League.js";
import {
  fetchLeagues,
  fetchUserId,
  fetchNFLState,
  fetchPlayerData,
  fetchTrendingPlayers,
  fetchMyTrendingRosterPlayers,
} from "./utils/api.js";
import { FIELDS } from "./utils/schemas.js";
import {
  processBenchVsStarterAnalysis,
  processLeagueDataByYear,
  processLeagueSettings,
  processMatchupBench,
  processMatchupDetails,
  processMatchupStarters,
  processPlayoffBracket,
  processPlayoffHistory,
  processPlayoffSchedule,
  processRosterSettings,
  processScoringSettings,
  processSeasonMatchupsBetweenUsers,
} from "./utils/processors.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const PLAYER_DATA_PATH = path.join(DATA_DIR, "player_data.json");

const mcpServer = new McpServer({
  name: "sleeper",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

mcpServer.tool(
  "get-current-nfl-week",
  "Gets the current week number for the nfl season. ",
  async () => {
    const nflStateData = await fetchNFLState();

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

    const { currentWeek, seasonType } = nflStateData;

    if (seasonType !== SeasonType.regular) {
      return {
        content: [
          {
            type: "text",
            text: `It is ${seasonType} season, not regular season. Week numbers are only applicable during the regular season.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: String(currentWeek),
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-trending-players",
  "Gets the current top 5 trending players based on waiver adds, drops, or both",
  {
    trendingType: FIELDS.trendingType,
  },
  async ({ trendingType }) => {
    const trendingPlayers = await fetchTrendingPlayers(trendingType);

    if (!trendingPlayers) {
      const trendLabel =
        trendingType === "add"
          ? "Most Added"
          : trendingType === "drop"
          ? "Most Dropped"
          : "Trending";
      return {
        content: [
          {
            type: "text",
            text: `Unable to fetch ${trendLabel} players at this time.`,
          },
        ],
      };
    }

    if (trendingType === "all") {
      // Separate and limit to top 5 of each
      const addPlayers = trendingPlayers
        .filter((p) => p.trendType === "add")
        .slice(0, 5);
      const dropPlayers = trendingPlayers
        .filter((p) => p.trendType === "drop")
        .slice(0, 5);

      return {
        content: [
          {
            type: "text",
            text: `## Most Added Players\n\n${addPlayers
              .map(
                (player, index) =>
                  `${index + 1}. **${player.name}** (${player.team}) - ${
                    player.playerTrend
                  }`
              )
              .join("\n")}\n\n## Most Dropped Players\n\n${dropPlayers
              .map(
                (player, index) =>
                  `${index + 1}. **${player.name}** (${player.team}) - ${
                    player.playerTrend
                  }`
              )
              .join("\n")}`,
          },
        ],
      };
    }

    // Single category (add or drop)
    const trendLabel = trendingType === "add" ? "Most Added" : "Most Dropped";

    return {
      content: [
        {
          type: "text",
          text: `## ${trendLabel} Players\n\n${trendingPlayers
            .slice(0, 5)
            .map(
              (player, index) =>
                `${index + 1}. **${player.name}** (${player.team}) - ${
                  player.playerTrend
                }`
            )
            .join("\n")}`,
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-user-roster-trending-players",
  "Gets the players on the user's roster that are currently trending",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    trendingType: FIELDS.trendingType,
  },
  async ({ username, leagueName, trendingType }) => {
    const myTrendingPlayers = await fetchMyTrendingRosterPlayers(
      username,
      leagueName,
      trendingType
    );

    if (!myTrendingPlayers || myTrendingPlayers.length === 0) {
      const trendLabel =
        trendingType === "add"
          ? "uptrending"
          : trendingType === "drop"
          ? "downtrending"
          : "trending";
      return {
        content: [
          {
            type: "text",
            text: `You don't have any ${trendLabel} players on your roster right now.`,
          },
        ],
      };
    }

    if (trendingType === "all") {
      const addPlayers = myTrendingPlayers.filter((p) => p.trendType === "add");
      const dropPlayers = myTrendingPlayers.filter(
        (p) => p.trendType === "drop"
      );

      let output = "";

      if (addPlayers.length > 0) {
        output += `## Your Uptrending Players\n\n${addPlayers
          .map(
            (player) =>
              `• **${player.name}** (${player.team}) - ${player.playerTrend}`
          )
          .join("\n")}`;
      }

      if (dropPlayers.length > 0) {
        if (output) output += "\n\n";
        output += `## Your Downtrending Players\n\n${dropPlayers
          .map(
            (player) =>
              `• **${player.name}** (${player.team}) - ${player.playerTrend}`
          )
          .join("\n")}`;
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    const trendLabel = trendingType === "add" ? "Uptrending" : "Downtrending";

    return {
      content: [
        {
          type: "text",
          text: `## Your ${trendLabel} Players\n\n${myTrendingPlayers
            .map(
              (player) =>
                `• **${player.name}** (${player.team}) - ${player.playerTrend}`
            )
            .join("\n")}`,
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-league-names-for-user",
  "Retrieves all fantasy football league names associated with a Sleeper username. Use this tool to verify league names mentioned by users. When a user references a league name that doesn't exactly match any returned names, select the closest match from this list or inform the user about valid league names. This tool should be called before any league-specific operations to ensure the correct league is targeted.",
  {
    username: FIELDS.username,
  },
  async ({ username }) => {
    const mostRecentLeagues = await fetchLeagues(username);

    if (!mostRecentLeagues) {
      return {
        content: [
          {
            type: "text",
            text: "Unable to fetch the most recent leagues. Try again.",
          },
        ],
      };
    }

    const mappedLeague = mostRecentLeagues.map((league: League) => league.name);

    return {
      content: [
        {
          type: "text",
          text: `League names for ${username}:\n\n${mappedLeague.join("\n")}`,
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-league-settings",
  "Gets the general settings, wavier settings, and taxi settings (if dynasty league) for a given league",
  {
    username: FIELDS.username,
    year: FIELDS.requiredYear,
    leagueName: FIELDS.leagueName,
  },
  async ({ username, year, leagueName }) => {
    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processLeagueSettings,
      `League Settings for ${leagueName}`
    );
  }
);

mcpServer.tool(
  "get-league-playoff-schedule",
  "Retrieves a league's playoff structure and schedule, mapping playoff rounds (like quarterfinals, semifinals, finals) to their corresponding week numbers. Use this tool to determine which NFL week corresponds to specific playoff rounds based on the league's settings.",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, year }) => {
    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processPlayoffSchedule,
      `Playoff Schedule for ${leagueName}`
    );
  }
);

mcpServer.tool(
  "get-league-scoring-settings",
  "Gets the detailed scoring settings for a league",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    year: FIELDS.requiredYear,
    category: FIELDS.scoreCategory,
  },
  async ({ username, leagueName, year, category }) => {
    const categoryDisplay =
      category.charAt(0).toUpperCase() + category.slice(1);

    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processScoringSettings,
      `${categoryDisplay} Scoring Settings for ${leagueName}`,
      category
    );
  }
);

mcpServer.tool(
  "get-league-roster-settings",
  "Retrieves the roster details for the league (i.e. How many starting roster slots and the type of those roster slots.).",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, year }) => {
    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processRosterSettings,
      `Roster Settings for ${leagueName}`
    );
  }
);

mcpServer.tool(
  "get-matchup-details",
  "Gets the matchup for the user given the league name, username, week, and season year",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    week: FIELDS.week,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, week, year }) => {
    const userId = await fetchUserId(username);

    if (!userId) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find user ID for username: ${username}. Ensure the username is valid.`,
          },
        ],
        isError: true,
      };
    }

    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processMatchupDetails,
      `Matchup Details for ${username} in ${leagueName}`,
      week,
      userId
    );
  }
);

mcpServer.tool(
  "get-matchup-starters",
  "Gets detailed information about the starting players for a matchup",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    week: FIELDS.week,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, week, year }) => {
    const userId = await fetchUserId(username);

    if (!userId) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find user ID for username: ${username}. Ensure the username is valid.`,
          },
        ],
        isError: true,
      };
    }

    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processMatchupStarters,
      `Matchup Starter Details for ${username} in ${leagueName} for Week ${week}`,
      week,
      userId
    );
  }
);

mcpServer.tool(
  "get-league-playoff-history",
  "Gets the complete playoff history for the league, including all placements. Please request the user's sleeper username before calling this.",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    year: FIELDS.year,
  },
  async ({ username, leagueName, year }) => {
    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processPlayoffHistory,
      "League Playoff History"
    );
  }
);

mcpServer.tool(
  "get-matchup-bench",
  "Gets detailed information about bench players for a matchup, showing which players were benched and how many points they scored",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    week: FIELDS.week,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, week, year }) => {
    const userId = await fetchUserId(username);

    if (!userId) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find user ID for username: ${username}. Ensure the username is valid.`,
          },
        ],
        isError: true,
      };
    }

    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processMatchupBench,
      `Matchup Bench Details for ${username} in ${leagueName} for Week ${week}`,
      week,
      userId
    );
  }
);

mcpServer.tool(
  "get-bench-starter-analysis",
  "Analyzes lineup decisions for a matchup, showing whether optimal choices were made and if bench players outperformed starters. Identifies missed opportunities and potential points left on the bench.",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    week: FIELDS.week,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, week, year }) => {
    const userId = await fetchUserId(username);

    if (!userId) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find user ID for username: ${username}. Ensure the username is valid.`,
          },
        ],
        isError: true,
      };
    }

    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processBenchVsStarterAnalysis,
      `Lineup Analysis for ${username} vs Opponent in Week ${week}`,
      week,
      userId
    );
  }
);

mcpServer.tool(
  "get-season-head-to-head",
  "Gets the complete head-to-head record between two users for an entire season, including win/loss record, total points, and game-by-game results",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    year: FIELDS.year,
    opponentUsername: FIELDS.opponentUsername,
  },
  async ({ username, leagueName, year, opponentUsername }) => {
    // Validate both usernames exist
    const userId = await fetchUserId(username);
    const opponentId = await fetchUserId(opponentUsername);

    if (!userId) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find user ID for username: ${username}. Ensure the username is valid.`,
          },
        ],
        isError: true,
      };
    }

    if (!opponentId) {
      return {
        content: [
          {
            type: "text",
            text: `Could not find user ID for opponent username: ${opponentUsername}. Ensure the username is valid.`,
          },
        ],
        isError: true,
      };
    }

    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processSeasonMatchupsBetweenUsers,
      `Season Head-to-Head: ${username} vs ${opponentUsername}`,
      username,
      opponentUsername
    );
  }
);

mcpServer.tool(
  "get-league-playoff-bracket",
  "Gets the current playoff bracket showing matchups, winners, and bracket progression for a league",
  {
    username: FIELDS.username,
    leagueName: FIELDS.leagueName,
    year: FIELDS.requiredYear,
  },
  async ({ username, leagueName, year }) => {
    return await processLeagueDataByYear(
      username,
      leagueName,
      year,
      processPlayoffBracket,
      `Playoff Bracket for ${leagueName}`
    );
  }
);

async function main() {
  if (!fs.existsSync(PLAYER_DATA_PATH)) {
    const playerData = await fetchPlayerData();
    if (playerData) {
      fs.writeFileSync(PLAYER_DATA_PATH, JSON.stringify(playerData, null, 2));
      console.error(`Finished writing to ${PLAYER_DATA_PATH}`);
    } else {
      console.error(
        "Failed to fetch player data. Player specific details won't be available"
      );
    }
  }

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Sleeper Fantasy Football MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
