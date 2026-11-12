# BAGİ Tasarım - 3D Baskı ve E-Ticaret Platformu 🖨️

Müşterilerin kendi 3D model (STL) dosyalarını yükleyerek anında fiyat tahmini alabildiği, hazır ürünleri interaktif olarak tarayıcıda inceleyebildiği ve sipariş süreçlerinin uçtan uca otomatik mail sistemiyle yönetildiği **Tam Yığın (Full-Stack) B2C E-Ticaret Uygulaması.**

🔗 **Canlı Demo:** [bagitasarim.com.tr](https://bagitasarim.com.tr)

## 🚀 Öne Çıkan Özellikler

- **İnteraktif 3D Görüntüleyici (Three.js):** Kullanıcılar hem vitrindeki ürünleri hem de kendi yükledikleri `.stl` dosyalarını tarayıcı üzerinden 360 derece döndürerek inceleyebilir.
- **Dinamik Fiyatlandırma Motoru:** Admin panelinden güncellenebilen (gramaj, saatlik makine ücreti, kar marjı) parametrelere göre, yüklenen dosyanın hacmi hesaplanarak anında dinamik fiyat çıkartılır.
- **Tam Otomatik Mail Bildirimleri (Nodemailer):** Yeni kullanıcı kaydı doğrulama, sipariş alındı teyidi, admin bilgilendirmesi ve "Üretimde/Kargolandı" durum güncellemelerinde asenkron ve güvenli (STARTTLS) otomatik e-posta gönderimi.
- **Çoklu Galeri ve Ürün Yönetimi:** Admin paneli üzerinden ürünlere çoklu görsel eklenebilir, ana sayfada kapak fotoğrafı, detay sayfasında ise kaydırmalı galeri (Carousel) olarak render edilir.
- **Güvenli Yetkilendirme:** JWT (JSON Web Token) ve Bcrypt kullanılarak şifrelenmiş oturum yönetimi ve Admin / Kullanıcı rol ayrımı.

## 🛠️ Kullanılan Teknolojiler

**Frontend (İstemci):**
- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 (Responsive UI)
- Three.js & OrbitControls (3D Render Motoru)

**Backend (Sunucu):**
- Node.js & Express.js (RESTful API Mimari)
- Nodemailer (SMTP E-posta Servisi)
- Multer (STL ve Görsel Dosya Yükleme)
- JWT & Bcryptjs (Güvenlik)

**Veri Tabanı & DevOps:**
- MongoDB Atlas (Bulut NoSQL Veri Tabanı)
- Mongoose (ODM)
- Render (Sunucu Barındırma & CI/CD Dağıtımı)

## 🗄️ Veri Tabanı Şeması (MongoDB)

Proje 3 ana koleksiyondan oluşmaktadır:
1. **Kullanıcılar:** Kimlik doğrulama, şifreleme (hash), yetki rolleri (admin/user) ve e-posta onay durumları.
2. **Ürünler:** Vitrin ürünleri, fiyat, malzeme, çoklu görsel listesi (`gorseller: [String]`) ve opsiyonel STL dosya yolları.
3. **Siparişler:** Müşteri bilgileri, yüklenen dosya konumu, toplam tutar ve anlık durum takibi (Bekliyor, Üretimde, Tamamlandı).

## 🔌 Temel API Rotaları

- `POST /api/auth/kayit` - Yeni kullanıcı kaydı ve mail doğrulama köprüsü oluşturur.
- `POST /api/auth/giris` - JWT token üretir ve yetki kontrolü yapar.
- `GET /api/urunler` - Vitrindeki tüm ürünleri çoklu galeri destekli JSON olarak döner.
- `POST /api/siparisler` - Multer ile dosyayı sunucuya kaydeder, MongoDB'ye siparişi yazar ve admine/müşteriye mail atar.
- `PUT /api/siparisler/:id/durum` - Sipariş durumunu günceller ve müşteriye otomatik durum maili tetikler.
- `POST /api/fiyat-ayarlari/guncelle` - (Admin) Sistemdeki hesaplama çarpanlarını günceller.

---

## 🔒 Proje Durumu ve Telif Hakkı (Copyright)

Bu proje, **BAGİ Tasarım** markasının ticari altyapısı ve kişisel bir Full-Stack portfolyo çalışması olarak geliştirilmiştir. 

Proje **açık kaynaklı (open-source) DEĞİLDİR**. Kaynak kodların kopyalanması, klonlanması, çoğaltılması, izinsiz dağıtılması veya başka ticari/kişisel projelerde kullanılması kesinlikle yasaktır. Bu depo (repository), yalnızca iş başvuruları kapsamında teknik becerilerin ve yazılım mimarisinin incelenmesi amacıyla erişime açık tutulmaktadır. Tüm hakları saklıdır.

**Geliştirici:** [Fatma Gizem Arı](https://fatmagizemari.com.tr)  
**GitHub:** [@gizem-ari](https://github.com/gizem-ari)