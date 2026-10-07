const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Kullanici = require('./models/Kullanici');

const app = express();

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { family: 4 })
    .then(() => {
        console.log("✅ MongoDB Veri Tabanına Başarıyla Bağlanıldı!");
        verileriOlustur(); // Bağlantı kurulduğunda veritabanını kontrol et ve doldur
    })
    .catch((err) => console.log("❌ MongoDB Bağlantı Hatası: ", err));


// ==========================================
// 1. MONGOOSE ŞEMALARI (Veri Tablosu Yapıları)
// ==========================================

// Fiyatlandırma Ayarları Şeması
const ayarSema = new mongoose.Schema({
    gramBasiMaliyet: Number,
    saatlikMakineUcreti: Number,
    sabitBaslangicUcreti: Number,
    karMarji: Number
});
const Ayar = mongoose.model('Ayar', ayarSema);

// 3D Ürünler Şeması
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

// Sipariş Şeması (Admin paneliyle uyumlu hale getirildi)
const siparisSema = new mongoose.Schema({
    isim: String,         // musteriAd yerine isim yapıldı
    email: String,
    telefon: String,
    dosyaAdi: String,     // Hangi modeli istediği
    dosyaUrl: String,     // Özel dosya yüklediyse Cloudinary linki
    fiyat: Number,        // Hesaplanıp müşteriye gösterilen fiyat
    mesaj: String,
    durum: { type: String, default: "Bekliyor" }
}, { timestamps: true }); // createdAt (oluşturulma tarihi) bilgisini otomatik ekler
const Siparis = mongoose.model('Siparis', siparisSema);


// ==========================================
// 2. ÖRNEK VERİLERİ DOLDURMA FONKSİYONU
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
// 3. API ROTALARI (Frontend ile iletişim)
// ==========================================

app.get('/', (req, res) => {
    res.send("3D Fabrika API Sunucusu Çalışıyor 🚀");
});

// --- FİYAT AYARLARI API'LERİ ---
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

// --- ÜRÜN API'LERİ ---
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

// Ürün Stok Durumunu Güncelleme API'si
app.put('/api/urunler/:id/stok', async (req, res) => {
    try {
        const { stokDurumu } = req.body;
        await Urun.findByIdAndUpdate(req.params.id, { stokDurumu });
        res.status(200).json({ mesaj: "Stok durumu başarıyla güncellendi!" });
    } catch (error) {
        res.status(500).json({ mesaj: "Stok güncellenemedi." });
    }
});

// --- SİPARİŞ API'LERİ ---
app.get('/api/siparisler', async (req, res) => {
    try {
        const siparisler = await Siparis.find().sort({ createdAt: -1 }); 
        res.status(200).json(siparisler);
    } catch (error) {
        console.error("Siparişler çekilirken hata:", error);
        res.status(500).json({ mesaj: "Siparişler getirilemedi." });
    }
});

app.post('/api/siparisler', async (req, res) => {
    try {
        const yeniSiparis = await Siparis.create(req.body);
        res.status(201).json({ mesaj: "✅ Siparişiniz başarıyla alındı!", siparisId: yeniSiparis._id });
    } catch (error) {
        console.error("❌ Sipariş Kayıt Hatası:", error); 
        res.status(500).json({ mesaj: "Sipariş kaydedilirken bir hata oluştu.", detay: error.message });
    }
});

app.put('/api/siparisler/:id/durum', async (req, res) => {
    try {
        const { durum } = req.body;
        await Siparis.findByIdAndUpdate(req.params.id, { durum });
        res.status(200).json({ mesaj: "Sipariş durumu güncellendi!" });
    } catch (error) {
        res.status(500).json({ mesaj: "Durum güncellenemedi." });
    }
});

// --- KİMLİK DOĞRULAMA (AUTH) API'LERİ ---
app.post('/api/auth/kayit', async (req, res) => {
    try {
        const { isim, email, sifre } = req.body;
        const eskiKullanici = await Kullanici.findOne({ email });
        if (eskiKullanici) return res.status(400).json({ mesaj: "Bu e-posta adresi zaten kullanımda." });

        const salt = await bcrypt.genSalt(10);
        const sifrelenmisSifre = await bcrypt.hash(sifre, salt);

        const yeniKullanici = new Kullanici({ isim, email, sifre: sifrelenmisSifre });
        await yeniKullanici.save();

        res.status(201).json({ mesaj: "Kayıt işlemi başarıyla tamamlandı!" });
    } catch (error) {
        console.error("Kayıt hatası:", error);
        res.status(500).json({ mesaj: "Kayıt sırasında sunucu hatası oluştu." });
    }
});

app.post('/api/auth/giris', async (req, res) => {
    try {
        const { email, sifre } = req.body;
        const kullanici = await Kullanici.findOne({ email });
        if (!kullanici) return res.status(400).json({ mesaj: "Böyle bir kullanıcı bulunamadı." });

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
        console.error("Giriş hatası:", error);
        res.status(500).json({ mesaj: "Giriş sırasında sunucu hatası oluştu." });
    }
});


// 4. SUNUCUYU BAŞLATMA (Her Zaman En Altta Olmalı)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda çalışıyor!`);
});