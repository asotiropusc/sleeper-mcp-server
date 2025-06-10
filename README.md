# Sleeper 🏈 Model Context Protocol Server

A Model Context Protocol (MCP) server that provides users with access to their historic performance across their Sleeper leagues. This server also provides access to current season details.

## Key Files

### `index.ts`

- Defines the 15 listed MCP tools below:
  - `get-current-nfl-week` - Current NFL week information
  - `get-trending-players` - Most added/dropped players league-wide
  - `get-user-roster-trending-players` - Trending players on user's roster
  - `get-league-names-for-user` - All leagues for a username
  - `get-league-settings` - General league configuration
  - `get-league-playoff-schedule` - Playoff structure and timing
  - `get-league-scoring-settings` - Detailed scoring rules
  - `get-league-roster-settings` - Starting lineup requirements
  - `get-matchup-details` - Head-to-head matchup summaries for a given week
  - `get-matchup-starters` - Retrieves the starters on both teams for a given matchup
  - `get-league-playoff-history` - Historical playoff results
  - `get-matchup-bench` - Retrieves the benched players on both teams for a given matchup
  - `get-bench-starter-analysis` - Lineup optimization analysis for a given matchup
  - `get-season-head-to-head` - Complete rivalry records across seasons
  - `get-league-playoff-bracket` - Retrieves the playoff bracket for a league

### `utils/processors.ts`

- This file is responsible for implementation details for tools that require historical data lookup.
- We define a function called `processLeagueDataByYear` which facilitates access to historical league information.
  - This is essential because the Sleeper API does not provide direct access to historical league data and so a league chain must be constructed manually by following `previous_league_id` references.
  - This function allows the client to provide year ranges such as `"2022"`, `"2022-2024"`, `"2020, 2022, 2024"`.
  - Each tool that utilizes this function needs to provide a processor function, which formats the outputs for the specific year based on the type of endpoints being accessed.

### `utils/api.ts`

- Houses the api calls for communication with the Sleeper API.

## Getting Started

## Prerequisites:

- Node.js
- npm
- Claude Desktop App

## Installation:

1. Clone the Repository
   ```bash
   git clone https://github.com/asotiropusc/sleeper-mcp-server.git
   cd sleeper-mcp-server
   ```
2. Install Dependencies
   ```bash
   npm install
   ```

## Configuration:

To use this MCP server you have to notify Claude Desktop of it through the Claude Config. To open the config:

### On Mac:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### On Windows:

```bash
code $env:AppData\Claude\claude_desktop_config.json
```

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sleeper-fantasy-football": {
      "command": "/ABSOLUTE/PATH/TO/PARENT/FOLDER/sleeper-mcp-server/node_modules/.bin/tsx",
      "args": [
        "/ABSOLUTE/PATH/TO/PARENT/FOLDER/sleeper-mcp-server/src/index.ts"
      ]
    }
  }
}
```
