# GO FASTER — Web Pendaftaran

## Struktur
```text
GO_FASTER_Pendaftaran/
├── index.html
├── style.css
├── script.js
├── Code.gs
├── README.txt
└── assets/
    ├── go-pat.png
    └── qris.png
```

## Pemakaian sebagai website biasa
`index.html` memanggil gambar dengan:
- `assets/go-pat.png`
- `assets/qris.png`

Jadi gambar tidak lagi di-embed Base64.

## Google Apps Script
Versi ini memakai `<img src="assets/...">`, sehingga jika `index.html` ditempel langsung ke Google Apps Script sebagai HTMLService, folder `assets` lokal tidak otomatis menjadi URL publik.

Untuk deployment Google Apps Script, gunakan salah satu cara berikut:
1. Upload gambar ke hosting/static storage yang menghasilkan URL publik, lalu ubah `src`.
2. Simpan gambar di Google Drive dan gunakan mekanisme penyajian gambar publik yang sesuai.
3. Jika ingin seluruh project self-contained di Apps Script, gunakan versi Base64 dari ZIP sebelumnya.

Backend `Code.gs` tetap dapat digunakan untuk:
- Google Sheets sebagai database
- Google Drive sebagai tempat bukti pembayaran/follow
- ID pendaftaran otomatis
- validasi email duplikat
