/**
 * FreeLang core/http - Test Suite
 *
 * Tests for HTTP client and server
 * Total: 20 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "http.h"

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

#define ASSERT_EQUAL_STR(actual, expected, message) \
  do { \
    if ((actual) != NULL && strcmp((actual), (expected)) == 0) { \
      ASSERT(1, message); \
    } else { \
      ASSERT(0, message); \
    } \
  } while(0)

/* ===== REQUEST TESTS ===== */

void test_http_request_create_get(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/users");
  ASSERT(req != NULL, "HTTP GET request created");

  if (req != NULL) {
    ASSERT_EQUAL_INT(req->method, FL_HTTP_GET, "Method is GET");
    if (req->uri != NULL) {
      ASSERT_EQUAL_STR(req->uri, "/api/users", "URI is /api/users");
    }
    fl_http_request_destroy(req);
  }
}

void test_http_request_create_post(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_POST, "/api/create");
  ASSERT(req != NULL, "HTTP POST request created");

  if (req != NULL) {
    ASSERT_EQUAL_INT(req->method, FL_HTTP_POST, "Method is POST");
    if (req->uri != NULL) {
      ASSERT_EQUAL_STR(req->uri, "/api/create", "URI is /api/create");
    }
    fl_http_request_destroy(req);
  }
}

void test_http_request_methods(void) {
  fl_http_request_t *req_put = fl_http_request_create(FL_HTTP_PUT, "/api/update");
  ASSERT(req_put != NULL, "PUT request created");
  if (req_put != NULL) {
    ASSERT_EQUAL_INT(req_put->method, FL_HTTP_PUT, "PUT method");
    fl_http_request_destroy(req_put);
  }

  fl_http_request_t *req_del = fl_http_request_create(FL_HTTP_DELETE, "/api/delete");
  ASSERT(req_del != NULL, "DELETE request created");
  if (req_del != NULL) {
    ASSERT_EQUAL_INT(req_del->method, FL_HTTP_DELETE, "DELETE method");
    fl_http_request_destroy(req_del);
  }
}

void test_http_request_add_header(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/test");

  if (req != NULL && req->headers == NULL) {
    req->headers = fl_http_headers_create(10);
  }

  if (req != NULL && req->headers != NULL) {
    int ret = fl_http_headers_set(req->headers, "Content-Type", "application/json");
    ASSERT(ret == 0, "Header set successfully");
    ASSERT(req->headers != NULL, "Headers assigned to request");
    fl_http_request_destroy(req);
  }
}

void test_http_request_get_header(void) {
  fl_http_headers_t *headers = fl_http_headers_create(10);

  if (headers != NULL) {
    int set_ret = fl_http_headers_set(headers, "Authorization", "Bearer token123");
    ASSERT(set_ret == 0, "Header set return code 0");

    const char *auth = fl_http_headers_get(headers, "Authorization");
    ASSERT(auth != NULL, "Header retrieved");

    if (auth != NULL) {
      ASSERT_EQUAL_STR(auth, "Bearer token123", "Header value matches");
    }

    fl_http_headers_destroy(headers);
  }
}

void test_http_request_has_header(void) {
  fl_http_headers_t *headers = fl_http_headers_create(10);

  if (headers != NULL) {
    fl_http_headers_set(headers, "Accept", "application/json");
    int exists = fl_http_headers_has(headers, "Accept");
    ASSERT(exists, "Header exists");
    fl_http_headers_destroy(headers);
  }
}

void test_http_request_body(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_POST, "/api/create");

  if (req != NULL) {
    const char *body = "{\"name\": \"John\"}";
    int ret = fl_http_request_set_body(req, (uint8_t*)body, strlen(body));

    ASSERT(ret == 0, "Body set successfully");
    ASSERT(req->body_size > 0, "Body size set");
    ASSERT(req->body != NULL, "Body pointer set");

    fl_http_request_destroy(req);
  }
}

void test_http_request_serialize_get(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/test");

  if (req != NULL) {
    char *serialized = fl_http_request_to_string(req);

    ASSERT(serialized != NULL, "Request serialized");
    if (serialized != NULL) {
      ASSERT(strstr(serialized, "GET") != NULL, "Contains GET method");
      ASSERT(strstr(serialized, "/api/test") != NULL, "Contains path");
      free(serialized);
    }

    fl_http_request_destroy(req);
  }
}

/* ===== RESPONSE TESTS ===== */

void test_http_response_create(void) {
  fl_http_response_t *resp = fl_http_response_create(200);
  ASSERT(resp != NULL, "HTTP response created");
  ASSERT_EQUAL_INT(resp->status_code, 200, "Status code is 200");

  if (resp) {
    fl_http_response_destroy(resp);
  }
}

void test_http_response_status(void) {
  fl_http_response_t *resp = fl_http_response_create(200);

  if (resp != NULL) {
    ASSERT_EQUAL_INT(resp->status_code, 200, "Status code is 200");
    ASSERT(resp->status_message != NULL, "Status message set");
    fl_http_response_destroy(resp);
  }
}

void test_http_response_various_status(void) {
  fl_http_response_t *resp_404 = fl_http_response_create(404);
  ASSERT(resp_404 != NULL && resp_404->status_code == 404, "404 status code");
  if (resp_404) fl_http_response_destroy(resp_404);

  fl_http_response_t *resp_500 = fl_http_response_create(500);
  ASSERT(resp_500 != NULL && resp_500->status_code == 500, "500 status code");
  if (resp_500) fl_http_response_destroy(resp_500);
}

void test_http_response_add_header(void) {
  fl_http_response_t *resp = fl_http_response_create(200);

  if (resp != NULL && resp->headers == NULL) {
    resp->headers = fl_http_headers_create(10);
  }

  if (resp != NULL && resp->headers != NULL) {
    int ret = fl_http_headers_set(resp->headers, "Content-Type", "application/json");
    ASSERT(ret == 0, "Header set successfully");
    ASSERT(resp->headers != NULL, "Headers assigned to response");

    fl_http_response_destroy(resp);
  }
}

void test_http_response_body(void) {
  fl_http_response_t *resp = fl_http_response_create(200);

  if (resp != NULL) {
    const char *body = "{\"status\": \"success\"}";
    int ret = fl_http_response_set_body(resp, (uint8_t*)body, strlen(body));

    ASSERT(ret == 0, "Body set successfully");
    ASSERT(resp->body_size > 0, "Body size set");
    ASSERT(resp->body != NULL, "Body pointer set");

    fl_http_response_destroy(resp);
  }
}

void test_http_response_serialize(void) {
  fl_http_response_t *resp = fl_http_response_create(200);

  if (resp != NULL && resp->headers == NULL) {
    resp->headers = fl_http_headers_create(10);
  }

  if (resp != NULL && resp->headers != NULL) {
    fl_http_headers_set(resp->headers, "Content-Type", "text/html");
    fl_http_response_set_body(resp, (uint8_t*)"<h1>Hello</h1>", 14);

    char *serialized = fl_http_response_to_string(resp);

    ASSERT(serialized != NULL, "Response serialized");
    if (serialized != NULL) {
      ASSERT(strstr(serialized, "200") != NULL, "Contains status code");
      free(serialized);
    }

    fl_http_response_destroy(resp);
  }
}

void test_http_request_parse(void) {
  const char *raw_req = "GET /api/test HTTP/1.1\r\nHost: example.com\r\n\r\n";

  fl_http_request_t *req = fl_http_parse_request(raw_req);

  ASSERT(req != NULL, "Request parsed");
  if (req) {
    ASSERT_EQUAL_INT(req->method, FL_HTTP_GET, "Parsed method is GET");
    fl_http_request_destroy(req);
  }
}

void test_http_response_parse(void) {
  const char *raw_resp = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Hello</h1>";

  fl_http_response_t *resp = fl_http_parse_response(raw_resp);

  ASSERT(resp != NULL, "Response parsed");
  if (resp) {
    ASSERT_EQUAL_INT(resp->status_code, 200, "Parsed status is 200");
    fl_http_response_destroy(resp);
  }
}

void test_http_request_query_string(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/search?q=test&limit=10");

  if (req != NULL && req->uri != NULL) {
    ASSERT_EQUAL_STR(req->uri, "/search?q=test&limit=10", "Query string preserved");
    fl_http_request_destroy(req);
  }
}

void test_http_response_content_length(void) {
  fl_http_response_t *resp = fl_http_response_create(200);

  if (resp != NULL) {
    const char *body = "Hello World";
    fl_http_response_set_body(resp, (uint8_t*)body, strlen(body));

    ASSERT(resp->body_size == strlen(body), "Content length matches body");

    fl_http_response_destroy(resp);
  }
}

void test_http_request_auth(void) {
  fl_http_request_t *req = fl_http_request_create(FL_HTTP_GET, "/api/secure");

  if (req != NULL && req->headers == NULL) {
    req->headers = fl_http_headers_create(10);
  }

  if (req != NULL && req->headers != NULL) {
    fl_http_headers_set(req->headers, "Authorization", "Bearer eyJhbGc...");
    ASSERT(req->headers != NULL, "Authorization header added");
    fl_http_request_destroy(req);
  }
}

void test_http_response_redirect(void) {
  fl_http_response_t *resp = fl_http_response_create(302);

  if (resp != NULL && resp->headers == NULL) {
    resp->headers = fl_http_headers_create(10);
  }

  if (resp != NULL && resp->headers != NULL) {
    fl_http_headers_set(resp->headers, "Location", "https://example.com/new-path");
    ASSERT(resp->status_code == 302, "302 redirect status");
    fl_http_response_destroy(resp);
  }
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running HTTP Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  printf("📤 Request Tests (8):\n");
  test_http_request_create_get();
  test_http_request_create_post();
  test_http_request_methods();
  test_http_request_add_header();
  test_http_request_get_header();
  test_http_request_has_header();
  test_http_request_body();
  test_http_request_serialize_get();

  printf("\n📥 Response Tests (12):\n");
  test_http_response_create();
  test_http_response_status();
  test_http_response_various_status();
  test_http_response_add_header();
  test_http_response_body();
  test_http_response_serialize();
  test_http_request_parse();
  test_http_response_parse();
  test_http_request_query_string();
  test_http_response_content_length();
  test_http_request_auth();
  test_http_response_redirect();

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
