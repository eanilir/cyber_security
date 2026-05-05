# 🛡️ Mini Network Attack Dashboard

Kullanıcıların ve botların ağ üzerindeki aktivitelerini simüle eden, siber güvenlik eğitimi için tasarlanmış **interaktif modern dashboard** uygulamasıdır.

**Versiyon: 2.0.0** - Modernleştirilmiş Tasarım & Gelişmiş Saldırı Tespiti 🚀

## ✨ Temel Özellikler

### 1️⃣ Simülasyon
- **Normal Kullanıcı Girişleri**: Sistem 5 örnek kullanıcı ile başlar
- **Bot Saldırıları**: Arka planda otomatik olarak her 8-12 saniyede tetiklenir
- **Brute Force Saldırıları**: Aynı IP'den 3+ başarısız giriş denemesi
- **Dinamik Kullanıcı Ekleme**: Sistem çalışırken yeni kullanıcı eklenebilir

### 2️⃣ Saldırı Tipleri & Tepit (Detection)

| Saldırı Tipi | Algılama Kriteri | Aksiyon | İkon |
|-------------|------------------|--------|------|
| **Brute Force** | Aynı IP'den 3+ başarısız giriş | IP'yi engelle | 🔓 |
| **Bot Attack** | 3+ farklı IP'den aynı hedefe hızlı giriş | IP'leri engelle | 🤖 |
| **DDoS Attack** | 10+ eş zamanlı flood request | IP'leri engelle | ⚡ |
| **SQL Injection** | SQL pattern karakterleri içeren giriş | Pattern'i engelle | 🔨 |
| **Suspicious Activity** | 1-2 başarısız deneme | Uyarı & izle | ⚠️ |
| **Rate Limiting** | 1 saniyede 10+ request | IP'yi engelle | 📊 |

### 3️⃣ Görselleştirme & Tasarım

**Modern Dashboard Özellikleri:**
- 🎨 Glassmorphism tasarımı (gradient backgrounds)
- ✨ Smooth animations ve transitions
- 📱 Responsive layout (mobil & masaüstü)
- 🎬 Canlı pulse ve glow efektleri
- 🟢 🟡 🔴 Durum renkleri (normal, suspicious, blocked)
- 📊 HTML5 Canvas tabanlı attack timeline chart
- ℹ️ Renkli log entry'ler (✓⚠✕ℹ emoji'ler)

**Stat Kartları:**
- 🟢 Normal Users
- 🟡 Suspicious Activity
- 🔴 Blocked Users
- ⚔️ Total Attacks
- ⚡ DDoS Attempts
- 🔨 SQL Injections

## 📁 Proje Yapısı

```
cyber_security/
├── index.html              # Ana dashboard sayfası
├── css/
│   └── style.css          # Tema, layout, animasyonlar
├── js/
│   ├── simulation.js       # Simülasyon motoru + tespit mantığı
│   ├── logger.js          # Log yönetimi
│   └── ui.js              # UI güncellemeleri + grafik
├── data/
│   └── users.json         # Örnek kullanıcı ve bot IP'leri
└── README.md              # Bu dosya
```

## 🚀 Kullanım

### Başlangıç
1. HTTP sunucusu başlatın:
   ```bash
   python3 -m http.server 8000
   ```
2. Tarayıcıda açın: `http://localhost:8000`

### Kontrol Paneli
**Temel Kontroller:**
- ▶️ **Start Simulation**: Bot saldırılarını otomatik tetiklemeye başla
- ⏹️ **Stop**: Simülasyonu durdur
- ➕ **Add Normal User**: Yeni kullanıcı ekle
- 🗑️ **Clear**: Log panelini temizle

**Saldırı Tetikleyicileri:**
- 🔓 **Brute Force**: Manuel brute force saldırısı (3 deneme)
- 🤖 **Bot Attack**: Manuel bot saldırısı (3+ IP'den)
- ⚡ **DDoS Attack**: Manuel DDoS simülasyonu (12 request)
- 🔨 **SQL Injection**: Manuel SQL injection test (4 pattern)

### Etkileşim
- **Kullanıcı Kartını Tıkla**: Manuel olarak o kullanıcıyı login yap

## 🔍 Simülasyon Detayları

### Bot Attack Örneği
```
IP 10.0.0.50 → root'a giriş denemeleri
IP 10.0.0.51 → root'a giriş denemeleri
IP 10.0.0.52 → root'a giriş denemeleri
(3+ farklı IP'den aynı hedefe)
↓
Bot Attack Detected!
↓
IP'ler engellenir
```

### Brute Force Örneği
```
IP 10.0.0.128 → alice'ye 3 başarısız giriş denemeleri
↓
Brute Force Attack Detected!
↓
10.0.0.128 engellenir
```

## 📊 Veri Yapıları

### Kullanıcı Objesi
```javascript
{
  id: "user_001",
  name: "Alice",
  email: "alice@company.com",
  homeIP: "192.168.1.101",
  status: "normal|suspicious|blocked",
  failedAttempts: 0,
  lastAttempt: null
}
```

### Log Entry
```javascript
{
  id: 1234567890,
  type: "success|error|warning|info",
  action: "Login failed",
  details: "bob from 10.0.0.50 (attempt 1/3)",
  timestamp: Date
}
```

## 🎨 Tasarım Özellikleri

- **Dark Theme**: Siber güvenlik konsolu benzeri koyu tema
- **Responsive**: Mobil ve masaüstüne uyumlu
- **Real-time Updates**: 1 saniyede bir otomatik güncelleme
- **Smooth Animations**: Geçişler ve pulse efektleri

## 🛠️ Teknoloji Yığını

- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Grafik**: HTML5 Canvas API (Attack Timeline Chart)
- **Veri**: JSON (metin tabanlı, localStorage opsiyonel)
- **Sunucu**: Python HTTP Server veya herhangi bir HTTP sunucusu
- **Tasarım**: Modern gradient, animations, responsive layout
- **Animasyonlar**: CSS3 keyframe animations, smooth transitions

## 📝 Notlar

- **localStorage**: Proje localStorage desteklemez (artifact ortamı uygulamasına göre tasarlanmamıştır)
- **Bot Aralığı**: Her 8-12 saniyede bir otomatik saldırı tetiklenir
- **Log Limit**: En fazla 100 log kaydedilir

## 🎓 Eğitim Amaçlı

Bu proje aşağıdaki kavramları öğretmek için tasarlanmıştır:
- ✅ Brute force saldırıları ve tespiti
- ✅ Bot saldırıları ve dağıtılmış giriş denemeleri
- ✅ IP engelleme ve kimlik doğrulama güvenliği
- ✅ Canlı log sistemi ve izleme
- ✅ Ağ aktivitelerinin görselleştirilmesi

## 🚀 Gelecek İyileştirmeler

- [ ] Coğrafi IP harita görselleştirmesi
- [ ] Attack heatmap (zaman bazlı analiz)
- [ ] Kullanıcı profil seviyeleri (weak, medium, strong)
- [ ] 2FA / MFA simülasyonu
- [ ] Endpoint security & firewall rules
- [ ] API rate limiting vs GraphQL throttling
- [ ] Machine learning tabanlı anomaly detection
- [ ] Dark/Light theme toggle
- [ ] Data export (CSV, JSON, PDF)
- [ ] Multi-user dashboard (team collaboration)

---

**Yapım**: Siber Güvenlik Eğitim Projesi  
**Versiyon**: 2.0.0 (Modernized Design & Advanced Attacks)  
**Son Güncelleme**: 5 Mayıs 2026  
**Lisans**: Eğitim Amaçlı (Educational Use)