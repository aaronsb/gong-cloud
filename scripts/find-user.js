#!/usr/bin/env node

/**
 * Script to find a specific user by name or email in the Gong API
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

// The name we are searching for - take from command line or use default
const searchName = process.argv[2] || '';
const searchEmail = process.argv[3] || '';

if (!searchName && !searchEmail) {
  console.error('Error: Please provide a name or email to search for');
  console.error('Usage: node find-user.js "User Name" [email@example.com]');
  process.exit(1);
}

console.log(`Searching for user: ${searchName}${searchEmail ? ` (${searchEmail})` : ''}`);
console.log(`Base URL: ${GONG_BASE_URL}`);

// Create an axios instance with authentication
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

async function findUser() {
  try {
    console.log('\n[1] Getting all users and searching...');
    
    // Get a list of all users with pagination
    const allUsers = [];
    let cursor = undefined;
    const limit = 100;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`Fetching users page ${pageCount}${cursor ? ' with cursor' : ''}...`);

      const params = { limit };
      if (cursor) params.cursor = cursor;

      const response = await gongClient.get('/v2/users', { params });
      const usersInPage = response.data.users || [];
      console.log(`Found ${usersInPage.length} users on this page`);

      allUsers.push(...usersInPage);
      cursor = response.data.records?.cursor;

      // Add a small delay to avoid rate limiting
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor);

    console.log(`Total users fetched: ${allUsers.length} across ${pageCount} pages`);

    const users = allUsers;

    if (users.length === 0) {
      console.log('No users found');
      return;
    }
    
    // Search for the user by name (first and last name)
    if (searchName) {
      console.log(`\n[2] Searching for user with name containing "${searchName}"...`);
      
      const nameMatches = users.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        return fullName.includes(searchName.toLowerCase());
      });
      
      console.log(`Found ${nameMatches.length} users matching the name criteria`);
      
      if (nameMatches.length > 0) {
        console.log('\nName matches:');
        nameMatches.forEach((user, index) => {
          console.log(`\n[User ${index + 1}]`);
          console.log(`- ID: ${user.id}`);
          console.log(`- Name: ${user.firstName} ${user.lastName}`);
          console.log(`- Email: ${user.emailAddress}`);
          console.log(`- Title: ${user.title || 'N/A'}`);
          console.log(`- Active: ${user.active}`);
          console.log(`- Created: ${user.created}`);
        });
      }
    }
    
    // If an email was provided, also search by email
    if (searchEmail) {
      console.log(`\n[3] Searching for user with email containing "${searchEmail}"...`);
      
      const emailMatches = users.filter(user => {
        return user.emailAddress && user.emailAddress.toLowerCase().includes(searchEmail.toLowerCase());
      });
      
      console.log(`Found ${emailMatches.length} users matching the email criteria`);
      
      if (emailMatches.length > 0) {
        console.log('\nEmail matches:');
        emailMatches.forEach((user, index) => {
          console.log(`\n[User ${index + 1}]`);
          console.log(`- ID: ${user.id}`);
          console.log(`- Name: ${user.firstName} ${user.lastName}`);
          console.log(`- Email: ${user.emailAddress}`);
          console.log(`- Title: ${user.title || 'N/A'}`);
          console.log(`- Active: ${user.active}`);
          console.log(`- Created: ${user.created}`);
        });
      }
    }
    
    // If no matches by name or email, try using partial name matching
    if (searchName && !searchEmail) {
      const nameMatches = users.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        return fullName.includes(searchName.toLowerCase());
      });

      if (nameMatches.length === 0) {
        console.log('\n[4] No exact matches found. Trying partial name matching...');
        
        // Split the search name into parts
        const nameParts = searchName.toLowerCase().split(' ');
        
        const partialMatches = users.filter(user => {
          const firstName = (user.firstName || '').toLowerCase();
          const lastName = (user.lastName || '').toLowerCase();
          
          // Check if any part of the search name matches either first or last name
          return nameParts.some(part => 
            firstName.includes(part) || lastName.includes(part)
          );
        });
        
        console.log(`Found ${partialMatches.length} users with partial name matches`);
        
        if (partialMatches.length > 0) {
          console.log('\nPartial matches:');
          partialMatches.forEach((user, index) => {
            console.log(`\n[User ${index + 1}]`);
            console.log(`- ID: ${user.id}`);
            console.log(`- Name: ${user.firstName} ${user.lastName}`);
            console.log(`- Email: ${user.emailAddress}`);
            console.log(`- Title: ${user.title || 'N/A'}`);
            console.log(`- Active: ${user.active}`);
            console.log(`- Created: ${user.created}`);
          });
        }
      }
    }
    
    console.log('\n✨ Search complete.');
    
  } catch (error) {
    console.error('\n❌ Search failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the search
findUser();