# FreeLang Process Module - Makefile (Phase 16 Week 4 Skeleton)
# Builds process management skeleton with libuv integration (full implementation Week 9)

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread
LIBUV_CFLAGS = -I/usr/include/node
LIBUV_LIBS = /usr/lib/x86_64-linux-gnu/libuv.so.1

# FFI headers
FFI_CFLAGS = -I../ffi

# Output
LIB_NAME = libprocess.so
OBJ = spawn.o
FFI_OBJ = ../ffi/freelang_ffi.o

# Targets
.PHONY: all clean test

all: $(LIB_NAME)

$(LIB_NAME): $(OBJ) $(FFI_OBJ)
	$(CC) -shared -o $@ $^ $(LIBUV_LIBS)

$(OBJ): spawn.c spawn.h ../ffi/freelang_ffi.h
	$(CC) $(CFLAGS) $(LIBUV_CFLAGS) $(FFI_CFLAGS) -c spawn.c -o $@

clean:
	rm -f $(OBJ) $(LIB_NAME)

test: $(LIB_NAME)
	@echo "Process library built (skeleton): $(LIB_NAME)"
	@echo "Size: $$(du -h $(LIB_NAME) | cut -f1)"
	@echo "Note: Full implementation in Week 9 Phase 18"
