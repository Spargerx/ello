import type { SecurityEvent } from "../types/events";

export type WebSocketStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "ERROR";

type EventCallback = (event: SecurityEvent) => void;
type StatusCallback = (status: WebSocketStatus) => void;

export class SecurityWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onEvent: EventCallback;
  private onStatus: StatusCallback;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: number | null = null;
  
  // Deduplication cache (keeps track of last 100 event IDs)
  private seenEventIds = new Set<string>();
  private seenEventQueue: string[] = [];
  private maxSeenSize = 100;

  constructor(url: string, onEvent: EventCallback, onStatus: StatusCallback) {
    this.url = url;
    this.onEvent = onEvent;
    this.onStatus = onStatus;
  }

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.onStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.onStatus("CONNECTED");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (messageEvent) => {
        try {
          const parsed = JSON.parse(messageEvent.data);
          // Backend sends: { type: "security_event", data: { event_id, action, ... }, sequence }
          let eventPayload = null;
          if (parsed && parsed.type === 'security_event' && parsed.data && parsed.data.event_id && parsed.data.action) {
            eventPayload = parsed.data;
          } else if (parsed && parsed.event_id && parsed.action) {
            // Fallback: flat event format (direct SecurityEvent)
            eventPayload = parsed;
          }
          if (eventPayload) {
            this.handleIncomingEvent(eventPayload as SecurityEvent);
          }
        } catch (e) {
          console.error("Invalid WebSocket message format:", e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.onStatus("DISCONNECTED");
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.onStatus("ERROR");
        // close event will fire next and handle reconnect
      };
    } catch (e) {
      this.onStatus("ERROR");
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onStatus("DISCONNECTED");
  }

  private handleIncomingEvent(event: SecurityEvent) {
    // Deduplication check
    if (this.seenEventIds.has(event.event_id)) {
      return; // Ignore duplicate
    }

    // Add to seen cache
    this.seenEventIds.add(event.event_id);
    this.seenEventQueue.push(event.event_id);

    if (this.seenEventQueue.length > this.maxSeenSize) {
      const oldest = this.seenEventQueue.shift();
      if (oldest) {
        this.seenEventIds.delete(oldest);
      }
    }

    // Notify callback
    this.onEvent(event);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatus("DISCONNECTED");
      return; // Stop trying
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Max 10 seconds
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }
}
