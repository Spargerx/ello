"""WebSocket connection manager for live security event broadcasting."""

import json
import asyncio

from fastapi import WebSocket


class WebSocketManager:
    """Manages WebSocket connections and broadcasts events to all clients."""

    def __init__(self):
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()
        self._sequence = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)

    async def broadcast_event(self, event: dict):
        """Send an event to every connected client. Drop dead connections."""
        async with self._lock:
            self._sequence += 1
            event["sequence"] = self._sequence
            
        message = json.dumps(event, default=str)
        dead: list[WebSocket] = []

        async with self._lock:
            for conn in self._connections:
                try:
                    await conn.send_text(message)
                except Exception:
                    dead.append(conn)
            for conn in dead:
                self._connections.remove(conn)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Singleton
ws_manager = WebSocketManager()
