const mongoose = require('mongoose');

const kullaniciSema = new mongoose.Schema({
    isim: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // Aynı e-posta adresiyle birden fazla hesap açılmasını engeller
    },
    sifre: {
        type: String,
        required: true
    },
    rol: {
        type: String,
        default: 'uye' // Yeni kaydolan herkes varsayılan olarak müşteri (üye) statüsünde olur
    }
}, { timestamps: true }); // Kullanıcının sisteme kayıt olduğu tarihi (createdAt) otomatik kaydeder

module.exports = mongoose.model('Kullanici', kullaniciSema);