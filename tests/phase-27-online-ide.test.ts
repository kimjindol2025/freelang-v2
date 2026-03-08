/**
 * 🧪 Phase 27: Online IDE & Documentation Tests
 *
 * 15+ test cases covering:
 * - Web-based editor (Ace.js integration)
 * - Real-time compilation (WASM)
 * - Example library (50+ examples)
 * - API documentation (Swagger/OpenAPI)
 * - Tutorial system (30 guides)
 * - Community forum (Gogs Wiki)
 * - Developer onboarding
 */

import { OnlineIDE, CompileResult } from '../src/phase-27/ide/editor';
import { ExampleManager } from '../src/phase-27/examples/example-manager';
import { TutorialSystem } from '../src/phase-27/tutorials/tutorial-system';
import { APIDocGenerator } from '../src/phase-27/api/api-doc-generator';
import { IntegratedIDE } from '../src/phase-27/ide/integrated-ide';

describe('Phase 27: Online IDE & Documentation System', () => {

  // ============ Editor Tests ============

  describe('Web-based Editor (Ace.js Integration)', () => {
    let editor: OnlineIDE;

    beforeEach(() => {
      editor = new OnlineIDE({
        theme: 'dark',
        fontSize: 14,
        language: 'freelang'
      });
    });

    test('Should initialize editor with default config', () => {
      const config = editor.getConfig();
      expect(config.theme).toBe('dark');
      expect(config.fontSize).toBe(14);
      expect(config.language).toBe('freelang');
    });

    test('Should update editor code', () => {
      const code = 'fn sum\ninput: array<number>\noutput: number';
      editor.setCode(code);
      expect(editor.getCode()).toBe(code);
    });

    test('Should handle syntax errors', async () => {
      editor.setCode('fn test { ( }'); // Mismatched parentheses
      const result = await editor.compile();
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('Should compile valid code', async () => {
      editor.setCode('fn main\ninput: void\noutput: string\n{ "Hello" }');
      const result = await editor.compile();
      expect(result.success).toBe(true);
      expect(result.bytecode).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('Should generate valid bytecode', async () => {
      editor.setCode('fn add\ninput: number, number\noutput: number\n{ $1 + $2 }');
      const result = await editor.compile();
      expect(result.bytecode).toBeTruthy();
      expect(Array.isArray(result.bytecode)).toBe(true);
    });

    test('Should cache compilation results', async () => {
      const code = 'fn test { 42 }';
      editor.setCode(code);

      const result1 = await editor.compile();
      const result2 = await editor.compile();

      expect(result1.bytecode).toEqual(result2.bytecode);
    });

    test('Should update editor configuration', () => {
      editor.updateConfig({ fontSize: 16, theme: 'light' });
      const config = editor.getConfig();
      expect(config.fontSize).toBe(16);
      expect(config.theme).toBe('light');
    });

    test('Should validate warnings', async () => {
      editor.setCode('let unused = 42;');
      const result = await editor.compile();
      // May have warnings for unused variables
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ============ Example Library Tests ============

  describe('Example Library (50+ Examples)', () => {
    let exampleManager: ExampleManager;

    beforeEach(() => {
      exampleManager = new ExampleManager();
    });

    test('Should load built-in examples', () => {
      const examples = exampleManager.getAllExamples();
      expect(examples.length).toBeGreaterThan(0);
    });

    test('Should get examples by category', () => {
      const basicExamples = exampleManager.getExamplesByCategory('basic');
      expect(basicExamples.length).toBeGreaterThan(0);
      basicExamples.forEach(ex => {
        expect(ex.category).toBe('basic');
      });
    });

    test('Should get examples by difficulty', () => {
      const easyExamples = exampleManager.getExamplesByDifficulty(1);
      easyExamples.forEach(ex => {
        expect(ex.difficulty).toBe(1);
      });
    });

    test('Should search examples by tag', () => {
      const mathExamples = exampleManager.searchByTag('math');
      mathExamples.forEach(ex => {
        expect(ex.tags).toContain('math');
      });
    });

    test('Should add custom examples', () => {
      const customExample = {
        id: 'custom-test',
        title: 'Custom Test',
        description: 'Test custom example',
        category: 'basic' as const,
        difficulty: 1 as const,
        code: 'fn test { 42 }',
        tags: ['test'],
        author: 'Test',
        createdAt: Date.now()
      };

      const added = exampleManager.addExample(customExample);
      expect(added).toBe(true);

      const retrieved = exampleManager.getExample('custom-test');
      expect(retrieved).toEqual(customExample);
    });

    test('Should get recommended examples by difficulty', () => {
      const recommended = exampleManager.getRecommendedExamples(2, 5);
      expect(recommended.length).toBeLessThanOrEqual(5);
      recommended.forEach(ex => {
        expect(Math.abs(ex.difficulty - 2)).toBeLessThanOrEqual(1);
      });
    });

    test('Should provide learning track', () => {
      const beginnerTrack = exampleManager.getLearningTrack('beginner');
      beginnerTrack.forEach(ex => {
        expect(ex.difficulty).toBeLessThanOrEqual(2);
      });
    });

    test('Should generate example statistics', () => {
      const stats = exampleManager.getStats();
      expect(stats.totalExamples).toBeGreaterThan(0);
      expect(stats.totalCategories).toBeGreaterThan(0);
      expect(stats.averageDifficulty).toBeGreaterThan(0);
      expect(typeof stats.tagCloud).toBe('object');
    });
  });

  // ============ Tutorial System Tests ============

  describe('Tutorial System (30 Guides)', () => {
    let tutorialSystem: TutorialSystem;

    beforeEach(() => {
      tutorialSystem = new TutorialSystem();
    });

    test('Should load built-in tutorials', () => {
      const tutorials = tutorialSystem.getAllTutorials();
      expect(tutorials.length).toBeGreaterThan(0);
    });

    test('Should filter tutorials by difficulty', () => {
      const beginnerTutorials = tutorialSystem.getTutorialsByDifficulty('beginner');
      beginnerTutorials.forEach(t => {
        expect(t.difficulty).toBe('beginner');
      });
    });

    test('Should start tutorial and track progress', () => {
      const tutorialId = tutorialSystem.getAllTutorials()[0]?.id;
      if (!tutorialId) return;

      const progress = tutorialSystem.startTutorial('user123', tutorialId);
      expect(progress.learnerId).toBe('user123');
      expect(progress.tutorialId).toBe(tutorialId);
      expect(progress.completionPercentage).toBe(0);
    });

    test('Should track lesson completion', () => {
      const tutorials = tutorialSystem.getAllTutorials();
      if (tutorials.length === 0) return;

      const tutorial = tutorials[0];
      if (tutorial.lessons.length === 0) return;

      const lessonId = tutorial.lessons[0].id;
      tutorialSystem.startTutorial('user456', tutorial.id);

      const completed = tutorialSystem.completeLesson('user456', tutorial.id, lessonId);
      expect(completed).toBe(true);

      const progress = tutorialSystem.getProgress('user456', tutorial.id);
      expect(progress?.completedLessons.has(lessonId)).toBe(true);
    });

    test('Should submit quiz scores', () => {
      const tutorials = tutorialSystem.getAllTutorials();
      if (tutorials.length === 0) return;

      const tutorial = tutorials[0];
      if (tutorial.lessons.length === 0) return;

      const lessonId = tutorial.lessons[0].id;
      tutorialSystem.startTutorial('user789', tutorial.id);

      const submitted = tutorialSystem.submitQuiz('user789', tutorial.id, lessonId, 85);
      expect(submitted).toBe(true);

      const progress = tutorialSystem.getProgress('user789', tutorial.id);
      expect(progress?.quizScores.get(lessonId)).toBe(85);
    });

    test('Should recommend tutorials', () => {
      const recommended = tutorialSystem.getRecommended('user-new', 3);
      expect(recommended.length).toBeLessThanOrEqual(3);
    });

    test('Should provide learning path', () => {
      const path = tutorialSystem.getLearningPath('user-beginner', 'beginner');
      path.forEach(t => {
        expect(['beginner']).toContain(t.difficulty);
      });
    });

    test('Should generate tutorial statistics', () => {
      const stats = tutorialSystem.getStats();
      expect(stats.totalTutorials).toBeGreaterThan(0);
      expect(stats.totalLessons).toBeGreaterThan(0);
      expect(stats.avgDuration).toBeGreaterThan(0);
    });
  });

  // ============ API Documentation Tests ============

  describe('API Documentation (Swagger/OpenAPI)', () => {
    let apiDocGenerator: APIDocGenerator;

    beforeEach(() => {
      apiDocGenerator = new APIDocGenerator();
    });

    test('Should have default endpoints', () => {
      const endpoints = apiDocGenerator.getAllEndpoints();
      expect(endpoints.length).toBeGreaterThan(0);
    });

    test('Should find endpoint by path and method', () => {
      const endpoint = apiDocGenerator.getEndpoint('/api/compile', 'POST');
      expect(endpoint).toBeDefined();
      expect(endpoint?.path).toBe('/api/compile');
      expect(endpoint?.method).toBe('POST');
    });

    test('Should generate valid OpenAPI 3.0 spec', () => {
      const spec = apiDocGenerator.generateOpenAPISpec();
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBe('FreeLang API');
      expect(spec.paths).toBeDefined();
      expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    });

    test('Should generate HTML documentation', () => {
      const html = apiDocGenerator.generateHTMLDocs();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('swagger-ui');
    });

    test('Should generate Markdown documentation', () => {
      const markdown = apiDocGenerator.generateMarkdownDocs();
      expect(markdown).toContain('# FreeLang API');
      expect(markdown).toContain('## Endpoints');
    });

    test('Should filter endpoints by tag', () => {
      const compilationEndpoints = apiDocGenerator.getEndpointsByTag('compilation');
      compilationEndpoints.forEach(ep => {
        expect(ep.tags).toContain('compilation');
      });
    });

    test('Should add custom endpoint', () => {
      const newEndpoint = {
        path: '/api/test',
        method: 'GET' as const,
        summary: 'Test endpoint',
        description: 'Test endpoint description',
        tags: ['test'],
        responses: {
          '200': { description: 'Success' }
        }
      };

      apiDocGenerator.addEndpoint(newEndpoint);
      const endpoint = apiDocGenerator.getEndpoint('/api/test', 'GET');
      expect(endpoint).toBeDefined();
    });

    test('Should generate API statistics', () => {
      const stats = apiDocGenerator.getStats();
      expect(stats.totalEndpoints).toBeGreaterThan(0);
      expect(stats.totalSchemas).toBeGreaterThan(0);
      expect(typeof stats.methodDistribution).toBe('object');
      expect(typeof stats.tagDistribution).toBe('object');
    });
  });

  // ============ Integrated IDE Tests ============

  describe('Integrated Online IDE System', () => {
    let ide: IntegratedIDE;

    beforeEach(() => {
      ide = new IntegratedIDE();
    });

    test('Should create IDE session', () => {
      const session = ide.createSession('user1');
      expect(session.userId).toBe('user1');
      expect(session.sessionId).toBeDefined();
      expect(session.code).toBe('');
    });

    test('Should load session', () => {
      const session = ide.createSession('user2');
      const loaded = ide.loadSession(session.sessionId);
      expect(loaded).toEqual(session);
    });

    test('Should update code in session', () => {
      const session = ide.createSession('user3');
      const updated = ide.updateCode(session.sessionId, 'fn test { 42 }');
      expect(updated).toBe(true);

      const loaded = ide.loadSession(session.sessionId);
      expect(loaded?.code).toBe('fn test { 42 }');
    });

    test('Should compile code', async () => {
      const session = ide.createSession('user4');
      ide.updateCode(session.sessionId, 'fn main { "test" }');
      const result = await ide.compileCode(session.sessionId);
      expect(result.success).toBe(true);
    });

    test('Should load example into session', () => {
      const session = ide.createSession('user5');
      const loaded = ide.loadExample(session.sessionId, 'basic-hello');
      expect(loaded).toBe(true);
    });

    test('Should start tutorial', () => {
      const session = ide.createSession('user6');
      const tutorial = ide.startTutorial(session.sessionId, 'tut-intro');
      expect(tutorial).toBeDefined();
      expect(tutorial?.id).toBe('tut-intro');
    });

    test('Should initialize user state', () => {
      const state = ide.initializeUserState('user7');
      expect(state.themePreference).toBe('dark');
      expect(state.fontSize).toBe(14);
      expect(state.autoCompile).toBe(true);
      expect(state.autoSave).toBe(true);
    });

    test('Should add bookmark', () => {
      ide.initializeUserState('user8');
      const added = ide.addBookmark('user8', 'file123');
      expect(added).toBe(true);

      const state = ide.getUserState('user8');
      expect(state?.bookmarks).toContain('file123');
    });

    test('Should track recent files', () => {
      ide.initializeUserState('user9');
      ide.addRecentFile('user9', 'file1');
      ide.addRecentFile('user9', 'file2');
      ide.addRecentFile('user9', 'file3');

      const state = ide.getUserState('user9');
      expect(state?.recentFiles[0]).toBe('file3');
      expect(state?.recentFiles).toContain('file1');
    });

    test('Should get API documentation', () => {
      const docs = ide.getAPIDocumentation();
      expect(docs).toContain('<!DOCTYPE html>');
    });

    test('Should get OpenAPI specification', () => {
      const spec = ide.getOpenAPISpec();
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBe('FreeLang API');
    });

    test('Should generate IDE statistics', async () => {
      const session = ide.createSession('user10');
      ide.updateCode(session.sessionId, 'fn test { 42 }');
      await ide.compileCode(session.sessionId);

      const stats = ide.getStats();
      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.avgCompilationTime).toBeGreaterThanOrEqual(0);
      expect(stats.compilationSuccessRate).toBeGreaterThanOrEqual(0);
    });

    test('Should search examples and tutorials', () => {
      const results = ide.search('hello');
      expect(results.examples).toBeDefined();
      expect(results.tutorials).toBeDefined();
    });

    test('Should export documentation in multiple formats', () => {
      const html = ide.exportDocumentation('html');
      expect(html).toContain('<!DOCTYPE html>');

      const markdown = ide.exportDocumentation('markdown');
      expect(markdown).toContain('#');

      const json = ide.exportDocumentation('json');
      const parsed = JSON.parse(json);
      expect(parsed.openapi).toBe('3.0.0');
    });

    test('Should cleanup old sessions', async () => {
      const session1 = ide.createSession('user11');
      // Manually set old timestamp
      const sessions = (ide as any).sessions;
      sessions.get(session1.sessionId).lastModified = Date.now() - (70 * 60 * 1000); // 70 minutes ago

      const removed = ide.cleanupOldSessions(60);
      expect(removed).toBeGreaterThan(0);
    });
  });

});
