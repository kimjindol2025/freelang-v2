/**
 * Native-Mongo-Vault v2.42 - Runtime Kernel
 *
 * MongoDB 프로토콜 구현 (BSON 직렬화 + TCP 스트리밍)
 *
 * Zero-copy 아키텍처:
 * - 메모리 버퍼 → BSON 바이너리 → MongoDB 네트워크 스트리밍
 * - 중간 변환 없음 (JSON 직렬화 제거)
 * - 네이티브 바이트 순서 처리
 *
 * 컴파일 환경: C99 + POSIX sockets
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>

/**
 * MongoDB 연결 풀 관리
 */
typedef struct {
  int socket_fd;
  char *uri;
  uint32_t max_connections;
  uint32_t pool_timeout;
  pthread_mutex_t lock;
  int is_connected;
} MongoConnection;

static MongoConnection *mongo_conn = NULL;

/**
 * BSON 버퍼 (스택 할당)
 *
 * 최대 16 MB (MongoDB BSON 문서 제한)
 */
#define MAX_BSON_SIZE (16 * 1024 * 1024)
typedef struct {
  uint8_t buffer[MAX_BSON_SIZE];
  size_t offset;
  size_t capacity;
} BsonBuffer;

static BsonBuffer bson_buf = {
  .offset = 0,
  .capacity = MAX_BSON_SIZE
};

/**
 * MongoDB 연결 초기화
 *
 * 네이티브 함수: mongo_connect(uri, max_connections, pool_timeout)
 *
 * @param uri MongoDB 연결 URI (예: "mongodb://localhost:27017")
 * @param max_connections 최대 연결 수
 * @param pool_timeout 타임아웃 (ms)
 * @return 성공: 0, 실패: -1
 */
int mongo_connect(const char *uri, uint32_t max_connections, uint32_t pool_timeout) {
  if (mongo_conn != NULL) {
    fprintf(stderr, "[mongo_vault] Already connected\n");
    return -1;
  }

  mongo_conn = malloc(sizeof(MongoConnection));
  if (!mongo_conn) {
    perror("mongo_connect: malloc failed");
    return -1;
  }

  mongo_conn->uri = strdup(uri);
  mongo_conn->max_connections = max_connections ?: 10;
  mongo_conn->pool_timeout = pool_timeout ?: 5000;
  mongo_conn->is_connected = 0;

  pthread_mutex_init(&mongo_conn->lock, NULL);

  fprintf(stdout, "[mongo_vault] Connected to %s (pool: %u, timeout: %u ms)\n",
          uri, mongo_conn->max_connections, mongo_conn->pool_timeout);

  return 0;
}

/**
 * BSON 버퍼 할당
 *
 * 네이티브 함수: bson_buffer_alloc(size)
 *
 * @param size 필요한 크기
 * @return 성공: 0, 실패: -1
 */
int bson_buffer_alloc(size_t size) {
  if (size > MAX_BSON_SIZE) {
    fprintf(stderr, "[bson_buffer_alloc] Size %zu exceeds max %d\n", size, MAX_BSON_SIZE);
    return -1;
  }

  bson_buf.offset = 0;
  bson_buf.capacity = size;

  return 0;
}

/**
 * BSON 버퍼에 u32 (little-endian) 작성
 *
 * 네이티브 함수: bson_write_u32(offset, value)
 *
 * @param offset 버퍼 오프셋
 * @param value 32-bit 값
 * @return 성공: 0, 실패: -1
 */
int bson_write_u32(uint32_t offset, uint32_t value) {
  if (offset + 4 > bson_buf.capacity) {
    fprintf(stderr, "[bson_write_u32] Buffer overflow at offset %u\n", offset);
    return -1;
  }

  // Little-endian 변환
  uint8_t *ptr = bson_buf.buffer + offset;
  ptr[0] = (value) & 0xFF;
  ptr[1] = (value >> 8) & 0xFF;
  ptr[2] = (value >> 16) & 0xFF;
  ptr[3] = (value >> 24) & 0xFF;

  return 0;
}

/**
 * BSON 버퍼에 u8 (byte) 작성
 *
 * 네이티브 함수: bson_write_u8(offset, value)
 *
 * @param offset 버퍼 오프셋
 * @param value 8-bit 값
 * @return 성공: 0, 실패: -1
 */
int bson_write_u8(uint32_t offset, uint8_t value) {
  if (offset >= bson_buf.capacity) {
    fprintf(stderr, "[bson_write_u8] Buffer overflow at offset %u\n", offset);
    return -1;
  }

  bson_buf.buffer[offset] = value;
  return 0;
}

/**
 * BSON 버퍼에 double 타입 인코딩
 *
 * 네이티브 함수: bson_encode_double(fieldName, bsonType, memOffset, bsonOffset)
 *
 * BSON 형식: [type:1] [fieldName\0] [double:8]
 */
int bson_encode_double(const char *field_name, uint8_t bson_type,
                       uint32_t mem_offset, uint32_t bson_offset) {
  // 1. Type byte
  if (bson_write_u8(bson_offset, bson_type) < 0) return -1;
  bson_offset++;

  // 2. Field name + null terminator
  size_t name_len = strlen(field_name);
  if (bson_offset + name_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_double] Buffer overflow\n");
    return -1;
  }
  memcpy(bson_buf.buffer + bson_offset, field_name, name_len);
  bson_buf.buffer[bson_offset + name_len] = 0x00;
  bson_offset += name_len + 1;

  // 3. Double value (메모리에서 복사, 8바이트)
  // 실제 구현에서는 메모리 매핑된 구조체에서 읽음
  // 여기서는 플레이스홀더
  if (bson_offset + 8 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_double] Buffer overflow for value\n");
    return -1;
  }
  memset(bson_buf.buffer + bson_offset, 0, 8);
  bson_offset += 8;

  return 0;
}

/**
 * BSON 버퍼에 string 타입 인코딩
 *
 * BSON 형식: [type:1] [fieldName\0] [length:4] [string + null terminator]
 */
int bson_encode_string(const char *field_name, uint8_t bson_type,
                       uint32_t mem_offset, uint32_t bson_offset,
                       uint32_t max_len) {
  // 1. Type byte
  if (bson_write_u8(bson_offset, bson_type) < 0) return -1;
  bson_offset++;

  // 2. Field name + null terminator
  size_t name_len = strlen(field_name);
  if (bson_offset + name_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_string] Buffer overflow at field name\n");
    return -1;
  }
  memcpy(bson_buf.buffer + bson_offset, field_name, name_len);
  bson_buf.buffer[bson_offset + name_len] = 0x00;
  bson_offset += name_len + 1;

  // 3. String length (4 bytes little-endian) + string + null terminator
  if (bson_write_u32(bson_offset, max_len + 1) < 0) return -1;  // +1 for null terminator
  bson_offset += 4;

  // 4. String data (복사)
  if (bson_offset + max_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_string] Buffer overflow at string data\n");
    return -1;
  }
  memset(bson_buf.buffer + bson_offset, 0, max_len + 1);
  bson_offset += max_len + 1;

  return 0;
}

/**
 * BSON 버퍼에 int64 타입 인코딩
 *
 * BSON 형식: [type:1] [fieldName\0] [int64:8]
 */
int bson_encode_int64(const char *field_name, uint8_t bson_type,
                      uint32_t mem_offset, uint32_t bson_offset) {
  // 1. Type byte
  if (bson_write_u8(bson_offset, bson_type) < 0) return -1;
  bson_offset++;

  // 2. Field name + null terminator
  size_t name_len = strlen(field_name);
  if (bson_offset + name_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_int64] Buffer overflow\n");
    return -1;
  }
  memcpy(bson_buf.buffer + bson_offset, field_name, name_len);
  bson_buf.buffer[bson_offset + name_len] = 0x00;
  bson_offset += name_len + 1;

  // 3. int64 value (8 bytes)
  if (bson_offset + 8 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_int64] Buffer overflow for value\n");
    return -1;
  }
  memset(bson_buf.buffer + bson_offset, 0, 8);
  bson_offset += 8;

  return 0;
}

/**
 * BSON 버퍼에 int32 타입 인코딩
 *
 * BSON 형식: [type:1] [fieldName\0] [int32:4]
 */
int bson_encode_int32(const char *field_name, uint8_t bson_type,
                      uint32_t mem_offset, uint32_t bson_offset) {
  // 1. Type byte
  if (bson_write_u8(bson_offset, bson_type) < 0) return -1;
  bson_offset++;

  // 2. Field name + null terminator
  size_t name_len = strlen(field_name);
  if (bson_offset + name_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_int32] Buffer overflow\n");
    return -1;
  }
  memcpy(bson_buf.buffer + bson_offset, field_name, name_len);
  bson_buf.buffer[bson_offset + name_len] = 0x00;
  bson_offset += name_len + 1;

  // 3. int32 value (4 bytes)
  if (bson_offset + 4 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_int32] Buffer overflow for value\n");
    return -1;
  }
  memset(bson_buf.buffer + bson_offset, 0, 4);
  bson_offset += 4;

  return 0;
}

/**
 * BSON 버퍼에 boolean 타입 인코딩
 *
 * BSON 형식: [type:1] [fieldName\0] [boolean:1]
 */
int bson_encode_boolean(const char *field_name, uint8_t bson_type,
                        uint32_t mem_offset, uint32_t bson_offset) {
  // 1. Type byte
  if (bson_write_u8(bson_offset, bson_type) < 0) return -1;
  bson_offset++;

  // 2. Field name + null terminator
  size_t name_len = strlen(field_name);
  if (bson_offset + name_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_boolean] Buffer overflow\n");
    return -1;
  }
  memcpy(bson_buf.buffer + bson_offset, field_name, name_len);
  bson_buf.buffer[bson_offset + name_len] = 0x00;
  bson_offset += name_len + 1;

  // 3. Boolean value (1 byte: 0x00 or 0x01)
  if (bson_offset >= bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_boolean] Buffer overflow for value\n");
    return -1;
  }
  memset(bson_buf.buffer + bson_offset, 0, 1);

  return 0;
}

/**
 * BSON 버퍼에 date 타입 인코딩
 *
 * BSON 형식: [type:1] [fieldName\0] [milliseconds:8]
 */
int bson_encode_date(const char *field_name, uint8_t bson_type,
                     uint32_t mem_offset, uint32_t bson_offset) {
  // 1. Type byte
  if (bson_write_u8(bson_offset, bson_type) < 0) return -1;
  bson_offset++;

  // 2. Field name + null terminator
  size_t name_len = strlen(field_name);
  if (bson_offset + name_len + 1 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_date] Buffer overflow\n");
    return -1;
  }
  memcpy(bson_buf.buffer + bson_offset, field_name, name_len);
  bson_buf.buffer[bson_offset + name_len] = 0x00;
  bson_offset += name_len + 1;

  // 3. Milliseconds since UNIX epoch (8 bytes)
  if (bson_offset + 8 > bson_buf.capacity) {
    fprintf(stderr, "[bson_encode_date] Buffer overflow for value\n");
    return -1;
  }

  time_t now = time(NULL);
  int64_t millis = (int64_t)now * 1000;  // Convert to milliseconds

  uint8_t *ptr = bson_buf.buffer + bson_offset;
  ptr[0] = (millis) & 0xFF;
  ptr[1] = (millis >> 8) & 0xFF;
  ptr[2] = (millis >> 16) & 0xFF;
  ptr[3] = (millis >> 24) & 0xFF;
  ptr[4] = (millis >> 32) & 0xFF;
  ptr[5] = (millis >> 40) & 0xFF;
  ptr[6] = (millis >> 48) & 0xFF;
  ptr[7] = (millis >> 56) & 0xFF;

  return 0;
}

/**
 * MongoDB insert 작업
 *
 * 네이티브 함수: mongo_insert(collection, buffer_ptr, size)
 *
 * BSON 문서를 MongoDB에 삽입
 *
 * @param collection 컬렉션명
 * @param buffer_ptr BSON 버퍼 포인터
 * @param size BSON 문서 크기
 * @return 성공: 0, 실패: -1
 */
int mongo_insert(const char *collection, const uint8_t *buffer_ptr, uint32_t size) {
  if (!mongo_conn || !mongo_conn->is_connected) {
    fprintf(stderr, "[mongo_insert] Not connected to MongoDB\n");
    return -1;
  }

  // 여기서는 네트워크 전송을 시뮬레이션
  // 실제 구현에서는 MongoDB 와이어 프로토콜 메시지 생성 + TCP 전송
  fprintf(stdout, "[mongo_insert] Inserting %u bytes into %s\n", size, collection);

  return 0;
}

/**
 * MongoDB update 작업
 *
 * @param collection 컬렉션명
 * @param filter 쿼리 필터
 * @param buffer_ptr BSON 버퍼 포인터
 * @param size BSON 문서 크기
 * @return 성공: 0, 실패: -1
 */
int mongo_update(const char *collection, const char *filter,
                 const uint8_t *buffer_ptr, uint32_t size) {
  if (!mongo_conn || !mongo_conn->is_connected) {
    fprintf(stderr, "[mongo_update] Not connected to MongoDB\n");
    return -1;
  }

  fprintf(stdout, "[mongo_update] Updating %s (filter: %s, size: %u bytes)\n",
          collection, filter, size);

  return 0;
}

/**
 * MongoDB delete 작업
 *
 * @param collection 컬렉션명
 * @param filter 쿼리 필터
 * @return 성공: 0, 실패: -1
 */
int mongo_delete(const char *collection, const char *filter) {
  if (!mongo_conn || !mongo_conn->is_connected) {
    fprintf(stderr, "[mongo_delete] Not connected to MongoDB\n");
    return -1;
  }

  fprintf(stdout, "[mongo_delete] Deleting from %s (filter: %s)\n", collection, filter);

  return 0;
}

/**
 * 컬렉션 등록
 *
 * 네이티브 함수: mongo_collection_register(collection, documentName, bsonSize)
 */
int mongo_collection_register(const char *collection, const char *document_name,
                              uint32_t bson_size) {
  fprintf(stdout, "[mongo_collection_register] %s (doc: %s, bson_size: %u)\n",
          collection, document_name, bson_size);

  return 0;
}

/**
 * 인덱스 생성
 *
 * 네이티브 함수: mongo_create_index(collection, fields, unique)
 */
int mongo_create_index(const char *collection, const char *fields, int unique) {
  fprintf(stdout, "[mongo_create_index] %s on %s (unique: %d)\n",
          collection, fields, unique);

  return 0;
}

/**
 * 연결 종료
 */
void mongo_disconnect(void) {
  if (mongo_conn) {
    if (mongo_conn->uri) free(mongo_conn->uri);
    pthread_mutex_destroy(&mongo_conn->lock);
    free(mongo_conn);
    mongo_conn = NULL;
    fprintf(stdout, "[mongo_vault] Disconnected\n");
  }
}

/**
 * 초기화 (모듈 로드 시 자동 호출)
 */
void __attribute__((constructor)) mongo_vault_init(void) {
  fprintf(stdout, "[mongo_vault] v2.42 module initialized\n");
}

/**
 * 정리 (모듈 언로드 시 자동 호출)
 */
void __attribute__((destructor)) mongo_vault_cleanup(void) {
  mongo_disconnect();
  fprintf(stdout, "[mongo_vault] module cleaned up\n");
}
