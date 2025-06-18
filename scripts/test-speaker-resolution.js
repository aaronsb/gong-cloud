#!/usr/bin/env node
import { GongApiClient } from '../build/src/api/client.js';
import { UserService } from '../build/src/services/user-service.js';
import dotenv from 'dotenv';

dotenv.config();

const GONG_ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const GONG_ACCESS_KEY_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const GONG_BASE_URL = process.env.GONG_BASE_URL || 'https://api.gong.io';

async function testSpeakerResolution() {
  const callId = '910886407874714421';
  
  const apiClient = new GongApiClient(GONG_ACCESS_KEY, GONG_ACCESS_KEY_SECRET, GONG_BASE_URL);
  const userService = new UserService(apiClient);
  
  console.log('Testing speaker resolution for call:', callId);
  console.log('-------------------------------------------');
  
  try {
    // Get call details
    const callResponse = await apiClient.getCall(callId);
    const call = callResponse.call;
    
    console.log('Call Title:', call.title);
    console.log('Participants from call details:', call.participants?.length || 0);
    
    // Get speaker map
    console.log('\nCreating speaker map...');
    const speakerMap = await userService.getSpeakerMap(callId, call);
    
    console.log('\nSpeaker Map:');
    Object.entries(speakerMap).forEach(([id, speaker]) => {
      console.log(`- ${id}: ${speaker.name} (${speaker.company || 'Unknown'}, ${speaker.role || 'Unknown'})`);
    });
    
    // Get transcript to see actual speaker IDs
    console.log('\nFetching transcript...');
    const transcriptResponse = await apiClient.getTranscripts([callId]);
    let transcripts = [];
    if (transcriptResponse.callTranscripts && transcriptResponse.callTranscripts.length > 0) {
      transcripts = transcriptResponse.callTranscripts[0].transcript || [];
    }
    
    // Get unique speaker IDs from transcript
    const speakerIds = new Set();
    transcripts.forEach(segment => {
      if (segment.speakerId) {
        speakerIds.add(segment.speakerId);
      }
    });
    
    console.log('\nSpeaker IDs found in transcript:');
    Array.from(speakerIds).forEach(id => {
      const speaker = speakerMap[id];
      if (speaker) {
        console.log(`- ${id}: Resolved to "${speaker.name}"`);
      } else {
        console.log(`- ${id}: NOT RESOLVED`);
      }
    });
    
    // Show first few transcript segments with resolved names
    console.log('\nFirst 3 transcript segments with resolved speakers:');
    transcripts.slice(0, 3).forEach((segment, i) => {
      const speaker = speakerMap[segment.speakerId];
      console.log(`\nSegment ${i + 1}:`);
      console.log(`- Speaker ID: ${segment.speakerId}`);
      console.log(`- Resolved Name: ${speaker ? speaker.name : 'NOT RESOLVED'}`);
      console.log(`- Text: "${segment.sentences[0]?.text || 'No text'}"`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSpeakerResolution();