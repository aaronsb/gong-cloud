import { GongApiClient } from '../api/client.js';
import { UserService } from './user-service.js';
import { TranscriptService } from './transcript-service.js';
import { GongCall, ListCallsParams, GetCallParams } from '../models/types.js';

export class CallService {
  private apiClient: GongApiClient;
  private userService: UserService;
  private transcriptService: TranscriptService;

  constructor(
    apiClient: GongApiClient, 
    userService: UserService,
    transcriptService: TranscriptService
  ) {
    this.apiClient = apiClient;
    this.userService = userService;
    this.transcriptService = transcriptService;
  }

  /**
   * List calls with optional filtering
   */
  public async listCalls(params?: ListCallsParams): Promise<GongCall[]> {
    try {
      // Use the paginated method for calls with the specified parameters
      const calls = await this.apiClient.getAllCalls(params);

      // Format calls for consistency
      return calls.map((call: any) => this.formatCall(call));
    } catch (error) {
      console.error(`Error listing calls: ${error}`);
      throw error;
    }
  }

  /**
   * Get a specific call by ID with optional transcript
   */
  public async getCall(params: GetCallParams): Promise<any> {
    try {
      // Get call details
      const callResponse = await this.apiClient.getCall(params.callId);
      let call = this.formatCall(callResponse.call);
      
      // Get transcript if requested
      let transcript: any = undefined;
      if (params.includeTranscript) {
        try {
          // Try to get the transcript regardless of hasTranscript flag
          transcript = await this.transcriptService.getFormattedTranscript(
            params.callId,
            params.transcriptFormat || 'concise',
            params.maxSegments || 0,
            params.maxSentences || 0
          );
          
          // If we got here, the transcript is available, so update the call object
          call.hasTranscript = true;
          
          // Get participants from transcript if available
          if (typeof transcript === 'object' && transcript) {
            // Try to extract participants from the transcript object
            const transcriptObj = transcript as any;
            if (transcriptObj.call && transcriptObj.call.participants) {
              call.participants = transcriptObj.call.participants;
            }
          }
        } catch (error) {
          console.error('Error getting transcript:', error);
          transcript = undefined; // Don't include transcript if there was an error
        }
      }
      
      // Return call with optional transcript
      return {
        call,
        transcript: params.includeTranscript ? transcript : undefined
      };
    } catch (error) {
      console.error(`Error getting call: ${error}`);
      throw error;
    }
  }

  /**
   * Format a call object for consistency
   */
  private formatCall(call: any): GongCall {
    return {
      id: call.id,
      title: call.title || 'Untitled Call',
      scheduled: call.scheduled,
      started: call.started || call.startTime,
      duration: call.duration,
      direction: call.direction,
      system: call.system,
      scope: call.scope,
      media: call.media,
      language: call.language,
      url: call.url,
      hasTranscript: !!call.transcript,
      participants: call.participants || []
    };
  }
}