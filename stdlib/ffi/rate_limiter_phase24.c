/**
 * FreeLang Rate Limiter Implementation (Phase 24)
 * Token bucket, sliding window, fixed window strategies
 */

#include "rate_limiter_phase24.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <limits.h>

fl_rate_limiter_t* freelang_rate_limiter_create(fl_limit_strategy_t strategy,
                                                 int default_limit_per_minute) {
  fl_rate_limiter_t *limiter = (fl_rate_limiter_t*)malloc(sizeof(fl_rate_limiter_t));
  if (!limiter) return NULL;

  memset(limiter, 0, sizeof(fl_rate_limiter_t));
  pthread_mutex_init(&limiter->limiter_mutex, NULL);

  limiter->default_strategy = strategy;
  limiter->default_limit_per_minute = default_limit_per_minute;
  limiter->auto_block_after_violations = 5;
  limiter->auto_block_duration_seconds = 300;

  fprintf(stderr, "[RateLimit] Created (strategy: %d, limit: %d/min)\\n",
          strategy, default_limit_per_minute);

  return limiter;
}

void freelang_rate_limiter_destroy(fl_rate_limiter_t *limiter) {
  if (!limiter) return;

  pthread_mutex_destroy(&limiter->limiter_mutex);
  free(limiter);

  fprintf(stderr, "[RateLimit] Destroyed\\n");
}

int freelang_rate_limiter_create_rule(fl_rate_limiter_t *limiter,
                                       const char *identifier,
                                       int limit_per_minute) {
  if (!limiter || !identifier || limiter->rule_count >= 1024) return -1;

  pthread_mutex_lock(&limiter->limiter_mutex);

  fl_rate_limit_rule_t *rule = &limiter->rules[limiter->rule_count];
  snprintf(rule->rule_id, sizeof(rule->rule_id), "rl_%d", limiter->rule_count);
  strncpy(rule->identifier, identifier, sizeof(rule->identifier) - 1);

  rule->limit_per_minute = limit_per_minute;
  rule->strategy = limiter->default_strategy;
  rule->window_start = time(NULL);
  rule->request_count = 0;
  rule->is_active = 1;

  rule->bucket.bucket_capacity = limit_per_minute;
  rule->bucket.tokens_available = limit_per_minute;
  rule->bucket.refill_rate = limit_per_minute / 60.0;
  rule->bucket.last_refill = time(NULL);

  int rule_id = limiter->rule_count;
  limiter->rule_count++;

  pthread_mutex_unlock(&limiter->limiter_mutex);

  fprintf(stderr, "[RateLimit] Rule created: %s (limit: %d/min)\\n", identifier, limit_per_minute);

  return rule_id;
}

fl_rate_limit_rule_t* freelang_rate_limiter_get_rule(fl_rate_limiter_t *limiter,
                                                      const char *identifier) {
  if (!limiter || !identifier) return NULL;

  pthread_mutex_lock(&limiter->limiter_mutex);

  for (int i = 0; i < limiter->rule_count; i++) {
    if (strcmp(limiter->rules[i].identifier, identifier) == 0) {
      pthread_mutex_unlock(&limiter->limiter_mutex);
      return &limiter->rules[i];
    }
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);
  return NULL;
}

fl_limit_status_t freelang_rate_limiter_check_and_consume(fl_rate_limiter_t *limiter,
                                                           const char *identifier) {
  if (!limiter || !identifier) return LIMIT_EXCEEDED;

  /* Get or create rule */
  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);

  if (!rule) {
    freelang_rate_limiter_create_rule(limiter, identifier, limiter->default_limit_per_minute);
    rule = freelang_rate_limiter_get_rule(limiter, identifier);
  }

  if (!rule || !rule->is_active) return LIMIT_EXCEEDED;

  time_t now = time(NULL);

  /* Check if temporarily blocked */
  if (rule->violation_count >= limiter->auto_block_after_violations) {
    fprintf(stderr, "[RateLimit] Identifier blocked: %s\\n", identifier);
    return LIMIT_EXCEEDED;
  }

  /* Token bucket strategy */
  if (rule->strategy == LIMIT_STRATEGY_TOKEN_BUCKET) {
    double time_elapsed = (double)(now - rule->bucket.last_refill);
    double tokens_to_add = time_elapsed * rule->bucket.refill_rate;

    rule->bucket.tokens_available += tokens_to_add;
    if (rule->bucket.tokens_available > rule->bucket.bucket_capacity) {
      rule->bucket.tokens_available = rule->bucket.bucket_capacity;
    }

    rule->bucket.last_refill = now;

    if (rule->bucket.tokens_available >= 1.0) {
      rule->bucket.tokens_available -= 1.0;
      pthread_mutex_lock(&limiter->limiter_mutex);
      limiter->total_requests_allowed++;
      pthread_mutex_unlock(&limiter->limiter_mutex);

      fprintf(stderr, "[RateLimit] Request allowed: %s (tokens: %.1f)\\n",
              identifier, rule->bucket.tokens_available);

      return LIMIT_ALLOWED;
    } else {
      rule->violation_count++;
      pthread_mutex_lock(&limiter->limiter_mutex);
      limiter->total_requests_blocked++;
      limiter->total_violations++;
      pthread_mutex_unlock(&limiter->limiter_mutex);

      fprintf(stderr, "[RateLimit] Request blocked: %s (violations: %d)\\n",
              identifier, rule->violation_count);

      return LIMIT_EXCEEDED;
    }
  }

  /* Fixed window strategy */
  if (now - rule->window_start >= 60) {
    rule->window_start = now;
    rule->request_count = 0;
  }

  if (rule->request_count < rule->limit_per_minute) {
    rule->request_count++;
    pthread_mutex_lock(&limiter->limiter_mutex);
    limiter->total_requests_allowed++;
    pthread_mutex_unlock(&limiter->limiter_mutex);

    fprintf(stderr, "[RateLimit] Request allowed: %s (%d/%d)\\n",
            identifier, rule->request_count, rule->limit_per_minute);

    return LIMIT_ALLOWED;
  } else {
    rule->violation_count++;
    pthread_mutex_lock(&limiter->limiter_mutex);
    limiter->total_requests_blocked++;
    limiter->total_violations++;
    pthread_mutex_unlock(&limiter->limiter_mutex);

    fprintf(stderr, "[RateLimit] Request blocked: %s (exceeded)\\n", identifier);

    return LIMIT_EXCEEDED;
  }
}

fl_limit_status_t freelang_rate_limiter_check(fl_rate_limiter_t *limiter,
                                               const char *identifier) {
  if (!limiter || !identifier) return LIMIT_EXCEEDED;

  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (!rule) return LIMIT_ALLOWED;  /* No rule = no limit */

  time_t now = time(NULL);

  if (rule->strategy == LIMIT_STRATEGY_TOKEN_BUCKET) {
    double time_elapsed = (double)(now - rule->bucket.last_refill);
    double estimated_tokens = rule->bucket.tokens_available + (time_elapsed * rule->bucket.refill_rate);

    return (estimated_tokens >= 1.0) ? LIMIT_ALLOWED : LIMIT_EXCEEDED;
  }

  if (now - rule->window_start >= 60) {
    return LIMIT_ALLOWED;
  }

  return (rule->request_count < rule->limit_per_minute) ? LIMIT_ALLOWED : LIMIT_EXCEEDED;
}

int freelang_rate_limiter_get_remaining(fl_rate_limiter_t *limiter,
                                         const char *identifier) {
  if (!limiter || !identifier) return 0;

  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (!rule) return limiter->default_limit_per_minute;

  if (rule->strategy == LIMIT_STRATEGY_TOKEN_BUCKET) {
    return (int)rule->bucket.tokens_available;
  }

  return rule->limit_per_minute - rule->request_count;
}

int freelang_rate_limiter_get_wait_time_ms(fl_rate_limiter_t *limiter,
                                            const char *identifier) {
  if (!limiter || !identifier) return 0;

  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (!rule) return 0;

  if (rule->strategy == LIMIT_STRATEGY_TOKEN_BUCKET) {
    double wait_tokens = 1.0 - rule->bucket.tokens_available;
    if (wait_tokens <= 0) return 0;

    double wait_seconds = wait_tokens / rule->bucket.refill_rate;
    return (int)(wait_seconds * 1000);
  }

  return 0;
}

void freelang_rate_limiter_block(fl_rate_limiter_t *limiter,
                                  const char *identifier,
                                  int duration_seconds) {
  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (rule) {
    rule->is_active = 0;
    fprintf(stderr, "[RateLimit] Identifier blocked: %s for %d seconds\\n",
            identifier, duration_seconds);
  }
}

void freelang_rate_limiter_unblock(fl_rate_limiter_t *limiter,
                                    const char *identifier) {
  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (rule) {
    rule->is_active = 1;
    rule->violation_count = 0;
    fprintf(stderr, "[RateLimit] Identifier unblocked: %s\\n", identifier);
  }
}

int freelang_rate_limiter_is_blocked(fl_rate_limiter_t *limiter,
                                      const char *identifier) {
  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  return rule ? !rule->is_active : 0;
}

fl_rate_limiter_stats_t freelang_rate_limiter_get_stats(fl_rate_limiter_t *limiter) {
  fl_rate_limiter_stats_t stats = {0, 0, 0, 0, 0.0};

  if (!limiter) return stats;

  pthread_mutex_lock(&limiter->limiter_mutex);

  stats.total_requests_allowed = limiter->total_requests_allowed;
  stats.total_requests_blocked = limiter->total_requests_blocked;
  stats.total_violations = limiter->total_violations;

  int total = stats.total_requests_allowed + stats.total_requests_blocked;
  if (total > 0) {
    stats.allow_rate = (double)stats.total_requests_allowed / total * 100.0;
  }

  for (int i = 0; i < limiter->rule_count; i++) {
    if (!limiter->rules[i].is_active) {
      stats.currently_blocked_identifiers++;
    }
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);

  return stats;
}

void freelang_rate_limiter_reset_stats(fl_rate_limiter_t *limiter) {
  if (!limiter) return;

  pthread_mutex_lock(&limiter->limiter_mutex);
  limiter->total_requests_allowed = 0;
  limiter->total_requests_blocked = 0;
  limiter->total_violations = 0;
  pthread_mutex_unlock(&limiter->limiter_mutex);

  fprintf(stderr, "[RateLimit] Statistics reset\\n");
}

void freelang_rate_limiter_delete_rule(fl_rate_limiter_t *limiter,
                                        const char *identifier) {
  if (!limiter || !identifier) return;

  pthread_mutex_lock(&limiter->limiter_mutex);

  for (int i = 0; i < limiter->rule_count; i++) {
    if (strcmp(limiter->rules[i].identifier, identifier) == 0) {
      for (int j = i; j < limiter->rule_count - 1; j++) {
        memcpy(&limiter->rules[j], &limiter->rules[j + 1], sizeof(fl_rate_limit_rule_t));
      }
      limiter->rule_count--;
      break;
    }
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);

  fprintf(stderr, "[RateLimit] Rule deleted: %s\\n", identifier);
}

void freelang_rate_limiter_update_rule(fl_rate_limiter_t *limiter,
                                        const char *identifier,
                                        int new_limit_per_minute) {
  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (rule) {
    rule->limit_per_minute = new_limit_per_minute;
    rule->bucket.bucket_capacity = new_limit_per_minute;
    rule->bucket.refill_rate = new_limit_per_minute / 60.0;

    fprintf(stderr, "[RateLimit] Rule updated: %s (new limit: %d/min)\\n",
            identifier, new_limit_per_minute);
  }
}

fl_rate_limit_context_t* freelang_rate_limiter_get_context(fl_rate_limiter_t *limiter,
                                                            const char *identifier) {
  if (!limiter || !identifier) return NULL;

  pthread_mutex_lock(&limiter->limiter_mutex);

  for (int i = 0; i < limiter->context_count; i++) {
    if (strcmp(limiter->contexts[i].context_id, identifier) == 0) {
      pthread_mutex_unlock(&limiter->limiter_mutex);
      return &limiter->contexts[i];
    }
  }

  pthread_mutex_unlock(&limiter->limiter_mutex);
  return NULL;
}

void freelang_rate_limiter_reset_context(fl_rate_limiter_t *limiter,
                                          const char *identifier) {
  fl_rate_limit_context_t *ctx = freelang_rate_limiter_get_context(limiter, identifier);
  if (ctx) {
    ctx->requests_this_window = 0;
    ctx->consecutive_violations = 0;

    fprintf(stderr, "[RateLimit] Context reset: %s\\n", identifier);
  }
}

void freelang_rate_limiter_reset_all_contexts(fl_rate_limiter_t *limiter) {
  if (!limiter) return;

  pthread_mutex_lock(&limiter->limiter_mutex);

  for (int i = 0; i < limiter->context_count; i++) {
    limiter->contexts[i].requests_this_window = 0;
    limiter->contexts[i].consecutive_violations = 0;
  }

  limiter->context_count = 0;

  pthread_mutex_unlock(&limiter->limiter_mutex);

  fprintf(stderr, "[RateLimit] All contexts reset\\n");
}

int64_t freelang_rate_limiter_get_block_until(fl_rate_limiter_t *limiter,
                                               const char *identifier) {
  fl_rate_limit_context_t *ctx = freelang_rate_limiter_get_context(limiter, identifier);
  return ctx ? ctx->block_until : 0;
}

void freelang_rate_limiter_add_tokens(fl_rate_limiter_t *limiter,
                                       const char *identifier,
                                       double tokens) {
  fl_rate_limit_rule_t *rule = freelang_rate_limiter_get_rule(limiter, identifier);
  if (rule) {
    rule->bucket.tokens_available += tokens;
    if (rule->bucket.tokens_available > rule->bucket.bucket_capacity) {
      rule->bucket.tokens_available = rule->bucket.bucket_capacity;
    }

    fprintf(stderr, "[RateLimit] Tokens added: %s (+%.1f)\\n", identifier, tokens);
  }
}

void freelang_rate_limiter_refill_tokens(fl_token_bucket_t *bucket,
                                          double refill_rate) {
  if (!bucket) return;

  time_t now = time(NULL);
  double time_elapsed = (double)(now - bucket->last_refill);
  double tokens_to_add = time_elapsed * refill_rate;

  bucket->tokens_available += tokens_to_add;
  if (bucket->tokens_available > bucket->bucket_capacity) {
    bucket->tokens_available = bucket->bucket_capacity;
  }

  bucket->last_refill = now;
}
