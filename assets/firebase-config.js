/* ADM Guru Pembelajaran – akun & penyimpanan data. Muat SETELAH app.js.
   Isi FIREBASE_CONFIG dengan konfigurasi proyek Firebase Anda (Firebase Console > Project settings > Your apps > Web app).
   Jika diubah menjadi null, aplikasi berjalan dalam MODE PERCOBAAN: akun dan data hanya tersimpan di peramban ini.
   Dengan Firebase: setiap akun punya data sendiri di Firestore pada  users/{uid}/…  (dikunci oleh firestore.rules).

   INGAT SAYA: pilihan disimpan di localStorage 'adm_ingat'.
   - '1' (bawaan): sesi disimpan permanen di perangkat (persistence LOCAL), guru tidak perlu masuk lagi.
   - '0': sesi hanya sampai tab/peramban ditutup (persistence SESSION) dan cache offline Firestore dimatikan.

   HEMAT KUOTA (READS/WRITES/DELETES) – ringkasan:
   - Semua akses Firestore lewat A.db / A.profile di berkas ini (tidak ada akses langsung di tempat lain).
   - Cache koleksi di memori + sessionStorage, berlaku TTL menit (lihat TTL). Penulisan memperbarui cache di tempat,
     tidak lagi membuang cache, sehingga tidak ada baca-ulang setelah Tambah/Edit/Hapus.
   - Query berfilter (mis. {kelas:'VII A'}) disaring dari cache koleksi bila sudah ada (0 read).
   - update() dilewati bila data tidak berubah; batch() menggabungkan tambah/ubah/hapus dalam satu commit.
   - Tidak ada onSnapshot (tidak perlu real-time) sehingga tidak ada listener ganda.
   - Muat ulang paksa dari server: A.db.segarkan([koleksi]) atau list(c, where, semua, true). */
(function(){
  const A = window.ADM;
  if (!A) { console.error('app.js belum dimuat. Muat assets/app.js sebelum firebase-config.js.'); return; }

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAESSx8aoZThCaSJ5TSogSOrzDf7gKDVUU",
    authDomain: "apk-pembelajaran-3a72e.firebaseapp.com",
    projectId: "apk-pembelajaran-3a72e",
    storageBucket: "apk-pembelajaran-3a72e.firebasestorage.app",
    messagingSenderId: "559813710476",
    appId: "1:559813710476:web:3e32b243fa2ede253a61a9",
    measurementId: "G-F4B096YQEP"
  };

  const FB = !!FIREBASE_CONFIG;
  const MIN_SANDI = 8;
  const ERR = {
    'auth/invalid-credential':'Email atau kata sandi salah.',
    'auth/wrong-password':'Email atau kata sandi salah.',
    'auth/user-not-found':'Email belum terdaftar. Silakan daftar dulu.',
    'auth/email-already-in-use':'Email ini sudah terdaftar. Silakan masuk.',
    'auth/weak-password':'Kata sandi minimal ' + MIN_SANDI + ' karakter.',
    'auth/invalid-email':'Format email tidak valid.',
    'auth/user-disabled':'Akun ini dinonaktifkan.',
    'auth/too-many-requests':'Terlalu banyak percobaan. Coba lagi beberapa saat.',
    'auth/account-exists-with-different-credential':'Email ini sudah terdaftar dengan cara masuk lain. Masuk dengan email dan kata sandi dulu.',
    'auth/provider-already-linked':'Kata sandi untuk akun ini sudah dibuat. Silakan masuk dengan email dan kata sandi.',
    'auth/credential-already-in-use':'Kredensial ini sudah dipakai akun lain.',
    'auth/requires-recent-login':'Sesi sudah lama. Masuk dengan Google lagi lalu coba buat kata sandi.',
    'auth/popup-closed-by-user':'Jendela Google ditutup sebelum selesai.',
    'auth/cancelled-popup-request':'Permintaan masuk dibatalkan. Coba klik sekali lagi.',
    'auth/popup-blocked':'Popup diblokir peramban. Izinkan popup lalu coba lagi.',
    'auth/unauthorized-domain':'Domain ini belum ditambahkan di Authorized domains Firebase (Authentication > Settings).',
    'auth/operation-not-allowed':'Metode masuk ini belum diaktifkan di Firebase Authentication.',
    'auth/network-request-failed':'Tidak ada koneksi internet.',
    'auth/web-storage-unsupported':'Peramban memblokir penyimpanan. Aktifkan cookie/penyimpanan situs, atau keluar dari mode privat.'
  };
  const U = r => ({uid:r.uid, email:r.email, nama:r.displayName || '', foto:r.photoURL || ''});
  const pesan = er => new Error(ERR[er.code] || er.message || 'Terjadi kesalahan.');

  /* ===== pilihan "Ingat saya" ===== */
  const ingat = () => { try { return localStorage.getItem('adm_ingat') !== '0'; } catch(_) { return true; } };

  let fb = null;
  const load = src => new Promise((ok,no) => { const t = document.createElement('script'); t.src = src; t.onload = ok; t.onerror = () => no(new Error('Gagal memuat Firebase. Periksa koneksi internet.')); document.head.appendChild(t); });
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-';
  const modeAuth = () => ingat() ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

  function init(){
    return fb || (fb = (async () => {
      await load(SDK + 'app-compat.js');
      await Promise.all([load(SDK + 'auth-compat.js'), load(SDK + 'firestore-compat.js')]);   // paralel
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      const auth = firebase.auth(), db = firebase.firestore();
      try { db.settings({experimentalAutoDetectLongPolling:true, merge:true}); } catch(_) {}   // membantu di jaringan sekolah/seluler yang menghambat WebChannel
      try { await auth.setPersistence(modeAuth()); } catch(_) {}                                // sesi login diingat sesuai pilihan
      if (ingat()) { try { await db.enablePersistence({synchronizeTabs:true}); } catch(_) {} }  // cache offline (gagal diam-diam bila tidak didukung)
      return {auth, db};
    })().catch(er => { fb = null; throw er; }));
  }
  if (FB) init().catch(() => {});   // mulai memuat Firebase segera

  const lget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(_) { return d; } };
  const lset = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const sha = async s => { try { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('adm|' + s)))].map(b => b.toString(16).padStart(2,'0')).join(''); } catch(_) { return btoa(unescape(encodeURIComponent(s))); } };

  /* Sesi mode lokal: localStorage bila diingat, sessionStorage bila tidak */
  const sesiStore = () => ingat() ? localStorage : sessionStorage;
  const sesiGet = () => { try { return localStorage.getItem('adm_sesi') || sessionStorage.getItem('adm_sesi'); } catch(_) { return null; } };
  const sesiSet = e => { try { localStorage.removeItem('adm_sesi'); sessionStorage.removeItem('adm_sesi'); sesiStore().setItem('adm_sesi', e); } catch(_) {} };
  const sesiHapus = () => { try { localStorage.removeItem('adm_sesi'); sessionStorage.removeItem('adm_sesi'); } catch(_) {} };

  const gUser = r => ({...U(r), hasPassword:r.providerData.some(p => p.providerId === 'password')});

  /* ===== akun ===== */
  A.auth = {
    mode: FB ? 'firebase' : 'lokal',
    ingat,
    /* Simpan pilihan "Ingat saya" dan terapkan ke Firebase sebelum masuk. */
    async setIngat(v){
      try { localStorage.setItem('adm_ingat', v ? '1' : '0'); } catch(_) {}
      if (FB) { try { await (await init()).auth.setPersistence(modeAuth()); } catch(_) {} }
    },
    async current(){
      if (!FB) { const e = sesiGet(), a = e && lget('adm_akun', {})[e]; return a ? {uid:a.uid, email:e} : null; }
      const f = await init();
      return new Promise(ok => { const u = f.auth.onAuthStateChanged(x => { u(); ok(x ? U(x) : null); }); });
    },
    async login(email, pw){
      email = email.trim().toLowerCase();
      if (!FB) { const a = lget('adm_akun', {})[email]; if (!a || a.h !== await sha(pw)) throw new Error('Email atau kata sandi salah.'); sesiSet(email); return {uid:a.uid, email}; }
      try { return U((await (await init()).auth.signInWithEmailAndPassword(email, pw)).user); } catch(er) { throw pesan(er); }
    },
    async register(email, pw, nama){
      email = email.trim().toLowerCase();
      if (pw.length < MIN_SANDI) throw new Error(ERR['auth/weak-password']);
      if (!FB) {
        const ak = lget('adm_akun', {}); if (ak[email]) throw new Error(ERR['auth/email-already-in-use']);
        ak[email] = {uid:'u_' + email.replace(/[^a-z0-9]/g, '_'), h:await sha(pw)}; lset('adm_akun', ak); sesiSet(email); return {uid:ak[email].uid, email};
      }
      try {
        const r = (await (await init()).auth.createUserWithEmailAndPassword(email, pw)).user;
        if (nama) await r.updateProfile({displayName:nama});
        r.sendEmailVerification().catch(() => {});   // kirim verifikasi email, tidak memblokir pendaftaran
        return U(r);
      } catch(er) { throw pesan(er); }
    },
    /* Mengembalikan data pengguna bila popup berhasil, atau null bila dialihkan lewat redirect (hasil diambil redirectResult()). */
    async google(){
      if (!FB) throw new Error('Masuk dengan Google memerlukan Firebase.');
      const f = await init(), prov = new firebase.auth.GoogleAuthProvider();
      try { return gUser((await f.auth.signInWithPopup(prov)).user); }
      catch(er) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(er.code)) {
          try { await f.auth.signInWithRedirect(prov); return null; } catch(e2) { throw pesan(e2); }
        }
        throw pesan(er);
      }
    },
    /* Dipanggil saat halaman login dimuat: ambil hasil masuk Google lewat redirect (null bila tidak ada). */
    async redirectResult(){
      if (!FB) return null;
      const f = await init();
      try { const r = await f.auth.getRedirectResult(); return r && r.user ? gUser(r.user) : null; } catch(er) { throw pesan(er); }
    },
    async linkPassword(pw){
      if (pw.length < MIN_SANDI) throw new Error(ERR['auth/weak-password']);
      try { const u = (await init()).auth.currentUser; await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pw)); } catch(er) { throw pesan(er); }
    },
    async reset(email){
      if (!FB) throw new Error('Reset kata sandi tersedia setelah Firebase dihubungkan.');
      try { await (await init()).auth.sendPasswordResetEmail(email.trim()); } catch(er) { throw pesan(er); }
    },
    async logout(){ A.db && A.db.reset(); if (!FB) return sesiHapus(); await (await init()).auth.signOut(); }
  };

  /* Dipanggil di setiap halaman: pastikan sudah masuk (sesi tersimpan dipulihkan otomatis), lalu muat profil akun. */
  A.boot = async () => {
    const u = await A.auth.current();
    if (!u) { location.replace(A.base + 'login.html'); return false; }
    A.uid = u.uid; A.email = u.email; A.guru.email = u.email;
    await A.profile.load(); return true;
  };

  /* ===== profil akun (nama, mapel, kelas diampu, foto) =====
     Dokumen users/{uid} dibaca sekali lalu disimpan (memori + sessionStorage, TTL). load() berikutnya (mis. ganti mapel,
     setelah save, pindah halaman) memakai salinan itu: 0 read. save() hanya menulis bila ada field yang berubah. */
  const TTL = 20 * 60 * 1000;                              // umur cache sebelum dibaca ulang dari server
  const sjson = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch(_) { return false; } };
  let profMem = null;
  const profKey = () => 'adm_p_' + A.uid;
  const profSes = () => { try { const o = JSON.parse(sessionStorage.getItem(profKey())); return o && o.d && Date.now() - o.t < TTL && o.t <= Date.now() + 1000 ? o : null; } catch(_) { return null; } };
  const profTulis = () => { try { if (profMem) sessionStorage.setItem(profKey(), JSON.stringify({t:profMem.t, d:profMem.d})); } catch(_) {} };
  const profAmbil = async () => {
    if (profMem && profMem.uid === A.uid && Date.now() - profMem.t < TTL) return profMem.d;
    const o = profSes();
    if (o) { profMem = {uid:A.uid, t:o.t, d:o.d}; return o.d; }
    const d = await (await init()).db.collection('users').doc(A.uid).get();
    profMem = {uid:A.uid, t:Date.now(), d:d.exists ? d.data() : {}}; profTulis();
    return profMem.d;
  };
  A.profile = {
    async load(force){
      let p;
      if (FB) { if (force) { profMem = null; try { sessionStorage.removeItem(profKey()); } catch(_) {} } p = await profAmbil(); }
      else p = lget('adm_' + A.uid + '_akun', {});
      const {kelas = [], mapelList, ...r} = p, g = A.guru; Object.assign(g, r);
      const ml = Array.isArray(mapelList) && mapelList.length ? mapelList : String(r.mapel || '').split(',').map(x => x.trim()).filter(Boolean).map(n => ({nama:n, kelas:[]}));
      g.mapelList = ml.map(m => ({nama:m.nama, kelas:[...(m.kelas || [])]}));
      g.semuaKelas.splice(0, g.semuaKelas.length, ...kelas);
      let a = ''; try { a = localStorage.getItem('adm_mapel_' + A.uid) || ''; } catch(_) {}
      if (!g.mapelList.some(m => m.nama === a)) a = (g.mapelList[0] || {}).nama || '';
      A.mapelAktif = a; g.mapel = a;
      const cur = g.mapelList.find(m => m.nama === a);
      g.kelas.splice(0, g.kelas.length, ...(cur && cur.kelas.length ? cur.kelas : kelas));   // kelas untuk mapel aktif
    },
    async save(d){
      const g = A.guru; let ml = d.mapelList ?? g.mapelList;
      if (d.mapel && !d.mapelList) ml = String(d.mapel).split(',').map(x => x.trim()).filter(Boolean).map(n => ({nama:n, kelas:[]}));
      ml = ml.map(m => ({nama:m.nama, kelas:[...new Set((m.kelas || []).map(A.kelasNorm))]}));
      const o = {nama:A.namaNorm(d.nama ?? g.nama), nip:d.nip ?? g.nip, hp:d.hp ?? g.hp, foto:d.foto ?? g.foto, mapelList:ml, mapel:ml.map(m => m.nama).join(', '), kelas:[...new Set((d.kelas ?? g.semuaKelas).map(A.kelasNorm))].sort(A.kelasSort), email:A.email};
      if (FB) {
        const lama = await profAmbil();
        if (!Object.keys(o).every(k => sjson(lama[k], o[k]))) {                 // tulis hanya bila ada field yang berubah
          await (await init()).db.collection('users').doc(A.uid).set(o, {merge:true});
          profMem = {uid:A.uid, t:profMem ? profMem.t : Date.now(), d:{...lama, ...o}}; profTulis();
        }
      } else lset('adm_' + A.uid + '_akun', o);
      await this.load();
    }
  };

  /* ===== data: setiap akun hanya membaca/menulis  users/{uid}/{koleksi} =====
     CACHE: satu entri per koleksi penuh (kunci = nama koleksi) + entri untuk query berfilter yang dijalankan ke server
     hanya bila koleksi penuhnya belum ada. Entri disimpan di memori (dan sessionStorage untuk koleksi penuh) dengan TTL.
     Penulisan memperbarui entri di tempat (tanpa baca ulang). */
  const col = async c => (await init()).db.collection('users').doc(A.uid).collection(c), lk = c => 'adm_' + A.uid + '_' + c;
  const MS = new Set(['presensi','nilai','jurnal','tujuan','materi','evaluasi','remedial','pengayaan','mapel']);   // data per mata pelajaran
  const cache = new Map();                                   // kunci → {c, w, t, p, rows}
  const kk = (c, w) => w.length ? c + '|' + JSON.stringify([...w].sort((a, b) => a[0] < b[0] ? -1 : 1)) : c;
  const cocok = (d, w) => w.every(([k, v]) => d[k] === v);
  const masih = e => e && Date.now() - e.t < TTL ? e : null;
  const sesKey = c => 'adm_c_' + A.uid + '_' + c;
  const sesBaca = c => { try { const o = JSON.parse(sessionStorage.getItem(sesKey(c))); return o && Array.isArray(o.rows) && Date.now() - o.t < TTL && o.t <= Date.now() + 1000 ? o : null; } catch(_) { return null; } };
  const tmr = {};
  const sesTulis = e => {                                    // simpan koleksi penuh ke sessionStorage (ditunda & digabung)
    if (e.w.length) return; clearTimeout(tmr[e.c]);
    tmr[e.c] = setTimeout(() => { try { if (cache.get(e.c) !== e || !e.rows) return; const s = JSON.stringify({t:e.t, rows:e.rows}); if (s.length < 2e6) sessionStorage.setItem(sesKey(e.c), s); else sessionStorage.removeItem(sesKey(e.c)); } catch(_) { try { sessionStorage.removeItem(sesKey(e.c)); } catch(_) {} } }, 400);
  };
  const hapusC = c => { for (const [k, e] of cache) if (e.c === c) cache.delete(k); try { sessionStorage.removeItem(sesKey(c)); } catch(_) {} };
  const raw = async (c, w) => {
    let q = await col(c);
    for (const [k, v] of w) q = q.where(k, '==', v);            // filter dikerjakan server
    return (await q.get()).docs.map(d => ({id:d.id, ...d.data()}));
  };
  const baru = (c, w) => {
    const e = {c, w, t:Date.now()}, key = kk(c, w);
    e.p = raw(c, w).then(r => { e.rows = r; sesTulis(e); return r; });
    e.p.catch(() => { if (cache.get(key) === e) cache.delete(key); });   // gagal → jangan simpan, coba lagi nanti
    cache.set(key, e); return e;
  };
  const saring = (r, w) => w.length ? r.filter(d => cocok(d, w)) : r;
  const ambil = (c, w, segar) => {
    if (segar) hapusC(c);
    let f = masih(cache.get(c));
    if (!f) {
      cache.delete(c);
      const o = sesBaca(c);
      if (o) { f = {c, w:[], t:o.t, rows:o.rows, p:Promise.resolve(o.rows)}; cache.set(c, f); }
    }
    if (f) return f.p.then(r => saring(r, w));                 // koleksi penuh sudah ada → saring lokal, 0 read
    if (!w.length) { for (const [k, e] of cache) if (e.c === c) cache.delete(k); return baru(c, []).p; }
    const key = kk(c, w); let e = masih(cache.get(key));
    if (!e) { cache.delete(key); e = baru(c, w); }
    return e.p;
  };
  /* terapkan perubahan ke semua entri cache koleksi c (berurutan lewat rantai promise, sehingga aman walau muatan masih berjalan) */
  const mut = (c, fn) => { for (const e of cache.values()) if (e.c === c) { e.p = e.p.then(r => { const n = fn(r, e); e.rows = n; sesTulis(e); return n; }); e.p.catch(() => {}); } };
  const cAdd = (c, docs) => mut(c, (r, e) => { docs.forEach(d => { if (cocok(d, e.w) && !r.some(x => x.id === d.id)) r.push(d); }); return r; });
  const cDel = (c, ids) => { const s = new Set(ids); mut(c, r => r.filter(d => !s.has(d.id))); };
  const cUbah = (c, id, data) => {
    for (const [k, e] of cache) if (e.c === c && e.w.some(([f, v]) => f in data && data[f] !== v)) cache.delete(k);   // dokumen pindah keluar/masuk filter → muat ulang bila perlu
    mut(c, r => { const d = r.find(x => x.id === id); if (d) Object.assign(d, data); return r; });
  };
  const cari = (c, id) => { for (const e of cache.values()) if (e.c === c && e.rows) { const d = e.rows.find(x => x.id === id); if (d) return d; } return null; };
  const tdkBerubah = (c, id, data) => { const d = cari(c, id); return !!d && Object.keys(data).every(k => k in d && sjson(d[k], data[k])); };
  const withMapel = (c, d) => MS.has(c) && A.mapelAktif && d.mapel == null ? {...d, mapel:A.mapelAktif} : d;
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const KOLEKSI = ['siswa','kelas','mapel','pengaturan','presensi','nilai','jurnal','tujuan','materi','evaluasi','pelanggaran','sikap','remedial','pengayaan','pesan','jadwal','kalender','wkprofil','wksiswa','wkrchk','kolomnilai'];

  A.db = {
    mode: A.auth.mode,
    /* list(koleksi, {field:nilai}, semuaMapel, segar) – segar=true: abaikan cache & baca ulang dari server */
    async list(c, where = {}, semua, segar){
      const w = Object.entries(where); let rows;
      if (!FB) rows = lget(lk(c), []);
      else rows = await ambil(c, w, segar);
      if (!semua && MS.has(c) && A.mapelAktif) rows = rows.filter(d => !d.mapel || d.mapel === A.mapelAktif);   // data tiap mapel terpisah
      return rows.filter(d => cocok(d, w));
    },
    async add(c, data){
      data = withMapel(c, data);
      if (FB) { const r = await (await col(c)).add(data), d = {id:r.id, ...data}; cAdd(c, [d]); return d; }
      const a = lget(lk(c), []), d = {id:newId(), ...data}; a.push(d); lset(lk(c), a); return d;
    },
    async update(c, id, data){
      if (FB) {
        if (tdkBerubah(c, id, data)) return;                   // tidak ada yang berubah → tidak ada write
        await (await col(c)).doc(id).update(data); cUbah(c, id, data); return;
      }
      lset(lk(c), lget(lk(c), []).map(d => d.id === id ? {...d, ...data} : d));
    },
    async remove(c, id){
      if (FB) { await (await col(c)).doc(id).delete(); cDel(c, [id]); return; }
      lset(lk(c), lget(lk(c), []).filter(d => d.id !== id));
    },
    /* batch(c, {tambah:[doc], ubah:[{id,data}], hapus:[id]}) – satu commit per 400 operasi; ubah yang tidak berubah dilewati */
    async batch(c, {tambah = [], ubah = [], hapus = []} = {}){
      tambah = tambah.map(d => withMapel(c, d)); ubah = ubah.map(u => ({id:u.id, data:withMapel(c, u.data)}));
      if (!FB) {
        let a = lget(lk(c), []); const h = new Set(hapus), um = new Map(ubah.map(u => [u.id, u.data]));
        a = a.filter(d => !h.has(d.id)).map(d => um.has(d.id) ? {...d, ...um.get(d.id)} : d);
        const out = tambah.map(d => ({id:newId(), ...d})); lset(lk(c), a.concat(out)); return out;
      }
      ubah = ubah.filter(u => !tdkBerubah(c, u.id, u.data));
      if (!tambah.length && !ubah.length && !hapus.length) return [];
      const f = await init(), ref = await col(c), out = [];
      const ops = [...tambah.map(d => ({t:'a', ref:ref.doc(), d})), ...ubah.map(u => ({t:'u', ref:ref.doc(u.id), id:u.id, d:u.data})), ...hapus.map(id => ({t:'h', ref:ref.doc(id), id}))];
      for (let i = 0; i < ops.length; i += 400) {
        const s = ops.slice(i, i + 400), b = f.db.batch();
        s.forEach(o => o.t === 'a' ? b.set(o.ref, o.d) : o.t === 'u' ? b.update(o.ref, o.d) : b.delete(o.ref));
        await b.commit();                                      // cache diperbarui per chunk yang sudah berhasil
        const add = s.filter(o => o.t === 'a').map(o => ({id:o.ref.id, ...o.d}));
        if (add.length) { cAdd(c, add); out.push(...add); }
        s.filter(o => o.t === 'u').forEach(o => cUbah(c, o.id, o.d));
        const del = s.filter(o => o.t === 'h').map(o => o.id); if (del.length) cDel(c, del);
      }
      return out;
    },
    async addMany(c, arr){ await this.batch(c, {tambah:arr}); },
    async removeMany(c, ids){ await this.batch(c, {hapus:ids}); },
    /* buang cache (semua koleksi, atau yang disebut) → pembacaan berikutnya mengambil dari server */
    segarkan(cs){ (cs ? [].concat(cs) : [...new Set([...cache.values()].map(e => e.c))]).forEach(hapusC); if (!cs) { profMem = null; try { sessionStorage.removeItem(profKey()); } catch(_) {} } },
    /* bersihkan semua cache (dipanggil saat keluar akun) */
    reset(){
      cache.clear(); profMem = null;
      try { Object.keys(sessionStorage).filter(k => k.startsWith('adm_c_') || k.startsWith('adm_p_')).forEach(k => sessionStorage.removeItem(k)); } catch(_) {}
    },
    KOLEKSI
  };
})();