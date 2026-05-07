/**
 * UI.JS — temiz, minimal, log scroll sorunu giderildi
 */

class UIManager {
  constructor() {
    this.selectedUserId = null;
    this.updateInterval = null;
    this._logPaused = false; // kullanıcı log'u kaydırınca otoscroll durur
  }

  async init() {
    await simulation.loadData();
    this.render();
    this.setupEventListeners();
    this.startClock();
    this.updateInterval = setInterval(() => this.render(), 1000);
    Logger.info('Dashboard', 'System ready');
  }

  setupEventListeners() {
    // Simülasyon kontrolleri
    document.getElementById('btn-start-sim')?.addEventListener('click', () => {
      simulation.start();
      document.getElementById('btn-start-sim').disabled = true;
      document.getElementById('btn-stop-sim').disabled = false;
      Logger.info('Control', 'Simulation started');
    });

    document.getElementById('btn-stop-sim')?.addEventListener('click', () => {
      simulation.stop();
      document.getElementById('btn-start-sim').disabled = false;
      document.getElementById('btn-stop-sim').disabled = true;
      Logger.info('Control', 'Simulation stopped');
    });

    document.getElementById('btn-add-user')?.addEventListener('click', () => {
      simulation.addNewUser();
      this.render();
    });

    document.getElementById('btn-reset-network')?.addEventListener('click', () => {
      simulation.resetNetwork();
      Logger.instance.clear();
      this.render();
    });

    // Saldırı tetikleyiciler
    document.getElementById('btn-trigger-brute-force')?.addEventListener('click', () => {
      const user = simulation.users[Math.floor(Math.random() * simulation.users.length)];
      const ip = `10.0.0.${Math.floor(Math.random() * 255)}`;
      for (let i = 0; i < 3; i++) simulation.simulateFailedLogin(user.name, ip);
      this.render();
    });

    document.getElementById('btn-trigger-bot-attack')?.addEventListener('click', () => {
      simulation.simulateBotAttack();
      this.render();
    });

    document.getElementById('btn-trigger-ddos')?.addEventListener('click', () => {
      simulation.simulateDDoSAttack('admin', 12);
      this.render();
    });

    document.getElementById('btn-trigger-sql')?.addEventListener('click', () => {
      simulation.simulateSQLInjection();
      this.render();
    });

    // Seçili kullanıcı eylemleri
    document.getElementById('btn-impersonate-selected')?.addEventListener('click', () => {
      if (!this.selectedUserId) return alert('Önce bir kullanıcı seç.');
      simulation.impersonateUser(this.selectedUserId, 3);
      this.render();
    });

    document.getElementById('btn-act-as-selected')?.addEventListener('click', () => {
      if (!this.selectedUserId) return alert('Önce bir kullanıcı seç.');
      simulation.actAsAttacker(this.selectedUserId, null, 3);
      this.render();
    });

    document.getElementById('btn-target-attack-selected')?.addEventListener('click', () => {
      if (!this.selectedUserId) return alert('Önce bir kullanıcı seç.');
      simulation.manualTargetAttack(this.selectedUserId, 3);
      this.render();
    });

    // Log
    document.getElementById('clear-logs')?.addEventListener('click', () => {
      Logger.instance.clear();
      this.render();
    });

    document.getElementById('log-filter')?.addEventListener('input', () => this.renderLog());

    // Log scroll pause — kullanıcı yukarı kaydırınca otoscroll durur
    const logContent = document.getElementById('log-content');
    if (logContent) {
      logContent.addEventListener('scroll', () => {
        const atBottom = logContent.scrollHeight - logContent.scrollTop - logContent.clientHeight < 32;
        this._logPaused = !atBottom;
      });
    }
  }

  startClock() {
    const tick = () => {
      const el = document.getElementById('current-time');
      if (el) el.textContent = new Date().toLocaleTimeString('tr-TR');
    };
    tick();
    setInterval(tick, 1000);
  }

  render() {
    this.renderNetworkGrid();
    this.renderLog();
    this.renderStats();
    this.renderChart();

    // Seçili kullanıcı adı
    const el = document.getElementById('selected-user-name');
    if (el) {
      const u = simulation.users.find(x => x.id === this.selectedUserId);
      el.textContent = u ? u.name : '—';
    }
  }

  renderNetworkGrid() {
    const container = document.getElementById('network-grid');
    if (!container) return;
    container.innerHTML = '';

    simulation.users.forEach(user => {
      const node = document.createElement('div');
      node.className = `user-node ${user.status}`;
      if (this.selectedUserId === user.id) node.classList.add('selected');

      node.innerHTML = `
        <div class="user-status-dot"></div>
        <div class="user-icon">${user.status === 'blocked' ? '🔒' : user.status === 'suspicious' ? '⚠️' : '👤'}</div>
        <div class="user-name">${user.name}</div>
        <div class="user-ip">${user.homeIP}</div>
      `;

      node.addEventListener('click', () => {
        this.selectedUserId = this.selectedUserId === user.id ? null : user.id;
        this.render();
      });

      container.appendChild(node);
    });
  }

  renderLog() {
    const container = document.getElementById('log-content');
    if (!container) return;

    const filter = (document.getElementById('log-filter')?.value || '').trim().toLowerCase();
    const logs = Logger.instance.getRecentLogs(200);

    const filtered = logs
      .filter(log => {
        if (!filter) return true;
        return String(log.action).toLowerCase().includes(filter) ||
               String(log.details).toLowerCase().includes(filter);
      })
      .slice(-40); // son 40 kayıt

    // Sadece değişiklik varsa DOM'u güncelle (zıplama önlemi)
    const currentCount = container.children.length;
    if (currentCount === filtered.length && currentCount > 0) return;

    container.innerHTML = '';

    filtered.forEach(log => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${log.type}`;

      const time = log.timestamp.toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      entry.innerHTML =
        `<span class="log-timestamp">${time}</span>` +
        `<span class="log-action">${log.action}</span>` +
        `: ${log.details}`;

      container.appendChild(entry);
    });

    // Sadece kullanıcı scroll yapmıyorsa aşağıya in
    if (!this._logPaused) {
      container.scrollTop = container.scrollHeight;
    }
  }

  renderStats() {
    const stats = simulation.getStats();
    const map = {
      'stat-normal':     stats.normalUsers,
      'stat-suspicious': stats.suspiciousUsers,
      'stat-blocked':    stats.blockedUsers,
      'stat-attacks':    stats.totalAttacks,
      'stat-ddos':       stats.ddosAttackDetections,
      'stat-sql':        stats.sqlInjectionDetections,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }

  renderChart() {
    const canvas = document.getElementById('attack-chart');
    if (!canvas) return;

    // Canvas boyutunu DOM'dan al (CSS'e göre)
    const rect = canvas.getBoundingClientRect();
    const W = Math.floor(rect.width)  || 800;
    const H = 140;

    if (canvas.width !== W)  canvas.width  = W;
    if (canvas.height !== H) canvas.height = H;

    const ctx = canvas.getContext('2d');
    const BAR_COUNT = 30;
    const barW = W / BAR_COUNT;
    const now = Date.now();

    // Slot başına saldırı sayısı
    const counts = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const slotStart = now - (BAR_COUNT - i) * 1000;
      const n = Logger.instance.logs.filter(log => {
        const t = log.timestamp.getTime();
        return t >= slotStart && t < slotStart + 1000 &&
               (log.type === 'error' || log.type === 'warning');
      }).length;
      counts.push(n);
    }

    const maxVal = Math.max(...counts, 1);

    // Temizle
    ctx.clearRect(0, 0, W, H);

    // Arka plan
    ctx.fillStyle = '#13161b';
    ctx.fillRect(0, 0, W, H);

    // Yatay grid çizgileri
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = Math.round((i / 4) * (H - 20));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Barlar
    counts.forEach((count, i) => {
      const x = i * barW;
      const barH = count === 0 ? 2 : ((count / maxVal) * (H - 28));
      const y = H - 20 - barH;

      if (count === 0) {
        ctx.fillStyle = 'rgba(34,197,94,0.25)';
      } else if (count < 3) {
        ctx.fillStyle = 'rgba(234,179,8,0.65)';
      } else {
        ctx.fillStyle = 'rgba(239,68,68,0.75)';
      }

      const gap = Math.max(barW * 0.15, 2);
      ctx.fillRect(x + gap, y, barW - gap * 2, barH);

      // Sayı etiketi
      if (count > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(count, x + barW / 2, y - 3);
      }
    });

    // X ekseni çizgisi
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 20);
    ctx.lineTo(W, H - 20);
    ctx.stroke();

    // Zaman etiketleri (her 5 bar'da bir)
    ctx.fillStyle = 'rgba(90,96,112,0.9)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < BAR_COUNT; i += 5) {
      const t = new Date(now - (BAR_COUNT - i) * 1000);
      const label = t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      ctx.fillText(label, i * barW + barW * 2.5, H - 5);
    }
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}

const UIManager_instance = new UIManager();

document.addEventListener('DOMContentLoaded', () => UIManager_instance.init());
window.addEventListener('beforeunload', () => {
  UIManager_instance.destroy();
  simulation.stop();
});
