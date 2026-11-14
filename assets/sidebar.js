/* ═══════════════════════════════════════════════════════════════
   ADM GURU PEMBELAJARAN
   SIDEBAR + HEADER + MODAL TENTANG APLIKASI

   - Bantuan masuk submenu Pengaturan
   - Tentang Aplikasi berbentuk modal
   - Mode Gelap/Terang
   - Logout
   - Navigasi tanpa reload
   - S.refresh()
   - Pemeriksaan perubahan Input Nilai sebelum navigasi

   Muat SETELAH app.js
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const S = window.ADM;
  let BUILT = [];

  const P = 'pages/';
  const W = P + 'wali-kelas/';

  /* ============================================================
     1. MENU UTAMA
     ============================================================ */

  const MENU = [

    ['Dashboard', '▦', [
      ['Ringkasan', 'dashboard.html'],
      ['Aktivitas Hari Ini', 'dashboard.html#aktif']
    ]],

    ['Data Master', '▤', [
      ['Data Siswa', P + 'data-master/siswa.html'],
      ['Data Kelas', P + 'data-master/kelas.html'],
      ['Data Mapel', P + 'data-master/mapel.html'],
      ['Data Guru', P + 'data-master/guru.html']
    ]],

    ['Presensi', '✓', [
      ['Input Presensi', P + 'presensi/input.html'],
      ['Rekap Presensi', P + 'presensi/rekap.html'],
      ['Riwayat Presensi', P + 'presensi/riwayat.html']
    ]],

    ['Penilaian', '✎', [
      ['Input Nilai', P + 'penilaian/input-nilai.html'],
      ['Rekap Nilai', P + 'penilaian/rekap-nilai.html'],
      ['Nilai Akhir', P + 'penilaian/nilai-akhir.html'],
      ['Analisis Ketuntasan', P + 'penilaian/ketuntasan.html']
    ]],

    ['Pembelajaran', '❖', [
      ['Materi Ajar', P + 'pembelajaran/materi.html'],
      ['Tujuan Pembelajaran', P + 'pembelajaran/tujuan.html'],
      ['Jurnal Mengajar', P + 'pembelajaran/jurnal.html'],
      ['Evaluasi Ketercapaian TP', P + 'pembelajaran/evaluasi.html']
    ]],

    ['Pembinaan Siswa', '♥', [
      ['Pelanggaran', P + 'pembinaan/pelanggaran.html'],
      ['Catatan Sikap', P + 'pembinaan/sikap.html'],
      ['Remedial', P + 'pembinaan/remedial.html'],
      ['Pengayaan', P + 'pembinaan/pengayaan.html']
    ]],

    ['Laporan', '▥', [
      ['Leger Nilai', P + 'laporan/leger.html'],
      ['Rekap Presensi', P + 'laporan/rekap-presensi.html'],
      ['Laporan Siswa', P + 'laporan/laporan-siswa.html'],
      ['Grafik', P + 'laporan/grafik.html']
    ]],

    ['Komunikasi', '✉', [
      ['Notifikasi Orang Tua', P + 'komunikasi/notifikasi.html'],
      ['Surat Otomatis', P + 'komunikasi/surat.html']
    ]],

    ['Wali Murid (RCHK)', '⌂', [
      ['Identitas Siswa', W + 'identitas.html'],
      ['Isi RCHK Bulanan', W + 'isi.html'],
      ['Rekap Bulan', W + 'rekap-bulan.html'],
      ['Rekap Semester', W + 'rekap-semester.html'],
      ['Rekap Tahun', W + 'rekap-tahun.html']
    ]],

    ['Pengaturan', '⚙', [
      ['Profil Guru', P + 'pengaturan/profil.html'],
      ['Profil Sekolah', P + 'pengaturan/sekolah.html'],
      ['Jadwal Mengajar', P + 'pengaturan/jadwal.html'],
      ['Kalender Akademik', P + 'pengaturan/kalender.html'],
      ['Pengaturan Aplikasi', P + 'pengaturan/aplikasi.html'],
      ['Bantuan', P + 'bantuan.html']
    ]]

  ];

  S.MENU = MENU;

  /* ============================================================
     2. DAFTAR HALAMAN TERSEDIA
     ============================================================ */

  BUILT = [
    'pages/bantuan.html',
    ...MENU.flatMap(m =>
      m[2].map(x => x[1].split('#')[0])
    )
  ];

  /* ============================================================
     3. INFORMASI HALAMAN
     ============================================================ */

  S.INFO = {

    'Data Siswa':
      'Kelola data siswa pada kelas yang Anda ampu.',

    'Data Kelas':
      'Daftar kelas dan wali kelas yang menjadi tanggung jawab Anda.',

    'Data Mapel':
      'Mata pelajaran, KKTP, dan bobot nilai.',

    'Data Guru':
      'Profil dan tugas mengajar Anda.',

    'Input Presensi':
      'Catat hadir, izin, sakit, dan alpa per pertemuan.',

    'Rekap Presensi':
      'Rekap kehadiran per siswa, kelas, dan bulan.',

    'Riwayat Presensi':
      'Telusuri presensi pertemuan sebelumnya.',

    'Input Nilai':
      'Masukkan nilai formatif, sumatif, dan ujian.',

    'Rekap Nilai':
      'Lihat semua nilai dalam satu tabel.',

    'Nilai Akhir':
      'Hitung nilai akhir otomatis dengan bobot yang Anda atur.',

    'Analisis Ketuntasan':
      'Lihat ketuntasan tiap tujuan pembelajaran.',

    'Materi Ajar':
      'Susun BAB dan subbab per kelas & semester (dasar untuk TP dan jurnal).',

    'Tujuan Pembelajaran':
      'Tulis tujuan pembelajaran (TP) untuk tiap subbab; kode TP otomatis.',

    'Jurnal Mengajar':
      'Catat materi, TP, kegiatan, dan penilaian setiap pertemuan.',

    'Evaluasi Ketercapaian TP':
      'Isi nilai tiap TP; status dan tindak lanjut (remedial/pengayaan) terisi otomatis dari KKTP.',

    'Pelanggaran':
      'Catat pelanggaran dan poin siswa.',

    'Catatan Sikap':
      'Tulis catatan sikap dan perkembangan karakter.',

    'Remedial':
      'Atur jadwal dan hasil remedial.',

    'Pengayaan':
      'Siapkan tugas pengayaan untuk siswa yang sudah tuntas.',

    'Leger Nilai':
      'Cetak leger nilai per kelas.',

    'Laporan Siswa':
      'Buat laporan perkembangan per siswa.',

    'Grafik':
      'Grafik lengkap kehadiran dan nilai.',

    'Notifikasi Orang Tua':
      'Kirim pemberitahuan ke orang tua.',

    'Surat Otomatis':
      'Buat surat dari templat.',

    'Profil Guru':
      'Ubah nama, mapel, kelas, dan foto profil.',

    'Jadwal Mengajar':
      'Atur jadwal mengajar mingguan.',

    'Kalender Akademik':
      'Tandai hari efektif, libur, dan ujian.',

    'Pengaturan Aplikasi':
      'KKTP, bobot nilai, dan batas peringatan.',

    'Profil Sekolah':
      'Identitas sekolah dan kepala sekolah.',

    'Identitas Siswa':
      'Siswa wali Anda dari berbagai kelas (otomatis dari Data Siswa).',

    'Isi RCHK Bulanan':
      'Isi jumlah hari 7 Kebiasaan Anak Indonesia Hebat tiap siswa per bulan.',

    'Rekap Bulan':
      'Rekap RCHK satu bulan.',

    'Rekap Semester':
      'Rekap RCHK satu semester.',

    'Rekap Tahun':
      'Rekap RCHK satu tahun ajaran.',

    'Bantuan':
      'Panduan penggunaan ADM Guru Pembelajaran.'

  };

  const e = S.esc;

  /* ============================================================
     4. FUNGSI URL
     ============================================================ */

  const abs = u => new URL(u, location.href).href;

  const href = (path, m, s) => abs(
    BUILT.includes(path.split('#')[0])
      ? S.base + path
      : S.base + 'segera.html?m=' +
        encodeURIComponent(m) +
        '&s=' +
        encodeURIComponent(s)
  );

  /* ============================================================
     5. PROFIL GURU SIDEBAR
     ============================================================ */

  const profHTML = g => {

    const mp = g.mapelList.map(m => m.nama).join(', ');

    return `
      <a class="prof"
         href="${href(P + 'pengaturan/profil.html', 'Pengaturan', 'Profil Guru')}"
         title="Ubah profil &amp; foto">

        ${S.avatar('pf')}

        <b>${e(g.nama || 'Guru')}</b>

        <small>${e(mp ? 'Guru ' + mp : g.email)}</small>

      </a>
    `;
  };

  /* ============================================================
     6. HEADER
     ============================================================ */

  const headHTML = ({ menu, sub, title, desc }) => {

    const g = S.guru;
    const mp = g.mapelList.map(m => m.nama).join(', ');

    return `
      <header class="top">

        <button id="burger"
                aria-label="Buka menu"
                onclick="document.body.classList.toggle('nav')">
          ☰
        </button>

        <div class="ttl">
          <h1 id="pgT">${e(title || sub || menu)}</h1>
          <small id="pgD">${e(desc || menu || '')}</small>
        </div>

        <div class="who">
          <div>
            <b>${e(g.nama || 'Guru')}</b>
            <small>${e(mp ? 'Guru ' + mp : g.email)}</small>
          </div>

          ${S.avatar('av')}
        </div>

      </header>
    `;
  };

  /* ============================================================
     7. MODAL TENTANG APLIKASI
     ============================================================ */

  function buatModalTentang() {

    // Jangan membuat modal berulang kali.
    if (document.getElementById('modalTentang')) return;

    document.body.insertAdjacentHTML('beforeend', `

      <div id="modalTentang"
           class="modal-tentang"
           role="dialog"
           aria-modal="true"
           aria-labelledby="judulTentang">

        <div class="modal-tentang-box">

          <!-- HEADER MODAL -->

          <div class="mt-head">

            <button
              type="button"
              id="tutupTentang"
              class="tutup-modal"
              aria-label="Tutup">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                   stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>

            <div class="mt-brand">

              <img
                src="${S.base}assets/template/logo.png"
                alt="Logo ADM Guru"
                class="logo-tentang"
                onerror="this.style.display='none'">

              <div class="mt-garis-v"></div>

              <div class="mt-judul">
                <h2 id="judulTentang">ADM <span>GURU</span></h2>
                <h3>Sistem Administrasi dan Guru</h3>
              </div>

            </div>

            <p>
              Aplikasi digital terintegrasi untuk membantu
              pengelolaan administrasi sekolah dan kegiatan
              pembelajaran guru secara efektif dan terorganisasi.
            </p>

          </div>

          <!-- ISI MODAL -->

          <div class="modal-tentang-body">

            <div class="mt-sec">
              <span class="mt-pill">
                <svg viewBox="0 0 24 24" width="26" height="26">
                  <circle cx="12" cy="12" r="11" fill="#fff"/>
                  <path d="M12 11v6" stroke="#0b57d0" stroke-width="2.6" stroke-linecap="round"/>
                  <circle cx="12" cy="7.2" r="1.6" fill="#0b57d0"/>
                </svg>
                Informasi Aplikasi
              </span>
            </div>

            <div class="mt-row">
              <span class="mt-ic ic-biru">
                <svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 5l-4 14"/></svg>
              </span>
              <span class="mt-label">Versi</span>
              <b class="mt-val val-biru">1.0.0</b>
            </div>

            <div class="mt-row">
              <span class="mt-ic ic-ungu">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3.2 3.5 14.8 0 18M12 3c-3.5 3.2-3.5 14.8 0 18"/></svg>
              </span>
              <span class="mt-label">Platform</span>
              <b class="mt-val val-ungu">Web &amp; App Application</b>
            </div>

            <div class="mt-row">
              <span class="mt-ic ic-hijau">
                <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>
              </span>
              <span class="mt-label">Tahun</span>
              <b class="mt-val val-hijau">2026</b>
            </div>

            <div class="mt-sec" style="margin-top:22px">
              <span class="mt-pill">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
                     stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/>
                  <path d="M3 19c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5M15 14c3 0 6 1.5 6 5"/>
                </svg>
                Dikembangkan Oleh
              </span>
            </div>

            <div class="developer-tentang">

              <img
                src="${S.base}assets/template/GR001.jpg"
                alt="Foto pengembang"
                class="foto-dev"
                onerror="this.style.display='none'">

              <div class="mt-garis-v mt-garis-dev"></div>

              <div class="dev-info">

                <strong>Komang Winastiyana, S.Pd., Gr., M.Pd.</strong>

                <p>
                  <svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
                  SMP Negeri 20 Konawe Selatan
                </p>

                <p>
                  <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
                  +628228821165
                </p>

              </div>

            </div>

          </div>

          <!-- FOOTER MODAL -->

          <div class="modal-tentang-footer">
            <span>© 2026 KW. All Rights Reserved.</span>
          </div>

        </div>

      </div>

    `);

    const modal = document.getElementById('modalTentang');
    const tombolBuka = document.getElementById('aboutApp');
    const tombolTutup = document.getElementById('tutupTentang');

    // Membuka modal.
    tombolBuka.onclick = () => {

      // Tutup sidebar mobile supaya tidak menumpuk di belakang modal.
      document.body.classList.remove('nav');

      modal.classList.add('show');
      document.body.classList.add('modal-open');

      tombolTutup.focus();

    };

    // Menutup modal.
    const tutupModal = () => {

      modal.classList.remove('show');
      document.body.classList.remove('modal-open');

      tombolBuka.focus();

    };

    tombolTutup.onclick = tutupModal;

    // Klik area luar modal.
    modal.addEventListener('click', ev => {
      if (ev.target === modal) tutupModal();
    });

    // Tombol Escape (satu pendengar saja).
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && modal.classList.contains('show')) {
        tutupModal();
      }
    });

  }

  /* ============================================================
     8. MENU AKTIF
     ============================================================ */

  const setActive = (menu, sub) => {

    document.querySelectorAll('#side .grp').forEach(gr => {

      const on = gr.dataset.m === menu;

      gr.classList.toggle('cur', on);

      if (on) gr.classList.add('open');

      const b = gr.querySelector('button');

      if (b) {
        b.setAttribute(
          'aria-expanded',
          gr.classList.contains('open')
        );
      }

    });

    document.querySelectorAll('#side .sub a').forEach(a => {

      a.classList.toggle(
        'on',
        a.dataset.m === menu &&
        a.dataset.s === sub
      );

    });

  };

  /* ============================================================
     9. MOUNT SIDEBAR + HEADER
     ============================================================ */

  let mounted = false;

  S.mount = function (o) {

    const { menu, sub } = o;
    const g = S.guru;

    mounted = true;

    let app = document.getElementById('app');

    if (!app) {

      // PEMUATAN PERTAMA: BANGUN SHELL.

      document.body.insertAdjacentHTML('afterbegin', `

        <div id="app">

          <aside id="side">

            <div class="brand">
              <i>▣</i>
              <span>ADM Guru<br>Pembelajaran</span>
            </div>

            ${profHTML(g)}

            <nav aria-label="Menu utama">

              ${MENU.map(([m, ic, subs]) => `

                <div class="grp" data-m="${e(m)}">

                  <button
                    aria-expanded="false"
                    onclick="
                      this.parentNode.classList.toggle('open');
                      this.setAttribute(
                        'aria-expanded',
                        this.parentNode.classList.contains('open')
                      )
                    ">

                    <span class="ic">${ic}</span>

                    ${m}

                    <span class="ar">▶</span>

                  </button>

                  <div class="sub">

                    ${subs.map(([n, p]) => `

                      <a
                        data-m="${e(m)}"
                        data-s="${e(n)}"
                        href="${href(p, m, n)}">

                        ${n}

                      </a>

                    `).join('')}

                  </div>

                </div>

              `).join('')}

            </nav>

            <!-- FOOTER SIDEBAR -->

            <div class="foot">

              <button
                type="button"
                id="aboutApp"
                class="fb">

                ℹ Tentang Aplikasi

              </button>

              <button id="dm">

                ${S.theme() === 'dark'
                  ? '☀ Mode Terang'
                  : '☾ Mode Gelap'}

              </button>

              <button onclick="ADM.logout()">
                ⎋ Logout
              </button>

            </div>

          </aside>

          <div class="scrim"
               onclick="document.body.classList.remove('nav')">
          </div>

          <main>

            ${headHTML(o)}

            <div class="content" id="view"></div>

          </main>

        </div>

      `);

      // MODE GELAP / TERANG.

      document.getElementById('dm').onclick = function () {

        const dark = S.theme() === 'dark';

        S.setTheme(dark ? '' : 'dark');

        this.textContent = dark
          ? '☾ Mode Gelap'
          : '☀ Mode Terang';

        if (window.onThemeChange) {
          window.onThemeChange();
        }

      };

    } else {

      // HALAMAN SUDAH ADA: SIDEBAR TETAP.

      app.querySelector('header.top').outerHTML = headHTML(o);

      app.querySelector('a.prof').outerHTML = profHTML(g);

      const old = app.querySelector('#view');

      old.replaceWith(old.cloneNode(false));

    }

    // Pastikan modal tersedia.
    buatModalTentang();

    setActive(menu, sub);

    return document.getElementById('view');

  };

  /* ============================================================
     10. NAVIGASI TANPA RELOAD
     ============================================================ */

  let token = 0;
  let curPath = location.pathname;

  const sameOrigin = u => u.origin === location.origin;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const loadScript = src => new Promise((ok, fail) => {

    const s = document.createElement('script');

    s.src = src;
    s.async = false;

    s.onload = ok;
    s.onerror = fail;

    document.head.appendChild(s);

  });

  const hasScript = src =>
    [...document.scripts].some(s => s.src === src);

  async function go(url, push) {

    const t = ++token;

    try {

      const res = await fetch(url, {
        credentials: 'same-origin'
      });

      if (!res.ok) throw new Error(res.status);

      const finalUrl = res.url || url;

      const doc = new DOMParser().parseFromString(
        await res.text(),
        'text/html'
      );

      if (t !== token) return;

      // URL diperbarui sebelum script halaman berjalan.

      const shown = new URL(finalUrl);

      shown.hash = new URL(url, location.href).hash;

      if (push) {
        history.pushState(null, '', shown.href);
      }

      curPath = shown.pathname;

      // Bersihkan sisa halaman sebelumnya.

      document.querySelectorAll('[data-pg]').forEach(n => n.remove());

      window.onThemeChange = null;
      window.onload = null;

      mounted = false;

      const before = new Set(document.body.children);

      // STYLE DAN LINK KHUSUS HALAMAN.

      doc.head.querySelectorAll(
        'style, link[rel="stylesheet"]'
      ).forEach(n => {

        if (n.tagName === 'LINK') {

          const h = new URL(
            n.getAttribute('href'),
            finalUrl
          ).href;

          if ([...document.styleSheets].some(s => s.href === h)) {
            return;
          }

          const l = document.createElement('link');

          l.rel = 'stylesheet';
          l.href = h;
          l.dataset.pg = 1;

          document.head.appendChild(l);

        } else {

          const st = document.createElement('style');

          st.textContent = n.textContent;
          st.dataset.pg = 1;

          document.head.appendChild(st);

        }

      });

      // MARKUP STATIS BODY.

      [...doc.body.children]
        .filter(n => n.tagName !== 'SCRIPT')
        .forEach(n => {

          document.body.appendChild(
            document.importNode(n, true)
          );

        });

      // JALANKAN SCRIPT HALAMAN.

      const dAdd = document.addEventListener;
      const wAdd = window.addEventListener;

      document.addEventListener = function (type, fn, opt) {

        if (type === 'DOMContentLoaded') {

          return void setTimeout(
            () => fn.call(document, new Event(type))
          );

        }

        return dAdd.call(this, type, fn, opt);

      };

      window.addEventListener = function (type, fn, opt) {

        if (type === 'load') {

          return void setTimeout(
            () => fn.call(window, new Event(type))
          );

        }

        return wAdd.call(this, type, fn, opt);

      };

      try {

        for (const s of doc.querySelectorAll('script')) {

          if (
            s.type &&
            !/javascript|module/i.test(s.type)
          ) continue;

          if (s.getAttribute('src')) {

            const src = new URL(
              s.getAttribute('src'),
              finalUrl
            ).href;

            if (!hasScript(src)) {
              await loadScript(src);
            }

          } else {

            (0, eval)(s.textContent);

          }

        }

      } finally {

        document.addEventListener = dAdd;
        window.addEventListener = wAdd;

      }

      if (typeof window.onload === 'function') {

        setTimeout(
          () => window.onload(new Event('load'))
        );

      }

      // Tunggu halaman memanggil S.mount.

      for (
        let i = 0;
        i < 60 && !mounted && t === token;
        i++
      ) {
        await sleep(50);
      }

      if (t !== token) return;

      if (!mounted) {
        throw new Error('halaman bukan halaman ADM');
      }

      // Tandai elemen halaman baru.

      document.body.querySelectorAll(':scope > *').forEach(n => {

        if (
          !before.has(n) &&
          n.tagName !== 'SCRIPT'
        ) {
          n.dataset.pg = 1;
        }

      });

      if (doc.title) {
        document.title = doc.title;
      }

      document.body.classList.remove('nav');

      const main = document.querySelector('#app main');

      if (main) main.scrollTop = 0;

      window.scrollTo(0, 0);

    } catch (err) {

      console.error('Navigasi ADM gagal:', err);

      if (t === token) {
        location.replace(url);
      }

    }

  }

  /* ============================================================
     11. REFRESH HALAMAN AKTIF
     ============================================================ */

  S.refresh = () => go(location.href, false);

  /* ============================================================
     12. KLIK MENU SIDEBAR
     ============================================================ */

  document.addEventListener('click', async ev => {

    if (
      ev.defaultPrevented ||
      ev.button !== 0 ||
      ev.metaKey ||
      ev.ctrlKey ||
      ev.shiftKey ||
      ev.altKey
    ) return;

    const a = ev.target.closest &&
      ev.target.closest('#side a[href]');

    if (!a || a.target || a.hasAttribute('download')) {
      return;
    }

    const u = new URL(a.href, location.href);

    if (!sameOrigin(u)) return;

    ev.preventDefault();

    // Pemeriksaan perubahan belum disimpan.

    if (typeof S.beforeNavigate === 'function') {

      const boleh = await S.beforeNavigate();

      if (!boleh) return;

    }

    if (
      u.pathname === curPath &&
      u.search === location.search
    ) {

      if (u.hash) {
        location.hash = u.hash;
      }

      document.body.classList.remove('nav');

      return;

    }

    S.beforeNavigate = null;

    go(u.href, true);

  });

  /* ============================================================
     13. TOMBOL BACK / FORWARD
     ============================================================ */

  window.addEventListener('popstate', () => {

    if (
      new URL(location.href).pathname !== curPath
    ) {
      go(location.href, false);
    }

  });

  /* ============================================================
     14. CSS FOOTER + MODAL TENTANG APLIKASI
     ============================================================ */

  const st = document.createElement('style');

  st.textContent = `

    /* FOOTER SIDEBAR */

    .foot .fb {
      display: flex;
      width: 100%;
      gap: 10px;
      align-items: center;
      color: #d5e6e3;
      padding: 7px 10px;
      border: 0;
      border-radius: 8px;
      font-size: 13px;
      text-decoration: none;
      text-align: left;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
    }

    .foot .fb:hover {
      background: var(--side2);
    }

    /* MODAL TENTANG APLIKASI */

    body.modal-open {
      overflow: hidden;
    }

    .modal-tentang {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(15,23,42,.60);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      backdrop-filter: blur(5px);
    }

    .modal-tentang.show {
      display: flex;
    }

    .modal-tentang-box {
      width: 100%;
      max-width: 520px;
      max-height: 92vh;
      overflow-y: auto;
      background: #f7faff;
      color: #0f2559;
      border: 2px solid #cfe0ff;
      border-radius: 26px;
      position: relative;
      box-shadow: 0 25px 60px rgba(0,0,0,.35);
      animation: modalMasuk .22s ease;
    }

    @keyframes modalMasuk {
      from {
        opacity: 0;
        transform: translateY(15px) scale(.97);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* HEADER */

    .mt-head {
      position: relative;
      overflow: hidden;
      color: #fff;
      text-align: center;
      padding: 30px 22px 62px;
      background:
        radial-gradient(120% 90% at 100% 0%, #1550c8 0%, transparent 60%),
        linear-gradient(135deg, #061c5c 0%, #0a2f8f 60%, #0b3fae 100%);
    }

    .mt-head::before {
      content: '';
      position: absolute;
      left: -10%;
      right: -10%;
      bottom: 6px;
      height: 44px;
      background: #1565e8;
      border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    }

    .mt-head::after {
      content: '';
      position: absolute;
      left: -10%;
      right: -10%;
      bottom: -1px;
      height: 42px;
      background: #f7faff;
      border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    }

    .tutup-modal {
      position: absolute;
      right: 16px;
      top: 16px;
      z-index: 3;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border: 2px solid #2f86ff;
      border-radius: 50%;
      background: rgba(6,28,92,.55);
      color: #fff;
      cursor: pointer;
      padding: 0;
    }

    .tutup-modal:hover {
      background: rgba(47,134,255,.35);
    }

    .mt-brand {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding-right: 34px;
      margin-bottom: 16px;
    }

    .logo-tentang {
      width: 96px;
      height: 96px;
      object-fit: contain;
      flex: none;
      padding: 8px;
      background: #fff;
      border: 3px solid #ffd21f;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0,0,0,.3);
    }

    .mt-garis-v {
      width: 2px;
      align-self: stretch;
      min-height: 64px;
      background: rgba(255,255,255,.55);
      border-radius: 2px;
      flex: none;
    }

    .mt-judul {
      text-align: left;
    }

    .mt-judul h2 {
      margin: 0;
      font-size: clamp(28px, 8vw, 42px);
      line-height: 1.05;
      font-weight: 800;
      color: #fff;
    }

    .mt-judul h2 span {
      color: #ffd21f;
    }

    .mt-judul h3 {
      margin: 6px 0 0;
      font-size: clamp(13px, 3.6vw, 17px);
      font-weight: 700;
      color: #fff;
    }

    .mt-head p {
      position: relative;
      z-index: 2;
      margin: 0 auto;
      max-width: 400px;
      font-size: 13px;
      line-height: 1.7;
      color: #eaf1ff;
    }

    /* ISI */

    .modal-tentang-body {
      padding: 6px 24px 22px;
    }

    .mt-sec {
      display: flex;
      align-items: center;
      gap: 0;
      margin: 8px 0 8px;
    }

    .mt-sec::after {
      content: '';
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, #6f9cf0, #cfe0ff);
    }

    .mt-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 9px 30px 9px 12px;
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      background: linear-gradient(90deg, #0a3fae, #1565e8);
      border-radius: 18px 28px 28px 18px;
      clip-path: polygon(0 0, 100% 0, 92% 100%, 0 100%);
    }

    .mt-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 4px;
      border-bottom: 1px solid #dbe6fa;
    }

    .mt-ic {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex: none;
    }

    .mt-ic svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: #fff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .ic-biru  { background: #1565e8; }
    .ic-ungu  { background: #6d3fc7; }
    .ic-hijau { background: #1fa24a; }

    .mt-label {
      flex: 1;
      font-size: 15px;
      color: #0f2559;
    }

    .mt-val {
      font-size: 15px;
      padding: 7px 18px;
      border-radius: 14px;
    }

    .val-biru  { background: #dbe7ff; color: #0a2a9c; }
    .val-ungu  { background: #e4dcff; color: #3b1d8f; }
    .val-hijau { background: #d6f5e0; color: #0d5a28; }

    /* PENGEMBANG */

    .developer-tentang {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #eaf1ff;
      border: 1.5px solid #c9daf8;
      border-radius: 18px;
    }

    .foto-dev {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      object-fit: cover;
      flex: none;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(10,42,120,.25);
    }

    .mt-garis-dev {
      background: #b9cdf3;
      min-height: 80px;
    }

    .dev-info {
      min-width: 0;
    }

    .developer-tentang strong {
      display: block;
      font-size: 16px;
      line-height: 1.45;
      color: #0a1f5c;
    }

    .developer-tentang p {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 0;
      font-size: 14px;
      color: #1d3470;
    }

    .developer-tentang p svg {
      width: 18px;
      height: 18px;
      flex: none;
      fill: none;
      stroke: #1565e8;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* FOOTER */

    .modal-tentang-footer {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 22px;
      background: #e6eefc;
      border-radius: 0 0 24px 24px;
      font-size: 13px;
      color: #0f2559;
    }

    .modal-tentang-footer::before,
    .modal-tentang-footer::after {
      content: '';
      flex: 1;
      height: 1.5px;
      background: #aac0ee;
    }

    @media (max-width: 500px) {

      .mt-head {
        padding: 26px 16px 58px;
      }

      .mt-brand {
        gap: 12px;
        padding-right: 28px;
      }

      .logo-tentang {
        width: 70px;
        height: 70px;
        padding: 6px;
        border-width: 2px;
      }

      .mt-garis-v {
        min-height: 52px;
      }

      .modal-tentang-body {
        padding: 6px 16px 20px;
      }

      .mt-pill {
        font-size: 14px;
      }

      .mt-val {
        padding: 6px 12px;
        font-size: 14px;
      }

      .foto-dev {
        width: 68px;
        height: 68px;
      }

      .developer-tentang {
        gap: 12px;
        padding: 12px;
      }

      .developer-tentang strong {
        font-size: 14px;
      }

      .developer-tentang p {
        font-size: 13px;
      }

    }

  `;

  document.head.appendChild(st);

})();