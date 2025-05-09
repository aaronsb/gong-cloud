# Gong Cloud MCP Server - Claude Instructions

## Development Tools

### Gong API Inspector

The Gong API Inspector is a useful tool for exploring and understanding the Gong API. It helps in navigating the API documentation and understanding available endpoints, schemas, and authentication requirements.

**Location**: /home/aaron/Projects/ai/mcp/gong-api-inspector/

**Usage**:
```bash
# Show general API information
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --info

# List all categories/tags
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --list-groups

# Show endpoints in a specific category
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --category Calls

# Show details of a specific endpoint
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --endpoint /v2/calls/transcript

# Show a specific schema
python3 ../gong-api-inspector/inspector.py --spec-file ../gong-api-inspector/gong-openapi.json --schema CallsFilter
```

**Source**: https://github.com/aaronsb/gong-api-inspector

Use this tool whenever you need to understand:
- Available API endpoints
- Request and response schemas
- Authentication requirements
- API limitations and pagination mechanisms

## Project Information

### Core MCP Server Tools

The Gong Cloud MCP server provides the following tools:

1. `list_calls`: Search for calls with optional date range filtering
   - Parameters: fromDateTime, toDateTime, limit
   
2. `get_call_details`: Get detailed information about a specific call with its transcript
   - Parameters: callId, includeTranscript, transcriptFormat, maxSegments, maxSentences
   
3. `find_users`: Search for users by name, email, or ID
   - Parameters: name, email, id

### Key Features

- **Consistent Pagination**: Automatically handles cursor-based pagination for all API endpoints
- **Speaker Resolution**: Automatically resolves speaker IDs to actual names and roles
- **Transcript Formatting**: Formats transcripts for readability with topics and speaker information
- **Error Handling**: Provides clear error messages and robust error handling

### Development Guidelines

- Use the pagination utility for all API requests that return large datasets
- Follow TypeScript types and interfaces for type safety
- Use the proper error handling patterns established in the codebase
- Run tests to verify functionality after making changes