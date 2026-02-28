/**
 * FreeLang core/socket - Test Suite
 *
 * Tests for socket operations
 * Total: 20 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include "socket.h"

/* ===== Test Framework ===== */

static int test_count = 0;
static int pass_count = 0;
static int fail_count = 0;

#define ASSERT(condition, message) \
  do { \
    test_count++; \
    if (condition) { \
      pass_count++; \
      printf("✓ Test %d: %s\n", test_count, message); \
    } else { \
      fail_count++; \
      printf("✗ Test %d: %s\n", test_count, message); \
    } \
  } while(0)

#define ASSERT_EQUAL_INT(actual, expected, message) \
  ASSERT((actual) == (expected), message)

/* ===== CONNECTION TESTS ===== */

/**
 * Test 1: Socket creation
 */
void test_socket_create(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  ASSERT(sock >= 0, "Socket creation succeeds");

  if (sock >= 0) {
    close(sock);
  }
}

/**
 * Test 2: Socket creation for UDP
 */
void test_socket_create_udp(void) {
  int sock = socket(AF_INET, SOCK_DGRAM, 0);
  ASSERT(sock >= 0, "UDP socket creation succeeds");

  if (sock >= 0) {
    close(sock);
  }
}

/**
 * Test 3: Multiple sockets
 */
void test_multiple_sockets(void) {
  int sock1 = socket(AF_INET, SOCK_STREAM, 0);
  int sock2 = socket(AF_INET, SOCK_STREAM, 0);
  int sock3 = socket(AF_INET, SOCK_STREAM, 0);

  ASSERT(sock1 >= 0, "First socket created");
  ASSERT(sock2 >= 0, "Second socket created");
  ASSERT(sock3 >= 0, "Third socket created");
  ASSERT(sock1 != sock2 && sock2 != sock3, "Sockets have different file descriptors");

  close(sock1);
  close(sock2);
  close(sock3);
}

/**
 * Test 4: Socket reuse address
 */
void test_socket_reuse_addr(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  int opt = 1;

  int ret = setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
  ASSERT(ret == 0, "SO_REUSEADDR set successfully");

  close(sock);
}

/**
 * Test 5: Socket bind
 */
void test_socket_bind(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  struct sockaddr_in addr;
  addr.sin_family = AF_INET;
  addr.sin_port = htons(0);  // Use any available port
  addr.sin_addr.s_addr = inet_addr("127.0.0.1");

  int ret = bind(sock, (struct sockaddr *)&addr, sizeof(addr));
  ASSERT(ret == 0, "Socket bind succeeds");

  close(sock);
}

/**
 * Test 6: Socket listen
 */
void test_socket_listen(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  struct sockaddr_in addr;
  addr.sin_family = AF_INET;
  addr.sin_port = htons(0);
  addr.sin_addr.s_addr = inet_addr("127.0.0.1");

  bind(sock, (struct sockaddr *)&addr, sizeof(addr));

  int ret = listen(sock, 5);
  ASSERT(ret == 0, "Socket listen succeeds");

  close(sock);
}

/**
 * Test 7: Socket non-blocking
 */
void test_socket_nonblocking(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  // Set non-blocking flag
  int flags = fcntl(sock, F_GETFL, 0);
  int ret = fcntl(sock, F_SETFL, flags | O_NONBLOCK);

  ASSERT(ret == 0, "Non-blocking flag set successfully");

  close(sock);
}

/**
 * Test 8: Socket close
 */
void test_socket_close(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  int ret = close(sock);

  ASSERT(ret == 0, "Socket close succeeds");

  // Socket descriptor should be invalid now
  int bad_ret = setsockopt(sock, SOL_SOCKET, SO_KEEPALIVE, NULL, 0);
  ASSERT(bad_ret != 0, "Closed socket descriptor is invalid");
}

/* ===== SEND/RECV TESTS ===== */

/**
 * Test 9: Send data
 */
void test_send_data(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
  ASSERT(ret == 0, "Socket pair created");

  if (ret == 0) {
    const char *msg = "hello";
    int sent = send(socks[0], msg, strlen(msg), 0);

    ASSERT(sent == strlen(msg), "Data sent successfully");

    close(socks[0]);
    close(socks[1]);
  }
}

/**
 * Test 10: Receive data
 */
void test_recv_data(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
  ASSERT(ret == 0, "Socket pair created");

  if (ret == 0) {
    const char *msg = "test message";
    send(socks[0], msg, strlen(msg), 0);

    char buffer[100] = {0};
    int received = recv(socks[1], buffer, sizeof(buffer) - 1, 0);

    ASSERT(received > 0, "Data received successfully");
    ASSERT(strcmp(buffer, msg) == 0, "Received data matches sent data");

    close(socks[0]);
    close(socks[1]);
  }
}

/**
 * Test 11: Send and receive large data
 */
void test_send_recv_large(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
  ASSERT(ret == 0, "Socket pair created");

  if (ret == 0) {
    // Create large buffer
    char buffer[10000];
    memset(buffer, 'A', sizeof(buffer));

    // Send
    int sent = send(socks[0], buffer, sizeof(buffer), 0);
    ASSERT(sent > 0, "Large data sent");

    // Receive
    char recv_buffer[10000] = {0};
    int received = recv(socks[1], recv_buffer, sizeof(recv_buffer), 0);
    ASSERT(received > 0, "Large data received");

    close(socks[0]);
    close(socks[1]);
  }
}

/**
 * Test 12: Multiple send calls
 */
void test_multiple_sends(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
  ASSERT(ret == 0, "Socket pair created");

  if (ret == 0) {
    const char *msgs[] = {"msg1", "msg2", "msg3"};
    int total_sent = 0;

    for (int i = 0; i < 3; i++) {
      int sent = send(socks[0], msgs[i], strlen(msgs[i]), 0);
      ASSERT(sent > 0, "Message sent");
      total_sent += sent;
    }

    ASSERT(total_sent > 0, "Multiple messages sent");

    close(socks[0]);
    close(socks[1]);
  }
}

/**
 * Test 13: Send while receiving
 */
void test_send_while_recv(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
  ASSERT(ret == 0, "Socket pair created");

  if (ret == 0) {
    // Send from first socket
    const char *msg1 = "first";
    send(socks[0], msg1, strlen(msg1), 0);

    // Receive on second socket
    char buffer[100] = {0};
    recv(socks[1], buffer, sizeof(buffer) - 1, 0);
    ASSERT(strcmp(buffer, msg1) == 0, "First message received");

    // Send from second socket
    const char *msg2 = "second";
    send(socks[1], msg2, strlen(msg2), 0);

    // Receive on first socket
    memset(buffer, 0, sizeof(buffer));
    recv(socks[0], buffer, sizeof(buffer) - 1, 0);
    ASSERT(strcmp(buffer, msg2) == 0, "Second message received");

    close(socks[0]);
    close(socks[1]);
  }
}

/**
 * Test 14: Partial send
 */
void test_partial_send(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);
  ASSERT(ret == 0, "Socket pair created");

  if (ret == 0) {
    const char *msg = "hello";

    // Try sending just part
    int sent = send(socks[0], msg, 2, 0);  // Send only "he"
    ASSERT(sent == 2, "Partial send works");

    char buffer[100] = {0};
    recv(socks[1], buffer, sizeof(buffer) - 1, 0);
    ASSERT(buffer[0] == 'h' && buffer[1] == 'e', "Partial data received");

    close(socks[0]);
    close(socks[1]);
  }
}

/**
 * Test 15: Socket pair creation
 */
void test_socketpair(void) {
  int socks[2];
  int ret = socketpair(AF_UNIX, SOCK_STREAM, 0, socks);

  ASSERT(ret == 0, "Socket pair created successfully");
  ASSERT(socks[0] >= 0 && socks[1] >= 0, "Both socket descriptors valid");

  close(socks[0]);
  close(socks[1]);
}

/* ===== SOCKET OPTIONS TESTS ===== */

/**
 * Test 16: Get socket option
 */
void test_getsockopt(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  int sndbuf = 0;
  socklen_t optlen = sizeof(sndbuf);

  int ret = getsockopt(sock, SOL_SOCKET, SO_SNDBUF, &sndbuf, &optlen);
  ASSERT(ret == 0, "Get socket option succeeds");
  ASSERT(sndbuf > 0, "Send buffer size is positive");

  close(sock);
}

/**
 * Test 17: Set socket send buffer size
 */
void test_set_sndbuf(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  int sndbuf = 65536;  // 64KB
  int ret = setsockopt(sock, SOL_SOCKET, SO_SNDBUF, &sndbuf, sizeof(sndbuf));

  ASSERT(ret == 0, "Set send buffer size succeeds");

  close(sock);
}

/**
 * Test 18: Set socket receive buffer size
 */
void test_set_rcvbuf(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  int rcvbuf = 131072;  // 128KB
  int ret = setsockopt(sock, SOL_SOCKET, SO_RCVBUF, &rcvbuf, sizeof(rcvbuf));

  ASSERT(ret == 0, "Set receive buffer size succeeds");

  close(sock);
}

/**
 * Test 19: Set keep-alive
 */
void test_set_keepalive(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);

  int keepalive = 1;
  int ret = setsockopt(sock, SOL_SOCKET, SO_KEEPALIVE, &keepalive, sizeof(keepalive));

  ASSERT(ret == 0, "Set keep-alive succeeds");

  close(sock);
}

/**
 * Test 20: Socket descriptor validity
 */
void test_socket_validity(void) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  ASSERT(sock >= 0, "Valid socket descriptor is non-negative");

  close(sock);

  // Verify descriptor is closed
  struct linger linger_opt = {0, 0};
  socklen_t optlen = sizeof(linger_opt);
  int ret = getsockopt(sock, SOL_SOCKET, SO_LINGER, &linger_opt, &optlen);
  ASSERT(ret < 0, "Closed socket descriptor returns error");
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running Socket Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  // Connection tests
  printf("🔌 Connection Tests (8):\n");
  test_socket_create();
  test_socket_create_udp();
  test_multiple_sockets();
  test_socket_reuse_addr();
  test_socket_bind();
  test_socket_listen();
  test_socket_nonblocking();
  test_socket_close();

  printf("\n📤📥 Send/Recv Tests (7):\n");
  test_send_data();
  test_recv_data();
  test_send_recv_large();
  test_multiple_sends();
  test_send_while_recv();
  test_partial_send();
  test_socketpair();

  printf("\n⚙️ Socket Options Tests (5):\n");
  test_getsockopt();
  test_set_sndbuf();
  test_set_rcvbuf();
  test_set_keepalive();
  test_socket_validity();

  // Results
  printf("\n════════════════════════════════════════\n");
  printf("📊 Test Results:\n");
  printf("  Total:  %d\n", test_count);
  printf("  Passed: %d ✅\n", pass_count);
  printf("  Failed: %d ❌\n", fail_count);
  printf("\n");

  if (fail_count == 0) {
    printf("🎉 All tests passed!\n");
    return 0;
  } else {
    printf("⚠️  %d test(s) failed\n", fail_count);
    return 1;
  }
}
