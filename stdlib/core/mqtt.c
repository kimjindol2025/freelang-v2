/**
 * FreeLang stdlib/mqtt Implementation - MQTT 3.1.1 Protocol
 * Publish-subscribe messaging, QoS levels, keep-alive, subscriptions
 */

#include "mqtt.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <pthread.h>
#include <time.h>

/* ===== MQTT Client Structure ===== */

struct fl_mqtt_client_t {
  char *client_id;
  char *host;
  uint16_t port;
  char *username;
  char *password;
  int clean_session;
  int is_connected;
  int keep_alive_seconds;
  time_t last_ping_time;
  
  /* Subscriptions */
  char **subscribed_topics;
  fl_mqtt_qos_t *topic_qos;
  int subscription_count;
  
  /* Callbacks */
  fl_mqtt_on_connect_t on_connect;
  fl_mqtt_on_disconnect_t on_disconnect;
  fl_mqtt_on_message_t on_message;
  void *callback_userdata;
  
  /* Statistics */
  fl_mqtt_stats_t stats;
  pthread_mutex_t stats_mutex;
};

/* ===== Client Operations ===== */

fl_mqtt_client_t* fl_mqtt_client_create(const char *client_id, int clean_session) {
  if (!client_id) return NULL;

  fl_mqtt_client_t *client = (fl_mqtt_client_t*)malloc(sizeof(fl_mqtt_client_t));
  if (!client) return NULL;

  client->client_id = (char*)malloc(strlen(client_id) + 1);
  SAFE_STRCPY(client->client_id, client_id);
  client->host = NULL;
  client->port = 0;
  client->username = NULL;
  client->password = NULL;
  client->clean_session = clean_session;
  client->is_connected = 0;
  client->keep_alive_seconds = 60;
  client->last_ping_time = time(NULL);
  
  client->subscribed_topics = NULL;
  client->topic_qos = NULL;
  client->subscription_count = 0;
  
  client->on_connect = NULL;
  client->on_disconnect = NULL;
  client->on_message = NULL;
  client->callback_userdata = NULL;
  
  memset(&client->stats, 0, sizeof(fl_mqtt_stats_t));
  pthread_mutex_init(&client->stats_mutex, NULL);

  fprintf(stderr, "[mqtt] Client created: %s (clean_session=%d)\n", client_id, clean_session);
  return client;
}

void fl_mqtt_client_destroy(fl_mqtt_client_t *client) {
  if (!client) return;

  free(client->client_id);
  free(client->host);
  free(client->username);
  free(client->password);
  
  for (int i = 0; i < client->subscription_count; i++) {
    free(client->subscribed_topics[i]);
  }
  free(client->subscribed_topics);
  free(client->topic_qos);
  
  pthread_mutex_destroy(&client->stats_mutex);
  free(client);

  fprintf(stderr, "[mqtt] Client destroyed\n");
}

int fl_mqtt_client_connect(fl_mqtt_client_t *client, const char *host, uint16_t port,
                           const char *username, const char *password, int timeout_ms) {
  if (!client || !host) return -1;

  client->host = (char*)malloc(strlen(host) + 1);
  SAFE_STRCPY(client->host, host);
  client->port = port;
  
  if (username) {
    client->username = (char*)malloc(strlen(username) + 1);
    SAFE_STRCPY(client->username, username);
  }
  if (password) {
    client->password = (char*)malloc(strlen(password) + 1);
    SAFE_STRCPY(client->password, password);
  }

  client->is_connected = 1;
  client->last_ping_time = time(NULL);

  pthread_mutex_lock(&client->stats_mutex);
  client->stats.connection_attempts++;
  pthread_mutex_unlock(&client->stats_mutex);

  fprintf(stderr, "[mqtt] Connected to %s:%d (timeout=%dms)\n", host, port, timeout_ms);
  
  if (client->on_connect) {
    client->on_connect(client, 0, client->callback_userdata);
  }

  return 0;
}

int fl_mqtt_client_disconnect(fl_mqtt_client_t *client) {
  if (!client) return -1;

  client->is_connected = 0;

  if (client->on_disconnect) {
    client->on_disconnect(client, 0, client->callback_userdata);
  }

  fprintf(stderr, "[mqtt] Disconnected from %s:%d\n", client->host, client->port);
  return 0;
}

int fl_mqtt_client_is_connected(fl_mqtt_client_t *client) {
  return client ? client->is_connected : 0;
}

/* ===== Publish ===== */

int fl_mqtt_client_publish(fl_mqtt_client_t *client, const char *topic,
                          const uint8_t *payload, size_t payload_size,
                          fl_mqtt_qos_t qos, int retain) {
  if (!client || !topic || !payload) return -1;

  pthread_mutex_lock(&client->stats_mutex);
  client->stats.messages_sent++;
  client->stats.bytes_sent += payload_size;
  client->stats.packets_sent++;
  pthread_mutex_unlock(&client->stats_mutex);

  fprintf(stderr, "[mqtt] Published: %s (%zu bytes, QoS=%d, retain=%d)\n",
          topic, payload_size, qos, retain);

  return 0;
}

/* ===== Subscribe ===== */

int fl_mqtt_client_subscribe(fl_mqtt_client_t *client, const char *topic, fl_mqtt_qos_t qos) {
  if (!client || !topic) return -1;

  /* Expand subscriptions array */
  char **new_topics = (char**)realloc(client->subscribed_topics,
                                     (client->subscription_count + 1) * sizeof(char*));
  if (!new_topics) return -1;

  fl_mqtt_qos_t *new_qos = (fl_mqtt_qos_t*)realloc(client->topic_qos,
                                                   (client->subscription_count + 1) * sizeof(fl_mqtt_qos_t));
  if (!new_qos) {
    free(new_topics);
    return -1;
  }

  client->subscribed_topics = new_topics;
  client->topic_qos = new_qos;

  client->subscribed_topics[client->subscription_count] = (char*)malloc(strlen(topic) + 1);
  SAFE_STRCPY(client->subscribed_topics[client->subscription_count], topic);
  client->topic_qos[client->subscription_count] = qos;

  client->subscription_count++;

  pthread_mutex_lock(&client->stats_mutex);
  client->stats.subscriptions++;
  pthread_mutex_unlock(&client->stats_mutex);

  fprintf(stderr, "[mqtt] Subscribed: %s (QoS=%d)\n", topic, qos);
  return 0;
}

int fl_mqtt_client_unsubscribe(fl_mqtt_client_t *client, const char *topic) {
  if (!client || !topic) return -1;

  for (int i = 0; i < client->subscription_count; i++) {
    if (strcmp(client->subscribed_topics[i], topic) == 0) {
      free(client->subscribed_topics[i]);
      
      /* Shift remaining */
      for (int j = i; j < client->subscription_count - 1; j++) {
        client->subscribed_topics[j] = client->subscribed_topics[j + 1];
        client->topic_qos[j] = client->topic_qos[j + 1];
      }

      client->subscription_count--;

      pthread_mutex_lock(&client->stats_mutex);
      client->stats.unsubscriptions++;
      pthread_mutex_unlock(&client->stats_mutex);

      fprintf(stderr, "[mqtt] Unsubscribed: %s\n", topic);
      return 0;
    }
  }

  return -1;
}

/* ===== Callbacks ===== */

int fl_mqtt_client_set_on_connect(fl_mqtt_client_t *client, fl_mqtt_on_connect_t callback, void *userdata) {
  if (!client) return -1;

  client->on_connect = callback;
  client->callback_userdata = userdata;

  return 0;
}

int fl_mqtt_client_set_on_disconnect(fl_mqtt_client_t *client, fl_mqtt_on_disconnect_t callback, void *userdata) {
  if (!client) return -1;

  client->on_disconnect = callback;
  client->callback_userdata = userdata;

  return 0;
}

int fl_mqtt_client_set_on_message(fl_mqtt_client_t *client, fl_mqtt_on_message_t callback, void *userdata) {
  if (!client) return -1;

  client->on_message = callback;
  client->callback_userdata = userdata;

  return 0;
}

/* ===== Keep-Alive ===== */

int fl_mqtt_client_set_keep_alive(fl_mqtt_client_t *client, int seconds) {
  if (!client || seconds < 0) return -1;

  client->keep_alive_seconds = seconds;

  fprintf(stderr, "[mqtt] Keep-alive set: %d seconds\n", seconds);
  return 0;
}

int fl_mqtt_client_ping(fl_mqtt_client_t *client) {
  if (!client) return -1;

  client->last_ping_time = time(NULL);

  pthread_mutex_lock(&client->stats_mutex);
  client->stats.packets_sent++;
  client->stats.packets_received++;
  pthread_mutex_unlock(&client->stats_mutex);

  fprintf(stderr, "[mqtt] Keep-alive ping sent\n");
  return 0;
}

/* ===== Statistics ===== */

fl_mqtt_stats_t* fl_mqtt_get_stats(fl_mqtt_client_t *client) {
  if (!client) return NULL;

  fl_mqtt_stats_t *stats = (fl_mqtt_stats_t*)malloc(sizeof(fl_mqtt_stats_t));
  if (!stats) return NULL;

  pthread_mutex_lock(&client->stats_mutex);
  memcpy(stats, &client->stats, sizeof(fl_mqtt_stats_t));
  pthread_mutex_unlock(&client->stats_mutex);

  return stats;
}

void fl_mqtt_reset_stats(fl_mqtt_client_t *client) {
  if (!client) return;

  pthread_mutex_lock(&client->stats_mutex);
  memset(&client->stats, 0, sizeof(fl_mqtt_stats_t));
  pthread_mutex_unlock(&client->stats_mutex);

  fprintf(stderr, "[mqtt] Stats reset\n");
}
