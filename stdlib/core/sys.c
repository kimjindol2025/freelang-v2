/**
 * FreeLang stdlib/sys Implementation - System Resource Information
 * CPU, memory, uptime, platform information
 */

#include "sys.h"
#include "security_macros.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/sysinfo.h>
#include <sys/utsname.h>

/* Get current system information */
int fl_sys_get_info(fl_sys_info_t *out_info) {
  if (!out_info) return -1;

  memset(out_info, 0, sizeof(fl_sys_info_t));

  /* Get memory info */
  struct sysinfo sinfo;
  if (sysinfo(&sinfo) == 0) {
    out_info->memory.total_memory = sinfo.totalram;
    out_info->memory.available_memory = sinfo.freeram;
    out_info->memory.used_memory = sinfo.totalram - sinfo.freeram;

    if (sinfo.totalram > 0) {
      out_info->memory.memory_percent = (100 * (sinfo.totalram - sinfo.freeram)) / sinfo.totalram;
    }

    /* CPU info */
    out_info->cpu.cpu_count = sysconf(_SC_NPROCESSORS_ONLN);
    out_info->cpu.load_average[0] = (sinfo.loads[0] * 100) >> 16;
    out_info->cpu.load_average[1] = (sinfo.loads[1] * 100) >> 16;
    out_info->cpu.load_average[2] = (sinfo.loads[2] * 100) >> 16;

    /* Runtime info */
    out_info->runtime.uptime_seconds = sinfo.uptime;
    out_info->runtime.boot_time = time(NULL) - sinfo.uptime;
    out_info->runtime.process_count = sinfo.procs;
  }

  /* Platform info */
  struct utsname uname_data;
  if (uname(&uname_data) == 0) {
    strncpy(out_info->platform.os_name, uname_data.sysname, sizeof(out_info->platform.os_name) - 1);
    strncpy(out_info->platform.os_version, uname_data.release, sizeof(out_info->platform.os_version) - 1);
    strncpy(out_info->platform.arch, uname_data.machine, sizeof(out_info->platform.arch) - 1);
    strncpy(out_info->platform.hostname, uname_data.nodename, sizeof(out_info->platform.hostname) - 1);
  }

  fprintf(stderr, "[sys] System info retrieved: %d CPUs, %dMB RAM\n",
          out_info->cpu.cpu_count,
          out_info->memory.total_memory / (1024 * 1024));

  return 0;
}

/* Get memory info only */
int fl_sys_get_memory(fl_sys_memory_t *out_mem) {
  if (!out_mem) return -1;

  memset(out_mem, 0, sizeof(fl_sys_memory_t));

  struct sysinfo sinfo;
  if (sysinfo(&sinfo) != 0) return -1;

  out_mem->total_memory = sinfo.totalram;
  out_mem->available_memory = sinfo.freeram;
  out_mem->used_memory = sinfo.totalram - sinfo.freeram;

  if (sinfo.totalram > 0) {
    out_mem->memory_percent = (100 * (sinfo.totalram - sinfo.freeram)) / sinfo.totalram;
  }

  fprintf(stderr, "[sys] Memory: %dMB/%dMB (%.0f%%)\n",
          out_mem->used_memory / (1024 * 1024),
          out_mem->total_memory / (1024 * 1024),
          (float)out_mem->memory_percent);

  return 0;
}

/* Get CPU info only */
int fl_sys_get_cpu(fl_sys_cpu_t *out_cpu) {
  if (!out_cpu) return -1;

  memset(out_cpu, 0, sizeof(fl_sys_cpu_t));

  struct sysinfo sinfo;
  if (sysinfo(&sinfo) != 0) return -1;

  out_cpu->cpu_count = sysconf(_SC_NPROCESSORS_ONLN);
  out_cpu->load_average[0] = (sinfo.loads[0] * 100) >> 16;
  out_cpu->load_average[1] = (sinfo.loads[1] * 100) >> 16;
  out_cpu->load_average[2] = (sinfo.loads[2] * 100) >> 16;

  fprintf(stderr, "[sys] CPU: %d cores, Load: %.2f %.2f %.2f\n",
          out_cpu->cpu_count,
          out_cpu->load_average[0] / 100.0,
          out_cpu->load_average[1] / 100.0,
          out_cpu->load_average[2] / 100.0);

  return 0;
}

/* Get platform info only */
int fl_sys_get_platform(fl_sys_platform_t *out_platform) {
  if (!out_platform) return -1;

  memset(out_platform, 0, sizeof(fl_sys_platform_t));

  struct utsname uname_data;
  if (uname(&uname_data) != 0) return -1;

  strncpy(out_platform->os_name, uname_data.sysname, sizeof(out_platform->os_name) - 1);
  strncpy(out_platform->os_version, uname_data.release, sizeof(out_platform->os_version) - 1);
  strncpy(out_platform->arch, uname_data.machine, sizeof(out_platform->arch) - 1);
  strncpy(out_platform->hostname, uname_data.nodename, sizeof(out_platform->hostname) - 1);

  snprintf(out_platform->platform, sizeof(out_platform->platform), "%s-%s",
           uname_data.sysname, uname_data.machine);

  fprintf(stderr, "[sys] Platform: %s %s (%s)\n",
          out_platform->os_name,
          out_platform->os_version,
          out_platform->arch);

  return 0;
}

/* Get system uptime in seconds */
uint64_t fl_sys_get_uptime(void) {
  struct sysinfo sinfo;
  if (sysinfo(&sinfo) != 0) return 0;
  return sinfo.uptime;
}

/* Get process ID */
uint32_t fl_sys_get_pid(void) {
  return (uint32_t)getpid();
}

/* Get parent process ID */
uint32_t fl_sys_get_ppid(void) {
  return (uint32_t)getppid();
}

/* Get current user ID */
uint32_t fl_sys_get_uid(void) {
  return (uint32_t)getuid();
}

/* Check if running as root/admin */
int fl_sys_is_elevated(void) {
  return getuid() == 0 ? 1 : 0;
}
