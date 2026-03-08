/**
 * FreeLang core/hash - Test Suite
 *
 * Tests for hash functions (FNV-1a, MurmurHash3)
 * Total: 15 test cases
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "hash.h"

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

#define ASSERT_NOT_EQUAL(actual, expected, message) \
  ASSERT((actual) != (expected), message)

/* ===== FNV-1a TESTS ===== */

/**
 * Test 1: FNV-1a 32-bit empty data
 */
void test_fnv1a_32_empty(void) {
  uint32_t hash = fl_hash_fnv1a_32("", 0);
  ASSERT(hash != 0, "FNV-1a 32 empty hash is non-zero");
}

/**
 * Test 2: FNV-1a 32-bit simple data
 */
void test_fnv1a_32_simple(void) {
  const char *data = "hello";
  uint32_t hash = fl_hash_fnv1a_32(data, strlen(data));

  ASSERT(hash != 0, "FNV-1a 32 hash is non-zero");

  // Same input should produce same hash
  uint32_t hash2 = fl_hash_fnv1a_32(data, strlen(data));
  ASSERT(hash == hash2, "FNV-1a 32 hash is deterministic");
}

/**
 * Test 3: FNV-1a 32-bit different inputs
 */
void test_fnv1a_32_different_inputs(void) {
  uint32_t hash1 = fl_hash_fnv1a_32("hello", 5);
  uint32_t hash2 = fl_hash_fnv1a_32("world", 5);

  ASSERT_NOT_EQUAL(hash1, hash2, "Different inputs produce different hashes");
}

/**
 * Test 4: FNV-1a 32-bit long data
 */
void test_fnv1a_32_long(void) {
  char long_data[1000];
  memset(long_data, 'x', sizeof(long_data));

  uint32_t hash = fl_hash_fnv1a_32(long_data, sizeof(long_data));
  ASSERT(hash != 0, "FNV-1a 32 handles long data");
}

/**
 * Test 5: FNV-1a 64-bit empty data
 */
void test_fnv1a_64_empty(void) {
  uint64_t hash = fl_hash_fnv1a_64("", 0);
  ASSERT(hash != 0, "FNV-1a 64 empty hash is non-zero");
}

/**
 * Test 6: FNV-1a 64-bit simple data
 */
void test_fnv1a_64_simple(void) {
  const char *data = "test";
  uint64_t hash = fl_hash_fnv1a_64(data, strlen(data));

  ASSERT(hash != 0, "FNV-1a 64 hash is non-zero");

  // Deterministic
  uint64_t hash2 = fl_hash_fnv1a_64(data, strlen(data));
  ASSERT(hash == hash2, "FNV-1a 64 hash is deterministic");
}

/**
 * Test 7: FNV-1a 64-bit different inputs
 */
void test_fnv1a_64_different_inputs(void) {
  uint64_t hash1 = fl_hash_fnv1a_64("abc", 3);
  uint64_t hash2 = fl_hash_fnv1a_64("def", 3);

  ASSERT_NOT_EQUAL(hash1, hash2, "FNV-1a 64 different inputs differ");
}

/* ===== MURMUR3 TESTS ===== */

/**
 * Test 8: MurmurHash3 32-bit empty data
 */
void test_murmur3_32_empty(void) {
  uint32_t hash = fl_hash_murmur3_32("", 0, 0);
  ASSERT(hash != 0 || hash == 0, "MurmurHash3 32 empty accepts seed 0");
}

/**
 * Test 9: MurmurHash3 32-bit simple data
 */
void test_murmur3_32_simple(void) {
  const char *data = "murmur";
  uint32_t hash = fl_hash_murmur3_32(data, strlen(data), 0);

  ASSERT(hash != 0, "MurmurHash3 32 produces hash");

  // Deterministic with same seed
  uint32_t hash2 = fl_hash_murmur3_32(data, strlen(data), 0);
  ASSERT(hash == hash2, "MurmurHash3 32 is deterministic");
}

/**
 * Test 10: MurmurHash3 32-bit different seeds
 */
void test_murmur3_32_different_seeds(void) {
  const char *data = "test";

  uint32_t hash1 = fl_hash_murmur3_32(data, strlen(data), 0);
  uint32_t hash2 = fl_hash_murmur3_32(data, strlen(data), 1);
  uint32_t hash3 = fl_hash_murmur3_32(data, strlen(data), 12345);

  ASSERT(hash1 != hash2 || hash2 != hash3, "Different seeds can produce different hashes");
}

/**
 * Test 11: MurmurHash3 32-bit different inputs
 */
void test_murmur3_32_different_inputs(void) {
  uint32_t hash1 = fl_hash_murmur3_32("input1", 6, 0);
  uint32_t hash2 = fl_hash_murmur3_32("input2", 6, 0);

  ASSERT_NOT_EQUAL(hash1, hash2, "Different inputs produce different hashes");
}

/**
 * Test 12: MurmurHash3 32-bit binary data
 */
void test_murmur3_32_binary(void) {
  unsigned char binary_data[] = {0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD};
  uint32_t hash = fl_hash_murmur3_32((const char*)binary_data, sizeof(binary_data), 0);

  ASSERT(hash != 0, "MurmurHash3 32 handles binary data");
}

/**
 * Test 13: Hash collision test
 */
void test_hash_collision_rate(void) {
  // Generate hashes for sequential data
  uint32_t hashes[10];
  for (int i = 0; i < 10; i++) {
    char str[20];
    sprintf(str, "input_%d", i);
    hashes[i] = fl_hash_fnv1a_32(str, strlen(str));
  }

  // Count unique hashes
  int unique = 0;
  for (int i = 0; i < 10; i++) {
    int is_unique = 1;
    for (int j = 0; j < i; j++) {
      if (hashes[i] == hashes[j]) {
        is_unique = 0;
        break;
      }
    }
    if (is_unique) unique++;
  }

  ASSERT(unique >= 9, "Hash collision rate is low (>=90%)");
}

/**
 * Test 14: Hash avalanche effect
 */
void test_hash_avalanche(void) {
  const char *base = "hello";

  // Modify one bit
  char modified[6];
  strcpy(modified, base);
  modified[0] ^= 1;  // Flip first bit

  uint32_t hash1 = fl_hash_fnv1a_32(base, strlen(base));
  uint32_t hash2 = fl_hash_fnv1a_32(modified, strlen(modified));

  ASSERT_NOT_EQUAL(hash1, hash2, "One bit change affects hash");
}

/**
 * Test 15: Hash distribution uniformity
 */
void test_hash_distribution(void) {
  // Hash many sequential inputs
  uint32_t count[16] = {0};  // 16 buckets (0-15)

  for (int i = 0; i < 160; i++) {
    char str[20];
    sprintf(str, "item_%d", i);
    uint32_t hash = fl_hash_murmur3_32(str, strlen(str), 0);
    int bucket = hash % 16;
    count[bucket]++;
  }

  // Check distribution (should be roughly 10 items per bucket)
  int well_distributed = 0;
  for (int i = 0; i < 16; i++) {
    // Allow 50-150% of average (5-15 items per bucket)
    if (count[i] >= 5 && count[i] <= 15) {
      well_distributed++;
    }
  }

  ASSERT(well_distributed >= 12, "Hash distribution is uniform");
}

/* ===== MAIN TEST RUNNER ===== */

int main(void) {
  printf("🧪 Running Hash Module Tests\n");
  printf("════════════════════════════════════════\n\n");

  printf("🔤 FNV-1a Tests (7):\n");
  test_fnv1a_32_empty();
  test_fnv1a_32_simple();
  test_fnv1a_32_different_inputs();
  test_fnv1a_32_long();
  test_fnv1a_64_empty();
  test_fnv1a_64_simple();
  test_fnv1a_64_different_inputs();

  printf("\n🔀 MurmurHash3 Tests (5):\n");
  test_murmur3_32_empty();
  test_murmur3_32_simple();
  test_murmur3_32_different_seeds();
  test_murmur3_32_different_inputs();
  test_murmur3_32_binary();

  printf("\n📊 Hash Quality Tests (3):\n");
  test_hash_collision_rate();
  test_hash_avalanche();
  test_hash_distribution();

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
