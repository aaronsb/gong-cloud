// Types for Gong API responses and entities

export interface GongCall {
  id: string;
  title?: string;
  scheduled?: string;
  started?: string;
  duration?: number;
  direction?: string;
  system?: string;
  scope?: string;
  media?: string;
  language?: string;
  url?: string;
  hasTranscript?: boolean;
  participants?: GongParticipant[];
}

export interface GongParticipant {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  company?: string;
}

export interface GongUser {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  title?: string;
  active?: boolean;
  created?: string;
}

export interface GongTranscriptSegment {
  speakerId: string;
  topic?: string;
  sentences: Array<{
    start: number;
    text: string;
  }>;
}

export interface GongSpeaker {
  id: string;
  name: string;
  email?: string;
  role?: string;
  company?: string;
}

export interface SpeakerMap {
  [speakerId: string]: GongSpeaker;
}

export interface FormattedTranscript {
  call: {
    id: string;
    title?: string;
    date?: string;
    duration?: string;
    participants?: Array<{
      name: string;
      company?: string;
      role?: string;
    }>;
  };
  sections: Array<{
    topic?: string;
    timeRange?: string;
    exchanges: Array<{
      speaker: {
        name: string;
        company?: string;
        role?: string;
      };
      text: string;
      timestamp?: string;
    }>;
  }>;
}

export interface ListCallsParams {
  fromDateTime?: string;
  toDateTime?: string;
  limit?: number;
}

export interface GetCallParams {
  callId: string;
  includeTranscript?: boolean;
  transcriptFormat?: 'concise' | 'full' | 'raw';
  maxSegments?: number;
  maxSentences?: number;
}

export interface FindUserParams {
  name?: string;
  email?: string;
  id?: string;
}