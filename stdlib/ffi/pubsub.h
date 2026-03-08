/**
 * FreeLang Pub/Sub System (Phase 21)
 * Publish/Subscribe messaging and event distribution
 */

#ifndef FREELANG_PUBSUB_H
#define FREELANG_PUBSUB_H

#include <pthread.h>
#include <time.h>

/* ===== Pub/Sub Configuration ===== */

#define PUBSUB_MAX_CHANNELS 1024        /* Max channels per broker */
#define PUBSUB_MAX_SUBSCRIBERS 10000    /* Max subscribers */
#define PUBSUB_MAX_MESSAGE_SIZE 65536   /* Max message size (64KB) */

/* ===== Message Structure ===== */

typedef struct {
  char *channel;                       /* Channel name */
  char *message;                       /* Message content */
  int64_t timestamp;                   /* Publication time (ms) */
  int publisher_id;                    /* Publisher client ID */
} fl_pubsub_message_t;

/* ===== Subscription Entry ===== */

typedef struct {
  int subscriber_id;                   /* Subscriber client ID */
  int callback_id;                     /* Message callback */
  int64_t subscribed_at;               /* Subscription time */
  int message_count;                   /* Messages received */
} fl_pubsub_subscriber_t;

/* ===== Channel State ===== */

typedef struct {
  char channel_name[256];              /* Channel identifier */

  fl_pubsub_subscriber_t subscribers[PUBSUB_MAX_SUBSCRIBERS];
  int subscriber_count;                /* Current subscribers */

  int total_messages;                  /* Lifetime messages */
  int64_t created_at;                  /* Channel creation time */
  int64_t last_message_at;             /* Last message time */

  pthread_mutex_t channel_mutex;       /* Thread-safe access */
} fl_pubsub_channel_t;

/* ===== Pub/Sub Broker ===== */

typedef struct {
  fl_pubsub_channel_t channels[PUBSUB_MAX_CHANNELS];
  int channel_count;

  int total_messages_published;        /* Lifetime stats */
  int total_subscriptions;             /* Total subscriptions made */

  pthread_mutex_t broker_mutex;        /* Thread-safe access */
} fl_pubsub_broker_t;

/* ===== Statistics ===== */

typedef struct {
  int total_channels;                  /* Active channels */
  int total_subscribers;               /* Active subscribers */
  int total_messages;                  /* Total published */
  double average_subscribers_per_channel;
  double average_message_delivery_time_ms;
} fl_pubsub_stats_t;

/* ===== Public API: Broker Management ===== */

/* Create Pub/Sub broker */
fl_pubsub_broker_t* freelang_pubsub_broker_create(void);

/* Destroy broker */
void freelang_pubsub_broker_destroy(fl_pubsub_broker_t *broker);

/* ===== Public API: Publishing ===== */

/* Publish message to channel */
int freelang_pubsub_publish(fl_pubsub_broker_t *broker,
                             const char *channel, const char *message,
                             int publisher_id);

/* Publish with options (TTL, priority, etc) */
int freelang_pubsub_publish_with_options(fl_pubsub_broker_t *broker,
                                          const char *channel,
                                          const char *message,
                                          int publisher_id,
                                          int ttl_seconds);

/* ===== Public API: Subscription ===== */

/* Subscribe to channel */
int freelang_pubsub_subscribe(fl_pubsub_broker_t *broker,
                               const char *channel, int subscriber_id,
                               int callback_id);

/* Unsubscribe from channel */
void freelang_pubsub_unsubscribe(fl_pubsub_broker_t *broker,
                                  const char *channel, int subscriber_id);

/* Subscribe to pattern (e.g., "user:*") */
int freelang_pubsub_psubscribe(fl_pubsub_broker_t *broker,
                                const char *pattern, int subscriber_id,
                                int callback_id);

/* Unsubscribe from pattern */
void freelang_pubsub_punsubscribe(fl_pubsub_broker_t *broker,
                                   const char *pattern, int subscriber_id);

/* ===== Public API: Channel Management ===== */

/* Get channel info */
fl_pubsub_channel_t* freelang_pubsub_get_channel(fl_pubsub_broker_t *broker,
                                                  const char *channel);

/* Get subscriber count on channel */
int freelang_pubsub_get_subscriber_count(fl_pubsub_broker_t *broker,
                                          const char *channel);

/* Remove channel if empty */
void freelang_pubsub_remove_channel(fl_pubsub_broker_t *broker,
                                     const char *channel);

/* ===== Public API: Statistics & Monitoring ===== */

/* Get broker statistics */
fl_pubsub_stats_t freelang_pubsub_get_stats(fl_pubsub_broker_t *broker);

/* List all active channels */
void freelang_pubsub_list_channels(fl_pubsub_broker_t *broker,
                                    char **channel_names, int *count);

/* Reset statistics */
void freelang_pubsub_reset_stats(fl_pubsub_broker_t *broker);

#endif /* FREELANG_PUBSUB_H */
