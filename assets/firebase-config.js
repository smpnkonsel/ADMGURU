/* ADM Guru Pembelajaran – akun & penyimpanan data. Muat SETELAH app.js.
   Isi FIREBASE_CONFIG dengan konfigurasi proyek Firebase Anda (Firebase Console > Project settings > Your apps > Web app).
   Jika diubah menjadi null, aplikasi berjalan dalam MODE PERCOBAAN: akun dan data hanya tersimpan di peramban ini.
   Dengan Firebase: setiap akun punya data sendiri di Firestore pada  users/{uid}/…  (dikunci oleh firestore.rules).

   INGAT SAYA: pilihan disimpan di localStorage 'adm_ingat'.
   - '1' (bawaan): sesi disimpan permanen di perangkat (persistence LOCAL), guru tidak perlu masuk lagi.
   - '0': sesi hanya sampai tab/peramban ditutup (persistence SESSION) dan cache offline Firestore dimatikan. */
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
    async logout(){ if (!FB) return sesiHapus(); await (await init()).auth.signOut(); }
  };

  /* Dipanggil di setiap halaman: pastikan sudah masuk (sesi tersimpan dipulihkan otomatis), lalu muat profil akun. */
  A.boot = async () => {
    const u = await A.auth.current();
    if (!u) { location.replace(A.base + 'login.html'); return false; }
    A.uid = u.uid; A.email = u.email; A.guru.email = u.email;
    await A.profile.load(); return true;
  };

  /* ===== profil akun (nama, mapel, kelas diampu, foto) ===== */
  A.profile = {
    async load(){
      let p;
      if (FB) { const d = await (await init()).db.collection('users').doc(A.uid).get(); p = d.exists ? d.data() : {}; }
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
      if (FB) await (await init()).db.collection('users').doc(A.uid).set(o, {merge:true}); else lset('adm_' + A.uid + '_akun', o);
      await this.load();
    }
  };

  /* ===== data: setiap akun hanya membaca/menulis  users/{uid}/{koleksi} ===== */
  const col = async c => (await init()).db.collection('users').doc(A.uid).collection(c), lk = c => 'adm_' + A.uid + '_' + c;
  const MS = new Set(['presensi','nilai','jurnal','tujuan','materi','evaluasi','remedial','pengayaan','mapel']);   // data per mata pelajaran
  const cache = new Map(), bust = c => cache.delete(c);   // cache koleksi penuh selama halaman terbuka
  const raw = async (c, where) => {
    if (!FB) return lget(lk(c), []);
    let q = await col(c);
    for (const [k,v] of Object.entries(where)) q = q.where(k, '==', v);   // filter dikerjakan server
    return (await q.get()).docs.map(d => ({id:d.id, ...d.data()}));
  };
  const withMapel = (c, d) => MS.has(c) && A.mapelAktif && d.mapel == null ? {...d, mapel:A.mapelAktif} : d;
  A.db = {
    mode: A.auth.mode,
    async list(c, where = {}, semua){
      const w = Object.entries(where); let p;
      if (w.length) p = raw(c, where);
      else { p = cache.get(c); if (!p) { cache.set(c, p = raw(c, {})); p.catch(() => cache.delete(c)); } }
      let rows = await p;
      if (!semua && MS.has(c) && A.mapelAktif) rows = rows.filter(d => !d.mapel || d.mapel === A.mapelAktif);   // data tiap mapel terpisah
      return rows.filter(d => w.every(([k,v]) => d[k] === v));
    },
    async add(c, data){
      data = withMapel(c, data); bust(c);
      if (FB) { const r = await (await col(c)).add(data); return {id:r.id, ...data}; }
      const a = lget(lk(c), []), d = {id:Date.now().toString(36) + Math.random().toString(36).slice(2,6), ...data}; a.push(d); lset(lk(c), a); return d;
    },
    async update(c, id, data){ bust(c); if (FB) return (await col(c)).doc(id).update(data); lset(lk(c), lget(lk(c), []).map(d => d.id === id ? {...d, ...data} : d)); },
    async remove(c, id){ bust(c); if (FB) return (await col(c)).doc(id).delete(); lset(lk(c), lget(lk(c), []).filter(d => d.id !== id)); },
    async addMany(c, arr){
      arr = arr.map(d => withMapel(c, d)); bust(c);
      if (!FB) { const a = lget(lk(c), []); arr.forEach(d => a.push({id:Date.now().toString(36) + Math.random().toString(36).slice(2,6), ...d})); lset(lk(c), a); return; }
      const f = await init(), ref = await col(c);
      for (let i = 0; i < arr.length; i += 400) { const b = f.db.batch(); arr.slice(i, i + 400).forEach(d => b.set(ref.doc(), d)); await b.commit(); }
    },
    async removeMany(c, ids){
      bust(c);
      if (!FB) { const s = new Set(ids); lset(lk(c), lget(lk(c), []).filter(d => !s.has(d.id))); return; }
      const f = await init(), ref = await col(c);
      for (let i = 0; i < ids.length; i += 400) { const b = f.db.batch(); ids.slice(i, i + 400).forEach(id => b.delete(ref.doc(id))); await b.commit(); }
    },
    KOLEKSI: ['siswa','kelas','mapel','pengaturan','presensi','nilai','jurnal','tujuan','materi','evaluasi','pelanggaran','sikap','remedial','pengayaan','pesan','jadwal','kalender','wkprofil','wksiswa','wkrchk','kolomnilai']
  };
})();