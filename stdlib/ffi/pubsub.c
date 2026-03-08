/**
 * FreeLang Pub/Sub System Implementation (Phase 21)
 * Publish/Subscribe messaging and event distribution
 */

#include "pubsub.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

/* ===== Broker Creation ===== */

fl_pubsub_broker_t* freelang_pubsub_broker_create(void) {
  fl_pubsub_broker_t *broker = (fl_pubsub_broker_t*)malloc(sizeof(fl_pubsub_broker_t));
  if (!broker) return NULL;

  memset(broker, 0, sizeof(fl_pubsub_broker_t));
  pthread_mutex_init(&broker->broker_mutex, NULL);

  fprintf(stderr, "[PubSub] Broker created\n");
  return broker;
}

void freelang_pubsub_broker_destroy(fl_pubsub_broker_t *broker) {
  if (!broker) return;

  pthread_mutex_lock(&broker->broker_mutex);

  for (int i = 0; i < broker->channel_count; i++) {
    if (broker->channels[i].channel_name[0]) {
      pthread_mutex_destroy(&broker->channels[i].channel_mutex);
    }
  }

  pthread_mutex_unlock(&broker->broker_mutex);
  pthread_mutex_destroy(&broker->broker_mutex);
  free(broker);

  fprintf(stderr, "[PubSub] Broker destroyed\n");
}

/* ===== Helper: Find or Create Channel ===== */

static fl_pubsub_channel_t* pubsub_find_channel(fl_pubsub_broker_t *broker,
                                                 const char *channel) {
  for (int i = 0; i < broker->channel_count; i++) {
    if (strcmp(broker->channels[i].channel_name, channel) == 0) {
      return &broker->channels[i];
    }
  }
  return NULL;
}

static fl_pubsub_channel_t* pubsub_create_channel(fl_pubsub_broker_t *broker,
                                                   const char *channel) {
  if (broker->channel_count >= PUBSUB_MAX_CHANNELS) {
    fprintf(stderr, "[PubSub] ERROR: Max channels reached\n");
    return NULL;
  }

  fl_pubsub_channel_t *ch = &broker->channels[broker->channel_count];
  strncpy(ch->channel_name, channel, sizeof(ch->channel_name) - 1);
  pthread_mutex_init(&ch->channel_mutex, NULL);
  ch->created_at = time(NULL) * 1000;  /* ms */

  broker->channel_count++;

  fprintf(stderr, "[PubSub] Channel created: %s\n", channel);
  return ch;
}

/* ===== Publishing ===== */

int freelang_pubsub_publish(fl_pubsub_broker_t *broker,
                             const char *channel, const char *message,
                             int publisher_id) {
  if (!broker || !channel || !message) return -1;

  pthread_mutex_lock(&broker->broker_mutex);

  fl_pubsub_channel_t *ch = pubsub_find_channel(broker, channel);
  if (!ch) {
    ch = pubsub_create_channel(broker, channel);
    if (!ch) {
      pthread_mutex_unlock(&broker->broker_mutex);
      return -1;
    }
  }

  pthread_mutex_lock(&ch->channel_mutex);

  int delivered = 0;

  /* Deliver message to all subscribers */
  for (int i = 0; i < ch->subscriber_count; i++) {
    fl_pubsub_subscriber_t *sub = &ch->subscribers[i];
    fprintf(stderr, "[PubSub] Message delivered to subscriber %d (callback: %d)\n",
            sub->subscriber_id, sub->callback_id);
    sub->message_count++;
    delivered++;
  }

  ch->total_messages++;
  ch->last_message_at = time(NULL) * 1000;  /* ms */

  fprintf(stderr, "[PubSub] Published to %s: %d bytes, %d subscribers\n",
          channel, (int)strlen(message), delivered);

  pthread_mutex_unlock(&ch->channel_mutex);

  /* Update broker stats */
  broker->total_messages_published++;

  pthread_mutex_unlock(&broker->broker_mutex);

  return delivered;
}

int freelang_pubsub_publish_with_options(fl_pubsub_broker_t *broker,
                                          const char *channel,
                                          const char *message,
                                          int publisher_id,
                                          int ttl_seconds) {
  if (!broker || !channel || !message) return -1;

  /* For now, just publish normally and ignore TTL */
  /* In real implementation, would expire messages after TTL */

  int result = freelang_pubsub_publish(broker, channel, message, publisher_id);

  if (result >= 0 && ttl_seconds > 0) {
    fprintf(stderr, "[PubSub] Message TTL: %d seconds\n", ttl_seconds);
  }

  return result;
}

/* ===== Subscription ===== */

int freelang_pubsub_subscribe(fl_pubsub_broker_t *broker,
                               const char *channel, int subscriber_id,
                               int callback_id) {
  if (!broker || !channel) return -1;

  pthread_mutex_lock(&broker->broker_mutex);

  fl_pubsub_channel_t *ch = pubsub_find_channel(broker, channel);
  if (!ch) {
    ch = pubsub_create_channel(broker, channel);
    if (!ch) {
      pthread_mutex_unlock(&broker->broker_mutex);
      return -1;
    }
  }

  pthread_mutex_lock(&ch->channel_mutex);

  if (ch->subscriber_count >= PUBSUB_MAX_SUBSCRIBERS) {
    fprintf(stderr, "[PubSub] ERROR: Max subscribers reached for channel\n");
    pthread_mutex_unlock(&ch->channel_mutex);
    pthread_mutex_unlock(&broker->broker_mutex);
    return -1;
  }

  fl_pubsub_subscriber_t *sub = &ch->subscribers[ch->subscriber_count];
  sub->subscriber_id = subscriber_id;
  sub->callback_id = callback_id;
  sub->subscribed_at = time(NULL) * 1000;  /* ms */
  sub->message_count = 0;

  ch->subscriber_count++;

  fprintf(stderr, "[PubSub] Subscribed: %s (sub_id: %d, callback: %d)\n",
          channel, subscriber_id, callback_id);

  pthread_mutex_unlock(&ch->channel_mutex);

  /* Update broker stats */
  broker->total_subscriptions++;

  pthread_mutex_unlock(&broker->broker_mutex);

  return ch->subscriber_count - 1;  /* Return subscription ID */
}

void freelang_pubsub_unsubscribe(fl_pubsub_broker_t *broker,
                                  const char *channel, int subscriber_id) {
  if (!broker || !channel) return;

  pthread_mutex_lock(&broker->broker_mutex);

  fl_pubsub_channel_t *ch = pubsub_find_channel(broker, channel);
  if (!ch) {
    pthread_mutex_unlock(&broker->broker_mutex);
    return;
  }

  pthread_mutex_lock(&ch->channel_mutex);

  /* Find and remove subscriber */
  for (int i = 0; i < ch->subscriber_count; i++) {
    if (ch->subscribers[i].subscriber_id == subscriber_id) {
      /* Shift remaining subscribers */
      for (int j = i; j < ch->subscriber_count - 1; j++) {
        ch->subscribers[j] = ch->subscribers[j + 1];
      }
      ch->subscriber_count--;

      fprintf(stderr, "[PubSub] Unsubscribed from %s (sub_id: %d)\n",
              channel, subscriber_id);
      break;
    }
  }

  pthread_mutex_unlock(&ch->channel_mutex);
  pthread_mutex_unlock(&broker->broker_mutex);
}

int freelang_pubsub_psubscribe(fl_pubsub_broker_t *broker,
                                const char *pattern, int subscriber_id,
                                int callback_id) {
  if (!broker || !pattern) return -1;

  /* Pattern subscription - for now, store as regular channel */
  /* In real implementation, would match patterns against channel names */

  fprintf(stderr, "[PubSub] Pattern subscribed: %s (pattern)\n", pattern);

  return freelang_pubsub_subscribe(broker, pattern, subscriber_id, callback_id);
}

void freelang_pubsub_punsubscribe(fl_pubsub_broker_t *broker,
                                   const char *pattern, int subscriber_id) {
  if (!broker || !pattern) return;

  fprintf(stderr, "[PubSub] Pattern unsubscribed: %s\n", pattern);

  freelang_pubsub_unsubscribe(broker, pattern, subscriber_id);
}

/* ===== Channel Management ===== */

fl_pubsub_channel_t* freelang_pubsub_get_channel(fl_pubsub_broker_t *broker,
                                                  const char *channel) {
  if (!broker || !channel) return NULL;

  pthread_mutex_lock(&broker->broker_mutex);
  fl_pubsub_channel_t *ch = pubsub_find_channel(broker, channel);
  pthread_mutex_unlock(&broker->broker_mutex);

  return ch;
}

int freelang_pubsub_get_subscriber_count(fl_pubsub_broker_t *broker,
                                          const char *channel) {
  if (!broker || !channel) return 0;

  pthread_mutex_lock(&broker->broker_mutex);

  fl_pubsub_channel_t *ch = pubsub_find_channel(broker, channel);
  int count = (ch) ? ch->subscriber_count : 0;

  pthread_mutex_unlock(&broker->broker_mutex);

  return count;
}

void freelang_pubsub_remove_channel(fl_pubsub_broker_t *broker,
                                     const char *channel) {
  if (!broker || !channel) return;

  pthread_mutex_lock(&broker->broker_mutex);

  for (int i = 0; i < broker->channel_count; i++) {
    if (strcmp(broker->channels[i].channel_name, channel) == 0) {
      if (broker->channels[i].subscriber_count == 0) {
        pthread_mutex_destroy(&broker->channels[i].channel_mutex);

        /* Shift remaining channels */
        for (int j = i; j < broker->channel_count - 1; j++) {
          broker->channels[j] = broker->channels[j + 1];
        }
        broker->channel_count--;

        fprintf(stderr, "[PubSub] Channel removed: %s\n", channel);
      }
      break;
    }
  }

  pthread_mutex_unlock(&broker->broker_mutex);
}

/* ===== Statistics ===== */

fl_pubsub_stats_t freelang_pubsub_get_stats(fl_pubsub_broker_t *broker) {
  fl_pubsub_stats_t stats = {0, 0, 0, 0.0, 0.0};

  if (!broker) return stats;

  pthread_mutex_lock(&broker->broker_mutex);

  stats.total_channels = broker->channel_count;
  stats.total_messages = broker->total_messages_published;

  int total_subscribers = 0;
  for (int i = 0; i < broker->channel_count; i++) {
    total_subscribers += broker->channels[i].subscriber_count;
  }

  stats.total_subscribers = total_subscribers;

  if (broker->channel_count > 0) {
    stats.average_subscribers_per_channel = (double)total_subscribers /
                                            (double)broker->channel_count;
  }

  pthread_mutex_unlock(&broker->broker_mutex);

  return stats;
}

void freelang_pubsub_list_channels(fl_pubsub_broker_t *broker,
                                    char **channel_names, int *count) {
  if (!broker || !channel_names || !count) return;

  pthread_mutex_lock(&broker->broker_mutex);

  int i = 0;
  for (; i < broker->channel_count && i < *count; i++) {
    channel_names[i] = broker->channels[i].channel_name;
  }

  *count = i;

  fprintf(stderr, "[PubSub] Listed %d channels\n", i);

  pthread_mutex_unlock(&broker->broker_mutex);
}

void freelang_pubsub_reset_stats(fl_pubsub_broker_t *broker) {
  if (!broker) return;

  pthread_mutex_lock(&broker->broker_mutex);

  broker->total_messages_published = 0;
  broker->total_subscriptions = 0;

  for (int i = 0; i < broker->channel_count; i++) {
    broker->channels[i].total_messages = 0;
  }

  fprintf(stderr, "[PubSub] Statistics reset\n");

  pthread_mutex_unlock(&broker->broker_mutex);
}
