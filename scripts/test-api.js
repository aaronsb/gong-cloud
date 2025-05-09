#!/usr/bin/env node

/**
 * Simple script to test the Gong API connection with provided credentials
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Get credentials from environment variables
const GONG_ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const GONG_ACCESS_KEY_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const GONG_BASE_URL = process.env.GONG_BASE_URL || 'https://api.gong.io';

if (!GONG_ACCESS_KEY || !GONG_ACCESS_KEY_SECRET) {
  console.error('Error: Missing Gong API credentials in .env file');
  console.error('Please set GONG_ACCESS_KEY and GONG_ACCESS_KEY_SECRET');
  process.exit(1);
}

console.log('Testing Gong API connection...');
console.log(`Base URL: ${GONG_BASE_URL}`);

async function testConnection() {
  try {
    // Create auth header
    const auth = Buffer.from(`${GONG_ACCESS_KEY}:${GONG_ACCESS_KEY_SECRET}`).toString('base64');
    
    // Make a request to get recent calls with a small limit
    const response = await axios({
      method: 'GET',
      url: `${GONG_BASE_URL}/v2/calls`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      params: {
        limit: 3 // Just get a few calls to test
      }
    });
    
    console.log('\n✅ API Connection successful!');
    
    // Check if we got any calls
    if (response.data && response.data.calls && response.data.calls.length > 0) {
      console.log(`Found ${response.data.calls.length} calls`);
      
      // Show brief information about the calls
      console.log('\nRecent calls:');
      response.data.calls.forEach((call, index) => {
        console.log(`\n[Call ${index + 1}]`);
        console.log(`- ID: ${call.id}`);
        console.log(`- Title: ${call.title || 'Untitled'}`);
        console.log(`- Date: ${new Date(call.started || call.scheduled || '').toLocaleString()}`);
        console.log(`- Duration: ${call.duration ? Math.floor(call.duration / 60) + 'm ' + (call.duration % 60) + 's' : 'Unknown'}`);
        console.log(`- Has Transcript: ${call.transcript ? 'Yes' : 'No'}`);
        
        // Get participant count
        const participantCount = call.participants ? call.participants.length : 0;
        console.log(`- Participants: ${participantCount}`);
        
        // If we have a transcript, this is a good call ID to use for testing
        if (call.transcript) {
          console.log(`\n⭐ This call has a transcript and can be used for testing transcript features.`);
          console.log(`   Try using this ID with get_call_details: ${call.id}`);
        }
      });
      
      // Provide next steps
      console.log('\n✨ Next steps:');
      console.log('1. Use these calls for testing the MCP server');
      console.log('2. Build and run the MCP server: npm run build && npm run start');
      console.log('3. Configure Claude to use the MCP server');
      
    } else {
      console.log('No calls found in the account. The connection is working, but there are no calls to display.');
    }
    
  } catch (error) {
    console.error('\n❌ Connection failed:');
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx range
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
      
      // Special handling for common errors
      if (error.response.status === 401) {
        console.error('\nAuthentication failed. Please check your API credentials in the .env file.');
      } else if (error.response.status === 403) {
        console.error('\nPermission denied. Your API key may not have the necessary permissions.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from the server. This might indicate network issues or incorrect base URL.');
      console.error(`Attempted to connect to: ${GONG_BASE_URL}`);
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testConnection();