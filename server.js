const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

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

// --- 1. MONGOOSE ŞEMALARI (Veri Tablosu Yapıları) ---

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

// --- 2. ÖRNEK VERİLERİ DOLDURMA FONKSİYONU ---
async function verileriOlustur() {
    // Ayarlar koleksiyonu boş mu diye kontrol et
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

    // Ürünler koleksiyonu boş mu diye kontrol et
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

// --- 3. API ROTALARI (Frontend ile iletişim) ---

app.get('/', (req, res) => {
    res.send("3D Fabrika API Sunucusu Çalışıyor 🚀");
});

// Fiyatlandırma Parametrelerini MongoDB'den Çeken Rota
app.get('/api/fiyat-ayarlari', async (req, res) => {
    try {
        const ayarlar = await Ayar.findOne(); // İlk ayar dokümanını bulur
        res.json(ayarlar);
    } catch (error) {
        res.status(500).json({ mesaj: "Veri tabanından ayarlar çekilemedi." });
    }
});

// Tüm Ürünleri MongoDB'den Çeken Rota
app.get('/api/urunler', async (req, res) => {
    try {
        const urunler = await Urun.find(); // Tüm ürünleri liste olarak bulur
        res.json(urunler);
    } catch (error) {
        // İŞTE BURASI: Hatanın asıl sebebini terminale yazdıracak kısım
        console.error("❌ MongoDB GET Okuma Hatası:", error);
        res.status(500).json({ mesaj: "Veri tabanından ürünler çekilemedi.", detay: error.message });
    }
});
// Tek Bir Ürünün Detaylarını Çeken Rota
app.get('/api/urunler/:id', async (req, res) => {
    try {
        const urun = await Urun.findById(req.params.id); // URL'den gelen ID ile veri tabanında arar
        if (!urun) {
            return res.status(404).json({ mesaj: "Ürün bulunamadı." });
        }
        res.json(urun);
    } catch (error) {
        res.status(500).json({ mesaj: "Ürün detayları getirilirken hata oluştu." });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde yakalandı!`);
});

// Yeni Ürün Ekleme Rotası (POST)
// İleride Postman ile veya HTML formundan veri göndererek ürün eklemek için kullanılır
app.post('/api/urunler', async (req, res) => {
    try {
        // req.body, formdan veya istekten gelen ürün verilerini içerir
        const yeniUrun = await Urun.create(req.body);
        res.status(201).json({ 
            mesaj: "✅ Yeni ürün başarıyla eklendi!", 
            urun: yeniUrun 
        });
    } catch (error) {
        res.status(500).json({ 
            mesaj: "❌ Ürün eklenirken hata oluştu.", 
            hata: error.message 
        });
    }
});

// --- SİPARİŞ ŞEMASI ---
const siparisSema = new mongoose.Schema({
    musteriAd: String,
    email: String,
    telefon: String,
    ilgilenilenUrun: String,
    mesaj: String,
    dosyaUrl: String, // Cloudinary'den gelecek görsel/dosya linki
    durum: { type: String, default: "Bekliyor" }, // Varsayılan durum
    tarih: { type: Date, default: Date.now }
});
const Siparis = mongoose.model('Siparis', siparisSema);


// --- YENİ SİPARİŞ EKLEME ROTASI (POST) ---
app.post('/api/siparisler', async (req, res) => {
    try {
        const yeniSiparis = await Siparis.create(req.body);
        res.status(201).json({ 
            mesaj: "✅ Siparişiniz başarıyla alındı!", 
            siparisId: yeniSiparis._id 
        });
    } catch (error) {
        console.error("❌ Sipariş Kayıt Hatası:", error); 
        res.status(500).json({ mesaj: "Sipariş kaydedilirken bir hata oluştu.", detay: error.message });
    }
});