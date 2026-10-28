const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Kullanici = require('./models/Kullanici');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// E-POSTA GÖNDERİM MOTORU (Transporter)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true ise 465 portunu, false ise 587 portunu kullanır
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        // Sunucu kaynaklı sertifika hatalarını es geçmek için
        rejectUnauthorized: false
    }
});

const app = express();

app.use(cors());
app.use(express.json());

// 'uploads' klasörünü dışarıya statik olarak açıyoruz ki linke tıklayınca dosya inebilsin
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// YÜKLEME (UPLOAD) AYARLARI
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir); // Klasör yoksa otomatik oluşturur
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Dosya isimlerinin çakışmaması için başına o anki zaman damgasını ekliyoruz
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => {
        console.log("✅ MongoDB Veri Tabanına Başarıyla Bağlanıldı!");
        verileriOlustur(); 
    })
    .catch((err) => console.log("❌ MongoDB Bağlantı Hatası: ", err));

// ==========================================
// 1. MONGOOSE ŞEMALARI
// ==========================================

const ayarSema = new mongoose.Schema({
    gramBasiMaliyet: Number,
    saatlikMakineUcreti: Number,
    sabitBaslangicUcreti: Number,
    karMarji: Number
});
const Ayar = mongoose.model('Ayar', ayarSema);

const urunSema = new mongoose.Schema({
    isim: String,
    fiyat: Number,
    aciklama: String,
    malzeme: String,
    boyutlar: String,
    stokDurumu: String,
    stlDosyaYolu: String
});
const Urun = mongoose.model('Urun', urunSema);

const siparisSema = new mongoose.Schema({
    isim: String,
    email: String,
    telefon: String,
    dosyaAdi: String,
    dosyaUrl: String,     // Dosyanın sunucudaki konumu (/uploads/...)
    fiyat: Number,
    mesaj: String,
    durum: { type: String, default: "Bekliyor" }
}, { timestamps: true });
const Siparis = mongoose.model('Siparis', siparisSema);

// ==========================================
// 2. ÖRNEK VERİLERİ DOLDURMA
// ==========================================
async function verileriOlustur() {
    const ayarSayisi = await Ayar.countDocuments();
    if (ayarSayisi === 0) {
        await Ayar.create({
            gramBasiMaliyet: 0.50,
            saatlikMakineUcreti: 15.00,
            sabitBaslangicUcreti: 50.00,
            karMarji: 1.30
        });
        console.log("📥 Örnek Fiyat Ayarları veri tabanına eklendi.");
    }

    const urunSayisi = await Urun.countDocuments();
    if (urunSayisi === 0) {
        await Urun.create([
            {
                isim: "NEÜ 2026 Mezuniyet Rozeti",
                fiyat: 85,
                aciklama: "Necmettin Erbakan Üniversitesi 2026 mezunlarına özel tasarlanmış, yaka ve çantalarda kullanıma uygun 3D baskı hatıra rozeti. Yüksek kalite PLA malzeme ile üretilmiş olup çift renk seçeneği mevcuttur.",
                malzeme: "PLA+ (Doğa Dostu)",
                boyutlar: "40mm x 40mm x 3mm",
                stokDurumu: "Siparişe Özel Üretim",
                stlDosyaYolu: "models/neu-rozet.stl"
            },
            {
                isim: "Hareketli Mafsallı Ejderha",
                fiyat: 250,
                aciklama: "Bütünleşik olarak basılan, montaj gerektirmeyen hareketli eklemlere sahip dekoratif ejderha figürü.",
                malzeme: "İpek PLA (Parlak)",
                boyutlar: "200mm x 45mm x 30mm",
                stokDurumu: "Stokta Var",
                stlDosyaYolu: "models/ejderha.stl"
            }
        ]);
        console.log("📥 Örnek Ürünler veri tabanına eklendi.");
    }
}

// ==========================================
// 3. API ROTALARI
// ==========================================

// Public klasöründeki ön yüz dosyalarını tarayıcı erişimine açar
app.use(express.static(path.join(__dirname, 'public')));

// Ana alan adına (bagitasarim.com.tr) girildiğinde index.html yüklenir
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/fiyat-ayarlari', async (req, res) => {
    try {
        const ayarlar = await Ayar.findOne(); 
        res.json(ayarlar);
    } catch (error) {
        res.status(500).json({ mesaj: "Veri tabanından ayarlar çekilemedi." });
    }
});

app.post('/api/fiyat-ayarlari/guncelle', async (req, res) => {
    try {
        const { gramBasiMaliyet, saatlikMakineUcreti, sabitBaslangicUcreti, karMarji } = req.body;
        let ayarlar = await Ayar.findOne();
        
        if (!ayarlar) {
            ayarlar = new Ayar({ gramBasiMaliyet, saatlikMakineUcreti, sabitBaslangicUcreti, karMarji });
        } else {
            ayarlar.gramBasiMaliyet = gramBasiMaliyet;
            ayarlar.saatlikMakineUcreti = saatlikMakineUcreti;
            ayarlar.sabitBaslangicUcreti = sabitBaslangicUcreti;
            ayarlar.karMarji = karMarji;
        }
        
        await ayarlar.save();
        res.status(200).json({ mesaj: "Fiyat ayarları başarıyla güncellendi!" });
    } catch (error) {
        console.error("Ayar güncelleme hatası:", error);
        res.status(500).json({ mesaj: "Ayarlar güncellenirken sunucu hatası oluştu." });
    }
});

app.get('/api/urunler', async (req, res) => {
    try {
        const urunler = await Urun.find(); 
        res.json(urunler);
    } catch (error) {
        console.error("❌ MongoDB GET Okuma Hatası:", error);
        res.status(500).json({ mesaj: "Veri tabanından ürünler çekilemedi.", detay: error.message });
    }
});

app.get('/api/urunler/:id', async (req, res) => {
    try {
        const urun = await Urun.findById(req.params.id); 
        if (!urun) return res.status(404).json({ mesaj: "Ürün bulunamadı." });
        res.json(urun);
    } catch (error) {
        res.status(500).json({ mesaj: "Ürün detayları getirilirken hata oluştu." });
    }
});

app.post('/api/urunler', async (req, res) => {
    try {
        const yeniUrun = await Urun.create(req.body);
        res.status(201).json({ mesaj: "✅ Yeni ürün başarıyla eklendi!", urun: yeniUrun });
    } catch (error) {
        res.status(500).json({ mesaj: "❌ Ürün eklenirken hata oluştu.", hata: error.message });
    }
});

app.put('/api/urunler/:id/stok', async (req, res) => {
    try {
        const { stokDurumu } = req.body;
        await Urun.findByIdAndUpdate(req.params.id, { stokDurumu });
        res.status(200).json({ mesaj: "Stok durumu başarıyla güncellendi!" });
    } catch (error) {
        res.status(500).json({ mesaj: "Stok güncellenemedi." });
    }
});
// ÜRÜN GÜNCELLEME API'Sİ
app.put('/api/urunler/:id', async (req, res) => {
    try {
        const guncelUrun = await Urun.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
        if (!guncelUrun) return res.status(404).json({ mesaj: "Güncellenecek ürün bulunamadı." });
        res.status(200).json({ mesaj: "✅ Ürün başarıyla güncellendi!", urun: guncelUrun });
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        res.status(500).json({ mesaj: "Ürün güncellenirken hata oluştu." });
    }
});

// ÜRÜN SİLME API'Sİ 
app.delete('/api/urunler/:id', async (req, res) => {
    try {
        const silinenUrun = await Urun.findByIdAndDelete(req.params.id);
        if (!silinenUrun) return res.status(404).json({ mesaj: "Silinecek ürün bulunamadı." });
        res.status(200).json({ mesaj: "✅ Ürün vitrinden silindi!" });
    } catch (error) {
        console.error("Silme hatası:", error);
        res.status(500).json({ mesaj: "Ürün silinirken hata oluştu." });
    }
});

// SİPARİŞ API'LERİ
app.get('/api/siparisler', async (req, res) => {
    try {
        const siparisler = await Siparis.find().sort({ createdAt: -1 }); 
        res.status(200).json(siparisler);
    } catch (error) {
        console.error("Siparişler çekilirken hata:", error);
        res.status(500).json({ mesaj: "Siparişler getirilemedi." });
    }
});

// Profil sayfası için sadece o kullanıcıya ait siparişleri getirme
app.get('/api/siparislerim/:email', async (req, res) => {
    try {
        const kullaniciEmail = req.params.email;
        const siparislerim = await Siparis.find({ email: kullaniciEmail }).sort({ createdAt: -1 });
        
        if (!siparislerim || siparislerim.length === 0) {
            return res.status(200).json({ siparisler: [] });
        }
        
        res.status(200).json({ siparisler: siparislerim });
    } catch (error) {
        console.error("Kullanıcı siparişleri çekilirken hata:", error);
        res.status(500).json({ mesaj: "Siparişleriniz getirilemedi." });
    }
});

// GÜNCELLENEN POST İŞLEMİ: Log ve Teşhis Destekli Mail Gönderimi
app.post('/api/siparisler', upload.single('dosya'), async (req, res) => {
    try {
        const { isim, email, mesaj, fiyat } = req.body;
        
        const dosyaAdi = req.file ? req.file.originalname : 'Dosya Yok';
        const dosyaUrl = req.file ? `/uploads/${req.file.filename}` : '';

        const yeniSiparis = await Siparis.create({
            isim,
            email,
            mesaj,
            fiyat: parseFloat(fiyat) || 0,
            dosyaAdi,
            dosyaUrl
        });

        // 📩 MÜŞTERİYE VE ADMİNE OTOMATİK MAİL GÖNDERİMİ
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            console.log("📧 E-Posta değişkenleri okundu, gönderim deneniyor...");
            
            // 1. Müşteriye giden "Sipariş Alındı" maili
            const musteriMail = {
                from: `"3D Fabrika" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Siparişiniz Alındı! 📦 - 3D Fabrika',
                html: `<h3>Merhaba ${isim},</h3>
                       <p>3D baskı sipariş talebiniz başarıyla bize ulaşmıştır. Sipariş tutarınız: <b style="color:#2563EB;">${fiyat} ₺</b>.</p>
                       <p>Siparişinizin üretim durumunu web sitemizdeki <b>Hesabım > Siparişlerim</b> sekmesinden anlık olarak takip edebilirsiniz.</p>
                       <br><p>Bizi tercih ettiğiniz için teşekkürler!</p>`
            };

            // 2. Sana (Admin) gelecek olan "Yeni Sipariş Var" maili
            const adminMail = {
                from: `"3D Fabrika Sistem" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER, 
                subject: '🚨 YENİ SİPARİŞ GELDİ! - 3D Fabrika',
                html: `<h3>Sisteme yeni bir sipariş düştü!</h3>
                       <p><b>Müşteri:</b> ${isim} (${email})</p>
                       <p><b>Model/Dosya:</b> ${dosyaAdi}</p>
                       <p><b>Tutar:</b> ${fiyat} ₺</p>
                       <p><b>Müşteri Mesajı:</b> ${mesaj}</p>
                       <p>Lütfen <a href="https://website3d-93zb.onrender.com/admin.html">Admin Paneline</a> girerek siparişi onaylayın ve işleme alın.</p>`
            };

            transporter.sendMail(musteriMail)
                .then(info => console.log("✅ Müşteri maili başarıyla gitti: ", info.response))
                .catch(err => console.log("❌ Müşteri maili hatası:", err));

            transporter.sendMail(adminMail)
                .then(info => console.log("✅ Admin maili başarıyla gitti: ", info.response))
                .catch(err => console.log("❌ Admin maili hatası:", err));
        } else {
            console.log("⚠️ UYARI: Render'da EMAIL_USER veya EMAIL_PASS bulunamadı! Mail atlandı.");
        }

        res.status(201).json({ mesaj: "✅ Siparişiniz başarıyla alındı!", siparisId: yeniSiparis._id });
    } catch (error) {
        console.error("❌ Sipariş Kayıt Hatası:", error); 
        res.status(500).json({ mesaj: "Sipariş kaydedilirken bir hata oluştu.", detay: error.message });
    }
});

app.put('/api/siparisler/:id/durum', async (req, res) => {
    try {
        const { durum } = req.body;
        // { new: true } uyarısı giderildi
        const siparis = await Siparis.findByIdAndUpdate(req.params.id, { durum }, { returnDocument: 'after' });
        
        if (!siparis) return res.status(404).json({ mesaj: "Sipariş bulunamadı." });

        // 📩 MÜŞTERİYE DURUM DEĞİŞİKLİĞİ MAİLİ GÖNDERİMİ
        if (siparis.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            
            let emoji = '⚙️';
            if (durum.toLowerCase().includes('tamamlandı') || durum.toLowerCase().includes('kargo')) emoji = '✅';
            
            const durumMail = {
                from: `"3D Fabrika" <${process.env.EMAIL_USER}>`,
                to: siparis.email,
                subject: `Siparişiniz ${durum} ${emoji} 3D Fabrika`,
                html: `<h3>Merhaba ${siparis.isim},</h3>
                       <p><b>${siparis.dosyaAdi !== 'Dosya Yok' ? siparis.dosyaAdi : 'Özel 3D Baskı'}</b> siparişinizin durumu güncellenmiştir.</p>
                       <p>Güncel Durum: <span style="font-size: 18px; font-weight: bold; color: #2563EB;">${durum}</span></p>
                       <p>Detayları web sitemizden hesabınıza giriş yaparak görebilirsiniz.</p>`
            };
            
            // Await eklendi: Mailin gitmesi beklenip loglanacak
            try {
                const info = await transporter.sendMail(durumMail);
                console.log(`✅ Sipariş durum maili başarıyla gitti: ${info.response}`);
            } catch (err) {
                console.log("❌ Durum maili hatası:", err);
            }
        }

        res.status(200).json({ mesaj: "Sipariş durumu güncellendi!" });
    } catch (error) {
        res.status(500).json({ mesaj: "Durum güncellenemedi." });
    }
});

// KULLANICI KAYIT API'Sİ (Doğrulama Kodlu)
app.post('/api/auth/kayit', async (req, res) => {
    try {
        const { isim, email, sifre } = req.body;
        const eskiKullanici = await Kullanici.findOne({ email });
        if (eskiKullanici) return res.status(400).json({ mesaj: "Bu e-posta adresi zaten kullanımda." });

        const salt = await bcrypt.genSalt(10);
        const sifrelenmisSifre = await bcrypt.hash(sifre, salt);
        
        const dogrulamaKodu = crypto.randomBytes(32).toString('hex');

        const yeniKullanici = new Kullanici({ 
            isim, 
            email, 
            sifre: sifrelenmisSifre,
            dogrulamaKodu: dogrulamaKodu
        });
        await yeniKullanici.save();

        // 📩 DOĞRULAMA MAİLİ GÖNDERİMİ
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // URL güncellendi
            const onayLinki = `https://bagitasarim.com.tr/api/auth/dogrula/${dogrulamaKodu}`;
            
            const onayMaili = {
                from: `"3D Fabrika" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Hesabınızı Doğrulayın - 3D Fabrika',
                html: `<h3>Aramıza Hoş Geldin, ${isim}!</h3>
                       <p>Kayıt işlemini tamamlamak ve sipariş verebilmek için aşağıdaki bağlantıya tıklayarak e-posta adresinizi doğrulamanız gerekmektedir:</p>
                       <a href="${onayLinki}" style="display:inline-block; padding:10px 20px; background-color:#2563EB; color:#fff; text-decoration:none; border-radius:5px; margin-top:10px;">Hesabımı Doğrula</a>
                       <p style="margin-top:20px; font-size:12px; color:#666;">Buton çalışmıyorsa şu linki tarayıcınıza yapıştırın: ${onayLinki}</p>`
            };
            
            // await eklendi ve loglar detaylandırıldı
            try {
                const info = await transporter.sendMail(onayMaili);
                console.log("✅ Onay maili başarıyla gitti: ", info.response);
            } catch (err) {
                console.log("❌ Onay maili gönderim hatası:", err);
            }
        }

        res.status(201).json({ mesaj: "Kayıt başarılı! Lütfen e-posta adresinize gönderilen linke tıklayarak hesabınızı doğrulayın." });
    } catch (error) {
        console.error("Kayıt hatası:", error);
        res.status(500).json({ mesaj: "Kayıt sırasında sunucu hatası oluştu." });
    }
});

// E-POSTA DOĞRULAMA KÖPRÜSÜ (Maile Tıklandığında Çalışır)
app.get('/api/auth/dogrula/:kod', async (req, res) => {
    try {
        const kullanici = await Kullanici.findOne({ dogrulamaKodu: req.params.kod });
        
        if (!kullanici) {
            return res.status(400).send("<h3>Geçersiz veya süresi dolmuş doğrulama bağlantısı.</h3>");
        }

        kullanici.onayliMi = true;
        kullanici.dogrulamaKodu = undefined; // Kodu tek seferlik kullanıp siliyoruz
        await kullanici.save();

        // Başarılı doğrulama sonrası kullanıcıyı giriş sayfasına yönlendiriyoruz
        res.redirect('/giris.html?onay=basarili');
    } catch (error) {
        res.status(500).send("Sunucu hatası oluştu.");
    }
});

// KULLANICI GİRİŞ API'Sİ (Onay Kontrollü)
app.post('/api/auth/giris', async (req, res) => {
    try {
        const { email, sifre } = req.body;
        const kullanici = await Kullanici.findOne({ email });
        if (!kullanici) return res.status(400).json({ mesaj: "Böyle bir kullanıcı bulunamadı." });

        // YENİ: E-posta onay kontrolü
        if (!kullanici.onayliMi) {
            return res.status(403).json({ mesaj: "Lütfen giriş yapmadan önce e-posta adresinize gönderilen bağlantıdan hesabınızı doğrulayın." });
        }

        const sifreDogruMu = await bcrypt.compare(sifre, kullanici.sifre);
        if (!sifreDogruMu) return res.status(400).json({ mesaj: "Hatalı şifre girdiniz." });

        const token = jwt.sign(
            { id: kullanici._id, rol: kullanici.rol },
            "GIZLI_ANAHTAR_3D_FABRIKA", 
            { expiresIn: '1d' } 
        );

        res.status(200).json({ 
            mesaj: "Giriş başarılı!", 
            token: token,
            kullanici: { isim: kullanici.isim, email: kullanici.email, rol: kullanici.rol }
        });
    } catch (error) {
        res.status(500).json({ mesaj: "Giriş sırasında sunucu hatası oluştu." });
    }
});

// 4. SUNUCUYU BAŞLATMA
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor!`);
});