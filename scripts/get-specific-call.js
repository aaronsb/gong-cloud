#!/usr/bin/env node

/**
 * Script to retrieve details and transcript for a specific call ID
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

// The call ID to retrieve - take from command line or use default
const CALL_ID = process.argv[2];

if (!CALL_ID) {
  console.error('Error: Please provide a call ID');
  console.error('Usage: node get-specific-call.js CALL_ID');
  process.exit(1);
}

if (!GONG_ACCESS_KEY || !GONG_ACCESS_KEY_SECRET) {
  console.error('Error: Missing Gong API credentials in .env file');
  console.error('Please set GONG_ACCESS_KEY and GONG_ACCESS_KEY_SECRET');
  process.exit(1);
}

console.log(`Retrieving details and transcript for call ID: ${CALL_ID}`);
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

// Time formatter function
function formatMilliseconds(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Simplified version of UserService.getAllUsers() with our pagination fix
async function getAllUsers() {
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
  return allUsers;
}

// Get call details and transcript
async function getCallDetails() {
  try {
    // Step 1: Get call details
    console.log('Fetching call details...');
    const callDetails = await gongClient.get(`/v2/calls/${CALL_ID}`);
    const call = callDetails.data.call;
    
    // Print call details
    console.log('\nCall Details:');
    console.log(`- Title: ${call.title || 'Untitled'}`);
    console.log(`- Date: ${new Date(call.startTime || call.scheduled || '').toLocaleString()}`);
    console.log(`- Duration: ${Math.floor((call.duration || 0) / 60)}m ${(call.duration || 0) % 60}s`);
    console.log(`- Has Transcript: ${call.transcript ? 'Yes' : 'No'}`);
    
    // Get participants
    const participants = call.participants || [];
    console.log(`\nParticipants: ${participants.length}`);
    participants.forEach((p, i) => {
      console.log(`[${i+1}] ${p.name || 'Unknown'} (${p.email || 'No email'}) - ${p.role || 'No role'} @ ${p.company || 'No company'}`);
    });
    
    // Step 2: Create speaker map
    console.log('\nCreating speaker map...');
    
    // Create initial speaker map from participants
    const speakerMap = {};
    participants.forEach(participant => {
      if (participant.id) {
        speakerMap[participant.id] = {
          id: participant.id,
          name: participant.name || `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || `Person ${participant.id.substring(0, 4)}`,
          email: participant.email,
          role: participant.role,
          company: participant.company
        };
      }
    });
    
    // Fetch all users to enrich speaker map
    console.log('\nFetching all users to enrich speaker map...');
    const allUsers = await getAllUsers();
    
    // Create user map
    const userMap = {};
    allUsers.forEach(user => {
      userMap[user.id] = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddress || `User ${user.id.substring(0, 4)}`,
        email: user.emailAddress,
        role: user.title,
        company: 'Unknown'
      };
    });
    
    // Merge maps (participant data takes precedence)
    const mergedMap = { ...userMap, ...speakerMap };
    
    // Step 3: Get transcript
    console.log('\nFetching transcript...');
    try {
      const transcriptResponse = await gongClient.post('/v2/calls/transcript', {
        filter: { callIds: [CALL_ID] }
      });
      
      const transcripts = transcriptResponse.data.transcripts || [];
      
      if (transcripts.length > 0) {
        console.log(`Found transcript with ${transcripts.length} segments`);
        
        // Check transcript for any speakers
        const speakerIds = new Set();
        const speakerSegmentCounts = {};
        
        transcripts.forEach(segment => {
          if (segment.speakerId) {
            speakerIds.add(segment.speakerId);
            
            // Count segments per speaker
            if (!speakerSegmentCounts[segment.speakerId]) {
              speakerSegmentCounts[segment.speakerId] = 0;
            }
            speakerSegmentCounts[segment.speakerId]++;
          }
        });
        
        console.log(`\nFound ${speakerIds.size} unique speakers in the transcript:`);
        for (const speakerId of speakerIds) {
          const speaker = mergedMap[speakerId];
          const speakerName = speaker ? speaker.name : `Unknown Speaker (${speakerId.substring(0, 8)})`;
          console.log(`- ${speakerName}: ${speakerSegmentCounts[speakerId] || 0} segments`);
        }
        
        // Format a sample of the transcript
        console.log('\nSample of transcript with resolved speakers:');
        const sampleSegments = transcripts.slice(0, 5);
        sampleSegments.forEach((segment, i) => {
          const speaker = mergedMap[segment.speakerId] || { name: `Unknown (${segment.speakerId.substring(0, 8)})` };
          
          // Show the time of the first sentence
          const time = segment.sentences.length > 0 ? formatMilliseconds(segment.sentences[0].start) : 'N/A';
          
          console.log(`\n[Segment ${i+1}] ${time} | ${speaker.name}:`);
          // Combine all sentences into a paragraph
          const text = segment.sentences.map(s => s.text).join(' ');
          console.log(text);
        });
      } else {
        console.log('No transcript found for this call');
      }
    } catch (error) {
      console.error(`Error fetching transcript for call ${CALL_ID}:`, error.message);
    }
    
    console.log('\n✨ Call retrieval complete');
  } catch (error) {
    console.error('\n❌ Error getting call details:');
    console.error(error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the function
getCallDetails();