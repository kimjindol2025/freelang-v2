/**
 * Security Macros - Buffer Overflow Prevention
 */

#ifndef FREELANG_SECURITY_MACROS_H
#define FREELANG_SECURITY_MACROS_H

#include <string.h>
#include <stdio.h>

/* Safe string copy with null termination */
#define SAFE_STRCPY(dst, src) do { \
    strncpy(dst, src, sizeof(dst) - 1); \
    dst[sizeof(dst) - 1] = '\0'; \
} while(0)

/* Safe string concatenation */
#define SAFE_STRCAT(dst, src) do { \
    size_t remaining = sizeof(dst) - strlen(dst) - 1; \
    if (remaining > 0) strncat(dst, src, remaining); \
} while(0)

/* Safe sprintf wrapper */
#define SAFE_SPRINTF(dst, fmt, ...) do { \
    snprintf(dst, sizeof(dst), fmt, ##__VA_ARGS__); \
} while(0)

#endif
