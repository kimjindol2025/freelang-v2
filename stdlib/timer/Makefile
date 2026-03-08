# FreeLang Timer Module - Makefile
# Builds libuv-based timer with Promise Bridge integration

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread
LIBUV_CFLAGS = -I/usr/include/node
LIBUV_LIBS = /usr/lib/x86_64-linux-gnu/libuv.so.1

# FFI headers
FFI_CFLAGS = -I../ffi

# Output
LIB_NAME = libtimer.so
OBJ = timer.o
FFI_OBJ = ../ffi/freelang_ffi.o

# Targets
.PHONY: all clean test

all: $(LIB_NAME)

$(LIB_NAME): $(OBJ) $(FFI_OBJ)
	$(CC) -shared -o $@ $^ $(LIBUV_LIBS)

$(OBJ): timer.c timer.h ../ffi/freelang_ffi.h
	$(CC) $(CFLAGS) $(LIBUV_CFLAGS) $(FFI_CFLAGS) -c timer.c -o $@

clean:
	rm -f $(OBJ) $(LIB_NAME)

test: $(LIB_NAME)
	@echo "Timer library built: $(LIB_NAME)"
	@echo "Size: $$(du -h $(LIB_NAME) | cut -f1)"

install: $(LIB_NAME)
	cp $(LIB_NAME) /usr/local/lib/
	cp timer.h /usr/local/include/

uninstall:
	rm -f /usr/local/lib/$(LIB_NAME)
	rm -f /usr/local/include/timer.h
