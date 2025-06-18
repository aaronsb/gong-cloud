import { GongApiClient } from '../api/client.js';
import { UserService } from './user-service.js';
import { 
  FormattedTranscript,
  GongTranscriptSegment, 
  SpeakerMap
} from '../models/types.js';

export class TranscriptService {
  private apiClient: GongApiClient;
  private userService: UserService;

  constructor(apiClient: GongApiClient, userService: UserService) {
    this.apiClient = apiClient;
    this.userService = userService;
  }

  /**
   * Format milliseconds to human-readable time
   */
  private formatMilliseconds(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Process a transcript segment to standardize format
   */
  private processSegment(segment: any, speakerMap: SpeakerMap): any {
    const speaker = speakerMap[segment.speakerId] || {
      id: segment.speakerId,
      name: `Speaker ${segment.speakerId.substring(0, 8)}`,
      company: 'Unknown',
      role: 'Unknown'
    };

    return {
      speakerId: segment.speakerId,
      speaker: {
        name: speaker.name,
        company: speaker.company,
        role: speaker.role
      },
      topic: segment.topic || '',
      sentences: segment.sentences.map((s: any) => ({
        start: s.start,
        text: s.text,
        timestamp: this.formatMilliseconds(s.start)
      }))
    };
  }

  /**
   * Get raw transcript data for a call
   */
  public async getRawTranscript(callId: string): Promise<any> {
    try {
      const response = await this.apiClient.getTranscripts([callId]);
      // The API returns callTranscripts array with transcript data
      if (response.callTranscripts && response.callTranscripts.length > 0) {
        return response.callTranscripts[0].transcript || [];
      }
      return [];
    } catch (error) {
      console.error(`Error getting raw transcript: ${error}`);
      throw error;
    }
  }

  /**
   * Get a formatted transcript for a call
   */
  public async getFormattedTranscript(
    callId: string, 
    format: 'concise' | 'full' | 'raw' = 'concise',
    maxSegments: number = 0,
    maxSentences: number = 0
  ): Promise<FormattedTranscript | any> {
    try {
      // Get call details
      const callResponse = await this.apiClient.getCall(callId);
      const call = callResponse.call;
      
      // Get transcript
      const transcriptResponse = await this.apiClient.getTranscripts([callId]);
      // The API returns callTranscripts array with transcript data
      let transcripts = [];
      if (transcriptResponse.callTranscripts && transcriptResponse.callTranscripts.length > 0) {
        transcripts = transcriptResponse.callTranscripts[0].transcript || [];
      }
      
      // Get speaker map
      const speakerMap = await this.userService.getSpeakerMap(callId, call);
      
      // If raw format is requested, return the processed data directly
      if (format === 'raw') {
        return {
          call: {
            id: call.id,
            title: call.title,
            date: new Date(call.startTime || call.scheduled || '').toISOString(),
            duration: this.formatMilliseconds(call.duration * 1000)
          },
          transcript: transcripts.map((segment: any) => this.processSegment(segment, speakerMap))
        };
      }
      
      // Create the formatted transcript
      const formattedTranscript: FormattedTranscript = {
        call: {
          id: call.id,
          title: call.title,
          date: new Date(call.startTime || call.scheduled || '').toISOString().split('T')[0],
          duration: call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : undefined,
          participants: call.participants?.map((p: any) => ({
            name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
            company: p.company || 'Unknown',
            role: p.role || 'Unknown'
          }))
        },
        sections: []
      };
      
      // Process transcript segments
      let segments = transcripts;
      
      // Apply limits if specified
      if (maxSegments > 0 && segments.length > maxSegments) {
        segments = segments.slice(0, maxSegments);
      }
      
      // Group by topic
      const topicGroups: { [key: string]: any[] } = {};
      
      segments.forEach((segment: any) => {
        const topic = segment.topic || 'Untitled Topic';
        if (!topicGroups[topic]) {
          topicGroups[topic] = [];
        }
        topicGroups[topic].push(segment);
      });
      
      // Create sections for each topic
      Object.entries(topicGroups).forEach(([topic, topicSegments]) => {
        // Get time range for this topic
        const firstStart = Math.min(...topicSegments.flatMap((s: any) => 
          s.sentences.map((sen: any) => sen.start)
        ));
        const lastStart = Math.max(...topicSegments.flatMap((s: any) => 
          s.sentences.map((sen: any) => sen.start)
        ));
        
        const timeRange = `${this.formatMilliseconds(firstStart)} - ${this.formatMilliseconds(lastStart)}`;
        
        // Group exchanges by speaker
        const section = {
          topic,
          timeRange,
          exchanges: [] as any[]
        };
        
        // Process segments into exchanges
        topicSegments.forEach((segment: any) => {
          const processedSegment = this.processSegment(segment, speakerMap);
          const speaker = processedSegment.speaker;
          
          // Apply sentence limit if specified
          let sentences = processedSegment.sentences;
          if (maxSentences > 0 && sentences.length > maxSentences) {
            sentences = sentences.slice(0, maxSentences);
          }
          
          // Create a single exchange with all sentences from this speaker
          const exchange = {
            speaker,
            text: sentences.map((s: any) => s.text).join(' '),
            timestamp: sentences.length > 0 ? sentences[0].timestamp : undefined
          };
          
          section.exchanges.push(exchange);
        });
        
        formattedTranscript.sections.push(section);
      });
      
      // Sort sections by time
      formattedTranscript.sections.sort((a, b) => {
        const aStart = a.timeRange?.split(' - ')[0] || '';
        const bStart = b.timeRange?.split(' - ')[0] || '';
        return aStart.localeCompare(bStart);
      });
      
      return formattedTranscript;
    } catch (error) {
      console.error(`Error getting formatted transcript: ${error}`);
      throw error;
    }
  }
}