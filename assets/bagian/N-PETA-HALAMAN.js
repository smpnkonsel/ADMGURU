/* ═══════════════════════════════════════════════════════════════════════════
   [N] PETA HALAMAN + ADM.page()   (file: bagian/N-PETA-HALAMAN.js)  ← HARUS DIMUAT PALING AKHIR
   Peta kunci → [grup menu, submenu, fungsi] kini diisi oleh tiap file bagian (D–L) lewat U.PG.
   Nama grup/submenu HARUS sama dengan di sidebar.js (supaya sidebar menandai menu aktif).
   Kunci dipanggil dari tiap file HTML: ADM.page('kunci').
   S.page: dijalankan tiap halaman – cek login (hanya sekali per sesi), pasang header/sidebar
   lewat S.mount, jalankan fungsi halaman, tampilkan kotak bantuan.
   Menambah halaman baru: buat fungsinya di file bagian yang sesuai, daftarkan di Object.assign(U.PG,{...}) file itu,
   dan teks bantuannya di file [M] (HELP).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$}=U,PG=U.PG;
/* Halaman yang datanya terpisah per mapel → pilihan Mapel tampil di dalam halaman (toolbar). Tambah/kurangi kunci di sini. */
const PMK=new Set(['dashboard','pres-input','pres-rekap','pres-riwayat','nilai-input','nilai-rekap','nilai-akhir','ketuntasan','jurnal','tujuan','materi','evaluasi','remedial','pengayaan','leger','lap-presensi','lap-siswa','grafik','notif','surat']);
S.page=async key=>{if(!S.booted){if(!await S.boot())return;S.booted=true;try{await U.hidrasiKolom()}catch(_){}}U.X.PM=PMK.has(key);const p=PG[key],dsh=key==='dashboard',sub=dsh&&location.hash==='#aktif'?'Aktivitas Hari Ini':p[1],v=S.mount({menu:p[0],sub,title:dsh?'Dashboard':p[1],desc:p[0]+(G.mapel?' · '+G.mapel:'')});
  try{await p[2](v);U.helpBox(key,v);const ms=$('mpS');if(ms)ms.onchange=ev=>S.setMapel(ev.target.value);if(!K.length&&p[0]!=='Wali Murid (RCHK)'&&!['profil','sekolah','bantuan','dashboard'].includes(key))v.insertAdjacentHTML('afterbegin','<div class="box" style="margin-bottom:14px;background:var(--warn2)">Belum ada kelas diampu. <a href="'+S.base+'pages/pengaturan/profil.html">Tambahkan di Profil Guru</a> agar pilihan kelas muncul.</div>')}
  catch(er){console.error(er);v.innerHTML='<div class="box empty">Terjadi kesalahan: '+e(er.message)+'</div>'}};
})();
