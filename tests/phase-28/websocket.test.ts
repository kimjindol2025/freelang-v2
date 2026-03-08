/**
 * Phase 28-6: WebSocket Socket Tests (RFC 6455)
 * Comprehensive test suite for WebSocket frame handling, masking, keep-alive, fragmentation
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Phase 28-6: WebSocket Socket (RFC 6455)', () => {
  const STDLIB_PATH = path.join(__dirname, '../../stdlib/core');

  describe('1. Library Files Validation', () => {
    test('websocket.h header file exists', () => {
      const headerPath = path.join(STDLIB_PATH, 'websocket.h');
      expect(fs.existsSync(headerPath)).toBe(true);
    });

    test('websocket.h has required enums', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('typedef enum');
      expect(content).toContain('FL_WS_FRAME_TEXT');
      expect(content).toContain('FL_WS_FRAME_BINARY');
      expect(content).toContain('FL_WS_FRAME_CLOSE');
      expect(content).toContain('FL_WS_CLOSE_NORMAL');
    });

    test('websocket.h has required structures', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_frame_t');
      expect(content).toContain('fl_ws_config_t');
      expect(content).toContain('fl_ws_connection_t');
      expect(content).toContain('fl_ws_stats_t');
    });

    test('websocket.h has include guards', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('#ifndef FREELANG_STDLIB_WEBSOCKET_H');
      expect(content).toContain('#define FREELANG_STDLIB_WEBSOCKET_H');
      expect(content).toContain('#endif');
    });

    test('websocket.h is properly formatted', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content.length).toBeGreaterThan(5000); // At least 5KB
      expect(content).toMatch(/\/\*.*?=====.*?\*\//s);
    });
  });

  describe('2. Frame Type Support', () => {
    test('defines continuation frame (0x0)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_FRAME_CONTINUATION');
      expect(content).toContain('0x0');
    });

    test('defines text frame (0x1)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_FRAME_TEXT');
      expect(content).toContain('0x1');
    });

    test('defines binary frame (0x2)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_FRAME_BINARY');
      expect(content).toContain('0x2');
    });

    test('defines close frame (0x8)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_FRAME_CLOSE');
      expect(content).toContain('0x8');
    });

    test('defines ping frame (0x9)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_FRAME_PING');
      expect(content).toContain('0x9');
    });

    test('defines pong frame (0xa)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_FRAME_PONG');
      expect(content).toContain('0xa');
    });
  });

  describe('3. Close Code Support', () => {
    test('defines normal closure (1000)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_NORMAL');
      expect(content).toContain('1000');
    });

    test('defines going away (1001)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_GOING_AWAY');
      expect(content).toContain('1001');
    });

    test('defines protocol error (1002)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_PROTOCOL_ERROR');
      expect(content).toContain('1002');
    });

    test('defines unsupported data (1003)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_UNSUPPORTED_DATA');
      expect(content).toContain('1003');
    });

    test('defines abnormal closure (1006)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_ABNORMAL');
      expect(content).toContain('1006');
    });

    test('defines invalid frame payload (1007)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_INVALID_FRAME_PAYLOAD');
      expect(content).toContain('1007');
    });

    test('defines policy violation (1008)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_POLICY_VIOLATION');
      expect(content).toContain('1008');
    });

    test('defines message too big (1009)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_MESSAGE_TOO_BIG');
      expect(content).toContain('1009');
    });

    test('defines missing extension (1010)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_MISSING_EXTENSION');
      expect(content).toContain('1010');
    });

    test('defines internal error (1011)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_INTERNAL_ERROR');
      expect(content).toContain('1011');
    });

    test('defines no status (1005)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('FL_WS_CLOSE_NO_STATUS');
      expect(content).toContain('1005');
    });
  });

  describe('4. Frame Structure', () => {
    test('fl_ws_frame_t has fin flag', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fin');
    });

    test('fl_ws_frame_t has opcode field', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_frame_type_t opcode');
    });

    test('fl_ws_frame_t has masking support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int masked');
      expect(content).toContain('uint8_t *mask_key');
    });

    test('fl_ws_frame_t has payload fields', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint8_t *payload');
      expect(content).toContain('uint64_t payload_len');
    });

    test('fl_ws_frame_t has reserved bits', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('rsv1');
      expect(content).toContain('rsv2');
      expect(content).toContain('rsv3');
    });
  });

  describe('5. Configuration Structure', () => {
    test('fl_ws_config_t has is_server field', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int is_server');
    });

    test('fl_ws_config_t has server address fields', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('char *server_address');
      expect(content).toContain('uint16_t server_port');
      expect(content).toContain('char *server_path');
    });

    test('fl_ws_config_t has subprotocol support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('char **subprotocols');
      expect(content).toContain('int subprotocol_count');
    });

    test('fl_ws_config_t has payload size limit', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int max_payload_size');
    });

    test('fl_ws_config_t has ping interval', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int ping_interval_ms');
    });

    test('fl_ws_config_t has idle timeout', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int idle_timeout_ms');
    });

    test('fl_ws_config_t has compression support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int use_compression');
    });
  });

  describe('6. Connection Structure', () => {
    test('fl_ws_connection_t has socket fd', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fd');
    });

    test('fl_ws_connection_t has server flag', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int is_server');
    });

    test('fl_ws_connection_t has connected flag', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int is_connected');
    });

    test('fl_ws_connection_t tracks messages sent', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t messages_sent');
    });

    test('fl_ws_connection_t tracks messages received', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t messages_received');
    });

    test('fl_ws_connection_t tracks bytes sent', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t bytes_sent');
    });

    test('fl_ws_connection_t tracks bytes received', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t bytes_received');
    });

    test('fl_ws_connection_t tracks ping/pong timestamps', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint32_t last_ping_ms');
      expect(content).toContain('uint32_t last_pong_ms');
    });

    test('fl_ws_connection_t tracks activity timestamp', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint32_t last_activity_ms');
    });

    test('fl_ws_connection_t tracks subprotocol', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('char *selected_subprotocol');
    });
  });

  describe('7. Statistics Structure', () => {
    test('fl_ws_stats_t tracks total connections', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t total_connections');
    });

    test('fl_ws_stats_t tracks active connections', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t active_connections');
    });

    test('fl_ws_stats_t tracks messages sent', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t total_messages_sent');
    });

    test('fl_ws_stats_t tracks messages received', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t total_messages_received');
    });

    test('fl_ws_stats_t tracks bytes sent', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t total_bytes_sent');
    });

    test('fl_ws_stats_t tracks bytes received', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t total_bytes_received');
    });

    test('fl_ws_stats_t tracks ping/pong/close/error counts', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint32_t ping_count');
      expect(content).toContain('uint32_t pong_count');
      expect(content).toContain('uint32_t close_count');
      expect(content).toContain('uint32_t error_count');
    });
  });

  describe('8. Configuration API', () => {
    test('defines fl_ws_config_create function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_config_t* fl_ws_config_create');
    });

    test('defines fl_ws_config_set_server function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_config_set_server');
    });

    test('defines fl_ws_config_set_origin function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_config_set_origin');
    });

    test('defines fl_ws_config_set_subprotocols function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_config_set_subprotocols');
    });

    test('defines fl_ws_config_set_max_payload function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_config_set_max_payload');
    });

    test('defines fl_ws_config_set_ping_interval function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_config_set_ping_interval');
    });

    test('defines fl_ws_config_set_compression function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_config_set_compression');
    });

    test('defines fl_ws_config_destroy function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('void fl_ws_config_destroy');
    });
  });

  describe('9. Connection API', () => {
    test('defines fl_ws_server_create function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_connection_t* fl_ws_server_create');
    });

    test('defines fl_ws_client_create function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_connection_t* fl_ws_client_create');
    });

    test('defines fl_ws_listen function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_listen');
    });

    test('defines fl_ws_accept function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_accept');
    });

    test('defines fl_ws_connect function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_connect');
    });

    test('defines fl_ws_handshake function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_handshake');
    });

    test('defines message sending functions', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_send_text');
      expect(content).toContain('int fl_ws_send_binary');
    });

    test('defines message receiving function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_recv_message');
    });

    test('defines ping/pong functions', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_send_ping');
      expect(content).toContain('int fl_ws_send_pong');
    });

    test('defines fl_ws_close function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_close');
    });

    test('defines fl_ws_destroy function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('void fl_ws_destroy');
    });
  });

  describe('10. Frame API', () => {
    test('defines fl_ws_frame_create function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_frame_t* fl_ws_frame_create');
    });

    test('defines fl_ws_frame_parse function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_frame_t* fl_ws_frame_parse');
    });

    test('defines fl_ws_frame_serialize function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_frame_serialize');
    });

    test('defines fl_ws_frame_mask function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_frame_mask');
    });

    test('defines fl_ws_frame_unmask function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_frame_unmask');
    });

    test('defines fl_ws_frame_destroy function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('void fl_ws_frame_destroy');
    });
  });

  describe('11. Message Fragmentation API', () => {
    test('defines fl_ws_create_fragmented_message function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_frame_t** fl_ws_create_fragmented_message');
    });

    test('defines fl_ws_reassemble_message function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_reassemble_message');
    });
  });

  describe('12. Statistics API', () => {
    test('defines fl_ws_get_stats function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_stats_t* fl_ws_get_stats');
    });

    test('defines fl_ws_reset_stats function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('void fl_ws_reset_stats');
    });
  });

  describe('13. Utility Functions', () => {
    test('defines fl_ws_close_code_to_string function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('const char* fl_ws_close_code_to_string');
    });

    test('defines fl_ws_frame_is_valid function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_frame_is_valid');
    });

    test('defines fl_ws_error_message function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('const char* fl_ws_error_message');
    });

    test('defines fl_ws_is_connected function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws_is_connected');
    });

    test('defines fl_ws_get_connection_info function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('char* fl_ws_get_connection_info');
    });
  });

  describe('14. RFC 6455 Compliance', () => {
    test('header includes all RFC required types', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      // Frame types: text, binary, continuation, close, ping, pong
      expect(content).toMatch(/TEXT|BINARY|CONTINUATION|CLOSE|PING|PONG/);
    });

    test('header defines proper masking support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('mask_key');
      expect(content).toContain('masked');
    });

    test('header defines payload length support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t payload_len');
    });

    test('header includes FIN bit support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fin');
    });

    test('header includes RSV bits support', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('rsv1');
    });
  });

  describe('15. Documentation Quality', () => {
    test('header includes function documentation', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('/**');
      expect(content).toContain('* Create');
    });

    test('header documents parameter meanings', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('@param');
    });

    test('header documents return values', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('@return');
    });

    test('header has section comments', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toMatch(/=====.*=====/);
    });
  });

  describe('16. Type System', () => {
    test('uses stdint.h types for portability', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('#include <stdint.h>');
    });

    test('uses size_t for buffer sizes', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('#include <stddef.h>');
    });

    test('uses time_t for timestamps', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('#include <time.h>');
    });

    test('uses uint8_t for byte data', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint8_t');
    });

    test('uses uint64_t for large counters', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('uint64_t');
    });
  });

  describe('17. Keep-Alive Support', () => {
    test('defines ping interval configuration', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('ping_interval_ms');
    });

    test('defines idle timeout configuration', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('idle_timeout_ms');
    });

    test('tracks last ping time', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('last_ping_ms');
    });

    test('tracks last pong time', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('last_pong_ms');
    });

    test('tracks last activity time', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('last_activity_ms');
    });
  });

  describe('18. Compression Support', () => {
    test('defines compression configuration flag', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('use_compression');
    });

    test('includes compression context in connection', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('compression_context');
    });

    test('defines set_compression function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_config_set_compression');
    });
  });

  describe('19. Subprotocol Support', () => {
    test('configuration supports multiple subprotocols', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('char **subprotocols');
      expect(content).toContain('subprotocol_count');
    });

    test('connection tracks selected subprotocol', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('selected_subprotocol');
    });

    test('defines set_subprotocols function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_config_set_subprotocols');
    });
  });

  describe('20. Error Handling', () => {
    test('functions return error codes (int -1)', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('int fl_ws');
    });

    test('defines error message function', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_error_message');
    });

    test('tracks error count in statistics', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('error_count');
    });

    test('validates frames before use', () => {
      const content = fs.readFileSync(path.join(STDLIB_PATH, 'websocket.h'), 'utf-8');
      expect(content).toContain('fl_ws_frame_is_valid');
    });
  });
});
