# Polls MCP Server

A Model Context Protocol (MCP) server that allows LLMs like Claude to create and manage polls in your polls application.

## Features

The MCP server provides the following tools:

### 1. `create_poll_suggestion`
Submit a new poll suggestion that can be reviewed and approved by admins.

**Parameters:**
- `question` (string, required): The poll question (minimum 8 characters)
- `options` (array, required): Array of 2-8 poll options

**Example:**
```json
{
  "question": "What's your favorite programming language?",
  "options": ["JavaScript", "Python", "TypeScript", "Rust"]
}
```

### 2. `create_poll_in_bank`
Create a poll directly in the poll bank. These polls can be selected as daily polls.

**Parameters:**
- `question` (string, required): The poll question
- `options` (array, required): Array of 2-8 poll options

### 3. `schedule_daily_poll`
Schedule a poll for a specific date. The poll will appear on that date.

**Parameters:**
- `poll_date` (string, required): Date in YYYY-MM-DD format
- `question` (string, required): The poll question
- `options` (array, required): Array of 2-8 poll options

**Example:**
```json
{
  "poll_date": "2026-03-15",
  "question": "What's your favorite season?",
  "options": ["Spring", "Summer", "Fall", "Winter"]
}
```

### 4. `list_polls`
List recent daily polls with their vote counts.

**Parameters:**
- `limit` (number, optional): Number of polls to retrieve (default: 10, max: 50)

### 5. `get_poll_results`
Get detailed results for a specific poll by ID.

**Parameters:**
- `poll_id` (string, required): The UUID of the poll

### 6. `list_poll_suggestions`
List poll suggestions that need review.

**Parameters:**
- `status` (string, optional): Filter by status: pending, approved, or rejected (default: pending)
- `limit` (number, optional): Number of suggestions to retrieve (default: 20)

## Setup

### Prerequisites

- Node.js 18 or higher
- A Supabase project with the polls schema
- Claude Desktop app

### Installation

1. **Install dependencies:**
   ```bash
   cd mcp
   npm install
   ```

2. **Configure environment variables:**
   
   The `.env` file should already exist with your Supabase credentials:
   ```env
   SUPABASE_URL=https://izcfkwvregyollaxltbt.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   USERNAME=szabee13
   DISPLAY_NAME=SzaBee13
   ```

3. **Configure Claude Desktop:**
   
   See [claude-config.md](./claude-config.md) for detailed instructions on configuring Claude Desktop.

   **Quick setup:**
   
   Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows):
   ```json
   {
     "mcpServers": {
       "polls": {
         "command": "node",
         "args": ["D:\\!_WEB\\polls\\mcp\\index.js"]
       }
     }
   }
   ```

4. **Restart Claude Desktop**

## Usage with Claude Desktop

Once configured, you can ask Claude to interact with your polls:

**Creating a poll:**
> "Create a poll asking 'What's your favorite programming language?' with options JavaScript, Python, TypeScript, and Rust"

**Scheduling a poll:**
> "Schedule a poll for March 15, 2026 asking 'What's your favorite season?' with options Spring, Summer, Fall, and Winter"

**Viewing results:**
> "Show me the results of recent polls"

**Checking suggestions:**
> "List all pending poll suggestions"

## Testing

You can test the MCP server manually using the MCP Inspector:

```bash
npm install -g @modelcontextprotocol/inspector
mcp-inspector node index.js
```

This will open a web interface where you can test the tools.

## Permissions & RLS

**Note:** Some operations may require elevated permissions depending on your Row Level Security (RLS) policies:

- `create_poll_suggestion`: Requires authentication (may fail with anon key)
- `create_poll_in_bank`: May require service role key depending on RLS
- `schedule_daily_poll`: May require service role key depending on RLS
- `list_polls`, `get_poll_results`: Should work with anon key
- `list_poll_suggestions`: Depends on RLS policies

If you need to create polls directly (not suggestions), you may need to:
1. Use a service role key instead of the anon key (be careful with security)
2. Adjust your RLS policies to allow anonymous or service role access
3. Implement authentication flow in the MCP server

## Architecture

```
Claude Desktop
    ↓
MCP Server (this project)
    ↓
Supabase API
    ↓
PostgreSQL Database
```

The MCP server acts as a bridge between Claude and your Supabase database, providing a structured interface for poll operations.

## Troubleshooting

**Server not connecting:**
- Check that Node.js is installed: `node --version`
- Verify the path in Claude Desktop config is correct
- Check Claude Desktop logs: Help → View Logs

**Database errors:**
- Verify Supabase credentials in `.env`
- Check RLS policies allow the operations
- Test Supabase connection: `npm start` and check for errors

**Authentication errors:**
- Some operations require authenticated users
- Consider using Supabase service role key for admin operations
- Review RLS policies in `supabase/active/schema.sql`

## Security Notes

- The `.env` file contains sensitive credentials - never commit it to public repositories
- The MCP server runs locally on your machine
- Consider using service role key only in local development
- For production use, implement proper authentication

## Development

The server is built using:
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP protocol implementation
- [@supabase/supabase-js](https://github.com/supabase/supabase-js) - Supabase client
- dotenv - Environment variable management

To modify the tools, edit `index.js` and restart Claude Desktop.

## License

Same as the parent project.
