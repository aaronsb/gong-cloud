# Gong Cloud MCP Server

An MCP (Model Context Protocol) server for interacting with the Gong API. This server enables AI agents to search Gong calls, retrieve transcripts, and find users with optimized token usage and contextual enrichment.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/gong-cloud.git
cd gong-cloud

# Install dependencies
npm install

# Create .env file with your Gong API credentials
echo "GONG_ACCESS_KEY=your_access_key
GONG_ACCESS_KEY_SECRET=your_access_key_secret
GONG_BASE_URL=https://your-domain.api.gong.io" > .env

# Build the project
npm run build

# Test the connection
npm run test:connection

# Start the MCP server
npm run start
```

For connecting to Claude Desktop and other LLMs, see the [LLMs Installation Guide](docs/llms-install.md).

## Features

- **List Calls**: Search for calls with optional date range filtering
- **Get Call Details**: Retrieve detailed information about a specific call with its transcript
- **Find Users**: Search for users by name, email, or ID
- **Speaker Resolution**: Automatically resolves speaker IDs to actual names and roles
- **Transcript Formatting**: Formats transcripts in a readable way with topics and speaker information
- **Pagination Handling**: Automatically handles pagination for large result sets

## Setup

### Prerequisites

- Node.js 18 or higher
- Gong API access credentials

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gong-cloud.git
   cd gong-cloud
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your Gong API credentials:
   ```
   GONG_ACCESS_KEY=your_access_key
   GONG_ACCESS_KEY_SECRET=your_access_key_secret
   GONG_BASE_URL=https://your-domain.api.gong.io
   ```

## Building and Running

### Build the project

```
npm run build
```

### Test API Connection

Before running the server, verify that your API credentials work:

```
npm run test:connection
```

This will list a few recent calls from your Gong account.

### Find a User

You can search for users with:

```
npm run test:find-user -- "User Name"
```

Or by email:

```
npm run test:find-user -- "" "user@example.com"
```

### Get a Specific Call

Once you have a call ID, you can retrieve its details and transcript:

```
npm run test:get-call -- "call_id_here"
```

### Start the MCP Server

```
npm run start
```

## MCP Server Tools

The server provides the following tools:

### `list_calls`

Lists Gong calls with optional date range filtering.

Parameters:
- `fromDateTime` (optional): Start date/time in ISO format (e.g., "2024-03-01T00:00:00Z")
- `toDateTime` (optional): End date/time in ISO format (e.g., "2024-03-31T23:59:59Z")
- `limit` (optional): Maximum number of calls to return

### `get_call_details`

Gets detailed information about a specific call, optionally including its transcript.

Parameters:
- `callId` (required): ID of the call to retrieve
- `includeTranscript` (optional): Whether to include the transcript in the response
- `transcriptFormat` (optional): Format of the transcript ("concise", "full", or "raw")
- `maxSegments` (optional): Maximum number of transcript segments to include (0 for all)
- `maxSentences` (optional): Maximum number of sentences per segment (0 for all)

### `find_users`

Searches for users by name, email, or ID.

Parameters:
- `name` (optional): Name to search for (can be partial)
- `email` (optional): Email to search for (can be partial)
- `id` (optional): Exact user ID to find

## Development

### Running in Development Mode

```
npm run dev
```

This will watch for changes and restart the server automatically.

### Development Tools

#### Gong API Inspector

The project uses a Gong API Inspector tool for exploring and understanding the Gong API specifications. This is particularly useful when implementing new features or debugging issues.

**Location**: ../gong-api-inspector/

**Usage**:
```bash
# Show general API information
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --info

# List all categories/tags
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --list-groups

# Show endpoints in a specific category
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --category Calls
```

**Source**: https://github.com/aaronsb/gong-api-inspector

### Linting

```
npm run lint
```

### Formatting

```
npm run format
```

## Project Structure

- `/src`: Source code
  - `/api`: API client for Gong API
  - `/models`: Data models
  - `/services`: Business logic
  - `/utils`: Utility functions
  - `index.ts`: Main entry point
- `/scripts`: Test scripts
- `/docs`: Documentation
  - `llms-install.md`: Guide for setting up with Claude and other LLMs

## Configuration for Claude Desktop

To use this MCP server with Claude Desktop, add the following to your Claude Desktop configuration file:

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

For more detailed instructions, see the [LLMs Installation Guide](docs/llms-install.md).

## License

This project is licensed under the MIT License.

## Acknowledgements

- [Gong API](https://app.gong.io/settings/api)
- [Model Context Protocol](https://github.com/ModelContextProtocol/mcp)