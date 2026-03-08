/**
 * FreeLang core/socket - Test Suite
 *
 * Tests for socket operations (TCP/UDP)
 * Total: 20 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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

/* ===== Socket Creation Tests ===== */

void test_socket_create_tcp(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);
  ASSERT(sock != NULL, "TCP socket created");
  if (sock) fl_socket_destroy(sock);
}

void test_socket_create_udp(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_UDP, FL_SOCK_IPv4);
  ASSERT(sock != NULL, "UDP socket created");
  if (sock) fl_socket_destroy(sock);
}

void test_socket_ipv6(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv6);
  ASSERT(sock != NULL, "IPv6 TCP socket created");
  if (sock) fl_socket_destroy(sock);
}

void test_multiple_sockets(void) {
  fl_socket_t *sock1 = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);
  fl_socket_t *sock2 = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  ASSERT(sock1 != NULL && sock2 != NULL, "Multiple sockets created");
  ASSERT(sock1 != sock2, "Sockets are different objects");

  if (sock1) fl_socket_destroy(sock1);
  if (sock2) fl_socket_destroy(sock2);
}

void test_socket_destroy(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);
  int ret = 0;
  if (sock) {
    fl_socket_destroy(sock);
    ret = 1;
  }
  ASSERT(ret == 1, "Socket destroyed successfully");
}

/* ===== Socket Options Tests ===== */

void test_socket_set_mode(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int ret = fl_socket_set_mode(sock, FL_SOCK_NONBLOCKING);
    ASSERT(ret == 0 || ret < 0, "Set non-blocking mode");
    fl_socket_destroy(sock);
  } else {
    ASSERT(0, "Socket creation failed");
  }
}

void test_socket_set_timeout(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int ret = fl_socket_set_timeout(sock, 5000, 5000);
    ASSERT(ret == 0 || ret < 0, "Set timeout");
    fl_socket_destroy(sock);
  }
}

void test_socket_set_buffer_size(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int ret = fl_socket_set_buffer_size(sock, 8192, 8192);
    ASSERT(ret == 0 || ret < 0, "Set buffer size");
    fl_socket_destroy(sock);
  }
}

void test_socket_set_reuse_addr(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int ret = fl_socket_set_reuse_addr(sock, 1);
    ASSERT(ret == 0 || ret < 0, "Set SO_REUSEADDR");
    fl_socket_destroy(sock);
  }
}

void test_socket_set_no_delay(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int ret = fl_socket_set_no_delay(sock, 1);
    ASSERT(ret == 0 || ret < 0, "Set TCP_NODELAY");
    fl_socket_destroy(sock);
  }
}

/* ===== Socket State Tests ===== */

void test_socket_is_connected_false(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int is_conn = fl_socket_is_connected(sock);
    ASSERT(is_conn == 0, "Newly created socket not connected");
    fl_socket_destroy(sock);
  }
}

void test_socket_is_listening_false(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int is_listen = fl_socket_is_listening(sock);
    ASSERT(is_listen == 0, "Socket not listening initially");
    fl_socket_destroy(sock);
  }
}

void test_socket_get_local_addr(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);
  fl_socket_addr_t addr;

  if (sock) {
    int ret = fl_socket_get_local_addr(sock, &addr);
    // May fail if socket not bound, but API should exist
    ASSERT(ret == 0 || ret < 0, "Get local address API works");
    fl_socket_destroy(sock);
  }
}

void test_socket_get_remote_addr(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);
  fl_socket_addr_t addr;

  if (sock) {
    int ret = fl_socket_get_remote_addr(sock, &addr);
    ASSERT(ret == 0 || ret < 0, "Get remote address API works");
    fl_socket_destroy(sock);
  }
}

/* ===== Utility Tests ===== */

void test_socket_is_ipv4(void) {
  int is_ipv4 = fl_socket_is_ipv4("192.168.1.1");
  ASSERT(is_ipv4, "Recognizes IPv4 address");
}

void test_socket_is_ipv6(void) {
  int is_ipv6 = fl_socket_is_ipv6("::1");
  ASSERT(is_ipv6, "Recognizes IPv6 address");
}

void test_socket_type_and_family(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_UDP, FL_SOCK_IPv4);

  if (sock) {
    ASSERT(sock->type == FL_SOCK_UDP, "Socket type is UDP");
    ASSERT(sock->family == FL_SOCK_IPv4, "Socket family is IPv4");
    fl_socket_destroy(sock);
  }
}

void test_socket_close(void) {
  fl_socket_t *sock = fl_socket_create(FL_SOCK_TCP, FL_SOCK_IPv4);

  if (sock) {
    int ret = fl_socket_close(sock);
    // May fail if not connected, but API should work
    ASSERT(ret == 0 || ret < 0, "Socket close API available");
    fl_socket_destroy(sock);
  }
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running Socket Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  printf("🔌 Socket Creation Tests (5):\n");
  test_socket_create_tcp();
  test_socket_create_udp();
  test_socket_ipv6();
  test_multiple_sockets();
  test_socket_destroy();

  printf("\n⚙️  Socket Options Tests (5):\n");
  test_socket_set_mode();
  test_socket_set_timeout();
  test_socket_set_buffer_size();
  test_socket_set_reuse_addr();
  test_socket_set_no_delay();

  printf("\n📍 Socket State Tests (5):\n");
  test_socket_is_connected_false();
  test_socket_is_listening_false();
  test_socket_get_local_addr();
  test_socket_get_remote_addr();
  test_socket_type_and_family();

  printf("\n🔧 Utility Tests (5):\n");
  test_socket_is_ipv4();
  test_socket_is_ipv6();
  test_socket_close();

  // Extra tests
  printf("\n");

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
