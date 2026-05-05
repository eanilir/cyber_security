/**
 * SIMULATION.JS
 * Kullanıcı simülasyonu, saldırılar ve tespit mantığı
 */

class SecuritySimulation {
    constructor() {
        this.users = [];
        this.blockedIPs = new Set();
        this.attackLog = [];
        this.statistics = {
            successLogins: 0,
            failedLogins: 0,
            bruteForceDetections: 0,
            botAttackDetections: 0,
            ddosAttackDetections: 0,
            sqlInjectionDetections: 0,
            totalAttacks: 0
        };
        this.userAttempts = {}; // IP -> {timestamp, count, targetUser}
        this.suspiciousIPs = new Map(); // IP -> {attemptCount, timestamp, status}
        this.rateLimitMap = new Map(); // IP -> {lastAttemptTime, attemptCount, window}
        this.running = false;
        this.botInterval = null;
    }

    /**
     * Verileri yükle (data/users.json'dan)
     */
    async loadData() {
        try {
            const response = await fetch('data/users.json');
            const data = await response.json();
            
            // Kullanıcıları başlat
            this.users = data.users.map(user => ({
                ...user,
                status: 'normal',
                failedAttempts: 0,
                lastAttempt: null,
                attemptCount: 0
            }));
            
            this.botAttackIPs = data.botAttackIPs || [];
            this.targetAccounts = data.targetAccounts || [];
            
            Logger.info('Data loaded successfully', `${this.users.length} users initialized`);
            return true;
        } catch (error) {
            Logger.error('Data loading failed', error.message);
            return false;
        }
    }

    /**
     * Normal kullanıcı girişi simüle et
     * @param {string} userId - Kullanıcı ID'si
     * @param {string} sourceIP - Kaynağı IP adresi (opsiyonel)
     */
    simulateNormalLogin(userId, sourceIP = null) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            Logger.error('Login failed', `User ${userId} not found`);
            return false;
        }

        // Kullanıcının kendi IP'si kullanılıyorsa veya varsa
        if (!sourceIP) sourceIP = user.homeIP;

        // IP engelliyse reddedilir
        if (this.blockedIPs.has(sourceIP)) {
            Logger.error('Login blocked', `${user.name} (${sourceIP}) - IP is blocked`);
            user.status = 'blocked';
            return false;
        }

        // Başarılı giriş
        user.status = 'normal';
        user.failedAttempts = 0; // Reset başarısız denemeler
        this.statistics.successLogins++;
        Logger.success('Login successful', `${user.name} from ${sourceIP}`);
        
        return true;
    }

    /**
     * Başarısız giriş (brute force tespiti)
     * @param {string} username - Hedef kullanıcı adı
     * @param {string} sourceIP - Kaynağı IP adresi
     */
    simulateFailedLogin(username, sourceIP) {
        // IP'yi engelle ise kontrol et
        if (this.blockedIPs.has(sourceIP)) {
            Logger.warning('Blocked IP attempt', `${sourceIP} → ${username} (rejected)`);
            return false;
        }

        // SUSPICIOUS DURUMU KONTROL ET
        this.checkSuspiciousActivity(sourceIP, username);

        // Bu IP'den yapılan girişimleri takip et
        if (!this.userAttempts[sourceIP]) {
            this.userAttempts[sourceIP] = {
                attempts: [],
                targetUsers: new Set()
            };
        }

        const now = Date.now();
        this.userAttempts[sourceIP].attempts.push(now);
        this.userAttempts[sourceIP].targetUsers.add(username);

        // 30 saniyeden eski girişimleri sil
        this.userAttempts[sourceIP].attempts = this.userAttempts[sourceIP].attempts.filter(
            t => now - t < 30000
        );

        this.statistics.failedLogins++;
        const attemptCount = this.userAttempts[sourceIP].attempts.length;

        Logger.warning('Login failed', `${username} from ${sourceIP} (attempt ${attemptCount}/3)`);

        // BRUTE FORCE TESPİTİ: 3+ başarısız giriş = IP engelleme
        if (attemptCount >= 3) {
            this.blockIP(sourceIP, 'Brute Force Attack');
            this.statistics.bruteForceDetections++;
            return false;
        }

        return false;
    }

    /**
     * BOT ATTACK TESPİTİ
     * Farklı IP'lerden aynı hedefe hızlı ardışık giriş
     */
    detectBotAttack() {
        const now = Date.now();
        const timeWindow = 5000; // 5 saniye
        
        // Tüm IP'lerdeki son girişimleri topla
        let recentAttempts = {};
        
        Object.entries(this.userAttempts).forEach(([ip, data]) => {
            // Engellenmemiş IP'leri kontrol et
            if (this.blockedIPs.has(ip)) return;
            
            data.targetUsers.forEach(targetUser => {
                if (!recentAttempts[targetUser]) {
                    recentAttempts[targetUser] = [];
                }
                
                // Son 5 saniye içindeki girişimleri ekle
                const recentAttemptsForIP = data.attempts.filter(t => now - t < timeWindow);
                if (recentAttemptsForIP.length > 0) {
                    recentAttempts[targetUser].push({
                        ip,
                        attemptCount: recentAttemptsForIP.length
                    });
                }
            });
        });

        // Hedef başına 3+ farklı IP'den giriş = Bot Attack
        Object.entries(recentAttempts).forEach(([targetUser, ips]) => {
            if (ips.length >= 3) {
                Logger.error('Bot attack detected', `${targetUser} targeted by ${ips.length} different IPs`);
                this.statistics.botAttackDetections++;
                this.statistics.totalAttacks++;
                
                // Saldırgan IP'leri engelle
                ips.slice(0, 2).forEach(item => { // İlk 2'sini engelle
                    if (!this.blockedIPs.has(item.ip)) {
                        this.blockIP(item.ip, 'Bot Attack');
                    }
                });
            }
        });
    }

    /**
     * IP adresini engelle
     * @param {string} ip - Engellenmesi gereken IP
     * @param {string} reason - Neden engellendi
     */
    blockIP(ip, reason = 'Suspicious Activity') {
        if (this.blockedIPs.has(ip)) return;
        
        this.blockedIPs.add(ip);
        Logger.error('IP blocked', `${ip} - Reason: ${reason}`);
        
        // Bu IP'den gelen kullanıcıları 'blocked' olarak işaretle
        this.users.forEach(user => {
            if (user.homeIP === ip) {
                user.status = 'blocked';
            }
        });

        this.statistics.totalAttacks++;
    }

    /**
     * SUSPICIOUS DURUMU: İlk 1-2 deneme sonra uyarı
     * @param {string} ip - Kontrol edilecek IP
     * @param {string} username - Hedef kullanıcı
     */
    checkSuspiciousActivity(ip, username) {
        if (!this.suspiciousIPs.has(ip)) {
            this.suspiciousIPs.set(ip, {
                attemptCount: 0,
                firstAttemptTime: Date.now(),
                targetUsers: new Set(),
                status: 'monitoring'
            });
        }

        const suspData = this.suspiciousIPs.get(ip);
        suspData.attemptCount++;
        suspData.targetUsers.add(username);

        // 1. deneme → uyarı
        if (suspData.attemptCount === 1) {
            Logger.warning('Suspicious activity detected', `${ip} - 1st attempt on ${username}`);
            // Şu an henüz block etme, sadece işaretle
        }

        // 2. deneme → daha güçlü uyarı
        if (suspData.attemptCount === 2) {
            Logger.warning('Suspicious activity escalated', `${ip} - 2nd attempt (targets: ${Array.from(suspData.targetUsers).join(', ')})`);
            // Bu IP'den gelen kullanıcıları suspicious olarak işaretle (eğer varsa)
            this.users.forEach(user => {
                if (user.homeIP === ip && user.status === 'normal') {
                    user.status = 'suspicious';
                }
            });
        }
    }

    /**
     * DDoS ATTACK SIMULATION
     * Çok sayıda IP'den eş zamanlı flood
     */
    simulateDDoSAttack(targetUsername = 'admin', requestCount = 10) {
        Logger.error('DDoS attack simulated', `${requestCount} simultaneous requests to ${targetUsername}`);
        
        // Rastgele IP'ler oluştur
        for (let i = 0; i < requestCount; i++) {
            const randomIP = `203.0.113.${100 + i}`; // Örnek IP aralığı
            
            // Her request için failed login simüle et
            this.simulateFailedLogin(targetUsername, randomIP);
            
            // Rate limiting kontrol et
            this.checkRateLimit(randomIP);
        }

        this.statistics.ddosAttackDetections++;
        this.statistics.totalAttacks++;
        
        // DDoS tespiti: 10+ farklı IP'den aynı hedefe
        const recentDDoS = this.userAttempts;
        let ddosDetected = false;
        
        Object.values(recentDDoS).forEach(ipData => {
            if (ipData.targetUsers && ipData.targetUsers.has(targetUsername)) {
                const uniqueIPs = Object.keys(recentDDoS).filter(ip => 
                    recentDDoS[ip].targetUsers && recentDDoS[ip].targetUsers.has(targetUsername)
                ).length;
                
                if (uniqueIPs >= 8) {
                    ddosDetected = true;
                    Logger.error('DDoS attack detected', `Target: ${targetUsername}, IPs: ${uniqueIPs}`);
                }
            }
        });
    }

    /**
     * SQL INJECTION SIMULATION
     * SQL injection karakterlerini içeren giriş denemeleri
     */
    simulateSQLInjection(targetUsername = "' OR '1'='1", sourceIP = '198.51.100.1') {
        Logger.error('SQL injection attack simulated', `Target: ${targetUsername} from ${sourceIP}`);
        
        // SQL injection pattern'leri
        const sqlPatterns = [
            "' OR '1'='1",
            "admin'--",
            "' UNION SELECT NULL--",
            "1' AND 1=1--"
        ];

        // Her pattern için deneme yap
        sqlPatterns.forEach((pattern, index) => {
            const attackIP = `198.51.100.${100 + index}`;
            this.simulateFailedLogin(pattern, attackIP);
            
            Logger.warning('SQL injection attempt blocked', `Pattern: ${pattern} from ${attackIP}`);
        });

        this.statistics.sqlInjectionDetections++;
        this.statistics.totalAttacks++;
        Logger.error('SQL injection pattern detected', `Multiple SQL patterns attempted from different IPs`);
    }

    /**
     * RATE LIMITING: Zaman bazlı sınırlama
     * @param {string} ip - Kontrol edilecek IP
     * @returns {boolean} - Rate limit aşıldı mı?
     */
    checkRateLimit(ip) {
        const now = Date.now();
        const timeWindow = 1000; // 1 saniye
        const maxRequests = 10; // 1 saniyede max 10 request

        if (!this.rateLimitMap.has(ip)) {
            this.rateLimitMap.set(ip, {
                requests: [],
                blocked: false
            });
        }

        const rateLimitData = this.rateLimitMap.get(ip);
        
        // Zaman penceresinin dışındaki requestleri sil
        rateLimitData.requests = rateLimitData.requests.filter(t => now - t < timeWindow);
        
        // Yeni request ekle
        rateLimitData.requests.push(now);

        // Rate limit kontrol et
        if (rateLimitData.requests.length > maxRequests && !rateLimitData.blocked) {
            Logger.error('Rate limit exceeded', `${ip} - ${rateLimitData.requests.length} requests in ${timeWindow}ms`);
            rateLimitData.blocked = true;
            
            // IP'yi block et
            this.blockIP(ip, 'Rate Limit Exceeded');
            return true;
        }

        return false;
    }

    /**
     * Bot saldırısı simüle et (arka planda otomatik)
     * Farklı IP'lerden ardışık giriş denemeleri
     */
    simulateBotAttack() {
        if (!this.running) return;

        // Rastgele sayıda farklı IP'den saldırı
        const attackCount = Math.floor(Math.random() * 3) + 2; // 2-4 IP
        const targetUser = this.targetAccounts[
            Math.floor(Math.random() * this.targetAccounts.length)
        ];

        for (let i = 0; i < attackCount; i++) {
            const randomIP = this.botAttackIPs[
                Math.floor(Math.random() * this.botAttackIPs.length)
            ];
            this.simulateFailedLogin(targetUser, randomIP);
        }

        // Bot attack tespiti çalıştır
        this.detectBotAttack();
    }

    /**
     * Yeni normal kullanıcı ekle
     */
    addNewUser() {
        const newUserId = `user_${Date.now()}`;
        const newUser = {
            id: newUserId,
            name: `User${Math.floor(Math.random() * 10000)}`,
            email: `user${Date.now()}@company.com`,
            homeIP: `192.168.1.${100 + this.users.length}`,
            status: 'normal',
            failedAttempts: 0,
            lastAttempt: null,
            attemptCount: 0
        };

        this.users.push(newUser);
        Logger.info('New user added', `${newUser.name} (${newUser.homeIP})`);
        return newUser;
    }

    /**
     * Simülasyonu başlat
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        Logger.info('Simulation started', 'Bot attacks will trigger every 8-12 seconds');

        // Her 8-12 saniyede bot saldırısı
        this.botInterval = setInterval(() => {
            if (this.running) {
                this.simulateBotAttack();
            }
        }, 8000 + Math.random() * 4000);
    }

    /**
     * Simülasyonu durdur
     */
    stop() {
        this.running = false;
        if (this.botInterval) {
            clearInterval(this.botInterval);
            this.botInterval = null;
        }
        Logger.info('Simulation stopped', 'No more automatic attacks');
    }

    /**
     * İstatistik al
     */
    getStats() {
        return {
            ...this.statistics,
            normalUsers: this.users.filter(u => u.status === 'normal').length,
            suspiciousUsers: this.users.filter(u => u.status === 'suspicious').length,
            blockedUsers: this.users.filter(u => u.status === 'blocked').length,
            totalUsers: this.users.length,
            blockedIPCount: this.blockedIPs.size,
            suspiciousIPCount: this.suspiciousIPs.size
        };
    }

    /**
     * Geçmiş temizle
     */
    resetAll() {
        this.users.forEach(user => {
            user.status = 'normal';
            user.failedAttempts = 0;
        });
        this.blockedIPs.clear();
        this.suspiciousIPs.clear();
        this.userAttempts = {};
        this.rateLimitMap.clear();
        this.statistics = {
            successLogins: 0,
            failedLogins: 0,
            bruteForceDetections: 0,
            botAttackDetections: 0,
            ddosAttackDetections: 0,
            sqlInjectionDetections: 0,
            totalAttacks: 0
        };
        this.stop();
        Logger.info('System reset', 'All data cleared');
    }
}

// Global instance oluştur
const simulation = new SecuritySimulation();
