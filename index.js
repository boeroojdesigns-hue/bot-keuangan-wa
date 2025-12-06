const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express'); 

// --- SERVER PENGHALANG TIDUR (KEEP-ALIVE) ---
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Bot WhatsApp Keuangan Aktif! 🚀');
});

app.listen(port, () => {
  console.log(`Server aktif di port ${port}`);
});
// -------------------------------------------

const GAS_URL = process.env.GAS_URL; 
const MONGO_URI = process.env.MONGO_URI;

if (!GAS_URL || !MONGO_URI) {
    console.error("ERROR: Mohon isi Secrets (GAS_URL dan MONGO_URI) di menu Tools Replit.");
    process.exit(1);
}

console.log("Menghubungkan ke Database...");

mongoose.connect(MONGO_URI).then(() => {
    console.log("Database Terhubung!");
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 60000 
        }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        }
    });

    client.on('qr', (qr) => {
        console.log('\n--- SCAN QR CODE DI BAWAH INI ---');
        qrcode.generate(qr, { small: true });
        console.log('---------------------------------\n');
    });

    client.on('remote_session_saved', () => {
        console.log('Sesi WA berhasil disimpan/update di Database!');
    });

    client.on('ready', () => {
        console.log('Bot WhatsApp SIAP digunakan!');
    });

    client.on('message', async msg => {
        const text = msg.body;
        const cmd = text.toLowerCase();
        
        // Command yang diizinkan: Masuk, Keluar, Cek Saldo, Help/Menu
        if (cmd.startsWith('masuk ') || 
            cmd.startsWith('keluar ') || 
            cmd === 'cek saldo' || 
            cmd === 'help' || 
            cmd === 'menu' || 
            cmd === 'bantuan') {
            
            const chat = await msg.getChat();
            console.log(`Pesan dari ${msg.from}: ${text}`);

            try {
                const response = await axios.post(GAS_URL, {
                    text: text,
                    sender: msg.from
                });

                if (response.data.reply) {
                    msg.reply(response.data.reply);
                }
            } catch (error) {
                console.error("Gagal kirim ke Google Sheet:", error.message);
                msg.reply('⚠️ Gagal menghubungi server database.');
            }
        }
    });

    client.initialize();
}).catch(err => {
    console.error("Gagal konek ke MongoDB:", err);
});
