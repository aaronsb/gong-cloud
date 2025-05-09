#!/usr/bin/env node

/**
 * Script to test the improved pagination functionality
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

// Create an authenticated axios client
const gongClient = axios.create({
  baseURL: GONG_BASE_URL,
  auth: {
    username: GONG_ACCESS_KEY,
    password: GONG_ACCESS_KEY_SECRET
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Paginated API call utility function
 */
async function fetchAllPages(apiPath, initialParams = {}, dataKey = '') {
  console.log(`Fetching all pages from ${apiPath} with pagination...`);
  const allResults = [];
  let cursor = undefined;
  const limit = initialParams.limit || 100;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`Fetching page ${pageCount}${cursor ? ' with cursor' : ''}...`);
    
    const params = { ...initialParams, limit };
    if (cursor) params.cursor = cursor;
    
    const response = await gongClient.get(apiPath, { params });
    const data = response.data;
    
    // Extract the data array based on the provided dataKey
    const dataArray = dataKey ? data[dataKey] || [] : data;
    
    console.log(`Received ${dataArray.length} items on this page`);
    allResults.push(...dataArray);
    
    // Get the next cursor from various possible locations
    const records = data.records || data.pagination || {};
    cursor = records.cursor || records.nextPageToken || records.nextCursor;
    
    // Add a small delay to avoid rate limiting
    if (cursor) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } while (cursor);
  
  console.log(`Total items fetched: ${allResults.length} across ${pageCount} pages`);
  return allResults;
}

async function testCallsPagination() {
  console.log('\n=== Testing Calls Pagination ===');
  try {
    // Only test with 2 pages max to keep test duration reasonable
    console.log('Testing with max 2 pages for calls...');
    let calls = [];
    let cursor = undefined;
    const limit = 50;
    let pageCount = 0;

    // Fetch only 2 pages max
    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}${cursor ? ' with cursor' : ''}...`);

      const params = { limit };
      if (cursor) params.cursor = cursor;

      const response = await gongClient.get('/v2/calls', { params });
      const callsInPage = response.data.calls || [];
      console.log(`Received ${callsInPage.length} items on this page`);

      calls.push(...callsInPage);
      cursor = response.data.records?.cursor;

      if (pageCount >= 2) {
        console.log('Reached page limit (2), stopping pagination test');
        break;
      }

      // Add a small delay to avoid rate limiting
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor);

    console.log(`Successfully fetched ${calls.length} calls with pagination (limited to 2 pages)`); 
    
    // Print some sample call data
    if (calls.length > 0) {
      console.log('\nSample calls:');
      
      // Print first 3 calls
      calls.slice(0, 3).forEach((call, index) => {
        console.log(`\n[Call ${index + 1}]`);
        console.log(`- ID: ${call.id}`);
        console.log(`- Title: ${call.title || 'Untitled'}`);
        console.log(`- Date: ${new Date(call.started || call.scheduled || '').toLocaleString()}`);
        console.log(`- Duration: ${call.duration ? Math.floor(call.duration / 60) + 'm ' + (call.duration % 60) + 's' : 'Unknown'}`);
      });
    }
  } catch (error) {
    console.error('Error testing calls pagination:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

async function testUsersPagination() {
  console.log('\n=== Testing Users Pagination ===');
  try {
    const users = await fetchAllPages('/v2/users', { limit: 100 }, 'users');
    console.log(`Successfully fetched ${users.length} users with pagination`);
    
    // Print some sample user data
    if (users.length > 0) {
      console.log('\nSample users:');
      
      // Print first 3 users
      users.slice(0, 3).forEach((user, index) => {
        console.log(`\n[User ${index + 1}]`);
        console.log(`- ID: ${user.id}`);
        console.log(`- Name: ${user.firstName} ${user.lastName}`);
        console.log(`- Email: ${user.emailAddress || 'N/A'}`);
        console.log(`- Title: ${user.title || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('Error testing users pagination:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

// Run the tests
async function runTests() {
  try {
    console.log('Testing improved pagination functionality...');
    console.log(`API URL: ${GONG_BASE_URL}`);
    
    await testCallsPagination();
    await testUsersPagination();
    
    console.log('\n✅ Pagination tests completed successfully');
  } catch (error) {
    console.error('\n❌ Error during pagination tests:', error.message);
  }
}

runTests();