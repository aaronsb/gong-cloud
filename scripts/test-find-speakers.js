#!/usr/bin/env node
import { GongApiClient } from '../build/src/api/client.js';
import { UserService } from '../build/src/services/user-service.js';
import dotenv from 'dotenv';

dotenv.config();

const GONG_ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const GONG_ACCESS_KEY_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const GONG_BASE_URL = process.env.GONG_BASE_URL || 'https://api.gong.io';

async function testFindSpeakers() {
  const apiClient = new GongApiClient(GONG_ACCESS_KEY, GONG_ACCESS_KEY_SECRET, GONG_BASE_URL);
  const userService = new UserService(apiClient);
  
  console.log('Searching for speakers by name...');
  console.log('-------------------------------------------');
  
  try {
    // Search for Donald
    console.log('\nSearching for "Donald":');
    const donalds = await userService.findUsers('Donald');
    console.log(`Found ${donalds.length} users matching "Donald"`);
    donalds.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.emailAddress}`);
      console.log(`  Title: ${user.title || 'N/A'}`);
    });
    
    // Search for Jose
    console.log('\nSearching for "Jose":');
    const joses = await userService.findUsers('Jose');
    console.log(`Found ${joses.length} users matching "Jose"`);
    joses.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.emailAddress}`);
      console.log(`  Title: ${user.title || 'N/A'}`);
    });
    
    // Search for Jose Arreguin specifically
    console.log('\nSearching for "Jose Arreguin":');
    const joseArreguin = await userService.findUsers('Jose Arreguin');
    console.log(`Found ${joseArreguin.length} users matching "Jose Arreguin"`);
    joseArreguin.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.emailAddress}`);
      console.log(`  Title: ${user.title || 'N/A'}`);
    });
    
    // Check if the speaker IDs exist as users
    console.log('\nChecking if speaker IDs exist as users:');
    const speakerId1 = '6937571049148752173';
    const speakerId2 = '6454002139360035438';
    
    const user1 = await userService.findUsers(undefined, undefined, speakerId1);
    console.log(`Speaker ID ${speakerId1}: ${user1.length > 0 ? 'Found' : 'Not found'}`);
    
    const user2 = await userService.findUsers(undefined, undefined, speakerId2);
    console.log(`Speaker ID ${speakerId2}: ${user2.length > 0 ? 'Found' : 'Not found'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testFindSpeakers();