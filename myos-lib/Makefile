# MyOS_Lib - Zero-Dependency Build System

CC = gcc
CFLAGS = -fPIC -Wall -Wextra -O2 -nostdlib -fno-builtin -fno-stack-protector
LDFLAGS = -nostdlib

INCLUDE_DIR = include
SRC_DIR = src
ARCH_DIR = arch/x86_64
TEST_DIR = tests
BUILD_DIR = build
BIN_DIR = build/bin

.PHONY: all clean test build dirs

all: build test

dirs:
	@mkdir -p $(BUILD_DIR) $(BIN_DIR)

build: dirs $(BIN_DIR)/test_memory $(BIN_DIR)/test_string $(BIN_DIR)/test_array $(BIN_DIR)/test_hashmap $(BIN_DIR)/test_io $(BIN_DIR)/test_log $(BIN_DIR)/test_timer

$(BUILD_DIR)/syscall.o: $(ARCH_DIR)/syscall.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/memory.o: $(SRC_DIR)/memory.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/string.o: $(SRC_DIR)/string.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/array.o: $(SRC_DIR)/array.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/hash.o: $(SRC_DIR)/hash.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/hashmap.o: $(SRC_DIR)/hashmap.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_memory.o: $(TEST_DIR)/test_memory.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_string.o: $(TEST_DIR)/test_string.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_array.o: $(TEST_DIR)/test_array.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_hashmap.o: $(TEST_DIR)/test_hashmap.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/io.o: $(SRC_DIR)/io.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_io.o: $(TEST_DIR)/test_io.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/log.o: $(SRC_DIR)/log.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_log.o: $(TEST_DIR)/test_log.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/timer.o: $(SRC_DIR)/timer.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_timer.o: $(TEST_DIR)/test_timer.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BIN_DIR)/test_memory: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/memory.o $(BUILD_DIR)/test_memory.o
	$(CC) $(LDFLAGS) -o $@ $^

$(BIN_DIR)/test_string: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/memory.o $(BUILD_DIR)/string.o $(BUILD_DIR)/test_string.o
	$(CC) $(LDFLAGS) -o $@ $^

$(BIN_DIR)/test_array: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/memory.o $(BUILD_DIR)/array.o $(BUILD_DIR)/test_array.o
	$(CC) $(LDFLAGS) -o $@ $^

$(BIN_DIR)/test_hashmap: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/memory.o $(BUILD_DIR)/string.o $(BUILD_DIR)/hash.o $(BUILD_DIR)/hashmap.o $(BUILD_DIR)/test_hashmap.o
	$(CC) $(LDFLAGS) -o $@ $^

$(BIN_DIR)/test_io: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/io.o $(BUILD_DIR)/test_io.o
	$(CC) $(LDFLAGS) -o $@ $^

$(BIN_DIR)/test_log: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/io.o $(BUILD_DIR)/log.o $(BUILD_DIR)/test_log.o
	$(CC) $(LDFLAGS) -o $@ $^

$(BIN_DIR)/test_timer: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/io.o $(BUILD_DIR)/timer.o $(BUILD_DIR)/test_timer.o
	$(CC) $(LDFLAGS) -o $@ $^

test: $(BIN_DIR)/test_memory $(BIN_DIR)/test_string $(BIN_DIR)/test_array $(BIN_DIR)/test_hashmap $(BIN_DIR)/test_io $(BIN_DIR)/test_log $(BIN_DIR)/test_timer
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.1 Memory Tests      ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_memory
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.2 String Tests      ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_string
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.3 Array Tests       ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_array
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.4 HashMap Tests     ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_hashmap
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.5 IO Tests          ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_io
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.6 Logging Tests     ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_log
	@echo ""
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.7 Timer Tests       ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_timer
	@echo ""

clean:
	@rm -rf $(BUILD_DIR)
	@echo "Cleaned: build directory removed"
