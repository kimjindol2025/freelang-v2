# FreeLang WebSocket Library - Complete Guide

## Overview

The FreeLang WebSocket library provides full-featured WebSocket support for both server-side and client-side applications. It includes:

- **WebSocket Server**: Create scalable real-time servers
- **WebSocket Client**: Connect to WebSocket servers
- **Event-based API**: Simple callback-based event handling
- **Broadcasting**: Send messages to multiple clients at once
- **State Management**: Track connection states

## Installation

The WebSocket library is built-in. Ensure you have the `ws` package installed:

```bash
npm install ws
```

## Basic Usage

### Creating a WebSocket Server

```freeLang
fn main() {
  let port = 8080;
  let server = ws.createServer(port);

  ws.onConnection(server, fn(client) {
    println("Client connected: " + client.id);
  });

  ws.onMessage(server, fn(client, msg) {
    println("Message from " + client.id + ": " + msg);
    ws.send(client, "Echo: " + msg);
  });

  ws.onDisconnection(server, fn(client) {
    println("Client disconnected: " + client.id);
  });

  ws.listen(server);
}

main()
```

### Creating a WebSocket Client

```freeLang
fn main() {
  let client = ws.connect("ws://localhost:8080");

  ws.on(client, "open", fn() {
    println("Connected!");
    ws.send(client, "Hello Server");
  });

  ws.on(client, "message", fn(msg) {
    println("Received: " + msg);
  });

  ws.on(client, "close", fn() {
    println("Disconnected");
  });
}

main()
```

## API Reference

### Server Functions

#### `ws.createServer(port)`

Create a WebSocket server instance.

**Parameters:**
- `port` (integer): Port number to listen on

**Returns:** Server object

**Example:**
```freeLang
let server = ws.createServer(8080);
```

#### `ws.onConnection(server, callback)`

Register a callback for new client connections.

**Parameters:**
- `server`: Server object
- `callback`: Function(client) - Called when client connects

**Example:**
```freeLang
ws.onConnection(server, fn(client) {
  println("New connection: " + client.id);
});
```

#### `ws.onMessage(server, callback)`

Register a callback for incoming messages.

**Parameters:**
- `server`: Server object
- `callback`: Function(client, message) - Called when message received

**Example:**
```freeLang
ws.onMessage(server, fn(client, msg) {
  println("Message: " + msg);
});
```

#### `ws.onDisconnection(server, callback)`

Register a callback for client disconnections.

**Parameters:**
- `server`: Server object
- `callback`: Function(client) - Called when client disconnects

**Example:**
```freeLang
ws.onDisconnection(server, fn(client) {
  println("Disconnection: " + client.id);
});
```

#### `ws.onError(server, callback)`

Register a callback for errors.

**Parameters:**
- `server`: Server object
- `callback`: Function(error) - Called on error

**Example:**
```freeLang
ws.onError(server, fn(err) {
  println("Error: " + err);
});
```

#### `ws.listen(server)`

Start listening for WebSocket connections.

**Parameters:**
- `server`: Server object

**Returns:** Server object

**Example:**
```freeLang
ws.listen(server);
```

#### `ws.broadcast(server, message)`

Send a message to all connected clients.

**Parameters:**
- `server`: Server object
- `message`: String or object (will be JSON stringified)

**Returns:** true

**Example:**
```freeLang
ws.broadcast(server, json.stringify({
  type: "notification",
  text: "Important message"
}));
```

#### `ws.broadcastExcept(server, excludeClient, message)`

Send a message to all clients except one.

**Parameters:**
- `server`: Server object
- `excludeClient`: Client object to exclude
- `message`: String or object

**Returns:** true

**Example:**
```freeLang
ws.broadcastExcept(server, sender, "User is typing...");
```

#### `ws.getClients(server)`

Get all connected clients.

**Parameters:**
- `server`: Server object

**Returns:** Array of client objects

**Example:**
```freeLang
let clients = ws.getClients(server);
let count = arr.length(clients);
println("Total clients: " + str(count));
```

#### `ws.getClientCount(server)`

Get the number of connected clients.

**Parameters:**
- `server`: Server object

**Returns:** Integer count

**Example:**
```freeLang
let count = ws.getClientCount(server);
println("Clients: " + str(count));
```

#### `ws.close(server)`

Close the server and disconnect all clients.

**Parameters:**
- `server`: Server object

**Returns:** Server object

**Example:**
```freeLang
ws.close(server);
```

### Client Functions

#### `ws.connect(url)`

Create and connect a WebSocket client.

**Parameters:**
- `url`: String - WebSocket server URL (e.g., "ws://localhost:8080")

**Returns:** Client object

**Example:**
```freeLang
let client = ws.connect("ws://localhost:8080");
```

#### `ws.on(client, event, callback)`

Register an event listener on a client.

**Parameters:**
- `client`: Client object
- `event`: String - Event name ("open", "message", "close", "error")
- `callback`: Function - Event handler

**Example:**
```freeLang
ws.on(client, "message", fn(data) {
  println("Message: " + data);
});
```

#### `ws.send(client, message)`

Send a message to the server.

**Parameters:**
- `client`: Client object
- `message`: String or object (will be JSON stringified)

**Returns:** true

**Example:**
```freeLang
ws.send(client, json.stringify({
  type: "message",
  text: "Hello"
}));
```

#### `ws.close(client)`

Close the client connection.

**Parameters:**
- `client`: Client object

**Returns:** Client object

**Example:**
```freeLang
ws.close(client);
```

#### `ws.getState(client)`

Get the connection state as a string.

**Parameters:**
- `client`: Client object

**Returns:** String - "CONNECTING", "OPEN", "CLOSING", or "CLOSED"

**Example:**
```freeLang
let state = ws.getState(client);
println("State: " + state);
```

#### `ws.isOpen(client)`

Check if the connection is open.

**Parameters:**
- `client`: Client object

**Returns:** Boolean

**Example:**
```freeLang
if ws.isOpen(client) {
  ws.send(client, "I am connected!");
}
```

#### `ws.isClosed(client)`

Check if the connection is closed.

**Parameters:**
- `client`: Client object

**Returns:** Boolean

**Example:**
```freeLang
if ws.isClosed(client) {
  println("Connection closed");
}
```

## Examples

### Example 1: Simple Echo Server

```freeLang
fn main() {
  let server = ws.createServer(3000);

  ws.onConnection(server, fn(client) {
    println("[+] Client connected");
  });

  ws.onMessage(server, fn(client, msg) {
    // Echo message back
    ws.send(client, "Echo: " + msg);
  });

  ws.listen(server);
}

main()
```

### Example 2: Chat Server

See `examples/websocket-chat.fl` for a complete chat server implementation with:
- User management
- Join/leave notifications
- Message broadcasting
- User list
- Statistics

### Example 3: Simple Client

```freeLang
fn main() {
  let client = ws.connect("ws://localhost:3000");

  ws.on(client, "open", fn() {
    println("Connected!");
    ws.send(client, "Hello Server");
  });

  ws.on(client, "message", fn(msg) {
    println("Server: " + msg);
  });
}

main()
```

### Example 4: HTML Client

See `examples/websocket-client.html` for a complete browser-based WebSocket client with:
- Real-time chat UI
- User list management
- Connection status display
- Message history

## Message Format

Messages are typically JSON-encoded for structured communication:

```freeLang
let msg = json.stringify({
  type: "message",
  from: "Alice",
  text: "Hello",
  timestamp: os.time()
});

ws.send(client, msg);
```

Receiving and parsing:

```freeLang
ws.onMessage(server, fn(client, rawMsg) {
  try {
    let msg = json.parse(rawMsg);

    match msg.type {
      "message" => {
        println(msg.from + ": " + msg.text);
      },
      "status" => {
        println("Status: " + msg.status);
      }
    }
  } catch e {
    println("Invalid message: " + e);
  }
});
```

## Connection States

WebSocket connections have four states:

1. **CONNECTING** (0): Connection is being established
2. **OPEN** (1): Connection is open and ready for communication
3. **CLOSING** (2): Connection is being closed
4. **CLOSED** (3): Connection is closed

Check states with:
```freeLang
let state = ws.getState(client);
if state == "OPEN" {
  ws.send(client, "message");
}
```

## Error Handling

Handle errors gracefully:

```freeLang
ws.on(client, "error", fn(err) {
  println("Error: " + err);
});

ws.onError(server, fn(err) {
  println("Server error: " + err);
});
```

## Performance Considerations

1. **Broadcasting**: Use `ws.broadcast()` for sending to all clients
2. **Selective Broadcasting**: Use `ws.broadcastExcept()` to exclude specific clients
3. **Connection Limits**: Monitor `ws.getClientCount()` to avoid resource exhaustion
4. **Message Size**: Keep messages reasonably sized for network efficiency
5. **Event Processing**: Use async patterns for long-running operations

## HTML Client Usage

To use the provided HTML client:

1. Start the WebSocket server:
   ```bash
   npm run cli -- run examples/websocket-chat.fl
   ```

2. Open the HTML client in a browser:
   ```
   examples/websocket-client.html
   ```

3. Enter your username and join the chat

## Testing

Run the WebSocket test suite:

```bash
npm run cli -- run examples/websocket-test.fl
```

This tests:
- Server creation
- Event registration
- Client creation
- Connection states
- Broadcasting
- Client management

## Troubleshooting

### Connection Refused
- Ensure the server is running on the specified port
- Check firewall settings
- Verify the URL format: `ws://host:port` (or `wss://host:port` for secure)

### Message Not Received
- Ensure connection is OPEN before sending
- Check message format (JSON validation)
- Verify event handlers are registered

### Memory Leaks
- Always close connections when done: `ws.close(client)`
- Remove event listeners if needed
- Monitor client count with `ws.getClientCount()`

## Advanced Topics

### Custom Message Protocol

Define your own message types:

```freeLang
fn sendCommand(client, cmd, args) {
  ws.send(client, json.stringify({
    type: "command",
    command: cmd,
    args: args,
    id: os.time()
  }));
}
```

### Rate Limiting

Implement message rate limiting:

```freeLang
let lastMessageTime = map.new();

ws.onMessage(server, fn(client, msg) {
  let now = os.time();
  let clientId = client.id;

  if map.has(lastMessageTime, clientId) {
    let last = map.get(lastMessageTime, clientId);
    if now - last < 100 {
      // Rate limited
      return;
    }
  }

  map.set(lastMessageTime, clientId, now);
  // Process message...
});
```

### Heartbeat/Ping

Implement a heartbeat to detect stale connections:

```freeLang
fn startHeartbeat(server) {
  // In real implementation, use timers
  // Send ping to all clients periodically
  while true {
    ws.broadcast(server, json.stringify({
      type: "ping",
      timestamp: os.time()
    }));
  }
}
```

## See Also

- `src/stdlib/ws.ts` - TypeScript implementation
- `src/stdlib/websocket.fl` - FreeLang API layer
- `examples/websocket-chat.fl` - Complete chat server
- `examples/websocket-client.html` - Browser client
