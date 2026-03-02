# Claude Desktop Configuration for Polls MCP Server

Add this configuration to your Claude Desktop config file:

## Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

## macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Configuration

```json
{
  "mcpServers": {
    "polls": {
      "command": "node",
      "args": ["D:\\!_WEB\\polls\\mcp\\index.js"],
      "env": {
        "SUPABASE_URL": "https://izcfkwvregyollaxltbt.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Y2Zrd3ZyZWd5b2xsYXhsdGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODg5MTgsImV4cCI6MjA4NTc2NDkxOH0.FKEPBlva61G1s8eeWv8wIjG8qozIgB4wxhQf6P-wNG0",
        "USERNAME": "szabee13",
        "DISPLAY_NAME": "SzaBee13"
      }
    }
  }
}
```

**Important:** 
- Update the `args` path to match your actual project location
- On macOS/Linux, use forward slashes: `/Users/yourname/polls/mcp/index.js`
- Make sure Node.js 18+ is installed and available in your PATH

## After Setup

1. Save the config file
2. Restart Claude Desktop
3. Look for the 🔌 icon in Claude Desktop to confirm the MCP server is connected
4. You can now ask Claude to create polls!

## Example Usage

Once configured, you can ask Claude things like:
- "Create a poll asking 'What's your favorite programming language?' with options: JavaScript, Python, TypeScript, Rust"
- "Schedule a poll for tomorrow asking about favorite pizza toppings"
- "Show me the results of recent polls"
- "List all pending poll suggestions"
