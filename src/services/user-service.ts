import { GongApiClient } from '../api/client.js';
import { GongUser, SpeakerMap } from '../models/types.js';

export class UserService {
  private apiClient: GongApiClient;
  private userCache: Map<string, GongUser> = new Map();
  private lastCacheUpdate: number = 0;
  private cacheExpiryMs: number = 1000 * 60 * 60; // 1 hour

  constructor(apiClient: GongApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Process a user object to standardize format
   */
  private processUser(user: any): GongUser {
    return {
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      emailAddress: user.emailAddress || user.email || '',
      title: user.title || user.role || '',
      active: user.active !== false,
      created: user.created || ''
    };
  }

  /**
   * Get all users with proper pagination
   */
  public async getAllUsers(forceRefresh: boolean = false): Promise<GongUser[]> {
    // Check if we have a valid cache
    const now = Date.now();
    if (!forceRefresh && this.userCache.size > 0 && (now - this.lastCacheUpdate) < this.cacheExpiryMs) {
      console.log(`Using cached users (${this.userCache.size} users)`);
      return Array.from(this.userCache.values());
    }

    console.log('Fetching all users with pagination...');

    // Use the new paginated method
    const rawUsers = await this.apiClient.getAllUsers();

    // Process the users
    const allUsers = rawUsers.map((user: any) => this.processUser(user));

    // Update the cache
    this.userCache.clear();
    allUsers.forEach(user => {
      this.userCache.set(user.id, user);
    });
    this.lastCacheUpdate = now;

    return allUsers;
  }

  /**
   * Find users by name or email
   */
  public async findUsers(name?: string, email?: string, id?: string): Promise<GongUser[]> {
    // Make sure we have users loaded
    const allUsers = await this.getAllUsers();
    
    // If id is provided, look for exact match first
    if (id) {
      const user = this.userCache.get(id);
      if (user) {
        return [user];
      }
    }
    
    // Search by name or email
    const results = allUsers.filter(user => {
      // Check for ID match
      if (id && user.id === id) {
        return true;
      }
      
      // Check for name match
      if (name) {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const searchName = name.toLowerCase();
        if (fullName.includes(searchName)) {
          return true;
        }
        
        // Try partial matching on first or last name
        const nameParts = searchName.split(' ');
        return nameParts.some(part => 
          user.firstName?.toLowerCase().includes(part) || 
          user.lastName?.toLowerCase().includes(part)
        );
      }
      
      // Check for email match
      if (email && user.emailAddress && user.emailAddress.toLowerCase().includes(email.toLowerCase())) {
        return true;
      }
      
      return false;
    });
    
    return results;
  }

  /**
   * Create a speaker map for a call
   */
  public async getSpeakerMap(callId: string, callDetails?: any): Promise<SpeakerMap> {
    console.log(`Creating speaker map for call ${callId}...`);
    
    try {
      // Step 1: Get call details to get participants if not provided
      if (!callDetails) {
        console.log('Fetching call details...');
        const callResponse = await this.apiClient.getCall(callId);
        callDetails = callResponse.call;
      }
      
      // Get participants from call details
      const participants = callDetails?.participants || [];
      console.log(`Found ${participants.length} participants in call details`);
      
      // Step 2: Create initial speaker map from participants
      const speakerMap: SpeakerMap = {};
      participants.forEach((participant: any) => {
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
      
      // Step 3: Fetch transcript to find speaker IDs
      console.log('Fetching transcript to get all speakers...');
      const transcriptResponse = await this.apiClient.getTranscripts([callId]);
      const transcripts = transcriptResponse.transcripts || [];
      
      // Extract all speaker IDs from transcript
      const speakerIds = new Set<string>();
      transcripts.forEach((segment: any) => {
        if (segment.speakerId) {
          speakerIds.add(segment.speakerId);
        }
      });
      console.log(`Found ${speakerIds.size} unique speakers in transcript`);
      
      // Step 4: Fetch all users to enrich speaker map
      console.log('Fetching all users to enrich speaker map...');
      const allUsers = await this.getAllUsers();
      
      // Create user map
      const userMap: SpeakerMap = {};
      allUsers.forEach(user => {
        userMap[user.id] = {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddress || `User ${user.id.substring(0, 4)}`,
          email: user.emailAddress,
          role: user.title,
          company: 'Unknown'
        };
      });
      
      // Step 5: Find speakers that aren't in our speaker map yet
      const missingIds = Array.from(speakerIds).filter(id => !speakerMap[id]);
      if (missingIds.length > 0) {
        console.log(`Looking up ${missingIds.length} missing speakers...`);
        
        // First check our user cache
        missingIds.forEach(id => {
          const user = this.userCache.get(id);
          if (user) {
            speakerMap[id] = {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddress || `User ${user.id.substring(0, 4)}`,
              email: user.emailAddress,
              role: user.title,
              company: 'Unknown'
            };
          } else if (userMap[id]) {
            speakerMap[id] = userMap[id];
          }
        });
      }
      
      // Step 6: Add placeholders for any remaining missing speakers
      Array.from(speakerIds).forEach(id => {
        if (!speakerMap[id]) {
          speakerMap[id] = {
            id,
            name: `Person ${id.substring(0, 4)}`,
            company: 'Unknown'
          };
        }
      });
      
      return speakerMap;
    } catch (error) {
      console.error(`Error creating speaker map:`, error);
      return {};
    }
  }
}