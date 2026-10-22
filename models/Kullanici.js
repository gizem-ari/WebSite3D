const mongoose = require('mongoose');

const kullaniciSema = new mongoose.Schema({
    isim: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    sifre: { type: String, required: true },
    rol: { type: String, default: 'kullanici' },
    onayliMi: { type: Boolean, default: false },
    dogrulamaKodu: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Kullanici', kullaniciSema);