import asyncio
import websockets

class WebSocketServer:
    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.connected_clients = set()
        self.on_message_callback = None

    async def broadcast(self, message):
        if self.connected_clients:
            await asyncio.gather(*[client.send(message) for client in self.connected_clients])

    async def handler(self, websocket):
        self.connected_clients.add(websocket)
        print(f"Cliente conectado. Clientes totales: {len(self.connected_clients)}")
        try:
            async for message in websocket:
                if self.on_message_callback:
                    await self.on_message_callback(message)
        except websockets.exceptions.ConnectionClosed:
            print("Cliente desconectado.")
        finally:
            self.connected_clients.remove(websocket)
            print(f"Cliente desconectado. Clientes restantes: {len(self.connected_clients)}")

    def on_message(self, callback):
        self.on_message_callback = callback
    
    async def start(self):
        print(f"Servidor WebSocket iniciado en ws://{self.host}:{self.port}")
        async with websockets.serve(self.handler, self.host, self.port):
            await asyncio.Future()