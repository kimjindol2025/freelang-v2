/**
 * FreeLang v2 Phase 11: Dynamic Confidence Adjuster
 * 패턴 신뢰도를 사용자 피드백에 따라 동적으로 조정
 */

interface PatternFeedback {
  patternId: string;
  helpful: number;
  unhelpful: number;
  usageCount: number;
  lastUsed: Date;
  avgUserRating: number;
}

class DynamicConfidenceAdjuster {
  adjust(pattern: any, feedback: PatternFeedback): any {
    const maxUsage = 1000;
    const usageFactor = 1.0 + Math.min(feedback.usageCount / maxUsage, 1.0) * 0.1;
    
    const totalFeedback = feedback.helpful + feedback.unhelpful + 1;
    const successRate = feedback.helpful / totalFeedback;
    
    const daysSinceUsed = this.getDaysSince(feedback.lastUsed);
    const timeFactor = Math.max(1.0 - daysSinceUsed * 0.001, 0.9);
    
    let newConfidence = pattern.confidence * usageFactor * successRate * timeFactor;
    newConfidence = Math.max(0.70, Math.min(0.99, newConfidence));
    
    return {
      patternId: pattern.id,
      originalConfidence: pattern.confidence,
      newConfidence,
      factors: { usageFactor, successRate, timeFactor },
      updatedAt: new Date(),
    };
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return diff / (1000 * 60 * 60 * 24);
  }
}

export { DynamicConfidenceAdjuster };
