import * as fs from 'fs';
import * as path from 'path';
import { FileIO, testFileIO } from '../src/phase-10/file-io';

describe('Phase 10: File I/O Operations', () => {
  const testDir = '/tmp/freelang-test';
  const testFile = path.join(testDir, 'test.txt');
  const fileIO = new FileIO();

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File Operations', () => {
    it('should write and read files', () => {
      const content = 'Hello, FreeLang!';
      fileIO.writeFile(testFile, content);
      const read = fileIO.readFile(testFile);
      expect(read).toBe(content);
    });

    it('should append to files', () => {
      fileIO.writeFile(testFile, 'Line 1\n');
      fileIO.appendFile(testFile, 'Line 2\n');
      const content = fileIO.readFile(testFile);
      expect(content).toContain('Line 1');
      expect(content).toContain('Line 2');
    });

    it('should check file existence', () => {
      fileIO.writeFile(testFile, 'exists');
      expect(fileIO.exists(testFile)).toBe(true);
      fs.unlinkSync(testFile);
      expect(fileIO.exists(testFile)).toBe(false);
    });

    it('should get file stats', () => {
      const content = 'test content';
      fileIO.writeFile(testFile, content);
      const info = fileIO.stat(testFile);
      expect(info.name).toBe('test.txt');
      expect(info.size).toBe(content.length);
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
    });

    it('should delete files', () => {
      fileIO.writeFile(testFile, 'delete me');
      expect(fileIO.exists(testFile)).toBe(true);
      fileIO.deleteFile(testFile);
      expect(fileIO.exists(testFile)).toBe(false);
    });

    it('should copy files', () => {
      const source = testFile;
      const dest = path.join(testDir, 'copy.txt');
      fileIO.writeFile(source, 'content');
      fileIO.copyFile(source, dest);
      expect(fileIO.readFile(dest)).toBe('content');
      fs.unlinkSync(dest);
    });

    it('should move files', () => {
      const source = testFile;
      const dest = path.join(testDir, 'moved.txt');
      fileIO.writeFile(source, 'move me');
      fileIO.moveFile(source, dest);
      expect(fileIO.exists(dest)).toBe(true);
      expect(fileIO.exists(source)).toBe(false);
      fs.unlinkSync(dest);
    });

    it('should format file size', () => {
      expect(fileIO.formatFileSize(1024)).toBe('1.00 KB');
      expect(fileIO.formatFileSize(1024 * 1024)).toContain('MB');
      expect(fileIO.formatFileSize(512)).toBe('512.00 B');
    });

    it('should get file size in MB', () => {
      const content = 'x'.repeat(1000);
      fileIO.writeFile(testFile, content);
      const size = fileIO.getFileSizeMB(testFile);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('Directory Operations', () => {
    it('should create directories', () => {
      const newDir = path.join(testDir, 'subdir');
      fileIO.createDirectory(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
      fs.rmdirSync(newDir);
    });

    it('should list files in directory', () => {
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(testDir, 'file2.txt'), 'content2');
      const files = fileIO.listFiles(testDir);
      expect(files.length).toBeGreaterThanOrEqual(2);
      fs.unlinkSync(path.join(testDir, 'file1.txt'));
      fs.unlinkSync(path.join(testDir, 'file2.txt'));
    });

    it('should delete directories', () => {
      const dir = path.join(testDir, 'todelete');
      fs.mkdirSync(dir);
      fileIO.deleteDirectory(dir);
      expect(fs.existsSync(dir)).toBe(false);
    });

    it('should recursively delete directories', () => {
      const dir = path.join(testDir, 'recursive');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'file.txt'), 'content');
      fileIO.deleteDirectory(dir, true);
      expect(fs.existsSync(dir)).toBe(false);
    });
  });

  describe('Line Operations', () => {
    it('should read all lines', () => {
      fileIO.writeFile(testFile, 'Line 1\nLine 2\nLine 3\n');
      const lines = fileIO.readLines(testFile);
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });

    it('should read first N lines', () => {
      fileIO.writeFile(testFile, 'Line 1\nLine 2\nLine 3\nLine 4\n');
      const lines = fileIO.readHead(testFile, 2);
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('should read last N lines', () => {
      fileIO.writeFile(testFile, 'Line 1\nLine 2\nLine 3\nLine 4\n');
      const lines = fileIO.readTail(testFile, 2);
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });

    it('should read line by line with callback', async () => {
      fileIO.writeFile(testFile, 'a\nb\nc\n');
      const lines: string[] = [];
      await fileIO.readLineByLine(testFile, (line) => {
        lines.push(line);
      });
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Path Operations', () => {
    it('should resolve paths', () => {
      const resolved = fileIO.resolvePath('./test');
      expect(resolved).toContain('test');
    });

    it('should join paths', () => {
      const joined = fileIO.joinPath('/home', 'user', 'file.txt');
      expect(joined).toContain('file.txt');
    });

    it('should extract basename', () => {
      expect(fileIO.basename('/path/to/file.txt')).toBe('file.txt');
    });

    it('should extract dirname', () => {
      const dir = fileIO.dirname('/path/to/file.txt');
      expect(dir).toContain('to');
    });

    it('should extract extension', () => {
      expect(fileIO.extname('file.txt')).toBe('.txt');
      expect(fileIO.extname('archive.tar.gz')).toBe('.gz');
    });

    it('should get current directory', () => {
      const cwd = fileIO.getCurrentDirectory();
      expect(cwd).toBeTruthy();
    });

    it('should get home directory', () => {
      const home = fileIO.getHomeDirectory();
      expect(home).toBeTruthy();
    });

    it('should create temporary file', () => {
      const temp = fileIO.createTempFile('test_');
      expect(temp).toContain('test_');
      expect(temp).toContain('/tmp');
    });
  });

  // Integration test
  it('should run file I/O tests without errors', () => {
    expect(() => testFileIO()).not.toThrow();
  });
});
