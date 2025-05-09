# Setting Up Gong Cloud MCP Server with Claude and Other LLMs

This guide explains how to set up the Gong Cloud MCP server to work with various LLM interfaces, including Claude Desktop and Claude Code.

## Prerequisites

Before getting started, ensure you have:

- Node.js 18 or higher installed
- npm package manager
- Gong API access credentials (Access Key and Access Key Secret)
- The Gong Cloud MCP server installed and built (see main README.md)

## Setting Up with Claude Desktop

Claude Desktop can connect to the Gong Cloud MCP server to enable searching of Gong calls, retrieving transcripts, and looking up users directly from the Claude interface.

### Step 1: Install and Build the MCP Server

First, ensure you have installed and built the MCP server:

```bash
# Clone the repository
git clone https://github.com/yourusername/gong-cloud.git
cd gong-cloud

# Install dependencies
npm install

# Build the project
npm run build

# Test the connection (optional)
npm run test:connection
```

### Step 2: Configure Claude Desktop

#### Find the Claude Desktop Configuration File

The configuration file location depends on your operating system:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Update the Configuration

Edit the configuration file to add the Gong Cloud MCP server:

```json
{
  "mcpServers": {
    "gong": {
      "command": "node",
      "args": ["/absolute/path/to/gong-cloud/build/src/index.js"],
      "env": {
        "GONG_ACCESS_KEY": "your-access-key",
        "GONG_ACCESS_KEY_SECRET": "your-access-key-secret",
        "GONG_BASE_URL": "https://your-gong-api-url.gong.io"
      },
      "disabled": false,
      "autoApprove": ["list_calls", "find_users", "get_call_details"]
    }
  }
}
```

**Important**: Replace the following placeholders:
- `/absolute/path/to/gong-cloud` with the full path to the MCP server on your machine
- `your-access-key` with your Gong API access key
- `your-access-key-secret` with your Gong API access key secret
- `https://your-gong-api-url.gong.io` with your Gong API base URL

### Step 3: Restart Claude Desktop

After updating the configuration, restart Claude Desktop for the changes to take effect.

## Setting Up with Claude Code CLI

For Claude Code CLI, you can add the MCP server to the CLI configuration.

### Update the Claude Code CLI Configuration

Edit your Claude Code CLI configuration file (usually in `~/.claude/config.json`):

```json
{
  "mcpServers": {
    "gong": {
      "command": "node",
      "args": ["/absolute/path/to/gong-cloud/build/src/index.js"],
      "env": {
        "GONG_ACCESS_KEY": "your-access-key",
        "GONG_ACCESS_KEY_SECRET": "your-access-key-secret",
        "GONG_BASE_URL": "https://your-gong-api-url.gong.io"
      },
      "disabled": false,
      "autoApprove": ["list_calls", "find_users", "get_call_details"]
    }
  }
}
```

## Using the Gong Cloud MCP Tools

Once configured, you can use the following tools within Claude:

### 1. List Calls

Search for Gong calls with optional date range filtering:

```
I'd like to see my Gong calls from the last month.
```

### 2. Get Call Details

Retrieve detailed information about a specific call with its transcript:

```
Can you show me the transcript for call ID 8234378152505885089?
```

### 3. Find Users

Search for users by name, email, or ID:

```
Find the Gong user with name "John Smith"
```

## Troubleshooting

### Common Issues

1. **Connection Failed**:
   - Verify your Gong API credentials in the configuration
   - Check network connectivity to the Gong API server
   - Ensure your Gong API key has appropriate permissions

2. **Permission Denied**:
   - Make sure the MCP server has execution permissions
   - Check if the Node.js executable is in the system PATH

3. **Tool Not Found**:
   - Ensure the MCP server is properly built (`npm run build`)
   - Verify the path to the index.js file is correct in the configuration

### Debug Mode

To enable debug logging, add the DEBUG environment variable in your configuration:

```json
"env": {
  "GONG_ACCESS_KEY": "your-access-key",
  "GONG_ACCESS_KEY_SECRET": "your-access-key-secret",
  "GONG_BASE_URL": "https://your-gong-api-url.gong.io",
  "DEBUG": "gong-cloud:*"
}
```