#!/usr/bin/env node
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const GONG_ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const GONG_ACCESS_KEY_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const GONG_BASE_URL = process.env.GONG_BASE_URL || 'https://api.gong.io';

async function generateSignature(method, path, timestamp, body) {
  const data = method.toUpperCase() + '\n' + 
              path + '\n' + 
              timestamp + '\n' + 
              (body ? JSON.stringify(body) : '');
  
  const hmac = crypto.createHmac('sha256', GONG_ACCESS_KEY_SECRET);
  hmac.update(data);
  return hmac.digest('base64');
}

async function testTranscriptAPI() {
  const callId = '910886407874714421';
  const path = '/v2/calls/transcript';
  const timestamp = Date.now().toString();
  
  // Try with just callIds
  const body1 = {
    filter: {
      callIds: [callId]
    }
  };
  
  console.log('Test 1: With just callIds');
  console.log('Request body:', JSON.stringify(body1, null, 2));
  
  try {
    const response1 = await axios({
      method: 'POST',
      url: `${GONG_BASE_URL}${path}`,
      data: body1,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${GONG_ACCESS_KEY}:${GONG_ACCESS_KEY_SECRET}`).toString('base64')}`,
        'X-Gong-AccessKey': GONG_ACCESS_KEY,
        'X-Gong-Timestamp': timestamp,
        'X-Gong-Signature': await generateSignature('POST', path, timestamp, body1)
      }
    });
    
    console.log('Response:', JSON.stringify(response1.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
  
  // Try with date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const body2 = {
    filter: {
      callIds: [callId],
      fromDateTime: '2025-06-01T00:00:00Z',
      toDateTime: '2025-06-11T00:00:00Z'
    }
  };
  
  console.log('\nTest 2: With callIds and date range');
  console.log('Request body:', JSON.stringify(body2, null, 2));
  
  try {
    const timestamp2 = Date.now().toString();
    const response2 = await axios({
      method: 'POST',
      url: `${GONG_BASE_URL}${path}`,
      data: body2,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${GONG_ACCESS_KEY}:${GONG_ACCESS_KEY_SECRET}`).toString('base64')}`,
        'X-Gong-AccessKey': GONG_ACCESS_KEY,
        'X-Gong-Timestamp': timestamp2,
        'X-Gong-Signature': await generateSignature('POST', path, timestamp2, body2)
      }
    });
    
    console.log('Response:', JSON.stringify(response2.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTranscriptAPI();