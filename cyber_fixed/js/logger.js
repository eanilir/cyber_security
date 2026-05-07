/**
 * LOGGER.JS
 * Log yönetimi ve veri yapıları
 */

class Logger {
    constructor(maxLogs = 100) {
        this.logs = [];
        this.maxLogs = maxLogs;
    }

    /**
     * Başarılı işlem logu
     */
    static success(action, details) {
        Logger.instance.addLog('success', action, details);
    }

    /**
     * Başarısız işlem / Hata logu
     */
    static error(action, details) {
        Logger.instance.addLog('error', action, details);
    }

    /**
     * Uyarı logu
     */
    static warning(action, details) {
        Logger.instance.addLog('warning', action, details);
    }

    /**
     * Bilgi logu
     */
    static info(action, details) {
        Logger.instance.addLog('info', action, details);
    }

    /**
     * Log ekle
     */
    addLog(type, action, details) {
        const timestamp = new Date();
        const log = {
            id: Date.now(),
            type,          // 'success', 'error', 'warning', 'info'
            action,
            details,
            timestamp
        };

        this.logs.push(log);

        // Limit aşılırsa eski logları sil
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console'a da yazdır (debug)
        console.log(`[${type.toUpperCase()}] ${action}: ${details}`, log);
        
        // UI'ı güncelle
        if (window.UIManager) {
            UIManager.addLogEntry(log);
        }
    }

    /**
     * Tüm logları al
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Son N logu al
     */
    getRecentLogs(count = 20) {
        return this.logs.slice(-count);
    }

    /**
     * Belirli türde logları al
     */
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }

    /**
     * Logları temizle
     */
    clear() {
        this.logs = [];
        console.log('[INFO] Logs cleared');
    }

    /**
     * Logları JSON olarak dışa aktar
     */
    export() {
        return JSON.stringify(this.logs, null, 2);
    }
}

// Global instance oluştur
Logger.instance = new Logger(100);
