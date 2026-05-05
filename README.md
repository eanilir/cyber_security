# 🛡️ Mini Network Attack Dashboard

Kullanıcıların ve botların ağ üzerindeki aktivitelerini simüle eden, siber güvenlik eğitimi için tasarlanmış interaktif bir dashboard uygulamasıdır.

## ✨ Temel Özellikler

### 1️⃣ Simülasyon
- **Normal Kullanıcı Girişleri**: Sistem 5 örnek kullanıcı ile başlar
- **Bot Saldırıları**: Arka planda otomatik olarak her 8-12 saniyede tetiklenir
- **Brute Force Saldırıları**: Aynı IP'den 3+ başarısız giriş denemesi
- **Dinamik Kullanıcı Ekleme**: Sistem çalışırken yeni kullanıcı eklenebilir

### 2️⃣ Tepit (Detection)
| Saldırı Türü | Algılama Kriteri | Aksiyon |
|-------------|------------------|--------|
| **Brute Force** | Aynı IP'den 3+ başarısız giriş | IP'yi engelle |
| **Bot Attack** | 3+ farklı IP'den aynı hedefe hızlı giriş | IP'leri engelle |

### 3️⃣ Görselleştirme
- 🟢 **Yeşil**: Normal kullanıcı / Başarılı giriş
- 🟡 **Sarı**: Şüpheli aktivite
- 🔴 **Kırmızı**: Engellenen IP / Saldırı
- **Canlı Log**: Son 20 giriş/saldırı kaydı
- **Attack Timeline**: Zaman ekseninde saldırı frekansı (bar chart)

### 4️⃣ İstatistikler
- Toplam normal kullanıcı sayısı
- Şüpheli aktivite sayısı
- Engellenen kullanıcı/IP sayısı
- Tespit edilen saldırı sayısı

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
- **Start Simulation**: Bot saldırılarını otomatik tetiklemeye başla
- **Stop**: Simülasyonu durdur
- **Add Normal User**: Yeni kullanıcı ekle
- **Trigger Brute Force**: Manuel brute force saldırısı tetikle
- **Trigger Bot Attack**: Manuel bot saldırısı tetikle
- **Clear**: Log panelini temizle

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

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Veri**: JSON (localStorage opsiyonel)
- **Grafik**: HTML5 Canvas API
- **Sunucu**: Python HTTP Server (veya herhangi bir HTTP sunucusu)

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

- [ ] "Suspicious" durumunu kullan (uyarı bazlı durumlandırma)
- [ ] Sistem reset fonksiyonu
- [ ] İstatistikler dışa aktarma (CSV/JSON)
- [ ] Farklı saldırı türleri (DDoS simülasyonu vb.)
- [ ] Kullanıcı kimlik doğrulama seviyeleri (weak, medium, strong)

---

**Yapım**: Siber Güvenlik Eğitim Projesi | **Versiyon**: 1.0