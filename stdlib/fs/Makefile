# FreeLang FS Module - Makefile
# Builds libuv-based file system with Promise Bridge integration

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread
LIBUV_CFLAGS = -I/usr/include/node
LIBUV_LIBS = /usr/lib/x86_64-linux-gnu/libuv.so.1

# FFI headers
FFI_CFLAGS = -I../ffi

# Output
LIB_NAME = libfs.so
OBJ = fs.o
FFI_OBJ = ../ffi/freelang_ffi.o

# Targets
.PHONY: all clean test

all: $(LIB_NAME)

$(LIB_NAME): $(OBJ) $(FFI_OBJ)
	$(CC) -shared -o $@ $^ $(LIBUV_LIBS)

$(OBJ): fs.c fs.h ../ffi/freelang_ffi.h
	$(CC) $(CFLAGS) $(LIBUV_CFLAGS) $(FFI_CFLAGS) -c fs.c -o $@

clean:
	rm -f $(OBJ) $(LIB_NAME)

test: $(LIB_NAME)
	@echo "FS library built: $(LIB_NAME)"
	@echo "Size: $$(du -h $(LIB_NAME) | cut -f1)"
