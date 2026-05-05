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
            totalAttacks: 0
        };
        this.userAttempts = {}; // IP -> {timestamp, count, targetUser}
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
            blockedIPCount: this.blockedIPs.size
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
        this.userAttempts = {};
        this.statistics = {
            successLogins: 0,
            failedLogins: 0,
            bruteForceDetections: 0,
            botAttackDetections: 0,
            totalAttacks: 0
        };
        this.stop();
        Logger.info('System reset', 'All data cleared');
    }
}

// Global instance oluştur
const simulation = new SecuritySimulation();
