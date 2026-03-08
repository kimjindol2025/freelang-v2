/**
 * FreeLang stdlib/mqtt - MQTT Message Broker Protocol (3.1.1)
 * Lightweight publish-subscribe, IoT messaging, QoS levels
 */

#ifndef FREELANG_STDLIB_MQTT_H
#define FREELANG_STDLIB_MQTT_H

#include <stdint.h>
#include <stddef.h>

/* ===== MQTT Message Types ===== */

typedef enum {
  FL_MQTT_RESERVED_0 = 0,
  FL_MQTT_CONNECT = 1,        /* Client → Broker */
  FL_MQTT_CONNACK = 2,        /* Broker → Client */
  FL_MQTT_PUBLISH = 3,        /* Bidirectional */
  FL_MQTT_PUBACK = 4,         /* QoS 1 ack */
  FL_MQTT_PUBREC = 5,         /* QoS 2 received */
  FL_MQTT_PUBREL = 6,         /* QoS 2 release */
  FL_MQTT_PUBCOMP = 7,        /* QoS 2 complete */
  FL_MQTT_SUBSCRIBE = 8,      /* Client → Broker */
  FL_MQTT_SUBACK = 9,         /* Broker → Client */
  FL_MQTT_UNSUBSCRIBE = 10,   /* Client → Broker */
  FL_MQTT_UNSUBACK = 11,      /* Broker → Client */
  FL_MQTT_PINGREQ = 12,       /* Keep-alive ping */
  FL_MQTT_PINGRESP = 13,      /* Keep-alive response */
  FL_MQTT_DISCONNECT = 14     /* Connection close */
} fl_mqtt_message_type_t;

/* ===== MQTT QoS Levels ===== */

typedef enum {
  FL_MQTT_QOS_0 = 0,          /* At most once (fire-and-forget) */
  FL_MQTT_QOS_1 = 1,          /* At least once (acknowledged) */
  FL_MQTT_QOS_2 = 2           /* Exactly once (two-phase) */
} fl_mqtt_qos_t;

/* ===== MQTT Connection Return Codes ===== */

typedef enum {
  FL_MQTT_CONNACK_ACCEPTED = 0,
  FL_MQTT_CONNACK_UNACCEPTABLE_PROTOCOL_VERSION = 1,
  FL_MQTT_CONNACK_IDENTIFIER_REJECTED = 2,
  FL_MQTT_CONNACK_SERVER_UNAVAILABLE = 3,
  FL_MQTT_CONNACK_BAD_USERNAME_PASSWORD = 4,
  FL_MQTT_CONNACK_NOT_AUTHORIZED = 5
} fl_mqtt_connack_code_t;

/* ===== MQTT Client Handle ===== */

typedef struct fl_mqtt_client_t fl_mqtt_client_t;

/* ===== MQTT Message ===== */

typedef struct {
  uint8_t *payload;
  size_t payload_size;
  int dup;                     /* Duplicate delivery flag */
  fl_mqtt_qos_t qos;           /* Quality of Service level */
  int retain;                  /* Retain flag */
} fl_mqtt_message_t;

/* ===== MQTT Callbacks ===== */

typedef void (*fl_mqtt_on_connect_t)(fl_mqtt_client_t *client, int session_present, void *userdata);
typedef void (*fl_mqtt_on_disconnect_t)(fl_mqtt_client_t *client, int reason_code, void *userdata);
typedef void (*fl_mqtt_on_message_t)(fl_mqtt_client_t *client, const char *topic,
                                     const fl_mqtt_message_t *msg, void *userdata);
typedef void (*fl_mqtt_on_subscribe_t)(fl_mqtt_client_t *client, const char *topic,
                                       fl_mqtt_qos_t qos, void *userdata);

/* ===== MQTT Statistics ===== */

typedef struct {
  uint64_t messages_sent;
  uint64_t messages_received;
  uint64_t bytes_sent;
  uint64_t bytes_received;
  uint64_t packets_sent;
  uint64_t packets_received;
  uint64_t connection_attempts;
  uint64_t subscriptions;
  uint64_t unsubscriptions;
} fl_mqtt_stats_t;

/* ===== Public API ===== */

/* Client */
fl_mqtt_client_t* fl_mqtt_client_create(const char *client_id, int clean_session);
void fl_mqtt_client_destroy(fl_mqtt_client_t *client);
int fl_mqtt_client_connect(fl_mqtt_client_t *client, const char *host, uint16_t port,
                           const char *username, const char *password, int timeout_ms);
int fl_mqtt_client_disconnect(fl_mqtt_client_t *client);
int fl_mqtt_client_is_connected(fl_mqtt_client_t *client);

/* Publish */
int fl_mqtt_client_publish(fl_mqtt_client_t *client, const char *topic,
                          const uint8_t *payload, size_t payload_size,
                          fl_mqtt_qos_t qos, int retain);

/* Subscribe */
int fl_mqtt_client_subscribe(fl_mqtt_client_t *client, const char *topic, fl_mqtt_qos_t qos);
int fl_mqtt_client_unsubscribe(fl_mqtt_client_t *client, const char *topic);

/* Callbacks */
int fl_mqtt_client_set_on_connect(fl_mqtt_client_t *client, fl_mqtt_on_connect_t callback, void *userdata);
int fl_mqtt_client_set_on_disconnect(fl_mqtt_client_t *client, fl_mqtt_on_disconnect_t callback, void *userdata);
int fl_mqtt_client_set_on_message(fl_mqtt_client_t *client, fl_mqtt_on_message_t callback, void *userdata);

/* Keep-alive */
int fl_mqtt_client_set_keep_alive(fl_mqtt_client_t *client, int seconds);
int fl_mqtt_client_ping(fl_mqtt_client_t *client);

/* Statistics */
fl_mqtt_stats_t* fl_mqtt_get_stats(fl_mqtt_client_t *client);
void fl_mqtt_reset_stats(fl_mqtt_client_t *client);

#endif /* FREELANG_STDLIB_MQTT_H */
