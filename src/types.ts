export interface ClickEventLog {
  id: string;
  button: 'Left' | 'Right' | 'Middle' | 'Back' | 'Forward' | 'Unknown';
  buttonCode: number;
  timestamp: number;
  interval: number; // ms since previous click of the same button
  isDoubleClickDefect: boolean; // if interval was suspiciously small (e.g., < 80ms)
}

export interface ScrollEventLog {
  timestamp: number;
  direction: 'up' | 'down';
  deltaY: number;
  isJitter: boolean; // if it goes opposite to the dominant direction of recent scrolls
}

export interface PollingStats {
  hz: number;
  avgHz: number;
  maxHz: number;
  minDelay: number;
  maxDelay: number;
  delayHistory: number[];
}

export interface MouseMetadata {
  brand: string;
  model: string;
  expectedPollingRate: string;
  additionalNotes: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
}
