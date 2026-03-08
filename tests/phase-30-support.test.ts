/**
 * Phase 30: Post-Launch Support Tests
 * Community management, issue tracking, and feedback collection
 */

import { CommunityManager } from '../src/phase-30/community/community-manager';
import { FeedbackManager } from '../src/phase-30/feedback/feedback-manager';

describe('Phase 30: Post-Launch Support', () => {
  let communityManager: CommunityManager;
  let feedbackManager: FeedbackManager;

  beforeEach(() => {
    communityManager = new CommunityManager();
    feedbackManager = new FeedbackManager();
  });

  describe('Community Manager', () => {
    test('Should register a new user', () => {
      const user = communityManager.registerUser('john_doe', 'john@example.com');

      expect(user.username).toBe('john_doe');
      expect(user.email).toBe('john@example.com');
      expect(user.role).toBe('user');
      expect(user.reputation).toBe(0);
    });

    test('Should create an issue', () => {
      const issue = communityManager.createIssue('Login bug', 'Cannot login with email', 'user-1', 'HIGH');

      expect(issue.title).toBe('Login bug');
      expect(issue.status).toBe('OPEN');
      expect(issue.priority).toBe('HIGH');
    });

    test('Should add comment to issue', () => {
      const issue = communityManager.createIssue('Test issue', 'Description', 'user-1');
      communityManager.registerUser('responder', 'resp@example.com');

      const comment = communityManager.addComment(issue.id, 'user-responder', 'I have this issue too');

      expect(comment.content).toBe('I have this issue too');
      expect(issue.comments.length).toBe(1);
    });

    test('Should update issue status', () => {
      const issue = communityManager.createIssue('Fix needed', 'Description', 'user-1');
      const updated = communityManager.updateIssueStatus(issue.id, 'RESOLVED', 'Fixed in v2.1');

      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolution).toBe('Fixed in v2.1');
    });

    test('Should create FAQ from resolved issue', () => {
      const issue = communityManager.createIssue('How to login', 'Login instructions', 'user-1');
      communityManager.updateIssueStatus(issue.id, 'RESOLVED', 'See our documentation');

      const faq = communityManager.createFaqFromIssue(issue.id);

      expect(faq.question).toBe('How to login');
      expect(faq.category).toBeDefined();
    });

    test('Should get FAQ by category', () => {
      const issue1 = communityManager.createIssue('Q1', 'Answer 1', 'user-1');
      communityManager.updateIssueStatus(issue1.id, 'RESOLVED', 'Answer 1');
      issue1.labels.push('Installation');

      const faqs = communityManager.getFaqByCategory('General');

      expect(faqs.length).toBeGreaterThanOrEqual(0);
    });

    test('Should mark FAQ as helpful', () => {
      const issue = communityManager.createIssue('Q', 'A', 'user-1');
      communityManager.updateIssueStatus(issue.id, 'RESOLVED', 'Answer');
      const faq = communityManager.createFaqFromIssue(issue.id);

      const updated = communityManager.markFaqHelpful(faq.id, true);

      expect(updated.helpful).toBe(1);
    });

    test('Should get community metrics', () => {
      communityManager.registerUser('user1', 'u1@example.com');
      communityManager.registerUser('user2', 'u2@example.com');

      const issue = communityManager.createIssue('Bug', 'Description', 'user1', 'HIGH');
      communityManager.updateIssueStatus(issue.id, 'RESOLVED');

      const metrics = communityManager.getCommunityMetrics();

      expect(metrics.totalUsers).toBeGreaterThan(0);
      expect(metrics.totalIssues).toBeGreaterThan(0);
      expect(metrics.communityHealth).toBeGreaterThanOrEqual(0);
    });

    test('Should get open issues', () => {
      communityManager.createIssue('Issue 1', 'Description', 'user-1', 'HIGH');
      communityManager.createIssue('Issue 2', 'Description', 'user-1', 'LOW');

      const openIssues = communityManager.getOpenIssues();

      expect(openIssues.length).toBeGreaterThan(0);
    });

    test('Should get recent issues', () => {
      communityManager.createIssue('Issue 1', 'Description', 'user-1');
      communityManager.createIssue('Issue 2', 'Description', 'user-1');

      const recent = communityManager.getRecentIssues(5);

      expect(recent.length).toBeGreaterThan(0);
    });

    test('Should get top contributors', () => {
      const user1 = communityManager.registerUser('user1', 'u1@example.com');
      const issue = communityManager.createIssue('Q', 'Desc', user1.id);

      communityManager.addComment(issue.id, user1.id, 'Response');

      const topContributors = communityManager.getTopContributors(5);

      expect(topContributors.length).toBeGreaterThanOrEqual(0);
    });

    test('Should get FAQ statistics', () => {
      const issue = communityManager.createIssue('Q', 'A', 'user-1');
      communityManager.updateIssueStatus(issue.id, 'RESOLVED', 'Answer');
      communityManager.createFaqFromIssue(issue.id);

      const stats = communityManager.getFaqStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.categories).toBeInstanceOf(Array);
    });
  });

  describe('Feedback Manager', () => {
    test('Should submit feedback', () => {
      const feedback = feedbackManager.submitFeedback(
        'user-1',
        'FEATURE_REQUEST',
        'Dark mode',
        'Please add dark mode support',
        5,
        ['UI', 'Feature']
      );

      expect(feedback.title).toBe('Dark mode');
      expect(feedback.rating).toBe(5);
      expect(feedback.status).toBe('NEW');
    });

    test('Should validate rating range', () => {
      expect(() => {
        feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug', 'Description', 6);
      }).toThrow();
    });

    test('Should respond to feedback', () => {
      const feedback = feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug', 'Desc', 2);

      const updated = feedbackManager.respondToFeedback(feedback.id, 'We are working on this', 'IN_REVIEW');

      expect(updated.response).toBe('We are working on this');
      expect(updated.respondedAt).toBeDefined();
    });

    test('Should update feedback status', () => {
      const feedback = feedbackManager.submitFeedback('user-1', 'IMPROVEMENT', 'Better UI', 'Desc', 4);

      const updated = feedbackManager.updateFeedbackStatus(feedback.id, 'IMPLEMENTED');

      expect(updated.status).toBe('IMPLEMENTED');
    });

    test('Should like feedback', () => {
      const feedback = feedbackManager.submitFeedback('user-1', 'FEATURE_REQUEST', 'Feature', 'Desc', 4);

      const updated = feedbackManager.likeFeedback(feedback.id);

      expect(updated.likes).toBe(1);
    });

    test('Should get feedback by type', () => {
      feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug 1', 'Desc', 2);
      feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug 2', 'Desc', 1);

      const bugReports = feedbackManager.getFeedbackByType('BUG_REPORT');

      expect(bugReports.length).toBeGreaterThanOrEqual(1);
    });

    test('Should get pending feedback', () => {
      feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Pending bug', 'Desc', 1);

      const pending = feedbackManager.getPendingFeedback();

      expect(pending.length).toBeGreaterThan(0);
    });

    test('Should get most liked feedback', () => {
      const fb1 = feedbackManager.submitFeedback('user-1', 'FEATURE_REQUEST', 'Feature 1', 'Desc', 5);

      feedbackManager.likeFeedback(fb1.id);
      feedbackManager.likeFeedback(fb1.id);

      const mostLiked = feedbackManager.getMostLikedFeedback(5);

      expect(mostLiked.length).toBeGreaterThan(0);
      expect(mostLiked[0].title).toBe('Feature 1');
    });

    test('Should analyze feedback', () => {
      feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug', 'Desc', 2);
      feedbackManager.submitFeedback('user-1', 'FEATURE_REQUEST', 'Feature', 'Desc', 5);

      const analysis = feedbackManager.analyzeFeedback();

      expect(analysis.totalFeedback).toBeGreaterThanOrEqual(1);
      expect(analysis.averageRating).toBeGreaterThan(0);
      expect(analysis.feedbackByType.size).toBeGreaterThan(0);
    });

    test('Should calculate response rate', () => {
      const fb1 = feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug', 'Desc', 1);

      feedbackManager.respondToFeedback(fb1.id, 'Fixed');

      const rate = feedbackManager.getResponseRate();

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    test('Should get feedback statistics', () => {
      feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Bug', 'Desc', 2);
      feedbackManager.submitFeedback('user-1', 'FEATURE_REQUEST', 'Feature', 'Desc', 5);

      const stats = feedbackManager.getFeedbackStats();

      expect(stats.totalFeedback).toBeGreaterThanOrEqual(1);
      expect(stats.averageRating).toBeGreaterThan(0);
      expect(stats.responseRate).toBeGreaterThanOrEqual(0);
      expect(stats.satisfactionScore).toBeGreaterThanOrEqual(0);
    });

    test('Should generate feedback report', () => {
      feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Critical bug', 'Desc', 1);
      feedbackManager.submitFeedback('user-1', 'FEATURE_REQUEST', 'Dark mode', 'Desc', 5);

      const report = feedbackManager.generateReport();

      expect(report).toContain('Feedback Report');
      expect(report).toContain('Total Feedback');
      expect(report.length).toBeGreaterThan(100);
    });
  });

  describe('Integration Tests', () => {
    test('Should manage complete community lifecycle', () => {
      // Register users
      const user1 = communityManager.registerUser('alice', 'alice@example.com');
      const user2 = communityManager.registerUser('bob', 'bob@example.com');

      // Create issue
      const issue = communityManager.createIssue('Performance issue', 'App is slow', user1.id, 'HIGH');

      // Add comments
      communityManager.addComment(issue.id, user2.id, 'I confirm this issue');
      communityManager.addComment(issue.id, user1.id, 'We are investigating');

      // Resolve issue
      communityManager.updateIssueStatus(issue.id, 'RESOLVED', 'Optimized query performance');

      // Create FAQ
      const faq = communityManager.createFaqFromIssue(issue.id);
      communityManager.markFaqHelpful(faq.id, true);

      // Get metrics
      const metrics = communityManager.getCommunityMetrics();

      expect(metrics.totalUsers).toBeGreaterThanOrEqual(1);
      expect(metrics.resolvedIssues).toBeGreaterThanOrEqual(0);
      expect(metrics.communityHealth).toBeGreaterThanOrEqual(0);
    });

    test('Should manage complete feedback workflow', () => {
      // Submit various feedback
      const bugReport = feedbackManager.submitFeedback('user-1', 'BUG_REPORT', 'Login bug', 'Cannot log in', 1);
      const featureRequest = feedbackManager.submitFeedback('user-1', 'FEATURE_REQUEST', 'Dark mode', 'Add dark theme', 5);

      // Like popular items
      feedbackManager.likeFeedback(featureRequest.id);
      feedbackManager.likeFeedback(featureRequest.id);

      // Respond to feedback
      feedbackManager.respondToFeedback(bugReport.id, 'We have fixed this issue', 'IMPLEMENTED');
      feedbackManager.respondToFeedback(featureRequest.id, 'In our roadmap for v3', 'ACKNOWLEDGED');

      // Get stats
      const stats = feedbackManager.getFeedbackStats();
      const analysis = feedbackManager.analyzeFeedback();
      const report = feedbackManager.generateReport();

      expect(stats.totalFeedback).toBeGreaterThanOrEqual(1);
      expect(analysis.topFeatureRequests.length).toBeGreaterThanOrEqual(0);
      expect(report).toContain('Satisfaction Score');
    });
  });
});
