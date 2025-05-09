import axios from 'axios';
import * as crypto from 'crypto';
import { TextEncoder } from 'util';

export class GongApiClient {
  private accessKey: string;
  private accessSecret: string;
  private baseUrl: string;

  constructor(accessKey: string, accessSecret: string, baseUrl: string = 'https://api.gong.io') {
    this.accessKey = accessKey;
    this.accessSecret = accessSecret;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate the signature required for Gong API authentication
   */
  private async generateSignature(method: string, path: string, timestamp: string, params?: unknown): Promise<string> {
    const stringToSign = `${method}\n${path}\n${timestamp}\n${params ? JSON.stringify(params) : ''}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.accessSecret);
    const messageData = encoder.encode(stringToSign);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
    
    return Buffer.from(signature).toString('base64');
  }

  /**
   * Make a request to the Gong API
   */
  public async request<T>(method: string, path: string, params?: Record<string, any>, data?: Record<string, any>): Promise<T> {
    const timestamp = new Date().toISOString();
    const url = `${this.baseUrl}${path}`;
    
    try {
      const response = await axios({
        method,
        url,
        params,
        data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.accessKey}:${this.accessSecret}`).toString('base64')}`,
          'X-Gong-AccessKey': this.accessKey,
          'X-Gong-Timestamp': timestamp,
          'X-Gong-Signature': await this.generateSignature(method, path, timestamp, data || params)
        }
      });

      return response.data as T;
    } catch (error: any) {
      console.error(`Error making request to Gong API: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get a specific call by ID
   */
  public async getCall(callId: string): Promise<any> {
    return this.request<any>('GET', `/v2/calls/${callId}`);
  }

  /**
   * List calls with optional filtering
   */
  public async listCalls(params?: Record<string, any>): Promise<any> {
    return this.request<any>('GET', '/v2/calls', params);
  }

  /**
   * Get transcript for specified call IDs
   */
  public async getTranscripts(callIds: string[]): Promise<any> {
    return this.request<any>('POST', '/v2/calls/transcript', undefined, {
      filter: {
        callIds,
        includeEntities: true,
        includeInteractionsSummary: true,
        includeTrackers: true
      }
    });
  }

  /**
   * Get all pages of a paginated resource
   */
  public async getAllPaginated<T>(
    method: string,
    path: string,
    initialParams: Record<string, any> = {},
    cursorKey: string = 'cursor',
    dataKey: string = ''
  ): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | undefined = undefined;
    const limit = initialParams.limit || 100;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}${cursor ? ' with cursor' : ''} from ${path}...`);

      const params: Record<string, any> = { ...initialParams, limit };
      if (cursor) params[cursorKey] = cursor;

      const response = await this.request<any>(method, path, params);

      // Extract the data array based on the provided dataKey
      const dataArray = dataKey ? response[dataKey] || [] : response;

      // Add results to our collection
      results.push(...dataArray);

      // Get the next cursor - try different possible locations
      const records = response.records || response.pagination || {};
      cursor = records[cursorKey] || records.nextPageToken || records.nextCursor || undefined;

      // Add a small delay to avoid rate limiting
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (cursor);

    console.log(`Total items fetched: ${results.length} across ${pageCount} pages from ${path}`);
    return results;
  }

  /**
   * Get users with optional pagination
   */
  public async getUsers(cursor?: string, limit: number = 100): Promise<any> {
    const params: any = { limit };
    if (cursor) params.cursor = cursor;
    return this.request<any>('GET', '/v2/users', params);
  }

  /**
   * Get all users using pagination
   */
  public async getAllUsers(): Promise<any[]> {
    return this.getAllPaginated('GET', '/v2/users', {}, 'cursor', 'users');
  }

  /**
   * Get all calls using pagination
   */
  public async getAllCalls(params: Record<string, any> = {}): Promise<any[]> {
    return this.getAllPaginated('GET', '/v2/calls', params, 'cursor', 'calls');
  }
}