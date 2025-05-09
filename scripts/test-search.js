#!/usr/bin/env node

/**
 * Script to test the search functionality using the same code as the MCP server
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import the same services used by the MCP server
import { GongApiClient } from '../build/src/api/client.js';
import { UserService } from '../build/src/services/user-service.js';
import { CallService } from '../build/src/services/call-service.js';
import { TranscriptService } from '../build/src/services/transcript-service.js';

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

// Create the same API client and services used by the MCP server
const apiClient = new GongApiClient(GONG_ACCESS_KEY, GONG_ACCESS_KEY_SECRET, GONG_BASE_URL);

// Patch the getAllPaginated method to limit pages for testing
const originalGetAllPaginated = apiClient.getAllPaginated;
apiClient.getAllPaginated = async function(method, path, initialParams = {}, cursorKey = 'cursor', dataKey = '') {
  console.log(`Using limited getAllPaginated (max 1 page) for ${path}`);
  const results = [];
  let cursor = undefined;
  const limit = initialParams.limit || 100;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`Fetching page ${pageCount}${cursor ? ' with cursor' : ''} from ${path}...`);

    const params = { ...initialParams, limit };
    if (cursor) params[cursorKey] = cursor;

    const response = await this.request(method, path, params);

    // Extract the data array based on the provided dataKey
    const dataArray = dataKey ? response[dataKey] || [] : response;

    // Add results to our collection
    results.push(...dataArray);

    // For testing purposes, only fetch 1 page
    break;

  } while (cursor);

  console.log(`Total items fetched: ${results.length} (limited to 1 page for testing) from ${path}`);
  return results;
};

const userService = new UserService(apiClient);
const transcriptService = new TranscriptService(apiClient, userService);
const callService = new CallService(apiClient, userService, transcriptService);

/**
 * Test finding users by name, email, or ID
 */
async function testFindUsers() {
  console.log('\n=== Testing Find Users ===');
  try {
    // Test finding by name
    console.log('\n1. Finding users by name: "Aaron"');
    const nameResults = await userService.findUsers('Aaron');
    console.log(`Found ${nameResults.length} users matching name "Aaron"`);
    
    if (nameResults.length > 0) {
      console.log('\nResults:');
      nameResults.forEach((user, i) => {
        console.log(`\n[User ${i + 1}]`);
        console.log(`- ID: ${user.id}`);
        console.log(`- Name: ${user.firstName} ${user.lastName}`);
        console.log(`- Email: ${user.emailAddress || 'N/A'}`);
        console.log(`- Title: ${user.title || 'N/A'}`);
      });
    }
    
    // Test finding by partial name
    console.log('\n2. Finding users by partial name: "Bockelie"');
    const partialNameResults = await userService.findUsers('Bockelie');
    console.log(`Found ${partialNameResults.length} users matching partial name "Bockelie"`);
    
    if (partialNameResults.length > 0) {
      console.log('\nResults:');
      partialNameResults.forEach((user, i) => {
        console.log(`\n[User ${i + 1}]`);
        console.log(`- ID: ${user.id}`);
        console.log(`- Name: ${user.firstName} ${user.lastName}`);
        console.log(`- Email: ${user.emailAddress || 'N/A'}`);
        console.log(`- Title: ${user.title || 'N/A'}`);
      });
    }
    
    // Test finding by email domain
    console.log('\n3. Finding users by email domain: "@cprime.com"');
    const emailResults = await userService.findUsers(undefined, '@cprime.com');
    console.log(`Found ${emailResults.length} users with email containing "@cprime.com"`);
    
    if (emailResults.length > 0) {
      console.log('\nSample of results (first 5):');
      emailResults.slice(0, 5).forEach((user, i) => {
        console.log(`\n[User ${i + 1}]`);
        console.log(`- ID: ${user.id}`);
        console.log(`- Name: ${user.firstName} ${user.lastName}`);
        console.log(`- Email: ${user.emailAddress || 'N/A'}`);
        console.log(`- Title: ${user.title || 'N/A'}`);
      });
    }
    
    // If we found Aaron Bockelie earlier, test finding by ID
    if (partialNameResults.length > 0) {
      const userId = partialNameResults[0].id;
      console.log(`\n4. Finding user by ID: "${userId}"`);
      const idResults = await userService.findUsers(undefined, undefined, userId);
      console.log(`Found ${idResults.length} users with ID "${userId}"`);
      
      if (idResults.length > 0) {
        console.log('\nResults:');
        idResults.forEach((user, i) => {
          console.log(`\n[User ${i + 1}]`);
          console.log(`- ID: ${user.id}`);
          console.log(`- Name: ${user.firstName} ${user.lastName}`);
          console.log(`- Email: ${user.emailAddress || 'N/A'}`);
          console.log(`- Title: ${user.title || 'N/A'}`);
        });
      }
    }
  } catch (error) {
    console.error('Error testing find users:', error);
  }
}

/**
 * Test listing calls with filters
 */
async function testListCalls() {
  console.log('\n=== Testing List Calls ===');
  try {
    // Test listing recent calls (limit 10)
    console.log('\n1. Listing recent calls (limit 10)');
    const recentCalls = await callService.listCalls({ limit: 10 });
    console.log(`Found ${recentCalls.length} recent calls`);
    
    if (recentCalls.length > 0) {
      console.log('\nResults:');
      recentCalls.forEach((call, i) => {
        console.log(`\n[Call ${i + 1}]`);
        console.log(`- ID: ${call.id}`);
        console.log(`- Title: ${call.title || 'Untitled'}`);
        console.log(`- Date: ${new Date(call.started || call.scheduled || '').toLocaleString()}`);
        console.log(`- Duration: ${call.duration ? Math.floor(call.duration / 60) + 'm ' + (call.duration % 60) + 's' : 'Unknown'}`);
      });
    }
    
    // Test listing calls with date filters
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const fromDate = lastYear.toISOString();
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const toDate = sixMonthsAgo.toISOString();
    
    console.log(`\n2. Listing calls from ${fromDate} to ${toDate} (limit 5)`);
    const dateFilteredCalls = await callService.listCalls({
      fromDateTime: fromDate,
      toDateTime: toDate,
      limit: 5
    });
    console.log(`Found ${dateFilteredCalls.length} calls in date range`);
    
    if (dateFilteredCalls.length > 0) {
      console.log('\nResults:');
      dateFilteredCalls.forEach((call, i) => {
        console.log(`\n[Call ${i + 1}]`);
        console.log(`- ID: ${call.id}`);
        console.log(`- Title: ${call.title || 'Untitled'}`);
        console.log(`- Date: ${new Date(call.started || call.scheduled || '').toLocaleString()}`);
        console.log(`- Duration: ${call.duration ? Math.floor(call.duration / 60) + 'm ' + (call.duration % 60) + 's' : 'Unknown'}`);
      });
    }
  } catch (error) {
    console.error('Error testing list calls:', error);
  }
}

/**
 * Test getting call details with transcript
 */
async function testGetCallDetails() {
  console.log('\n=== Testing Get Call Details ===');
  try {
    // First, get a call ID from a recent call
    console.log('\nGetting a call ID from recent calls...');
    const recentCalls = await callService.listCalls({ limit: 1 });
    
    if (recentCalls.length === 0) {
      console.log('No calls found to test call details');
      return;
    }
    
    const callId = recentCalls[0].id;
    console.log(`Using call ID: ${callId}`);
    
    // Test getting call details without transcript
    console.log('\n1. Getting call details without transcript');
    const callDetails = await callService.getCall({ callId });
    console.log(`Retrieved details for call "${callDetails.call.title || 'Untitled'}"`);
    
    console.log('\nCall details:');
    console.log(`- ID: ${callDetails.call.id}`);
    console.log(`- Title: ${callDetails.call.title || 'Untitled'}`);
    console.log(`- Date: ${new Date(callDetails.call.started || callDetails.call.scheduled || '').toLocaleString()}`);
    console.log(`- Duration: ${callDetails.call.duration ? Math.floor(callDetails.call.duration / 60) + 'm ' + (callDetails.call.duration % 60) + 's' : 'Unknown'}`);
    console.log(`- Has Transcript: ${callDetails.call.hasTranscript ? 'Yes' : 'No'}`);
    
    // Test getting call details with transcript if available
    if (callDetails.call.hasTranscript) {
      console.log('\n2. Getting call details with transcript');
      const callWithTranscript = await callService.getCall({
        callId,
        includeTranscript: true,
        transcriptFormat: 'concise'
      });
      
      console.log('\nTranscript available:');
      console.log(`- Format: ${callWithTranscript.transcript ? 'Concise' : 'None'}`);
      
      if (callWithTranscript.transcript && callWithTranscript.transcript.sections) {
        console.log(`- Sections: ${callWithTranscript.transcript.sections.length}`);
        
        // Show a sample of the transcript
        if (callWithTranscript.transcript.sections.length > 0) {
          const firstSection = callWithTranscript.transcript.sections[0];
          console.log('\nSample of transcript:');
          console.log(`Topic: ${firstSection.topic || 'None'}`);
          console.log(`Time Range: ${firstSection.timeRange || 'Unknown'}`);
          
          if (firstSection.exchanges && firstSection.exchanges.length > 0) {
            const firstExchange = firstSection.exchanges[0];
            console.log(`Speaker: ${firstExchange.speaker.name}`);
            console.log(`Text: ${firstExchange.text.substring(0, 150)}${firstExchange.text.length > 150 ? '...' : ''}`);
          }
        }
      }
    } else {
      console.log('\nNo transcript available for this call');
    }
  } catch (error) {
    console.error('Error testing get call details:', error);
  }
}

// Run all the tests
async function runTests() {
  try {
    console.log('Testing search functionality using MCP server code...');
    console.log(`API URL: ${GONG_BASE_URL}`);
    
    await testFindUsers();
    await testListCalls();
    await testGetCallDetails();
    
    console.log('\n✅ Search tests completed successfully');
  } catch (error) {
    console.error('\n❌ Error during tests:', error);
  }
}

runTests();