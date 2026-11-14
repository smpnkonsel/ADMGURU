/* ═══════════════════════════════════════════════════════════════════════════
   [F] PENILAIAN – VERSI REVISI
   [F1] Input Nilai bertahap + kolom dinamis (LM → TG) + simpan manual
   [F2] Rekap Nilai – kolom mengikuti F1
   [F3] Nilai Akhir – kolom mengikuti F1 + Predikat + Keterangan
   [F4] Analisis Ketuntasan
   Kop laporan: Profil Sekolah + Tahun Ajaran + Semester
   Logo kiri dan kanan opsional (diatur di Pengaturan › Profil Sekolah, file [J]).
   Hasil laporan: kertas LEGAL (8,5 x 14 inci) orientasi LANSKAP.

   Struktur Formatif:
     LM = Lingkup Materi (bab), TG = Tugas di dalam LM tersebut.
     Konfigurasi disimpan sebagai lm:[2,3,1] artinya LM 1 punya 2 TG,
     LM 2 punya 3 TG, LM 3 punya 1 TG.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const S=window.ADM,U=S.u;
const {
  e,K,$,JN,tag,tbl,opt,kSel,nm,n1,nc,pred,bar,cfg,tb,mpBar,finals
}=U;

/* ═══════════════════════════════════════════════════════════════════════════
   FUNGSI BANTU UMUM
   ═══════════════════════════════════════════════════════════════════════════ */

/* Ukuran kertas Legal lanskap: 14 x 8,5 inci = 355,6 x 215,9 mm.
   Dalam piksel CSS (96 dpi): 1344 x 816. */
const KERTAS={lebarMm:355.6,tinggiMm:215.9,lebarPx:1344,tinggiPx:816};

const tingkat=k=>S.tingkat?S.tingkat(k):String(k||'').toUpperCase().trim();
const esc=x=>e(x==null?'':String(x));
const nilaiAngka=x=>{
  if(x===null||x===undefined||x==='')return null;
  const n=Number(x);
  return Number.isFinite(n)?n:null;
};
const angka=x=>x==null?'–':Number(x).toFixed(1);
/* Tampilan angka pada laporan: bulat tetap bulat, desimal 1 angka. */
const fmt=x=>{
  if(x==null||x==='')return '';
  if(typeof x==='number'&&Number.isFinite(x))
    return Number.isInteger(x)?String(x):x.toFixed(1);
  return String(x);
};
const amanURL=x=>{
  const s=String(x||'').trim();
  if(/^https?:\/\//i.test(s))return s;
  /* Logo hasil unggah disimpan sebagai data gambar (bukan SVG). */
  if(/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/i.test(s))return s;
  return '';
};
const unduh=(nama,isi,tipe)=>{
  const blob=new Blob([isi],{type:tipe});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
};
const formatTanggal=()=>{
  try{return new Date().toLocaleDateString('id-ID',{
    day:'2-digit',month:'long',year:'numeric'
  })}catch(_){return ''}
};

/* ── Konfigurasi kolom (dipakai bersama oleh F1, F2, dan F3) ─────────────── */

/* Normalisasi konfigurasi: formatif disimpan sebagai daftar LM,
   tiap elemen = jumlah TG pada LM tersebut. Contoh: lm:[2,3,1]. */
const normKonfig=k=>{
  const x={sumatif:3,ujian:2,praktik:1,...(k||{})};
  if(!Array.isArray(x.lm)||!x.lm.length){
    /* Migrasi dari format lama (formatif = total kolom, 2 TG per LM). */
    let sisa=Number(x.formatif)||6;
    const arr=[];
    while(sisa>0){arr.push(Math.min(2,sisa));sisa-=2}
    x.lm=arr;
  }
  x.lm=x.lm.slice(0,20).map(n=>Math.max(1,Math.min(10,parseInt(n,10)||1)));
  x.formatif=x.lm.reduce((a,b)=>a+b,0);
  x.sumatif=Math.max(1,Math.min(20,parseInt(x.sumatif,10)||3));
  x.praktik=Math.max(1,Math.min(20,parseInt(x.praktik,10)||1));
  return x;
};

const ambilKonfigurasi=(mapel,kelas)=>{
  const key='adm_nilai_kolom_'+encodeURIComponent(mapel)+'_'+
    encodeURIComponent(tingkat(kelas));
  try{
    return normKonfig(JSON.parse(localStorage.getItem(key)||'null'));
  }catch(_){return normKonfig(null)}
};

const buatDaftarKolom=(konfigurasi,praktikAktif)=>{
  const kf=normKonfig(konfigurasi);
  const cols=[];
  kf.lm.forEach((jumlahTg,i)=>{
    const lm=i+1;
    for(let tg=1;tg<=jumlahTg;tg++){
      cols.push({
        id:'f'+lm+'_'+tg,jenis:'Formatif',
        judul:'LM '+lm+' - TG '+tg,   /* tetap sama dengan data lama */
        grup:'formatif',label:'TG '+tg,lm,tg
      });
    }
  });
  for(let i=1;i<=kf.sumatif;i++){
    cols.push({
      id:'s'+i,jenis:'Sumatif',
      judul:'UH '+i,grup:'sumatif',label:'UH '+i
    });
  }
  cols.push(
    {id:'u1',jenis:'Ujian',judul:'PTS',grup:'ujian',label:'PTS'},
    {id:'u2',jenis:'Ujian',judul:'SAS',grup:'ujian',label:'SAS'}
  );
  if(praktikAktif){
    for(let i=1;i<=kf.praktik;i++){
      cols.push({
        id:'p'+i,jenis:'Praktik',
        judul:'Praktik '+i,grup:'praktik',label:'Praktik '+i
      });
    }
  }
  return cols;
};

const bacaMapel=async(mapel,kelas)=>{
  try{
    const data=await S.db.list('mapel',{},1);
    return data.find(x=>
      x.mapel===mapel&&(x.kelas||'')===tingkat(kelas)
    )||data.find(x=>x.mapel===mapel)||{};
  }catch(_){return {}}
};

/* Profil Sekolah dibaca dari fungsi pembaca profil yang tersedia.
   Jika fungsi tersebut tidak tersedia, baca koleksi wkprofil. */
async function bacaProfilSekolah(){
  let p=null;

  /* Profil hasil pengaturan kop dibaca langsung agar selalu terbaru. */
  try{
    const rows=await S.db.list('wkprofil',{},1);
    p=Array.isArray(rows)?(rows[0]||null):(rows||null);
    if(!p||!p.sekolah)p=null;
  }catch(_){}

  try{
    if(!p&&typeof U.wkp==='function')p=await U.wkp();
  }catch(_){}

  try{
    if(!p&&typeof window.wkp==='function')p=await window.wkp();
  }catch(_){}

  return p||{};
}

/* Data sekolah dan pengaturan akademik untuk kop dokumen. */
async function dataKop(){
  const [p,a]=await Promise.all([
    bacaProfilSekolah(),
    U.app()
  ]);

return {
  pemda:p.pemda||'',
  dinas:p.dinas||'',
  alamat:p.alamat||'',
  sekolah:p.sekolah||'',
  npsn:p.npsn||'',
  jenjang:p.jenjang||'',
  provinsi:p.provinsi||'',
  kab:p.kab||'',
  kecamatan:p.kecamatan||'',
  kepsek:p.kepsek||'',
  nipKepsek:p.nipKepsek||'',
  logoKiri:amanURL(p.logoKiri),
  logoKanan:amanURL(p.logoKanan),
  tahun:a.tahun||'',
  semester:a.semester||''
};
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOKUMEN LAPORAN – LEGAL LANSKAP
   Parameter:
     judul, mapel, kelas  : teks kop dan identitas
     header               : array judul kolom
     rows                 : array baris (nilai polos, TIDAK berupa HTML)
     foot                 : baris statistik; sel pertama membentang 2 kolom
     kktp                 : angka di bawah KKTP diberi warna merah
     ringkasan            : teks ringkasan di bagian info
     jenis                : 'pdf' | 'excel' | 'word'
     preview              : true → hanya mengembalikan string HTML
     win                  : jendela yang sudah dibuka (untuk PDF)
   ═══════════════════════════════════════════════════════════════════════════ */

async function dokumenLaporan({
  judul,mapel,kelas,header,rows,foot=[],kktp=null,ringkasan='',
  jenis,preview=false,win=null
}){
  const p=await dataKop();
  const guru=S.guru||{};

  const guruNama=guru.nama||guru.namaGuru||'';
  const guruNip=guru.nip||guru.NIP||guru.nipGuru||'-';

  const logoL=p.logoKiri?
    `<img src="${esc(p.logoKiri)}" class="logo" alt="Logo kiri">`:'<span></span>';
  const logoR=p.logoKanan?
    `<img src="${esc(p.logoKanan)}" class="logo" alt="Logo kanan">`:'<span></span>';

  /* Ukuran huruf menyesuaikan jumlah kolom agar muat di satu halaman lebar. */
  const jumlahKolom=header.length;
  const fs=jumlahKolom>28?8:jumlahKolom>22?9:jumlahKolom>16?10:11.5;

  const kolom=header.map(x=>`<th>${esc(x)}</th>`).join('');

  const sel=(x,idx)=>{
    const teks=fmt(x);
    let kelasCss='';
    if(typeof x==='number'&&kktp!=null&&idx>=2&&x<kktp)kelasCss=' class="rendah"';
    else if(teks==='Tuntas')kelasCss=' class="tuntas"';
    else if(teks==='Belum tuntas')kelasCss=' class="belum"';
    return `<td${kelasCss}>${esc(teks)}</td>`;
  };

  const isi=rows.map(r=>
    '<tr>'+r.map((x,i)=>sel(x,i)).join('')+'</tr>'
  ).join('');

  const kaki=foot.map(r=>{
    const [label,...sisa]=r;
    return `<tr class="stat"><td colspan="2">${esc(label)}</td>`+
      sisa.map(x=>`<td>${esc(fmt(x)||'–')}</td>`).join('')+'</tr>';
  }).join('');

  const html=`<!DOCTYPE html>
<html lang="id" xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="UTF-8">
<title>${esc(judul)}</title>
<style>
/* Kertas Legal (14 x 8,5 inci) lanskap */
@page{size:${KERTAS.lebarMm}mm ${KERTAS.tinggiMm}mm;margin:10mm 12mm}
@page WordSection1{size:14in 8.5in;mso-page-orientation:landscape;
  margin:0.4in 0.5in 0.4in 0.5in}
div.WordSection1{page:WordSection1}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1a1a1a;
  margin:0;font-size:${fs}px;line-height:1.35}
${preview?'body{padding:10mm 12mm;background:#fff}':''}

.kop{display:grid;grid-template-columns:80px 1fr 80px;align-items:center;
  gap:12px;border-bottom:3px double #1a1a1a;padding-bottom:10px}
.logo{width:72px;height:72px;object-fit:contain}
.kop .logo:last-child{justify-self:end}
.identitas{text-align:center}
.identitas{line-height:1.3;color:#111}
.identitas .instansi{margin:0;font-size:14px;font-weight:700;
  text-transform:uppercase}
.identitas h2{font-size:20px;margin:2px 0 3px;text-transform:uppercase;
  font-weight:700}
.identitas .alamat{margin:2px 0 0;font-size:11px;font-weight:600}

.judul{text-align:center;margin:14px 0 8px}
.judul h3{margin:0 0 3px;font-size:15px;text-transform:uppercase;
  letter-spacing:.8px}
.judul div{font-size:12.5px;font-weight:600;color:#333}

.info{display:flex;flex-wrap:wrap;gap:6px 40px;margin:8px 0 6px;
  padding:7px 12px;background:#f3f6fa;border:1px solid #d5dde8;
  border-radius:6px;font-size:11.5px}
.info span b{display:inline-block;min-width:92px}

table{width:100%;border-collapse:collapse;margin-top:6px}
thead{display:table-header-group}
tfoot{display:table-footer-group}
th,td{border:1px solid #444;padding:4px 3px;text-align:center;
  vertical-align:middle}
th{background:#dfe7f1;font-weight:700;font-size:${Math.max(fs-0.5,7.5)}px}
td:first-child,th:first-child{width:30px}
td:nth-child(2){text-align:left;padding-left:7px;min-width:150px;
  white-space:normal}
th:nth-child(2){min-width:150px}
tbody tr:nth-child(even){background:#f8fafc}
tr{page-break-inside:avoid}
td.rendah{color:#b00020;font-weight:700}
td.tuntas{color:#146c2e;font-weight:700}
td.belum{color:#b00020;font-weight:700}
tr.stat td{background:#eef2f7;font-weight:700}
tr.stat td:first-child{text-align:right;padding-right:8px}

.ttd{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:22px;
  page-break-inside:avoid;font-size:12px}
.ttd>div{text-align:center;line-height:1.5}
.ttd .nama{margin-top:58px;font-weight:700;text-decoration:underline}
.ttd .nip{font-size:11px}

@media print{
  body{margin:0}
}
</style>
</head>
<body>
<div class="WordSection1">
<div class="kop">
  ${logoL}
  <div class="identitas">
    ${p.pemda?`<p class="instansi">${esc(p.pemda)}</p>`:''}
    ${p.dinas?`<p class="instansi">${esc(p.dinas)}</p>`:''}
    <h2>${esc(p.sekolah||'Nama Sekolah')}</h2>
    ${p.alamat
      ?`<p class="alamat">${esc(p.alamat)}</p>`
      :`<p class="alamat">${esc([p.jenjang,p.npsn?'NPSN '+p.npsn:'',p.kab,p.provinsi].filter(Boolean).join(' · '))}</p>`}
  </div>
  ${logoR}
</div>

<div class="judul">
  <h3>${esc(judul)}</h3>
  <div>${esc(mapel||'')}</div>
</div>

<div class="info">
  <span><b>Kelas</b>: ${esc(kelas)}</span>
  <span><b>Tahun Pelajaran</b>: ${esc(p.tahun)}</span>
  <span><b>Semester</b>: ${esc(p.semester)}</span>
  ${kktp!=null?`<span><b>KKTP</b>: ${esc(kktp)}</span>`:''}
  <span><b>Jumlah Siswa</b>: ${rows.length}</span>
  ${ringkasan?`<span>${esc(ringkasan)}</span>`:''}
  <span><b>Tanggal Cetak</b>: ${formatTanggal()}</span>
</div>

<table>
<thead><tr>${kolom}</tr></thead>
<tbody>${isi}${kaki}</tbody>
</table>

<div class="ttd">
  <div>
    Mengetahui,<br>
    Kepala Sekolah
    <div class="nama">${esc(p.kepsek||'')}</div>
    <div class="nip">NIP. ${esc(p.nipKepsek||'-')}</div>
  </div>

  <div>
    ${esc(p.kecamatan||p.kab||'')}${p.kecamatan||p.kab?', ':''}${formatTanggal()}<br>
    Guru Mata Pelajaran
    <div class="nama">${esc(guruNama)}</div>
    <div class="nip">NIP. ${esc(guruNip)}</div>
  </div>
</div>
</div>
</body>
</html>`;

  if(preview)return html;

  const namaFile=(
    'laporan-nilai-'+
    String(kelas||'kelas').replace(/\s+/g,'-').toLowerCase()
  );

  if(jenis==='pdf'){
    const w=win||window.open('','_blank');
    if(!w){
      S.toast('Izinkan pop-up browser untuk mencetak PDF.',1);
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(()=>{w.focus();w.print()},700);
  }else if(jenis==='excel'){
    unduh(namaFile+'.xls',html,'application/vnd.ms-excel;charset=utf-8');
  }else if(jenis==='word'){
    unduh(namaFile+'.doc',html,'application/msword;charset=utf-8');
  }
}


/* ═══════════════════════════════════════════════════════════════════════════
   [F1] INPUT NILAI
   ═══════════════════════════════════════════════════════════════════════════ */

async function nilaiInput(v){
  let sis=[],all=[],cols=[],dirty=new Set(),loading=false;
  let kelasAwal='';
  let mapelAktif=S.mapelAktif||S.guru.mapel;
  let praktikAktif=false;
  let kktp=75;
  let konfigurasi=normKonfig(null);
  let lmDipilih=0;   /* LM yang dipilih untuk tombol + TG / − TG */
  let aktif=true;
  let hookLama=null;

  const $v=id=>v.querySelector('#'+id);
  const storageKey=()=> 'adm_nilai_kolom_'+
    encodeURIComponent(mapelAktif)+'_'+encodeURIComponent(tingkat($v('kl').value));

  const simpanKonfigurasi=()=>{
    try{localStorage.setItem(storageKey(),JSON.stringify(konfigurasi))}catch(_){}
    U.simpanKolom(storageKey(),konfigurasi);   /* salinan di akun (cadangan & lintas perangkat) */
  };
  const bacaKonfigurasi=()=>{
    /* Selalu reset dari penyimpanan, supaya konfigurasi kelas lain tidak terbawa. */
    try{
      konfigurasi=normKonfig(JSON.parse(localStorage.getItem(storageKey())||'null'));
    }catch(_){konfigurasi=normKonfig(null)}
    lmDipilih=0;
  };

  const buatKolom=()=>{
    cols=buatDaftarKolom(konfigurasi,praktikAktif);
  };

  const nilaiAda=(s,c)=>all.find(x=>
    x.siswaId===s.id&&x.jenis===c.jenis&&x.judul===c.judul
  );

  const statusDirty=()=>dirty.size>0;

  const modalKonfirmasi=()=>new Promise(resolve=>{
    if(!statusDirty()){resolve(true);return}
    const lama=document.querySelector('#konfirmasiNilai');
    if(lama)lama.remove();

    const el=document.createElement('div');
    el.id='konfirmasiNilai';
    el.style.cssText=[
      'position:fixed','inset:0','z-index:99999',
      'background:rgba(0,0,0,.58)','display:flex',
      'align-items:center','justify-content:center','padding:18px'
    ].join(';');

    el.innerHTML=`
      <div style="background:var(--card,#fff);color:var(--text,inherit);
        width:min(420px,100%);padding:22px;border-radius:16px;
        box-shadow:0 15px 50px #0004">
        <div style="font-size:24px;margin-bottom:10px">⚠️</div>
        <h3 style="margin:0 0 9px">Perubahan belum disimpan!</h3>
        <p style="font-size:14px;color:var(--mute);line-height:1.6">
          Ada ${dirty.size} perubahan nilai yang belum disimpan.
          Jika meninggalkan halaman sekarang, perubahan tersebut akan hilang.
        </p>
        <div style="display:flex;gap:9px;justify-content:flex-end;
          flex-wrap:wrap;margin-top:20px">
          <button type="button" class="btn2 ghost" data-pilih="batal">
            Kembali mengisi
          </button>
          <button type="button" class="btn2 del" data-pilih="buang">
            Tinggalkan
          </button>
        </div>
      </div>`;

    document.body.appendChild(el);
    el.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-pilih]');
      if(!b)return;
      const pilih=b.dataset.pilih;
      el.remove();
      resolve(pilih==='buang');
    });
  });

  const tandaiDirty=input=>{
    const id=input.dataset.key;
    if(id)dirty.add(id);
    perbaruiTombol();
  };

  const perbaruiTombol=()=>{
    const b=$v('sv');
    if(!b)return;
    b.textContent=statusDirty()?
      'Simpan Nilai ('+dirty.size+')':'Simpan Nilai';
    b.disabled=loading;
  };

  const muatPengaturan=async k=>{
    const data=await bacaMapel(mapelAktif,k);
    praktikAktif=!!data.praktek;
    kktp=nilaiAngka(data.kktp)??75;
  };

  const gambarTabel=()=>{
    buatKolom();
    if(lmDipilih>=konfigurasi.lm.length)lmDipilih=konfigurasi.lm.length-1;
    if(lmDipilih<0)lmDipilih=0;

    const grup=[
      {nama:'FORMATIF',jumlah:konfigurasi.formatif},
      {nama:'SUMATIF',jumlah:konfigurasi.sumatif},
      {nama:'UJIAN',jumlah:2},
      ...(praktikAktif?[{nama:'PRAKTIK',jumlah:konfigurasi.praktik}]:[])
    ];

    /* Header 3 tingkat: grup → LM → TG */
    let head=`<tr>
      <th rowspan="3" style="min-width:48px">No</th>
      <th rowspan="3" style="min-width:190px">Nama Siswa</th>`;
    grup.forEach(g=>{
      head+=`<th colspan="${g.jumlah}" style="text-align:center">${g.nama}</th>`;
    });
    head+='</tr><tr>';

    konfigurasi.lm.forEach((n,i)=>{
      head+=`<th colspan="${n}" style="text-align:center">LM ${i+1}</th>`;
    });
    cols.filter(c=>c.grup!=='formatif').forEach(c=>{
      head+=`<th rowspan="2" style="min-width:105px;text-align:center">${esc(c.label)}</th>`;
    });
    head+='</tr><tr>';
    cols.filter(c=>c.grup==='formatif').forEach(c=>{
      head+=`<th style="min-width:105px;text-align:center">${esc(c.label)}</th>`;
    });
    head+='</tr>';

    const body=sis.map((s,i)=>{
      let html=`<tr><td>${i+1}</td><td>${esc(s.nama)}</td>`;
      cols.forEach(c=>{
        const old=nilaiAda(s,c);
        const n=old?old.nilai:'';
        const id=c.id+'|'+s.id;
        html+=`<td>
          <input type="number" min="0" max="100" step="any"
            data-s="${esc(s.id)}"
            data-col="${esc(c.id)}"
            data-key="${esc(id)}"
            value="${n??''}"
            aria-label="${esc(s.nama)} ${esc(c.judul)}"
            style="width:78px;min-width:65px;text-align:center;
              ${n!==''&&n!=null&&+n<kktp?'color:var(--bad)':''}">
        </td>`;
      });
      return html+'</tr>';
    }).join('');

    const opsiLM=konfigurasi.lm.map((n,i)=>
      `<option value="${i}" ${i===lmDipilih?'selected':''}>LM ${i+1} (${n} TG)</option>`
    ).join('');

    const boxStyle='display:flex;align-items:center;gap:7px;flex-wrap:wrap';
    const tombolGrup=`
      <div style="${boxStyle}">
        <b>FORMATIF</b>
        <button class="btn2 ghost" data-aksi="lm+">+ LM</button>
        <button class="btn2 ghost" data-aksi="lm-">− LM</button>
        <span style="color:var(--mute)">|</span>
        <select id="pilihLM" aria-label="Pilih LM untuk menambah TG">${opsiLM}</select>
        <button class="btn2 ghost" data-aksi="tg+">+ TG</button>
        <button class="btn2 ghost" data-aksi="tg-">− TG</button>
      </div>
      <div style="${boxStyle}">
        <b>SUMATIF</b>
        <button class="btn2 ghost" data-aksi="uh+">+ UH</button>
        <button class="btn2 ghost" data-aksi="uh-">− UH</button>
      </div>
      ${praktikAktif?`<div style="${boxStyle}">
        <b>PRAKTIK</b>
        <button class="btn2 ghost" data-aksi="pr+">+ Praktik</button>
        <button class="btn2 ghost" data-aksi="pr-">− Praktik</button>
      </div>`:''}`;

    $v('ls').innerHTML=`
      <div style="display:flex;gap:12px;align-items:flex-start;
        justify-content:space-between;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <b>Daftar Nilai Siswa</b>
          <div style="font-size:12px;color:var(--mute)">
            ${sis.length} siswa · ${konfigurasi.lm.length} LM · ${cols.length} kolom penilaian · KKTP ${kktp}
          </div>
        </div>
        <div style="display:flex;gap:10px 18px;flex-wrap:wrap">${tombolGrup}</div>
      </div>
      <div style="overflow:auto;width:100%;border-radius:10px">
        <table class="tstick" style="width:100%;border-collapse:collapse;white-space:nowrap">
          <thead>${head}</thead>
          <tbody>${body||`<tr><td colspan="${cols.length+2}"
            style="text-align:center;padding:22px">
            Belum ada siswa di kelas ini.
          </td></tr>`}</tbody>
        </table>
      </div>
      <p style="font-size:12px;color:var(--mute);margin-top:10px">
        LM = Lingkup Materi (bab), TG = Tugas dalam LM tersebut.
        Pilih LM pada dropdown, lalu tekan + TG untuk menambah tugas pada LM itu.
        Nilai belum disimpan ditandai pada tombol Simpan Nilai.
        Nilai di bawah KKTP ditampilkan dengan warna merah.
      </p>`;

    $v('ls').querySelectorAll('th').forEach(th=>{
      th.style.background='var(--soft)';
      th.style.padding='11px 9px';
      th.style.border='1px solid var(--line)';
    });
    $v('ls').querySelectorAll('td').forEach(td=>{
      td.style.padding='7px';
      td.style.border='1px solid var(--line)';
    });
  };

  const muatData=async()=>{
    if(loading)return;
    loading=true;
    try{
      const k=$v('kl').value;
      kelasAwal=k;
      bacaKonfigurasi();
      await muatPengaturan(k);
      [sis,all]=await Promise.all([
        S.db.list('siswa',{kelas:k}),
        S.db.list('nilai',{kelas:k})
      ]);
      sis.sort(nm);
      dirty.clear();
      gambarTabel();
    }catch(err){
      S.toast('Gagal memuat nilai: '+err.message,1);
    }finally{
      loading=false;
      perbaruiTombol();
    }
  };

  /* Tambah / kurangi LM, TG, UH, dan Praktik.
     Mengurangi kolom hanya menyembunyikannya; nilai di database tetap ada. */
  const ubahJumlah=aksi=>{
    const adaNilai=daftar=>all.some(x=>
      daftar.some(j=>x.jenis===j.jenis&&x.judul===j.judul)
    );
    const hapusDirty=prefiks=>{
      [...dirty].forEach(k=>{if(k.startsWith(prefiks))dirty.delete(k)});
    };
    const konfirmasiHapus=(teks,daftar)=>{
      if(!adaNilai(daftar))return true;
      return window.confirm(teks+' sudah berisi nilai. Kolom akan disembunyikan '+
        '(nilai di database tidak dihapus). Lanjutkan?');
    };

    if(aksi==='lm+'){
      if(konfigurasi.lm.length>=20)return;
      konfigurasi.lm.push(1);
      lmDipilih=konfigurasi.lm.length-1;   /* langsung pilih LM baru */
    }else if(aksi==='lm-'){
      if(konfigurasi.lm.length<=1)return;
      const no=konfigurasi.lm.length;
      const daftar=[];
      for(let t=1;t<=konfigurasi.lm[no-1];t++)
        daftar.push({jenis:'Formatif',judul:'LM '+no+' - TG '+t});
      if(!konfirmasiHapus('LM '+no,daftar))return;
      for(let t=1;t<=konfigurasi.lm[no-1];t++)hapusDirty('f'+no+'_'+t+'|');
      konfigurasi.lm.pop();
    }else if(aksi==='tg+'){
      if(konfigurasi.lm[lmDipilih]>=10)return;
      konfigurasi.lm[lmDipilih]++;
    }else if(aksi==='tg-'){
      const n=konfigurasi.lm[lmDipilih];
      if(n<=1)return;
      const lm=lmDipilih+1;
      if(!konfirmasiHapus('LM '+lm+' - TG '+n,
        [{jenis:'Formatif',judul:'LM '+lm+' - TG '+n}]))return;
      hapusDirty('f'+lm+'_'+n+'|');
      konfigurasi.lm[lmDipilih]--;
    }else if(aksi==='uh+'){
      if(konfigurasi.sumatif>=20)return;
      konfigurasi.sumatif++;
    }else if(aksi==='uh-'){
      if(konfigurasi.sumatif<=1)return;
      const n=konfigurasi.sumatif;
      if(!konfirmasiHapus('UH '+n,[{jenis:'Sumatif',judul:'UH '+n}]))return;
      hapusDirty('s'+n+'|');
      konfigurasi.sumatif--;
    }else if(aksi==='pr+'){
      if(konfigurasi.praktik>=20)return;
      konfigurasi.praktik++;
    }else if(aksi==='pr-'){
      if(konfigurasi.praktik<=1)return;
      const n=konfigurasi.praktik;
      if(!konfirmasiHapus('Praktik '+n,[{jenis:'Praktik',judul:'Praktik '+n}]))return;
      hapusDirty('p'+n+'|');
      konfigurasi.praktik--;
    }else return;

    konfigurasi=normKonfig(konfigurasi);
    simpanKonfigurasi();
    gambarTabel();
    perbaruiTombol();
  };

  v.innerHTML=tb(`
    ${kSel('kl')}
    <span class="sp"></span>
    <button class="btn2" id="sv">Simpan Nilai</button>
  `)+`<div class="box" id="ls"></div>`;

  $v('ls').addEventListener('input',ev=>{
    const i=ev.target;
    if(!i.matches('input[data-key]'))return;
    if(i.value!==''&&(Number(i.value)<0||Number(i.value)>100)){
      i.setCustomValidity('Nilai harus antara 0 sampai 100');
    }else i.setCustomValidity('');
    i.style.color=i.value!==''&&+i.value<kktp?'var(--bad)':'';
    tandaiDirty(i);
  });

  $v('ls').addEventListener('click',ev=>{
    const b=ev.target.closest('button[data-aksi]');
    if(b)ubahJumlah(b.dataset.aksi);
  });

  $v('ls').addEventListener('change',ev=>{
    if(ev.target.id==='pilihLM')lmDipilih=parseInt(ev.target.value,10)||0;
  });

  $v('kl').addEventListener('change',async()=>{
    if(statusDirty()){
      const boleh=await modalKonfirmasi();
      if(!boleh){
        $v('kl').value=kelasAwal;
        return;
      }
    }
    dirty.clear();
    await muatData();
  });

  $v('sv').onclick=async()=>{
    if(loading)return;
    const k=$v('kl').value;
    const inputs=[...$v('ls').querySelectorAll('input[data-key]')];
    const berubah=inputs.filter(i=>dirty.has(i.dataset.key));

    if(!berubah.length){
      S.toast('Belum ada perubahan nilai',1);
      return;
    }

    for(const i of berubah){
      if(i.value!==''&&(!Number.isFinite(+i.value)||+i.value<0||+i.value>100)){
        S.toast('Nilai harus antara 0 sampai 100',1);
        i.focus();
        return;
      }
    }

    loading=true;
    perbaruiTombol();
    let berhasil=0;
    const selesai=[];

    try{
      for(const i of berubah){
        const s=sis.find(x=>x.id===i.dataset.s);
        const c=cols.find(x=>x.id===i.dataset.col);
        if(!s||!c)continue;

        const lama=nilaiAda(s,c);
        if(i.value===''){
          if(lama)await S.db.remove('nilai',lama.id);
        }else{
          const data={
            kelas:k,jenis:c.jenis,judul:c.judul,
            siswaId:s.id,nama:s.nama,
            nilai:Math.max(0,Math.min(100,+i.value))
          };
          if(lama)await S.db.update('nilai',lama.id,data);
          else await S.db.add('nilai',data);
        }
        selesai.push(i.dataset.key);
        berhasil++;
      }

      all=await S.db.list('nilai',{kelas:k});
      selesai.forEach(x=>dirty.delete(x));
      gambarTabel();
      S.toast('Nilai berhasil disimpan ('+berhasil+' perubahan)');
    }catch(err){
      /* Sel yang sudah berhasil disimpan tidak akan dibuat ulang.
         Sel yang gagal tetap ditandai agar bisa dicoba kembali. */
      try{all=await S.db.list('nilai',{kelas:k})}catch(_){}
      selesai.forEach(x=>dirty.delete(x));
      gambarTabel();
      S.toast('Penyimpanan sebagian gagal: '+err.message+
        '. Periksa tombol Simpan Nilai untuk perubahan tersisa.',1);
    }finally{
      loading=false;
      perbaruiTombol();
    }
  };

  const beforeUnload=ev=>{
    if(!aktif||!statusDirty())return;
    ev.preventDefault();
    ev.returnValue='';
  };
  window.addEventListener('beforeunload',beforeUnload);

  /* Pengait navigasi hanya aktif selama halaman Input Nilai dipakai.
     Setelah pengguna menyetujui perpindahan, pengait dibersihkan. */
  hookLama=S.beforeNavigate;
  const hookBaru=async info=>{
    if(hookLama){
      const ok=await hookLama(info);
      if(!ok)return false;
    }
    const boleh=await modalKonfirmasi();
    if(boleh)bersihkan();
    return boleh;
  };
  S.beforeNavigate=hookBaru;

  function bersihkan(){
    if(!aktif)return;
    aktif=false;
    window.removeEventListener('beforeunload',beforeUnload);
    if(S.beforeNavigate===hookBaru)S.beforeNavigate=hookLama||null;
  }

  window.addEventListener('pagehide',bersihkan,{once:true});
  await muatData();
}

/* ═══════════════════════════════════════════════════════════════════════════
   FUNGSI HALAMAN REKAP DAN NILAI AKHIR
   ═══════════════════════════════════════════════════════════════════════════ */

async function halamanNilai(v,mode){
  const mapelAktif=S.mapelAktif||S.guru.mapel;
  let kelas='';
  let siswa=[],nilai=[],dataMapel={},konfigurasi={},cols=[];
  let finalRows=[];

  const judul=mode==='rekap'?'REKAP NILAI':'DAFTAR NILAI AKHIR';
  const judulLaporan=mode==='rekap'?'Rekap Nilai':'Daftar Nilai Akhir';

  v.innerHTML=tb(`
    ${kSel('kl')}
    <span class="sp"></span>
    <button class="btn2 ghost" id="pdf">PDF / Cetak</button>
    <button class="btn2 ghost" id="xls">Excel</button>
    <button class="btn2 ghost" id="doc">Word</button>
  `)+`
  <div class="box" id="isiNilai"></div>
  <div class="box" style="margin-top:18px">
    <h3 style="margin-top:0">Pratinjau Hasil Laporan</h3>
    <p style="font-size:12px;color:var(--mute)">
      Kertas Legal (8,5 × 14 inci) · orientasi lanskap.
      Tampilan diperkecil agar muat di layar. Nama sekolah, kepala sekolah, dan logo diatur di Pengaturan › Profil Sekolah.
    </p>
    <div id="pratinjauLaporan"
      style="width:100%;overflow:auto;background:#d9e0ea;
      border-radius:10px;padding:14px">
      <div style="padding:25px;text-align:center">
        Memuat pratinjau laporan...
      </div>
    </div>
  </div>`;

  const $v=id=>v.querySelector('#'+id);

  const ambilNilai=(s,c)=>{
    const x=nilai.find(n=>
      n.siswaId===s.id&&n.jenis===c.jenis&&n.judul===c.judul
    );
    return x?nilaiAngka(x.nilai):null;
  };

  const ambilFinal=(s)=>{
    const x=finalRows.find(r=>r.s&&r.s.id===s.id);
    return x?nilaiAngka(x.akhir):null;
  };

  const buatHeader=()=>{
    const h=['No','Nama Siswa',...cols.map(c=>c.judul)];
    if(mode==='rekap')h.push('Rata-rata');
    else h.push('Nilai Akhir','Predikat','Keterangan');
    return h;
  };

  const gambar=()=>{
    const header=buatHeader();
    const k=nilaiAngka(dataMapel.kktp)??75;
    const body=siswa.map((s,i)=>{
      const nilaiKolom=cols.map(c=>ambilNilai(s,c));
      if(mode==='rekap'){
        const ada=nilaiKolom.filter(x=>x!=null);
        const rata=ada.length?S.avg(ada):null;
        return [i+1,esc(s.nama),...nilaiKolom.map(x=>x==null?'–':nc(x,k)),rata==null?'–':nc(rata,k)];
      }

      const akhir=ambilFinal(s);
      const pr=akhir==null?'-':pred(akhir,k);
      const ket=akhir==null?'Belum ada nilai':
        akhir>=k?'Tuntas':'Belum tuntas';

      return [
        i+1,esc(s.nama),
        ...nilaiKolom.map(x=>x==null?'–':nc(x,k)),
        akhir==null?'–':nc(akhir,k),
        pr,
        ket==='Tuntas'?tag(ket,'ok'):
          ket==='Belum tuntas'?tag(ket,'b'):ket
      ];
    });

    /* Rekap rata-rata kelas per kolom. */
    let foot='';
    if(mode==='rekap'){
      const statistik=[
        ['Nilai tertinggi',c=>Math.max(...c)],
        ['Nilai terendah',c=>Math.min(...c)],
        ['Rata-rata kelas',a=>S.avg(a)]
      ];
      foot=statistik.map(([label,fn])=>{
        const cells=cols.map(c=>{
          const a=siswa.map(s=>ambilNilai(s,c)).filter(x=>x!=null);
          return a.length?angka(fn(a)):'–';
        });
        return `<tr class="ft"><td colspan="2"><b>${label}</b></td>`+
          cells.map(x=>`<td><b>${x}</b></td>`).join('')+
          `<td>–</td></tr>`;
      }).join('');
    }

    $v('isiNilai').innerHTML=`
      <div style="display:flex;gap:10px;justify-content:space-between;
        flex-wrap:wrap;margin-bottom:12px">
        <div>
          <h3 style="margin:0">${judul}</h3>
          <p style="margin:5px 0 0;color:var(--mute)">
            ${esc(mapelAktif)} · Kelas ${esc(kelas)} · ${siswa.length} siswa
          </p>
        </div>
        <div style="color:var(--mute);font-size:12px">
          KKTP: ${esc(dataMapel.kktp??75)}
        </div>
      </div>
      <div style="overflow:auto">
        <table class="tstick" style="width:100%;border-collapse:collapse;white-space:nowrap">
          <thead><tr>${header.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${body.map(r=>'<tr>'+r.map(x=>`<td>${x==null?'–':x}</td>`).join('')+'</tr>').join('')}
            ${foot}
          </tbody>
        </table>
      </div>
      <p class="hint" style="margin-top:10px">
        Kolom penilaian mengikuti pengaturan pada halaman Input Nilai.
        ${mode==='akhir'?'Nilai akhir, predikat, dan keterangan mengikuti perhitungan nilai aplikasi.':''}
      </p>`;

    $v('isiNilai').querySelectorAll('th,td').forEach(x=>{
      x.style.border='1px solid var(--line)';
      x.style.padding='8px';
    });
    $v('isiNilai').querySelectorAll('th').forEach(x=>{
      x.style.background='var(--soft)';
    });
  };

  /* Data untuk laporan: nilai polos (angka/teks), bukan HTML. */
  const dataEkspor=()=>{
    const header=buatHeader();
    const k=nilaiAngka(dataMapel.kktp)??75;
    let foot=[];
    let ringkasan='';

    const rows=siswa.map((s,i)=>{
      const vals=cols.map(c=>ambilNilai(s,c));
      if(mode==='rekap'){
        const a=vals.filter(x=>x!=null);
        return [
          i+1,s.nama,...vals.map(x=>x==null?'':x),
          a.length?S.avg(a):''
        ];
      }
      const akhir=ambilFinal(s);
      return [
        i+1,s.nama,...vals.map(x=>x==null?'':x),
        akhir==null?'':akhir,
        akhir==null?'-':pred(akhir,k),
        akhir==null?'Belum ada nilai':akhir>=k?'Tuntas':'Belum tuntas'
      ];
    });

    if(mode==='rekap'){
      /* Statistik per kolom, termasuk kolom rata-rata di ujung kanan. */
      const kolomData=cols.map((c,ci)=>
        rows.map(r=>r[2+ci]).filter(x=>x!==''&&x!=null)
      );
      kolomData.push(rows.map(r=>r[2+cols.length]).filter(x=>x!==''&&x!=null));
      const stat=[
        ['Nilai tertinggi',a=>Math.max(...a)],
        ['Nilai terendah',a=>Math.min(...a)],
        ['Rata-rata kelas',a=>S.avg(a)]
      ];
      foot=stat.map(([label,fn])=>[
        label,...kolomData.map(a=>a.length?fn(a):'')
      ]);
    }else{
      const ada=rows.filter(r=>r[2+cols.length]!=='');
      const tuntas=ada.filter(r=>r[2+cols.length]>=k).length;
      ringkasan='Tuntas: '+tuntas+' · Belum tuntas: '+(ada.length-tuntas);
    }
    return {header,rows,foot,ringkasan,kktp:k};
  };

  /* Pratinjau: halaman Legal lanskap diperkecil mengikuti lebar layar. */
  const buatPratinjau=async()=>{
    const x=dataEkspor();
    const html=await dokumenLaporan({
      judul:judulLaporan,mapel:mapelAktif,kelas,
      header:x.header,rows:x.rows,foot:x.foot,
      kktp:x.kktp,ringkasan:x.ringkasan,preview:true
    });

    const area=$v('pratinjauLaporan');
    if(!area)return;

    area.innerHTML='';
    const lebarTersedia=Math.max(area.clientWidth-28,280);
    const skala=Math.min(1,lebarTersedia/KERTAS.lebarPx);

    const kertas=document.createElement('div');
    kertas.style.cssText=
      'position:relative;margin:0 auto;background:#fff;'+
      'box-shadow:0 4px 18px #0003;overflow:hidden;'+
      'width:'+(KERTAS.lebarPx*skala)+'px;'+
      'height:'+(KERTAS.tinggiPx*skala)+'px';

    const frame=document.createElement('iframe');
    frame.title='Pratinjau laporan nilai (Legal lanskap)';
    frame.style.cssText=
      'position:absolute;top:0;left:0;border:0;background:#fff;'+
      'width:'+KERTAS.lebarPx+'px;height:'+KERTAS.tinggiPx+'px;'+
      'transform-origin:0 0;transform:scale('+skala+')';
    frame.onload=()=>{
      try{
        const h=Math.max(
          KERTAS.tinggiPx,
          frame.contentDocument.documentElement.scrollHeight
        );
        frame.style.height=h+'px';
        kertas.style.height=(h*skala)+'px';
      }catch(_){}
    };
    frame.srcdoc=html;
    kertas.appendChild(frame);
    area.appendChild(kertas);
  };

  const ekspor=async(jenis)=>{
    /* Jendela cetak dibuka lebih dulu (saat klik) agar tidak diblokir browser. */
    let w=null;
    if(jenis==='pdf'){
      w=window.open('','_blank');
      if(!w){
        S.toast('Izinkan pop-up browser untuk mencetak PDF.',1);
        return;
      }
      w.document.write('<p style="font-family:Arial;padding:20px">Menyiapkan laporan...</p>');
    }
    try{
      const x=dataEkspor();
      await dokumenLaporan({
        judul:judulLaporan,mapel:mapelAktif,kelas,
        header:x.header,rows:x.rows,foot:x.foot,
        kktp:x.kktp,ringkasan:x.ringkasan,jenis,win:w
      });
    }catch(err){
      if(w)w.close();
      S.toast('Gagal membuat laporan: '+err.message,1);
    }
  };

  const gambarUlang=async()=>{
    kelas=$v('kl').value;
    try{
      const [s,n,m]=await Promise.all([
        S.db.list('siswa',{kelas}),
        S.db.list('nilai',{kelas}),
        bacaMapel(mapelAktif,kelas)
      ]);
      siswa=s.sort(nm);
      nilai=n;
      dataMapel=m||{};
      konfigurasi=ambilKonfigurasi(mapelAktif,kelas);
      cols=buatDaftarKolom(konfigurasi,!!dataMapel.praktek);

      if(mode==='akhir'){
        try{
          const f=await finals();
          finalRows=f.rows||[];
        }catch(_){finalRows=[]}
      }
      gambar();
      await buatPratinjau();
    }catch(err){
      S.toast('Gagal memuat data nilai: '+err.message,1);
    }
  };

  $v('kl').addEventListener('change',gambarUlang);
  $v('pdf').onclick=()=>ekspor('pdf');
  $v('xls').onclick=()=>ekspor('excel');
  $v('doc').onclick=()=>ekspor('word');

  await gambarUlang();
}

const nilaiRekap=v=>halamanNilai(v,'rekap');
const nilaiAkhir=v=>halamanNilai(v,'akhir');

/* ═══════════════════════════════════════════════════════════════════════════
   [F4] ANALISIS KETUNTASAN
   ═══════════════════════════════════════════════════════════════════════════ */

async function ketuntasan(v){
  const f=await finals();
  const ok=f.rows.filter(x=>x.akhir!=null);
  const kLabel=[...new Set(ok.map(x=>x.kktp))].sort().join(' / ')||String(f.c.kktp);
  const bel=ok.filter(x=>x.akhir<x.kktp),g={};
  const kkOf=new Map(f.rows.map(x=>[x.s.kelas,x.kktp]));

  f.nl.forEach(n=>{
    (g[n.kelas+'|'+n.jenis+'|'+n.judul]=
      g[n.kelas+'|'+n.jenis+'|'+n.judul]||[]).push(+n.nilai);
  });

  v.innerHTML=mpBar()+`
    <div class="charts">
      <div class="box">
        <h3>Ketuntasan per kelas (% siswa ≥ KKTP ${kLabel})</h3>
        ${K.map(c=>{
          const a=ok.filter(x=>x.s.kelas===c);
          return bar(c,a.length?
            a.filter(x=>x.akhir>=x.kktp).length/a.length*100:null,
            'var(--ok)');
        }).join('')}
      </div>
      <div class="box">
        <h3>Siswa belum tuntas (${bel.length})</h3>
        ${tbl(['Nama','Kelas','Nilai akhir'],
          bel.map(x=>[esc(x.s.nama),x.s.kelas,nc(x.akhir,x.kktp)]),
          'Semua siswa tuntas.')}
        <p style="margin-top:10px">
          <a href="${S.base}pages/pembinaan/remedial.html">Atur remedial →</a>
        </p>
      </div>
    </div>
    <h2>Per penilaian</h2>
    <div class="box">
      ${tbl(['Kelas','Jenis','Judul','Rata-rata','Tuntas'],
        Object.entries(g).sort().map(([x,a])=>{
          const [c,j,t]=x.split('|');
          return [
            c,j,esc(t),n1(S.avg(a)),
            Math.round(a.filter(z=>z>=(kkOf.get(c)??f.c.kktp)).length/a.length*100)+'%'
          ];
        }),'Belum ada nilai.')}
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DAFTAR HALAMAN
   ═══════════════════════════════════════════════════════════════════════════ */

Object.assign(U.PG,{
  'nilai-input':['Penilaian','Input Nilai',nilaiInput],
  'nilai-rekap':['Penilaian','Rekap Nilai',nilaiRekap],
  'nilai-akhir':['Penilaian','Nilai Akhir',nilaiAkhir],
  ketuntasan:['Penilaian','Analisis Ketuntasan',ketuntasan]
});

})();