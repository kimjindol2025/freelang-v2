/**
 * FreeLang v2.40 - Native Entropy Core (entropy_core.v2.c)
 *
 * Kernel-level entropy source for UUID v4 generation
 * - /dev/urandom 직접 호출
 * - RDRAND 하드웨어 난수생성기 (Intel/AMD)
 * - 128-bit 바이너리 직접 할당 (문자열 변환 없음)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/stat.h>

/* CPU RDRAND 가용성 확인 */
#ifdef __x86_64__
  #define HAS_RDRAND 1
  #include <immintrin.h>
#else
  #define HAS_RDRAND 0
#endif

/**
 * 엔트로피 상태 저장소 (글로벌)
 * 런타임 초기화 시 한 번만 열기
 */
static int entropy_fd = -1;
static int entropy_source = 0;  // 0: /dev/urandom, 1: RDRAND, -1: not initialized

#define ENTROPY_SOURCE_URANDOM 0
#define ENTROPY_SOURCE_RDRAND 1
#define ENTROPY_SOURCE_HYBRID 2

/**
 * entropy_init()
 * /dev/urandom 또는 RDRAND 초기화
 * Return: 0 (success), -1 (failure)
 */
int entropy_init() {
  if (entropy_source != 0 && entropy_fd != -1) {
    return 0;  // Already initialized
  }

#ifdef HAS_RDRAND
  // CPU에 RDRAND 지원 확인 (cpuid 사용)
  unsigned int eax, edx;
  __cpuid(1, eax, eax, eax, edx);
  if (edx & (1 << 30)) {
    entropy_source = ENTROPY_SOURCE_RDRAND;
    return 0;
  }
#endif

  // Fallback: /dev/urandom
  entropy_fd = open("/dev/urandom", O_RDONLY);
  if (entropy_fd < 0) {
    perror("Failed to open /dev/urandom");
    return -1;
  }

  entropy_source = ENTROPY_SOURCE_URANDOM;
  return 0;
}

/**
 * entropy_generate_128bit(buf[16])
 * 128-bit (16 바이트) 난수 직접 할당
 *
 * UUID v4 형식 (RFC 4122):
 * - Bits 0-3: version (0100 = v4)
 * - Bits 4-7: variant (10xx = RFC 4122)
 * - Bits 8-127: random
 *
 * Return: 0 (success), -1 (failure)
 */
int entropy_generate_128bit(unsigned char* buf, int buflen) {
  if (buflen < 16) {
    return -1;
  }

  if (entropy_source < 0) {
    if (entropy_init() < 0) {
      return -1;
    }
  }

#ifdef HAS_RDRAND
  if (entropy_source == ENTROPY_SOURCE_RDRAND) {
    // Intel RDRAND 사용
    unsigned long long *ptr = (unsigned long long *)buf;

    // 64-bit × 2 = 128-bit
    if (!_rdrand64_step(&ptr[0])) {
      goto fallback_urandom;
    }
    if (!_rdrand64_step(&ptr[1])) {
      goto fallback_urandom;
    }

    // UUID v4 바이트 조정 (RFC 4122)
    buf[6] = (buf[6] & 0x0F) | 0x40;  // version 4
    buf[8] = (buf[8] & 0x3F) | 0x80;  // variant

    return 0;
  }

fallback_urandom:
#endif

  // /dev/urandom에서 16바이트 읽기
  ssize_t n = read(entropy_fd, buf, 16);
  if (n < 16) {
    perror("Failed to read from /dev/urandom");
    return -1;
  }

  // UUID v4 바이트 조정
  buf[6] = (buf[6] & 0x0F) | 0x40;  // version 4
  buf[8] = (buf[8] & 0x3F) | 0x80;  // variant

  return 0;
}

/**
 * entropy_cleanup()
 * 엔트로피 리소스 정리
 */
void entropy_cleanup() {
  if (entropy_fd >= 0) {
    close(entropy_fd);
    entropy_fd = -1;
  }
  entropy_source = -1;
}

/**
 * entropy_stats()
 * 현재 엔트로피 소스 상태 반환
 * Return: 0 (urandom), 1 (rdrand), -1 (not initialized)
 */
int entropy_stats() {
  if (entropy_source < 0) {
    entropy_init();
  }
  return entropy_source;
}

/* 테스트 바이너리 (선택사항) */
#ifdef ENTROPY_STANDALONE_TEST
#include <stdio.h>

int main() {
  unsigned char uuid[16];

  if (entropy_init() < 0) {
    fprintf(stderr, "Failed to initialize entropy\n");
    return 1;
  }

  if (entropy_generate_128bit(uuid, 16) < 0) {
    fprintf(stderr, "Failed to generate UUID\n");
    return 1;
  }

  printf("Generated UUID (hex): ");
  for (int i = 0; i < 16; i++) {
    printf("%02x", uuid[i]);
  }
  printf("\n");

  printf("Entropy source: %d\n", entropy_stats());

  entropy_cleanup();
  return 0;
}
#endif
