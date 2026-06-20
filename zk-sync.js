try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed/loaded in this execution context
}
const ZKLib = require('zkteco-js');
const axios = require('axios');

// ── Configuration ─────────────────────────────────────────────
const ZK_DEVICE_IP = process.env.ZK_DEVICE_IP || '192.168.1.201';   // Your device's IP address
const ZK_DEVICE_PORT = parseInt(process.env.ZK_DEVICE_PORT || '4370', 10);
const ZK_PASSWORD = parseInt(process.env.ZK_PASSWORD || '0', 10);                  // Change if you set a device password

const API_URL = process.env.API_URL || 'http://localhost:5000/api/machine/attendance';
const API_KEY = process.env.API_KEY || 'abdi_adama_zk_secure_key_2026';

// ── State: track the last synced log index to avoid resending ──
let lastSyncedIndex = 0;

async function syncAttendance() {
  const zk = new ZKLib(ZK_DEVICE_IP, ZK_DEVICE_PORT, 10000, 4000);

  try {
    await zk.createSocket();
    console.log(`[ZK] Connected to device at ${ZK_DEVICE_IP}:${ZK_DEVICE_PORT}`);

    // Sync device time with local machine time
    try {
      await zk.setTime(new Date());
      console.log('[ZK] ✓ Device clock synchronized successfully.');
    } catch (timeErr) {
      console.warn('[ZK] ⚠ Failed to sync device clock:', timeErr.message || timeErr);
    }

    // Read all attendance logs from device
    const logsObj = await zk.getAttendances();
    const logs = logsObj.data;

    if (!Array.isArray(logs) || logs.length === 0) {
      console.log('[ZK] No attendance logs found on device.');
      return;
    }

    // Only process new logs since last sync
    const newLogs = logs.slice(lastSyncedIndex);
    if (newLogs.length === 0) {
      console.log('[ZK] No new logs since last sync.');
      return;
    }

    // Format for your backend's expected payload
    const formattedLogs = newLogs.map(log => {
      const d = new Date(log.record_time);
      const pad = (n) => String(n).padStart(2, '0');
      const localISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      return {
        zkDeviceId: String(log.user_id),
        timestamp: localISO,
        type: typeof log.state === 'number' ? log.state : 0
      };
    });

    console.log(`[ZK] Sending ${formattedLogs.length} log(s) to backend...`);

    const response = await axios.post(API_URL, { logs: formattedLogs }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      timeout: 15000
    });

    console.log(`[ZK] ✓ Backend response:`, response.data);
    lastSyncedIndex = logs.length; // advance pointer

  } catch (err) {
    console.error('[ZK] Error:', err.message || err);
  } finally {
    try { await zk.disconnect(); } catch (_) {}
  }
}

// Run sync immediately, then every 2 minutes
syncAttendance();
setInterval(syncAttendance, 2 * 60 * 1000);

console.log('[ZK Middleware] Started. Syncing every 2 minutes...');
