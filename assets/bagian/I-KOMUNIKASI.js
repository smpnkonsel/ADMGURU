/* ═══════════════════════════════════════════════════════════════════════════
   [I] KOMUNIKASI   (file: bagian/I-KOMUNIKASI.js)
   [I1] Notifikasi Orang Tua (templat pesan WhatsApp ada di objek T)
   [I2] Surat Otomatis (isi surat ada di objek J, pesan pengantar di objek PENGANTAR)

   Kop surat:
   - Logo kiri dan kanan dari Profil Sekolah
   - Identitas sekolah dari U.wkp()
   - Dua garis horizontal
   - Nomor surat diinput manual
   - Nama kepala sekolah dan NIP otomatis dari Profil Sekolah

   Pengirim surat:
   - Wali siswa; nama dan NIP otomatis dari Profil Guru (G.nama, G.nip)
   - Kepala sekolah tetap tercantum sebagai "Mengetahui"
   ═══════════════════════════════════════════════════════════════════════════ */

(function(){

const S=window.ADM,U=S.u,
{e,G,K,$,today,fmt,opt,kSel,nm,byK,byT,n1,tbl,wa,app,tb,finals}=U;


/* Nomor HP valid untuk WhatsApp: hanya angka, 0xxx diubah ke 62xxx,
   panjang 10-15 digit. Jika tidak valid, hasilnya '' (tombol dinonaktifkan). */
function nomorWA(hp){

  let d=String(hp||'').replace(/\D/g,'');

  if(d.startsWith('0'))d='62'+d.slice(1);
  else if(d.startsWith('8'))d='62'+d;

  return /^62\d{8,13}$/.test(d)?d:'';

}


/* ═══════════════════════════════════════════════════════════════════════════
   [I1] MENU: Komunikasi › Notifikasi Orang Tua
   ═══════════════════════════════════════════════════════════════════════════ */

async function notif(v){

  const [sis,pr,f,log]=await Promise.all([
    S.db.list('siswa'),
    S.db.list('presensi'),
    finals(),
    S.db.list('pesan')
  ]);

  const T={
    Kehadiran:
      'Yth. Orang Tua/Wali {nama} (kelas {kelas}). Kehadiran putra/putri Bapak/Ibu pada mapel {mapel} saat ini {hadir}%. Mohon perhatiannya. Terima kasih. – {guru}',

    Nilai:
      'Yth. Orang Tua/Wali {nama} (kelas {kelas}). Nilai akhir {mapel} saat ini {nilai} (KKTP {kktp}). Mohon dampingi belajar di rumah. Terima kasih. – {guru}',

    Panggilan:
      'Yth. Orang Tua/Wali {nama} (kelas {kelas}). Mohon berkenan hadir ke sekolah untuk berdiskusi tentang perkembangan putra/putri Bapak/Ibu. Terima kasih. – {guru}'
  };

  v.innerHTML=
    tb(
      `${kSel('kl',K[0])}
       <select id="tp" aria-label="Templat">
         ${opt(Object.keys(T))}
       </select>`
    )+
    `<div class="box" style="margin-bottom:14px">
       <label for="ms" style="margin-top:0">Pesan (bisa diubah)</label>
       <textarea id="ms" rows="4"></textarea>
     </div>
     <div class="box" id="ls"></div>
     <h2>Riwayat pesan</h2>
     <div class="box">`+
       tbl(
         ['Tanggal','Siswa','Kelas','Jenis'],
         log.sort(byT).map(x=>[
           fmt(x.tanggal),
           e(x.nama),
           e(x.kelas),
           e(x.jenis)
         ]),
         'Belum ada pesan terkirim.'
       )+
     `</div>`;

  const draw=()=>{
    const k=$('kl').value;
    const t=$('ms').value;

    $('ls').innerHTML=tbl(
      ['Nama','No. HP','Kirim'],

      sis
        .filter(s=>s.kelas===k)
        .sort(nm)
        .map(s=>{

          const m=pr.filter(x=>x.siswaId===s.id);
          const r=f.rows.find(x=>x.s.id===s.id);

          const txt=t
            .replace('{nama}',s.nama)
            .replace('{kelas}',s.kelas)
            .replace('{mapel}',G.mapel)
            .replace(
              '{hadir}',
              m.length
                ?Math.round(
                    m.filter(x=>x.status==='H').length/m.length*100
                  )
                :'-'
            )
            .replace('{nilai}',n1(r&&r.akhir))
            .replace('{kktp}',r?r.kktp:f.c.kktp)
            .replace('{guru}',G.nama);

          return [
            e(s.nama),
            e(s.hp||'-'),
            nomorWA(s.hp)
              ?`<a href="https://wa.me/${nomorWA(s.hp)}?text=${encodeURIComponent(txt)}"
                   target="_blank"
                   rel="noopener"
                   data-s="${s.id}">
                   Kirim WhatsApp
                 </a>`
              :'Tidak ada nomor'
          ];

        }),

      'Belum ada siswa di kelas ini.'
    );
  };

  const tp=()=>{
    $('ms').value=T[$('tp').value];
    draw();
  };

  $('kl').onchange=draw;
  $('tp').onchange=tp;
  $('ms').oninput=draw;

  tp();

  $('ls').onclick=async ev=>{

    const a=ev.target.closest('a[data-s]');
    if(!a)return;

    const s=sis.find(x=>x.id===a.dataset.s);
    if(!s)return;

    await S.db.add('pesan',{
      tanggal:today(),
      siswaId:s.id,
      nama:s.nama,
      kelas:s.kelas,
      jenis:$('tp').value
    });

  };

}


/* ═══════════════════════════════════════════════════════════════════════════
   [I2] MENU: Komunikasi › Surat Otomatis
   ═══════════════════════════════════════════════════════════════════════════ */


/* Format tanggal Indonesia */
function tanggalIndonesia(t){

  if(!t)return '';

  const d=new Date(t+'T00:00:00');

  if(isNaN(d.getTime()))return '';

  return d.toLocaleDateString('id-ID',{
    day:'numeric',
    month:'long',
    year:'numeric'
  });

}


/* Kop surat berdasarkan Profil Sekolah */
function buatKopSurat(p){

  p=p||{};

  const logoKiri=p.logoKiri
    ?`<img src="${e(p.logoKiri)}" alt="Logo kiri">`
    :'';

  const logoKanan=p.logoKanan
    ?`<img src="${e(p.logoKanan)}" alt="Logo kanan">`
    :'';

  return `
    <div class="kop-surat">

      <div class="kop-logo kiri">
        ${logoKiri}
      </div>

      <div class="kop-identitas">

        ${p.pemda
          ?`<div class="kop-pemda">${e(p.pemda)}</div>`
          :''}

        ${p.dinas
          ?`<div class="kop-dinas">${e(p.dinas)}</div>`
          :''}

        ${p.sekolah
          ?`<div class="kop-sekolah">${e(p.sekolah)}</div>`
          :'<div class="kop-sekolah">NAMA SEKOLAH BELUM DIISI</div>'}

        ${p.alamat
          ?`<div class="kop-alamat">${e(p.alamat)}</div>`
          :''}

        ${p.npsn
          ?`<div class="kop-npsn">NPSN: ${e(p.npsn)}</div>`
          :''}

      </div>

      <div class="kop-logo kanan">
        ${logoKanan}
      </div>

    </div>

    <div class="kop-garis">
      <div></div>
      <div></div>
    </div>
  `;

}


/* CSS khusus dokumen surat */
const CSS_SURAT=`

  @page{
    size:A4 portrait;
    margin:20mm 25mm 20mm 25mm;
  }

  *{
    box-sizing:border-box;
  }

  body{
    margin:0;
    padding:0;
    color:#000;
    background:#fff;
    font-family:"Times New Roman",serif;
    font-size:12pt;
    line-height:1.6;
  }

  .surat{
    width:100%;
    background:#fff;
    color:#000;
  }

  /* KOP SURAT */

  .kop-surat{
    display:grid;
    grid-template-columns:85px minmax(0,1fr) 85px;
    align-items:center;
    gap:8px;
    width:100%;
    min-height:100px;
    color:#000;
  }

  .kop-logo{
    display:flex;
    align-items:center;
    justify-content:center;
    width:85px;
    height:90px;
  }

  .kop-logo img{
    display:block;
    max-width:78px;
    max-height:85px;
    width:auto;
    height:auto;
    object-fit:contain;
  }

  .kop-identitas{
    text-align:center;
    line-height:1.25;
    min-width:0;
  }

  .kop-pemda{
    font-size:12pt;
    font-weight:bold;
    text-transform:uppercase;
  }

  .kop-dinas{
    font-size:12pt;
    font-weight:bold;
    text-transform:uppercase;
  }

  .kop-sekolah{
    font-size:17pt;
    font-weight:bold;
    text-transform:uppercase;
    margin:3px 0;
  }

  .kop-alamat{
    font-size:9.5pt;
    line-height:1.3;
  }

  .kop-npsn{
    font-size:9pt;
    margin-top:2px;
  }

  /* DUA GARIS KOP */

  .kop-garis{
    width:100%;
    margin-top:7px;
    margin-bottom:25px;
    padding-bottom:3px;
    border-bottom:1px solid #000;
  }

  .kop-garis div:first-child{
    border-top:2px solid #000;
    margin-bottom:2px;
  }

  .kop-garis div:last-child{
    border-top:1px solid #000;
  }

  /* ISI SURAT */

  .nomor-surat{
    margin-bottom:18px;
    line-height:1.5;
  }

  .tanggal-surat{
    text-align:right;
    margin-bottom:20px;
  }

  .tujuan-surat{
    margin-bottom:22px;
    line-height:1.5;
  }

  .isi-surat{
    text-align:justify;
    line-height:1.7;
  }

  .isi-surat p{
    margin:0 0 12px;
  }

  .isi-surat table td{
    vertical-align:top;
  }

  /* TANDA TANGAN: Kepala Sekolah (kiri) dan Wali Siswa (kanan) */

  .ttd-surat{
    width:100%;
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    column-gap:24px;
    align-items:start;
    margin-top:35px;
    page-break-inside:avoid;
    line-height:1.5;
  }

  .ttd-label{
    min-height:3em;
  }

  .ttd-nama{
    margin-top:65px;
    font-weight:bold;
    text-decoration:underline;
    overflow-wrap:anywhere;
  }

  .ttd-nip{
    margin-top:2px;
  }

  @media screen{
    body{
      background:#f0f2f5;
      padding:20px;
    }

    .surat{
      max-width:210mm;
      min-height:297mm;
      margin:auto;
      padding:20mm 25mm;
      box-shadow:0 2px 15px rgba(0,0,0,.12);
    }
  }

  @media print{
    body{
      padding:0;
      background:#fff;
    }

    .surat{
      width:100%;
      min-height:auto;
      margin:0;
      padding:0;
      box-shadow:none;
    }

    .kop-surat,
    .kop-garis,
    .ttd-surat{
      break-inside:avoid;
    }
  }

  @media screen and (max-width:600px){

    .kop-surat{
      grid-template-columns:55px minmax(0,1fr) 55px;
      gap:4px;
      min-height:75px;
    }

    .kop-logo{
      width:55px;
      height:65px;
    }

    .kop-logo img{
      max-width:52px;
      max-height:60px;
    }

    .kop-pemda,
    .kop-dinas{
      font-size:8pt;
    }

    .kop-sekolah{
      font-size:11pt;
    }

    .kop-alamat,
    .kop-npsn{
      font-size:7pt;
    }

  }

`;


/* Membuat isi surat berdasarkan jenis surat */
async function surat(v){

  let [sis,ap,f,profilSekolah]=await Promise.all([

    S.db.list('siswa'),
    app(),
    finals(),
    U.wkp()

  ]);

  sis=U.diampu(sis).sort(byK);

  const p=profilSekolah||{};


  /* ─────────────────────────────────────────────────────────────────────
     TEMPLAT ISI SURAT (bahasa formal)
     ───────────────────────────────────────────────────────────────────── */

  const J={

    'Panggilan orang tua':s=>`

      <p>Dengan hormat,</p>

      <p>
        Sehubungan dengan perkembangan belajar peserta didik di bawah ini:
      </p>

      <table style="margin:0 0 12px 20px;border-collapse:collapse">
        <tr><td style="padding-right:12px">Nama</td><td>: <b>${e(s.nama)}</b></td></tr>
        <tr><td style="padding-right:12px">Kelas</td><td>: ${e(s.kelas)}</td></tr>
        <tr><td style="padding-right:12px">Mata Pelajaran</td><td>: ${e(G.mapel)}</td></tr>
      </table>

      <p>
        kami mengharapkan kehadiran Bapak/Ibu orang tua/wali murid di sekolah
        untuk berdiskusi mengenai perkembangan belajar putra/putri Bapak/Ibu.
        Waktu pertemuan dapat disesuaikan dengan kesediaan Bapak/Ibu dan
        dikoordinasikan terlebih dahulu dengan wali siswa.
      </p>

      <p>
        Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama
        Bapak/Ibu, kami ucapkan terima kasih.
      </p>

    `,


    'Pemberitahuan nilai':s=>{

      const r=f.rows.find(x=>x.s.id===s.id);
      const nilai=r&&r.akhir;
      const tuntas=nilai!=null&&Number(nilai)>=Number(r?r.kktp:f.c.kktp);

      return `

        <p>Dengan hormat,</p>

        <p>
          Melalui surat ini kami memberitahukan capaian hasil belajar
          peserta didik berikut:
        </p>

        <table style="margin:0 0 12px 20px;border-collapse:collapse">
          <tr><td style="padding-right:12px">Nama</td><td>: <b>${e(s.nama)}</b></td></tr>
          <tr><td style="padding-right:12px">Kelas</td><td>: ${e(s.kelas)}</td></tr>
          <tr><td style="padding-right:12px">Mata Pelajaran</td><td>: ${e(G.mapel)}</td></tr>
          <tr><td style="padding-right:12px">Nilai Akhir</td><td>: <b>${n1(nilai)}</b></td></tr>
          <tr><td style="padding-right:12px">KKTP</td><td>: ${e(r?r.kktp:f.c.kktp)}</td></tr>
          <tr><td style="padding-right:12px">Keterangan</td><td>: ${tuntas?'Telah mencapai KKTP':'Belum mencapai KKTP'}</td></tr>
        </table>

        <p>
          ${tuntas
            ?'Kami berharap capaian tersebut dapat dipertahankan dan ditingkatkan.'
            :'Kami mengharapkan dukungan Bapak/Ibu dalam mendampingi putra/putri Bapak/Ibu belajar di rumah agar capaian belajarnya dapat meningkat.'}
        </p>

        <p>
          Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan
          kerja sama Bapak/Ibu, kami ucapkan terima kasih.
        </p>

      `;

    },


    'Peringatan kehadiran':s=>`

      <p>Dengan hormat,</p>

      <p>
        Berdasarkan catatan presensi, tingkat kehadiran peserta didik berikut
        pada mata pelajaran ${e(G.mapel)} berada di bawah batas minimal
        kehadiran sebesar ${e(ap.hadir)}%:
      </p>

      <table style="margin:0 0 12px 20px;border-collapse:collapse">
        <tr><td style="padding-right:12px">Nama</td><td>: <b>${e(s.nama)}</b></td></tr>
        <tr><td style="padding-right:12px">Kelas</td><td>: ${e(s.kelas)}</td></tr>
      </table>

      <p>
        Sehubungan dengan hal tersebut, kami mohon Bapak/Ibu berkenan
        memperhatikan dan memastikan kehadiran putra/putri Bapak/Ibu
        di sekolah. Apabila terdapat kendala, mohon disampaikan kepada
        wali siswa.
      </p>

      <p>
        Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama
        Bapak/Ibu, kami ucapkan terima kasih.
      </p>

    `,


    'Izin / pemberitahuan lainnya':s=>{

      const isi=($('sx')&&$('sx').value.trim())||'................................';

      return `

        <p>Dengan hormat,</p>

        <p>
          Melalui surat ini kami menyampaikan kepada orang tua/wali dari
          <b>${e(s.nama)}</b> (kelas ${e(s.kelas)}) hal sebagai berikut:
        </p>

        <p style="margin-left:20px">${e(isi).replace(/\n/g,'<br>')}</p>

        <p>
          Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama
          Bapak/Ibu, kami ucapkan terima kasih.
        </p>

      `;

    }

  };


  /* ─────────────────────────────────────────────────────────────────────
     PESAN PENGANTAR WHATSAPP (pengirim: wali siswa)
     ───────────────────────────────────────────────────────────────────── */

  const PENGANTAR=
    'Yth. Bapak/Ibu Orang Tua/Wali dari {nama} (kelas {kelas}).\n\n'+
    'Bersama pesan ini kami sampaikan surat resmi dari sekolah perihal {perihal}. '+
    'Mohon berkenan membaca dan menindaklanjutinya.\n\n'+
    'Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.\n'+
    '– {guru}, Wali Siswa';


  /* ─────────────────────────────────────────────────────────────────────
     FORM SURAT
     ───────────────────────────────────────────────────────────────────── */

  v.innerHTML=`

    <div class="box" style="max-width:760px">

      <h3 style="margin-top:0">Buat Surat Otomatis</h3>

      <div class="fg">

        <div>
          <label for="ss">Pilih siswa</label>
          <select id="ss">
            ${
              sis.map(s=>`
                <option value="${e(s.id)}">
                  ${e(s.nama)} (${e(s.kelas)})
                </option>
              `).join('')
            }
          </select>
        </div>

        <div>
          <label for="js">Jenis surat</label>
          <select id="js">
            ${opt(Object.keys(J))}
          </select>
        </div>

        <div>
          <label for="sn">Nomor surat</label>
          <input
            id="sn"
            type="text"
            placeholder="Contoh: 001/SMN20/IX/2026"
          >
        </div>

        <div>
          <label for="sd">Tanggal surat</label>
          <input
            id="sd"
            type="date"
            value="${today()}"
          >
        </div>

        <div style="grid-column:1/-1">
          <label for="sx">Isi surat (untuk jenis "Izin / pemberitahuan lainnya")</label>
          <textarea id="sx" rows="3" placeholder="Tulis keperluan surat di sini"></textarea>
        </div>

        <div>
          <label for="skepsek">Nama kepala sekolah</label>
          <input
            id="skepsek"
            type="text"
            value="${e(p.kepsek||'')}"
            placeholder="Nama kepala sekolah"
          >
        </div>

        <div>
          <label for="snip">NIP kepala sekolah</label>
          <input
            id="snip"
            type="text"
            value="${e(p.nipKepsek||'')}"
            placeholder="NIP kepala sekolah"
          >
        </div>

        <div style="grid-column:1/-1">
          <label for="spg">Pesan pengantar WhatsApp (bisa diubah)</label>
          <textarea id="spg" rows="6"></textarea>
        </div>

      </div>

      <p class="hint">
        Nomor surat diisi secara manual. Identitas sekolah dan logo
        diambil dari Pengaturan › Profil Sekolah. Surat dikirim atas nama
        wali siswa (nama dan NIP otomatis dari Profil Guru) dan diketahui
        kepala sekolah. Nama dan NIP kepala sekolah dapat diedit sebelum
        mencetak.
        Untuk mengirim lewat WhatsApp: klik Cetak Surat, simpan sebagai PDF,
        lalu klik Kirim WhatsApp dan lampirkan PDF tersebut pada percakapan.
      </p>

      <button class="btn2" type="button" id="pc">
        Cetak Surat / Simpan PDF
      </button>

      <a class="btn2" id="kw" href="#" target="_blank" rel="noopener"
         style="display:inline-block;margin-left:8px;text-decoration:none">
        Kirim WhatsApp
      </a>

    </div>

    <h3>Pratinjau Surat</h3>

    <div id="ls" class="box" style="
      max-width:850px;
      padding:20px;
      overflow:auto;
    "></div>

  `;


  /* ─────────────────────────────────────────────────────────────────────
     MEMBANGUN DOKUMEN SURAT
     ───────────────────────────────────────────────────────────────────── */

  const buatIsiSurat=()=>{

    const id=$('ss').value;
    const s=sis.find(x=>x.id===id);

    if(!s)return `
      <div class="empty">Belum ada siswa.</div>
    `;

    const jenis=$('js').value;
    const nomor=$('sn').value.trim();
    const tanggal=$('sd').value;
    const kepsek=$('skepsek').value.trim();
    const nip=$('snip').value.trim();
    const wali=(G.nama||'').trim();
    const nipWali=(G.nip||'').trim();

    return `

      <div class="surat">

        ${buatKopSurat(p)}

        <div class="nomor-surat">
          <b>Nomor</b> : ${e(nomor||'................................')}<br>
          <b>Lampiran</b> : -<br>
          <b>Perihal</b> : ${e(jenis)}
        </div>


        <div class="tujuan-surat">
          Yth. Bapak/Ibu Orang Tua/Wali dari:<br>
          <b>${e(s.nama)}</b><br>
          Kelas ${e(s.kelas)}<br>
          Di Tempat
        </div>

        <div class="isi-surat">
          ${J[jenis](s)}
        </div>

        <div class="ttd-surat">

          <div class="ttd-label">
            Mengetahui,<br>
            Kepala Sekolah
          </div>

          <div class="ttd-label">
            ${e(p.kecamatan||'')}${p.kecamatan?', ':''}${e(tanggalIndonesia(tanggal))}<br>
            Wali Siswa
          </div>

          <div class="ttd-nama">
            ${e(kepsek||'................................')}
          </div>

          <div class="ttd-nama">
            ${e(wali||'................................')}
          </div>

          <div class="ttd-nip">
            NIP. ${e(nip||'-')}
          </div>

          <div class="ttd-nip">
            NIP. ${e(nipWali||'-')}
          </div>

        </div>

      </div>

    `;

  };


  /* ─────────────────────────────────────────────────────────────────────
     PESAN PENGANTAR + TAUTAN WHATSAPP
     ───────────────────────────────────────────────────────────────────── */

  const isiPengantar=()=>{

    const s=sis.find(x=>x.id===$('ss').value);
    if(!s)return '';

    return $('spg').value
      .replace(/\{nama\}/g,s.nama)
      .replace(/\{kelas\}/g,s.kelas)
      .replace(/\{perihal\}/g,$('js').value.toLowerCase())
      .replace(/\{guru\}/g,G.nama||'');

  };

  const isiTemplatPengantar=()=>{
    $('spg').value=PENGANTAR;
  };

  const tautanWA=()=>{

    const s=sis.find(x=>x.id===$('ss').value);
    const a=$('kw');

    if(!s||!nomorWA(s.hp)){
      a.removeAttribute('href');
      a.setAttribute('aria-disabled','true');
      a.textContent='Nomor HP belum ada';
      a.style.background='#e3e8ea';
      a.style.color='#5f6b73';
      a.style.border='1px solid #cfd6d9';
      a.style.boxShadow='none';
      a.style.opacity='1';
      a.style.cursor='not-allowed';
      a.style.pointerEvents='none';
      return;
    }

    a.href='https://wa.me/'+nomorWA(s.hp)+'?text='+encodeURIComponent(isiPengantar());
    a.removeAttribute('aria-disabled');
    a.textContent='Kirim WhatsApp';
    a.style.background='';
    a.style.color='';
    a.style.border='';
    a.style.boxShadow='';
    a.style.opacity='1';
    a.style.cursor='';
    a.style.pointerEvents='auto';

  };


  /* ─────────────────────────────────────────────────────────────────────
     PRATINJAU
     ───────────────────────────────────────────────────────────────────── */

  const draw=()=>{

    $('ls').innerHTML=`

      <style>${CSS_SURAT}</style>

      ${buatIsiSurat()}

    `;

    tautanWA();

  };


  /* Perubahan form langsung memperbarui pratinjau */
  [
    'ss',
    'js',
    'sn',
    'sd',
    'sx',
    'skepsek',
    'snip',
    'spg'
  ].forEach(id=>{

    $(id).addEventListener('input',draw);
    $(id).addEventListener('change',draw);

  });


  /* ─────────────────────────────────────────────────────────────────────
     CATAT PENGIRIMAN KE RIWAYAT
     ───────────────────────────────────────────────────────────────────── */

  $('kw').onclick=async ev=>{

    const s=sis.find(x=>x.id===$('ss').value);

    if(!s||!nomorWA(s.hp)){
      ev.preventDefault();
      return S.toast('Siswa ini belum memiliki nomor HP yang valid.',1);
    }

    await S.db.add('pesan',{
      tanggal:today(),
      siswaId:s.id,
      nama:s.nama,
      kelas:s.kelas,
      jenis:'Surat: '+$('js').value
    });

  };


  /* ─────────────────────────────────────────────────────────────────────
     CETAK SURAT
     ───────────────────────────────────────────────────────────────────── */

  $('pc').onclick=()=>{

    if(!sis.length){
      return S.toast('Belum ada data siswa.',1);
    }

    const nomor=$('sn').value.trim();

    if(!nomor){
      return S.toast('Nomor surat harus diisi.',1);
    }

    if(!$('sd').value){
      return S.toast('Tanggal surat harus diisi.',1);
    }

    const isi=buatIsiSurat();

    const win=window.open('','_blank');

    if(!win){
      return S.toast(
        'Jendela cetak diblokir. Izinkan pop-up untuk aplikasi ini.',
        1
      );
    }

    win.document.open();

    win.document.write(`

      <!DOCTYPE html>

      <html lang="id">

      <head>

        <meta charset="UTF-8">

        <meta name="viewport" content="width=device-width,initial-scale=1">

        <title>Surat - ${e($('js').value)}</title>

        <style>

          ${CSS_SURAT}

        </style>

      </head>

      <body>

        ${isi}

        <script>

          window.onload=function(){

            const imgs=Array.from(document.images);

            Promise.all(imgs.map(img=>{

              if(img.complete)return Promise.resolve();

              return new Promise(resolve=>{

                img.onload=resolve;
                img.onerror=resolve;

              });

            })).then(()=>{

              setTimeout(()=>{

                window.focus();
                window.print();

              },300);

            });

          };

        <\/script>

      </body>

      </html>

    `);

    win.document.close();

  };


  isiTemplatPengantar();
  draw();

}


/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRASI MENU
   ═══════════════════════════════════════════════════════════════════════════ */

Object.assign(U.PG,{

  notif:[
    'Komunikasi',
    'Notifikasi Orang Tua',
    notif
  ],

  surat:[
    'Komunikasi',
    'Surat Otomatis',
    surat
  ]

});

})();