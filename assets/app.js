/* ADM Guru Pembelajaran – inti aplikasi: tema, fungsi bantu, data guru yang sedang masuk. Muat PERTAMA di setiap halaman. */
(function(){
  const S = window.ADM = window.ADM || {};
  S.NAMA = 'ADM Guru Pembelajaran';
  S.base = new URL('../', document.currentScript.src).href;
  S.KKTP = 75;
  S.guru = {nama:'', mapel:'', mapelList:[], kelas:[], semuaKelas:[], foto:'', nip:'', hp:'', email:''};
  /* mapel = mapel aktif; mapelList = semua mapel [{nama, kelas:[…]}]; kelas = kelas untuk mapel aktif; semuaKelas = semua kelas diampu */

  /* Ganti mapel aktif: simpan pilihan, muat ulang profil di memori, lalu render ulang halaman (tanpa muat ulang penuh).
     S.refresh disediakan sidebar.js; bila belum ada, jatuh ke reload biasa. */
  S.setMapel = async n => {
    try { localStorage.setItem('adm_mapel_' + S.uid, n); } catch(_) {}
    try { await S.profile.load(); S.refresh ? S.refresh() : location.reload(); } catch(_) { location.reload(); }
  };   // S.uid diisi dari akun yang masuk (lihat firebase-config.js)

  /* Perapian otomatis: kelas → "VII A" (7a, 7 A, VIia, viiA semuanya jadi VII A); nama → huruf besar di awal tiap kata */
  const ROM = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  S.kelasNorm = k => {
    k = String(k ?? '').trim().replace(/\s+/g, ' ');
    const m = k.match(/^(\d{1,2}|[ivx]+)([\s.-]*)(.*)$/i); if (!m) return k.toUpperCase();
    let n = m[1]; const r = m[3].trim();
    if (/^\d+$/.test(n)) { n = ROM[+n]; if (!n) return k.toUpperCase(); }
    else { if (!m[2] && /^[a-z]{2,}/i.test(r)) return k.toUpperCase(); n = n.toUpperCase(); }   // "IPA 1" bukan angka romawi
    const s = r.split(' ').map(w => w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return s ? n + ' ' + s : n;
  };
  S.kelasSort = (a, b) => { const f = k => { const i = ROM.indexOf((String(k).match(/^[IVX]+/) || [''])[0]); return i < 1 ? 99 : i; }; return f(a) - f(b) || a.localeCompare(b, 'id', {numeric:true}); };
  S.namaNorm = s => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (x, a, b) => a + b.toUpperCase());

  S.theme = () => document.documentElement.dataset.theme || '';
  S.setTheme = t => { document.documentElement.dataset.theme = t; try { localStorage.setItem('adm-tema', t); } catch(_) {} };
  try { const t = localStorage.getItem('adm-tema'); if (t) document.documentElement.dataset.theme = t; } catch(_) {}

  S.logout = async () => { try { await S.auth.logout(); } catch(_) {} location.replace(S.base + 'login.html'); };
  S.avg = a => a.length ? a.reduce((x,y) => x + y, 0) / a.length : 0;
  S.esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  S.toast = (msg, err) => {
    const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = msg;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2800);
  };
  S.csv = (nama, baris) => {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const blob = new Blob(['\ufeff' + baris.map(r => r.map(q).join(',')).join('\n')], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; a.click(); URL.revokeObjectURL(a.href);
  };

  /* Foto profil: tautan Google Drive ("Siapa saja yang memiliki link") diubah otomatis menjadi alamat gambar. */
  S.fotoUrl = u => {
    u = (u || '').trim(); if (!u) return '';
    const m = u.match(/\/d\/([\w-]{10,})/) || u.match(/[?&]id=([\w-]{10,})/);
    return m && /(drive|docs)\.google\.com/.test(u) ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400' : u;
  };
  S.avatar = (cls, g = S.guru) => {
    let i = ((g.nama || g.email || '?').replace(/^(Bu|Pak|Ibu|Bapak)\s+/i, '').trim()[0] || '?').toUpperCase(); if (!/[A-Z0-9]/.test(i)) i = '?';
    const f = S.fotoUrl(g.foto);
    return f ? `<img class="${cls}" src="${S.esc(f)}" alt="Foto ${S.esc(g.nama)}" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} ph',textContent:'${i}'}))">`
             : `<span class="${cls} ph">${i}</span>`;
  };
})();