/**
 * UI.JS
 * Canlı güncelleme, görselleştirme ve grafik gösterimleri
 */

class UIManager {
    constructor() {
        this.attackHistory = []; // Zaman serisi: {time, count}
        this.chart = null;
        this.updateInterval = null;
        this.selectedUserId = null;
    }

    /**
     * UI'ı başlat ve event listener'ları ekle
     */
    async init() {
        // Veri yükle
        await simulation.loadData();
        
        // İlk render
        this.render();
        
        // Event listener'ları ekle
        this.setupEventListeners();
        
        // Saati güncelle
        this.startClock();
        
        // UI'ı periyodik olarak güncelle (1 saniye)
        this.updateInterval = setInterval(() => {
            this.render();
        }, 1000);
        
        Logger.info('UI initialized', 'Dashboard ready');
    }

    /**
     * Event listener'ları setup et
     */
    setupEventListeners() {
        document.getElementById('btn-start-sim')?.addEventListener('click', () => {
            simulation.start();
            document.getElementById('btn-start-sim').disabled = true;
            document.getElementById('btn-stop-sim').disabled = false;
            Logger.info('User action', 'Simulation started by user');
        });

        document.getElementById('btn-stop-sim')?.addEventListener('click', () => {
            simulation.stop();
            document.getElementById('btn-start-sim').disabled = false;
            document.getElementById('btn-stop-sim').disabled = true;
            Logger.info('User action', 'Simulation stopped by user');
        });

        document.getElementById('btn-add-user')?.addEventListener('click', () => {
            const newUser = simulation.addNewUser();
            this.render();
        });

        document.getElementById('btn-trigger-brute-force')?.addEventListener('click', () => {
            const randomUser = simulation.users[Math.floor(Math.random() * simulation.users.length)];
            const randomIP = `10.0.0.${Math.floor(Math.random() * 255)}`;
            
            for (let i = 0; i < 3; i++) {
                simulation.simulateFailedLogin(randomUser.name, randomIP);
            }
            
            Logger.warning('User action', 'Manual brute force attack triggered');
            this.render();
        });

        document.getElementById('btn-trigger-bot-attack')?.addEventListener('click', () => {
            simulation.simulateBotAttack();
            Logger.error('User action', 'Manual bot attack triggered');
            this.render();
        });

        document.getElementById('btn-trigger-ddos')?.addEventListener('click', () => {
            const targetUser = 'admin';
            simulation.simulateDDoSAttack(targetUser, 12);
            this.render();
        });

        document.getElementById('btn-trigger-sql')?.addEventListener('click', () => {
            simulation.simulateSQLInjection();
            this.render();
        });

        document.getElementById('clear-logs')?.addEventListener('click', () => {
            Logger.instance.clear();
            this.render();
        });

        // Log filtresi: kullanıcı adına göre filtrele
        const logFilter = document.getElementById('log-filter');
        if (logFilter) {
            logFilter.addEventListener('input', () => this.renderLogPanel());
        }

        // Seçilmiş kullanıcı için control butonları
        document.getElementById('btn-impersonate-selected')?.addEventListener('click', () => {
            if (!this.selectedUserId) { alert('Lütfen önce bir kullanıcı seçin.'); return; }
            simulation.impersonateUser(this.selectedUserId, 3);
            this.render();
        });

        document.getElementById('btn-act-as-selected')?.addEventListener('click', () => {
            if (!this.selectedUserId) { alert('Lütfen önce bir kullanıcı seçin.'); return; }
            simulation.actAsAttacker(this.selectedUserId, null, 3);
            this.render();
        });

        document.getElementById('btn-target-attack-selected')?.addEventListener('click', () => {
            if (!this.selectedUserId) { alert('Lütfen önce bir kullanıcı seçin.'); return; }
            simulation.manualTargetAttack(this.selectedUserId, 3);
            this.render();
        });

        document.getElementById('btn-reset-network')?.addEventListener('click', () => {
            simulation.resetNetwork();
            Logger.instance.clear();
            this.render();
        });
    }

    /**
     * Saati güncelle
     */
    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('tr-TR');
            const element = document.getElementById('current-time');
            if (element) {
                element.textContent = `⏰ ${timeStr}`;
            }
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    /**
     * Tüm UI'ı render et
     */
    render() {
        this.renderNetworkGrid();
        this.renderLogPanel();
        this.renderStats();
        this.updateChart();
        // Update selected user name display
        const selEl = document.getElementById('selected-user-name');
        if (selEl) {
            const u = simulation.users.find(x => x.id === this.selectedUserId);
            selEl.textContent = u ? u.name : 'None';
        }
    }

    /**
     * Network Grid'i render et (kullanıcı kartları)
     */
    renderNetworkGrid() {
        const container = document.getElementById('network-grid');
        if (!container) return;

        container.innerHTML = '';

        simulation.users.forEach(user => {
            const node = document.createElement('div');
            node.className = `user-node ${user.status}`;
            node.title = `${user.name}\n${user.homeIP}\nStatus: ${user.status.toUpperCase()}`;

            // Status emoji
            let statusEmoji = '🟢'; // normal
            if (user.status === 'suspicious') statusEmoji = '🟡';
            if (user.status === 'blocked') statusEmoji = '🔴';

            node.innerHTML = `
                <div class="user-icon">${statusEmoji}</div>
                <div class="user-name">${user.name}</div>
                <div class="user-ip">${user.homeIP}</div>
            `;

            // Tıklama: kullanıcıyı seç (status sıfırlamasın)
            node.addEventListener('click', (evt) => {
                if (this.selectedUserId === user.id) {
                    this.selectedUserId = null;
                } else {
                    this.selectedUserId = user.id;
                }
                this.render();
            });

            if (this.selectedUserId === user.id) node.classList.add('selected');
            container.appendChild(node);
        });
    }

    /**
     * Log Panel'i render et
     */
    renderLogPanel() {
        const container = document.getElementById('log-content');
        if (!container) return;
        const recentLogs = Logger.instance.getRecentLogs(200);
        const filterInput = document.getElementById('log-filter');
        const filterValue = filterInput ? filterInput.value.trim().toLowerCase() : '';
        container.innerHTML = '';

        // Filtre uygula (action veya details içinde kullanıcı adı geçtiyse göster)
        const filtered = recentLogs.filter(log => {
            if (!filterValue) return true;
            const action = String(log.action || '').toLowerCase();
            const details = String(log.details || '').toLowerCase();
            return action.includes(filterValue) || details.includes(filterValue);
        }).slice(-20);

        filtered.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${log.type}`;

            const time = log.timestamp.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            entry.innerHTML = `
                <span class="log-timestamp">${time}</span>
                <strong>${log.action}</strong>: ${log.details}
            `;

            container.appendChild(entry);
        });
    }

    /**
     * Basit modal: kullanıcıya özel eylem seçimi
     * @param {*} user
     * @param {*} evt
     */
    // showUserActionModal removed — selection + control panel used instead

    /**
     * İstatistikleri render et
     */
    renderStats() {
        const stats = simulation.getStats();

        const elements = {
            'stat-normal': stats.normalUsers,
            'stat-suspicious': stats.suspiciousUsers,
            'stat-blocked': stats.blockedUsers,
            'stat-attacks': stats.totalAttacks,
            'stat-ddos': stats.ddosAttackDetections,
            'stat-sql': stats.sqlInjectionDetections
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Grafik güncelle (attack timeline)
     */
    updateChart() {
        const canvas = document.getElementById('attack-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Son 30 saniyeyi al
        const now = Date.now();
        const timeWindow = 30000; // 30 saniye
        
        // Her saniye için saldırı sayısını hesapla
        const timeSlots = [];
        const counts = [];
        
        for (let i = 0; i < 30; i++) {
            const slotTime = now - (30 - i) * 1000;
            timeSlots.push(new Date(slotTime).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
            
            // Bu zaman dilimindeki saldırı sayısı (basit: log'lardan hesapla)
            const attackLogs = Logger.instance.logs.filter(log => {
                const logTime = log.timestamp.getTime();
                return logTime >= slotTime && logTime < slotTime + 1000 &&
                       (log.type === 'error' || log.type === 'warning');
            });
            counts.push(attackLogs.length);
        }

        // Grafik çiz (basit bar chart)
        const chartHeight = 200;
        const chartWidth = canvas.width;
        const barWidth = chartWidth / 30;
        const maxCount = Math.max(...counts, 1);
        const scale = chartHeight / maxCount;

        // Canvas'ı temizle
        ctx.fillStyle = 'rgba(15, 20, 25, 0.6)';
        ctx.fillRect(0, 0, chartWidth, chartHeight);

        // Grid çiz
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (i / 5) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(chartWidth, y);
            ctx.stroke();
        }

        // Barları çiz
        counts.forEach((count, index) => {
            const x = index * barWidth;
            const barHeight = count * scale;
            const y = chartHeight - barHeight;

            // Renk: saldırı sayısına göre
            if (count === 0) {
                ctx.fillStyle = 'rgba(40, 167, 69, 0.7)'; // Yeşil
            } else if (count < 3) {
                ctx.fillStyle = 'rgba(255, 193, 7, 0.7)'; // Sarı
            } else {
                ctx.fillStyle = 'rgba(220, 53, 69, 0.7)'; // Kırmızı
            }

            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

            // Saldırı sayısını yazı olarak göster
            if (count > 0) {
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(count.toString(), x + barWidth / 2, y - 5);
            }
        });

        // X-axis (zaman etiketleri)
        ctx.fillStyle = '#aaa';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        for (let i = 0; i < 30; i += 5) {
            ctx.fillText(timeSlots[i], i * barWidth + barWidth / 2, chartHeight + 15);
        }
    }

    /**
     * Log entry'i manuel olarak ekle (socket vs. varsa kullanılır)
     */
    static addLogEntry(log) {
        // UI'ı otomatik update eder (render fonksiyonu)
    }

    /**
     * Kapat
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Global instance oluştur
const UIManager_instance = new UIManager();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    UIManager_instance.init();
});

// Sayfa kapatılırken temizle
window.addEventListener('beforeunload', () => {
    UIManager_instance.destroy();
    simulation.stop();
});
