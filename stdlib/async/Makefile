# FreeLang stdlib/async - Async Module Build

CC = gcc
CFLAGS = -Wall -Wextra -fPIC -O2 -pthread -I..
LDFLAGS = -shared -pthread

SRC_DIR = .
BUILD_DIR = build
DIST_DIR = ../../dist/stdlib

SOURCES = $(SRC_DIR)/async.c
OBJECTS = $(patsubst $(SRC_DIR)/%.c,$(BUILD_DIR)/%.o,$(SOURCES))
TARGET = $(DIST_DIR)/libasync.so

.PHONY: all clean

all: $(TARGET)
	@echo "✅ libasync.so built successfully"

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

$(DIST_DIR):
	@mkdir -p $(DIST_DIR)

$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c | $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(TARGET): $(OBJECTS) | $(DIST_DIR)
	$(CC) $(LDFLAGS) $(OBJECTS) -o $@
	@echo "✅ libasync.so created: $(TARGET)"

clean:
	@rm -rf $(BUILD_DIR) $(TARGET)
	@echo "✅ Cleaned"
