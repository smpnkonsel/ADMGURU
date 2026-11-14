/* ═══════════════════════════════════════════════════════════════════════════
   [J] PENGATURAN & BANTUAN   (file: bagian/J-PENGATURAN.js)
   [J1] Profil Guru  [J2] Jadwal Mengajar  [J3] Kalender Akademik
   [J4] Pengaturan Aplikasi  [J5] Bantuan
   [J6] Profil Sekolah (identitas sekolah + kepala sekolah + logo kiri/kanan)
        → dipakai kop RCHK (file [L]) dan kop Rekap Nilai / Nilai Akhir (file [F])
   Kalender Akademik: tiap agenda punya tanggal mulai + "sampai" (opsional, untuk rentang). Jenis berawalan "Libur"
   dipakai Presensi (lewat U.liburSet di file [A]) agar hari libur dilewati otomatis.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$,HARI,tag,opt,app,save1,muat,ask,crud,date,fmt,tgl,isLibur,liburSet}=U;

/* ─── [J1] MENU: Pengaturan › Profil Guru (nama, NIP, HP, mapel+kelas, kelas diampu, foto) ─── */
async function profil(v){const g=S.guru,lst=s=>[...new Set(String(s).split(',').map(x=>x.trim()).filter(Boolean))];
  const row=m=>`<div class="mrow"><input class="mn" placeholder="Mata pelajaran, mis. Matematika" value="${e(m.nama)}" aria-label="Mata pelajaran"><input class="mk" placeholder="Kelas mapel ini, mis. 7A, 7B (kosong = semua kelas)" value="${e((m.kelas||[]).join(', '))}" aria-label="Kelas untuk mapel ini"><button type="button" class="btn2 del" data-x>Hapus</button></div>`;
  v.innerHTML=`<div class="box" style="max-width:760px"><div class="fg"><div><label for="pn">Nama lengkap</label><input id="pn" value="${e(g.nama)}"></div><div><label for="pi">NIP</label><input id="pi" value="${e(g.nip)}"></div><div><label for="ph">No. HP</label><input id="ph" value="${e(g.hp)}"></div></div>
  <label>Mata pelajaran yang Anda ajar</label><div id="ml">${(g.mapelList.length?g.mapelList:[{nama:'',kelas:[]}]).map(row).join('')}</div><button type="button" class="btn2 ghost" id="am">+ Tambah mata pelajaran</button>
  <p class="hint">Mengajar lebih dari satu mapel? Tambahkan semuanya. Isi kolom kelas bila mapel itu hanya diajarkan di kelas tertentu. Jangan mengganti nama mapel yang sudah berisi data, karena data lama tidak akan tampil di nama baru.</p>
  <label for="pk">Semua kelas yang Anda ampu (pisahkan koma, tulis bebas)</label><input id="pk" value="${e(g.semuaKelas.join(', '))}" placeholder="mis. 7A, 7B, 8C">
  <p class="hint">Cukup tulis kelas yang benar-benar Anda ajar, misalnya hanya 7A dan 7B. Penulisan seperti 7a, 7 A, atau viiA dirapikan otomatis menjadi <b>VII A</b>.</p>
  <label for="pf">Foto profil (tautan Google Drive)</label><input id="pf" type="url" value="${e(g.foto)}" placeholder="https://drive.google.com/file/d/…/view?usp=sharing">
  <div class="fotoPrev"><span id="pv">${S.avatar('pv',g)}</span><p class="hint">Unggah foto ke Google Drive → klik kanan › Bagikan › ubah akses menjadi <b>“Siapa saja yang memiliki link”</b> → salin link, lalu tempel di sini. Kosongkan untuk memakai inisial nama.</p></div>
  <button class="btn2" id="sv" style="margin-top:14px">Simpan</button>
  <p class="hint" style="margin-top:14px">Akun: <b>${e(S.email)}</b> · ${S.auth.mode==='firebase'?'Data tersimpan di Firebase untuk akun ini.':'Mode percobaan: data tersimpan di peramban ini.'}</p>
  ${S.auth.mode==='firebase'?'<button class="btn2 ghost" id="rp" style="margin-top:8px">Kirim email ganti kata sandi</button>':''}</div>`;
  $('am').onclick=()=>$('ml').insertAdjacentHTML('beforeend',row({nama:'',kelas:[]}));
  $('ml').onclick=ev=>{if(ev.target.dataset.x!==undefined&&$('ml').children.length>1)ev.target.closest('.mrow').remove()};
  $('pf').oninput=()=>{$('pv').innerHTML=S.avatar('pv',{nama:$('pn').value,email:S.email,foto:$('pf').value})};
  if($('rp'))$('rp').onclick=async()=>{try{await S.auth.reset(S.email);S.toast('Email ganti kata sandi terkirim')}catch(er){S.toast(er.message,1)}};
  $('sv').onclick=async()=>{if(!$('pn').value.trim())return S.toast('Nama wajib diisi',1);
    const ml=[...document.querySelectorAll('.mrow')].map(r=>({nama:r.querySelector('.mn').value.trim(),kelas:lst(r.querySelector('.mk').value)})).filter(m=>m.nama),seen=new Set(),mapelList=ml.filter(m=>!seen.has(m.nama.toLowerCase())&&seen.add(m.nama.toLowerCase()));
    if(!mapelList.length)return S.toast('Isi minimal satu mata pelajaran',1);
    const kelas=[...new Set([...lst($('pk').value),...mapelList.flatMap(m=>m.kelas)])].sort(S.kelasSort);
    try{await S.profile.save({nama:$('pn').value.trim(),nip:$('pi').value.trim(),hp:$('ph').value.trim(),foto:$('pf').value.trim(),mapelList,kelas});S.toast('Tersimpan');muat()}catch(er){S.toast(er.message,1)}}}

/* ─── [J2] MENU: Pengaturan › Jadwal Mengajar (hari, jam, kelas, mapel) ─── */
const JAM_LIST=['07.30-08.50','08.50-10.10','10.30-11.50','11.50-13.10']; // sesuaikan dengan jam pelajaran sekolahmu
const jadwal=v=>crud({coll:'jadwal',multi:['jam','kelas','mapel'],sort:(a,b)=>HARI.indexOf(a.hari)-HARI.indexOf(b.hari)||(a.jam||'').localeCompare(b.jam||''),f:[{k:'hari',l:'Hari',t:'select',o:HARI},{k:'jam',l:'Jam (pilih atau ketik, mis. 07.30-08.50)',r:1,list:JAM_LIST},{k:'kelas',l:'Kelas',t:'select',o:K},{k:'mapel',l:'Mapel',t:'select',o:G.mapelList.map(m=>m.nama),d:()=>G.mapel}],cols:[['hari','Hari'],['jam','Jam'],['kelas','Kelas'],['mapel','Mapel',r=>e(r.mapel||'-')]]})(v);

/* ─── [J3] MENU: Pengaturan › Kalender Akademik
   Data per agenda: tanggal (mulai), sampai (opsional), jenis, ket.
   Jenis berawalan "Libur" = bukan hari efektif; dibaca Presensi lewat U.liburSet.
   Tombol "Impor dari file PDF" membaca PDF Kalender Pendidikan Dinas (PDF teks, bukan scan) → pratinjau → simpan.
   Pratinjau juga mencocokkan Hari Belajar Efektif (HBE) per bulan dengan angka yang tertulis di PDF.
   Tombol "Impor Kalender Konsel 2024/2025" tetap ada (data tertanam KONSEL_2425). ─── */
const JENIS=['Hari efektif','Libur','Libur semester','Ujian','Kegiatan'],
  rentang=r=>e(r.sampai&&r.sampai!==r.tanggal?`${fmt(r.tanggal)} – ${fmt(r.sampai)}`:fmt(r.tanggal));

/* Data dari PDF Kalender Pendidikan Kab. Konawe Selatan TP 2024/2025. Format: [mulai, sampai, jenis, ket] */
const KONSEL_2425=[
['2024-07-01','2024-07-08','Libur semester','PPDB Tahun Pelajaran 2024/2025'],
['2024-07-08','2024-07-10','Kegiatan','Awal masuk sekolah / Asesmen awal / MPLS SMP'],
['2024-08-17','','Libur','HUT Kemerdekaan RI'],
['2024-09-02','2024-09-07','Kegiatan','Persiapan/Gladi bersih ANBK SMP'],
['2024-09-09','2024-09-14','Ujian','Pelaksanaan ANBK SMP'],
['2024-09-16','','Libur','Maulid Nabi Muhammad SAW'],
['2024-09-23','2024-09-28','Ujian','Pelaksanaan PTS/STS Ganjil'],
['2024-12-09','2024-12-14','Ujian','Pelaksanaan PAS/SAS Ganjil'],
['2024-12-16','2024-12-20','Kegiatan','Pengolahan nilai & PORSENI/Ekskul'],
['2024-12-21','','Kegiatan','Penyerahan Buku Laporan Pendidikan (Ganjil)'],
['2024-12-22','2024-12-31','Libur semester','Libur Semester Ganjil'],
['2024-12-25','2024-12-26','Libur','Hari Raya Natal & Cuti Bersama'],
['2025-01-01','','Libur','Tahun Baru Masehi'],
['2025-01-27','','Libur','Isra Mi\'raj Nabi Muhammad SAW'],
['2025-01-29','','Libur','Tahun Baru Imlek'],
['2025-03-03','2025-03-08','Kegiatan','Pelaksanaan Pesantren Ramadhan'],
['2025-03-10','2025-03-15','Ujian','Pelaksanaan PTS/STS Genap'],
['2025-03-26','2025-03-31','Libur','Perkiraan libur sekitar Idul Fitri'],
['2025-03-29','','Libur','Hari libur 29 Maret (di PDF tertulis "Wafat Isa Almasih", mohon cek)'],
['2025-04-01','','Libur','Hari Raya Idul Fitri'],
['2025-04-02','2025-04-07','Libur','Perkiraan libur Idul Fitri'],
['2025-04-18','','Libur','Wafat Isa Al-Masih'],
['2025-05-01','','Libur','Hari Buruh Nasional'],
['2025-05-02','','Libur','HUT Konsel / Hardiknas'],
['2025-05-13','','Libur','Hari Raya Waisak'],
['2025-05-13','2025-05-18','Ujian','Pelaksanaan US/USBN SMP (menunggu petunjuk Kemdikbudristek)'],
['2025-05-29','','Libur','Kenaikan Isa Almasih'],
['2025-06-01','','Libur','Hari Lahir Pancasila'],
['2025-06-02','2025-06-09','Ujian','Pelaksanaan PAS/SAS Genap'],
['2025-06-07','','Libur','Hari Raya Idul Adha'],
['2025-06-10','2025-06-20','Kegiatan','Pengolahan nilai & PORSENI/Ekskul'],
['2025-06-21','','Kegiatan','Penyerahan Buku Laporan Pendidikan (Genap)'],
['2025-06-23','2025-06-30','Libur semester','Libur kenaikan kelas (keterangan di PDF kosong, mohon cek)']
];

/* Hari belajar efektif per bulan: Senin–Sabtu yang tidak termasuk tanggal libur. Rentang bulan mengikuti data kalender. */
function hbePerBulan(rows){const libur=liburSet(rows),hasil={},ts=rows.map(r=>r.tanggal).filter(Boolean).sort();
  if(!ts.length)return hasil;
  const [y0,m0]=ts[0].split('-').map(Number),[y1,m1]=ts.at(-1).split('-').map(Number);
  for(let d=new Date(y0,m0-1,1);d<=new Date(y1,m1,0);d.setDate(d.getDate()+1)){
    const k=tgl(d).slice(0,7);hasil[k]=hasil[k]||0;
    if(d.getDay()===0||libur.has(tgl(d)))continue;
    hasil[k]++}
  return hasil}

/* ═══ Pembaca PDF Kalender Pendidikan (satu objek PDFKAL, tidak menambah nama global lain) ═══
   baca(file)      → daftar baris teks PDF (pdf.js dimuat dari cdnjs saat pertama dipakai)
   parse(baris)    → {agenda:[{tanggal,sampai,jenis,ket,cat?}], hbe:{'2024-07':21,…}, y1, y2}
   banding(rows,y1,y2) → HBE per bulan "gaya PDF Dinas" dari agenda yang dipilih            */
const PDFKAL=(()=>{
  const NAMA=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
    BLN={jan:1,feb:2,mar:3,apr:4,mei:5,jun:6,jul:7,agu:8,sep:9,okt:10,nov:11,des:12},
    RX_AGENDA=/(^|[^\d/])(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Juni?|Juli?|Agu(?:stus)?|Sep(?:t(?:ember)?)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\.?\s*:/gi,
    RX_HBE=/HBE\s*=\s*(\d+)\s*\/\s*ME\s*=\s*(\d+)\s*\(SMP\)/gi,
    p2=n=>String(n).padStart(2,'0'),
    iso=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`,
    obj=s=>new Date(s+'T00:00:00'),
    PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

  const jenisDari=k=>
    /libur semester|PPDB/i.test(k)?'Libur semester':
    /^(persiapan|gladi)/i.test(k)?'Kegiatan':
    /pelaksanaan\s+(PTS|STS|PAS|SAS|ANBK|US)/i.test(k)?'Ujian':
    /libur|hari raya|tahun baru|natal|wafat|maulid|isra|kenaikan|waisak|buruh|pancasila|kemerdekaan|cuti|imlek|hardiknas/i.test(k)?'Libur':'Kegiatan';

  async function baca(file){
    if(!window.pdfjsLib){
      await new Promise((ok,gagal)=>{const s=document.createElement('script');s.src=PDFJS+'pdf.min.js';s.onload=ok;
        s.onerror=()=>gagal(new Error('Gagal memuat pdf.js. Periksa koneksi internet.'));document.head.appendChild(s)});
      pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'}
    let pdf;
    try{pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise}
    catch(er){throw new Error('PDF tidak dapat dibuka (rusak atau diproteksi password).')}
    const baris=[];
    for(let p=1;p<=pdf.numPages;p++){
      const tc=await(await pdf.getPage(p)).getTextContent(),rows=[];
      tc.items.forEach(it=>{if(!it.str.trim())return;
        const y=it.transform[5],x=it.transform[4];let r=rows.find(r=>Math.abs(r.y-y)<2);
        if(!r)rows.push(r={y,it:[]});r.it.push({x,s:it.str})});
      rows.sort((a,b)=>b.y-a.y).forEach(r=>baris.push(r.it.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim()))}
    return baris}

  function parse(baris){
    const th=baris.join('\n').match(/(\d{4})\s*\/\s*(\d{4})/);
    if(!th)throw new Error('Tahun pelajaran (mis. 2024/2025) tidak ditemukan. PDF mungkin hasil scan/foto atau bukan kalender pendidikan.');
    const y1=+th[1],y2=+th[2],agenda=[],lihat=new Set(),hb=[];
    baris.forEach(row=>{
      for(const m of row.matchAll(RX_HBE))hb.push(+m[1]);
      const ms=[...row.matchAll(RX_AGENDA)];
      ms.forEach((m,i)=>{
        const bln=BLN[m[4].slice(0,3).toLowerCase()],thn=bln>=7?y1:y2,
          akhir=i+1<ms.length?ms[i+1].index+ms[i+1][1].length:undefined,
          ket=row.slice(m.index+m[0].length,akhir).replace(/\s*\*\s*SEMESTER\s+(GANJIL|GENAP).*$/i,'').trim();
        if(/\b(SD|MI|SDLB|PAUD)\b|Paket A/.test(ket)&&!/SMP|MTs|Paket B/.test(ket))return; // agenda khusus SD/MI
        const tg=n=>`${thn}-${p2(bln)}-${p2(n)}`,a=+m[2],z=m[3]?+m[3]:0,
          r={tanggal:tg(a),sampai:z>a?tg(z):'',jenis:ket?jenisDari(ket):'Libur semester',ket:ket||'(keterangan di PDF kosong, mohon cek)'},
          kunci=r.tanggal+'|'+r.ket;
        if(!lihat.has(kunci)){lihat.add(kunci);agenda.push(r)}})});
    /* Libur semester yang berakhir di hari yang sama dengan awal agenda lain (mis. PPDB 1–8 Juli & MPLS 8–10 Juli): akhir libur dimajukan 1 hari */
    agenda.forEach(r=>{
      if(r.jenis==='Libur semester'&&r.sampai&&agenda.some(x=>x!==r&&!/^Libur/i.test(x.jenis)&&x.tanggal===r.sampai)){
        const d=obj(r.sampai);d.setDate(d.getDate()-1);
        r.sampai=iso(d)>r.tanggal?iso(d):'';r.cat='Tanggal akhir dimajukan 1 hari karena bertumpuk dengan agenda berikutnya'}});
    agenda.sort((a,b)=>a.tanggal.localeCompare(b.tanggal));
    const hbe={};
    if(hb.length===12)hb.forEach((n,i)=>{const b=(6+i)%12+1;hbe[`${b>=7?y1:y2}-${p2(b)}`]=n});
    return{agenda,hbe,y1,y2}}

  /* Cara PDF Dinas menghitung HBE: Senin–Sabtu, di luar Libur*, PAS/SAS, ANBK, US, pengolahan nilai/PORSENI,
     penyerahan buku laporan, dan Pesantren Ramadhan. MPLS, gladi bersih, dan PTS/STS tetap dihitung efektif. */
  const efektif=r=>/^Libur/i.test(r.jenis)?false:
    r.jenis==='Ujian'?/PTS|STS/i.test(r.ket):
    r.jenis==='Kegiatan'?/awal masuk|MPLS|persiapan|gladi/i.test(r.ket):true;

  function banding(rows,y1,y2){
    const non=new Set(),hasil={};
    rows.forEach(r=>{if(!r.tanggal||efektif(r))return;
      for(let d=obj(r.tanggal),z=obj(r.sampai||r.tanggal);d<=z;d.setDate(d.getDate()+1))non.add(iso(d))});
    for(let d=new Date(y1,6,1);d<=new Date(y2,5,30);d.setDate(d.getDate()+1)){
      const k=iso(d).slice(0,7),o=hasil[k]=hasil[k]||{n:0,hari:[]};
      if(d.getDay()!==0&&!non.has(iso(d))){o.n++;o.hari.push(d.getDate())}}
    return hasil}

  return{baca,parse,banding,NAMA}})();

/* grup (opsional, didukung crud di [C]): label kelompok tabel. Juli–Des = Semester Ganjil TP th/th+1, Jan–Jun = Semester Genap TP th-1/th */
const semesterDari=r=>{const th=+(r.tanggal||'').slice(0,4),b=+(r.tanggal||'').slice(5,7);
  return!th?'Tanpa tanggal':b>=7?`Semester Ganjil ${th}/${th+1}`:`Semester Genap ${th-1}/${th}`};
const kalenderCrud=crud({coll:'kalender',grup:semesterDari,sort:(a,b)=>(a.tanggal||'').localeCompare(b.tanggal||''),
  f:[date('tanggal','Tanggal mulai'),date('sampai','Sampai tanggal (kosongkan bila 1 hari)'),{k:'jenis',l:'Jenis',t:'select',o:JENIS},{k:'ket',l:'Keterangan'}],
  cols:[['tanggal','Tanggal',rentang],['jenis','Jenis',r=>tag(e(r.jenis),isLibur(r.jenis)?'b':r.jenis==='Ujian'?'w':'n')],['ket','Keterangan']]});

async function kalender(v){
  v.innerHTML=`<div class="box" style="max-width:760px"><button class="btn2" id="kp">Impor dari file PDF</button>
    <input type="file" id="kf" accept="application/pdf" style="display:none">
    <button class="btn2 ghost" id="ki">Impor Kalender Konsel 2024/2025</button> <button class="btn2 ghost" id="kh">Hitung hari efektif</button>
    <p class="hint">Jenis berawalan <b>Libur</b> dilewati otomatis di Presensi. <b>Impor dari file PDF</b> membaca Kalender Pendidikan Dinas (harus PDF teks, bukan hasil scan/foto), menampilkan pratinjau yang bisa diedit, lalu mencocokkan HBE per bulan dengan angka di PDF. Agenda yang sudah ada tidak ditimpa.</p><div id="kr"></div></div><div id="kt"></div>`;

  const q=s=>$('kr').querySelector(s);

  $('kp').onclick=()=>$('kf').click();
  $('kf').onchange=async ev=>{
    const f=ev.target.files[0];ev.target.value='';if(!f)return;
    try{S.toast('Membaca PDF…');
      const hasil=PDFKAL.parse(await PDFKAL.baca(f));
      if(!hasil.agenda.length)return S.toast('Tidak ada agenda terbaca. PDF mungkin hasil scan/foto.',1);
      const ada=await S.db.list('kalender',{},1);
      pratinjau(hasil,ada)}
    catch(er){S.toast(er.message,1)}};

  function pratinjau(hasil,ada){
    const {agenda:ag,hbe,y1,y2}=hasil,
      kunciLama=new Set(ada.flatMap(x=>[x.tanggal+'|'+(x.sampai||'')+'|'+x.jenis,x.tanggal+'|'+(x.ket||'')])),
      sudah=ag.map(r=>kunciLama.has(r.tanggal+'|'+(r.sampai||'')+'|'+r.jenis)||kunciLama.has(r.tanggal+'|'+r.ket));
    const ganjil=i=>ag[i].tanggal.slice(0,4)===String(y1)&&ag[i].tanggal.slice(5,7)>='07',
      barisAg=i=>{const r=ag[i];return`<tr><td><input type="checkbox" data-i="${i}"${sudah[i]?'':' checked'}></td><td>${rentang(r)}</td>
        <td><select data-j="${i}">${JENIS.map(j=>`<option${j===r.jenis?' selected':''}>${e(j)}</option>`).join('')}</select></td>
        <td><input data-k="${i}" value="${e(r.ket)}" style="width:100%">${sudah[i]?'<div class="hint">Sudah ada di kalender, tidak dicentang.</div>':''}${r.cat?`<div class="hint">${e(r.cat)}</div>`:''}</td></tr>`},
      tabelAg=(judul,idx)=>`<h4 style="margin:14px 0 4px">${judul} <span class="hint">(${idx.length} agenda)</span></h4>
        <div style="overflow-x:auto"><table class="tbl"><tbody>${idx.map(barisAg).join('')||'<tr><td class="hint">Tidak ada agenda.</td></tr>'}</tbody></table></div>`,
      semua=ag.map((_,i)=>i);
    $('kr').innerHTML=`<p style="margin-top:10px"><b>${ag.length} agenda terbaca</b> dari kalender TP ${y1}/${y2}. Periksa, ubah jenis/keterangan bila perlu, hapus centang yang tidak diperlukan.</p>`
      +tabelAg(`Semester Ganjil (Juli–Desember ${y1})`,semua.filter(ganjil))
      +tabelAg(`Semester Genap (Januari–Juni ${y2})`,semua.filter(i=>!ganjil(i)))
      +`<div id="kb"></div><button class="btn2" id="ks" style="margin-top:8px">Simpan agenda terpilih</button>`;

    const ambil=()=>ag.map((r,i)=>({tanggal:r.tanggal,sampai:r.sampai,jenis:q(`[data-j="${i}"]`).value,ket:q(`[data-k="${i}"]`).value.trim(),pilih:q(`[data-i="${i}"]`).checked}));

    function cocokkan(){
      const kb=q('#kb');
      if(Object.keys(hbe).length!==12){kb.innerHTML='<p class="hint" style="margin-top:10px">Angka HBE per bulan tidak ditemukan di PDF, pencocokan dilewati.</p>';return}
      const rows=ambil().filter(r=>r.pilih),hit=PDFKAL.banding(rows,y1,y2),ks=Object.keys(hbe).sort();
      let cocok=0;
      const status=(a,b)=>a===b?'✓ cocok':`⚠ selisih ${b-a>0?'+':''}${b-a}`,
        bagian=(judul,kunci)=>{let sa=0,sb=0;
          const tr=kunci.map(k=>{const [th,bl]=k.split('-'),a=hbe[k],b=hit[k]?hit[k].n:0;sa+=a;sb+=b;if(a===b)cocok++;
            return`<tr><td>${PDFKAL.NAMA[+bl-1]} ${th}</td><td>${a}</td><td>${b}</td><td>${status(a,b)}</td></tr>`+
              (a===b?'':`<tr><td colspan="4" class="hint">Tanggal yang terhitung efektif: ${hit[k]&&hit[k].hari.length?hit[k].hari.join(', '):'tidak ada'}. Bandingkan dengan kotak putih (tanpa warna) pada bulan ini di PDF, lalu tambah/ubah agenda yang kurang.</td></tr>`)}).join('');
          return`<h4 style="margin:14px 0 4px">${judul}</h4><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bulan</th><th>HBE PDF</th><th>Hitungan aplikasi</th><th>Status</th></tr></thead><tbody>${tr}
            <tr><td><b>Jumlah</b></td><td><b>${sa}</b></td><td><b>${sb}</b></td><td>${status(sa,sb)}</td></tr></tbody></table></div>`},
        gj=bagian(`HBE Semester Ganjil (Juli–Desember ${y1})`,ks.filter(k=>+k.slice(5)>=7)),
        gn=bagian(`HBE Semester Genap (Januari–Juni ${y2})`,ks.filter(k=>+k.slice(5)<7));
      kb.innerHTML=`<p style="margin-top:12px"><b>Pencocokan HBE dengan PDF:</b> ${cocok} dari 12 bulan cocok. Total HBE di PDF: ${ks.reduce((s,k)=>s+hbe[k],0)} hari.</p>`+gj+gn+
        `<p class="hint">Selisih tidak selalu berarti salah baca: kotak berwarna di PDF kadang tidak sama dengan tulisan keterangannya. Anda bisa menyimpan dulu lalu memperbaiki lewat tabel agenda di bawah.</p>`}

    $('kr').oninput=$('kr').onchange=ev=>{if(ev.target.closest('table')&&ev.target.closest('#kb')==null)cocokkan()};
    cocokkan();

    q('#ks').onclick=async()=>{
      try{const lama=await S.db.list('kalender',{},1),
          kunci=new Set(lama.flatMap(x=>[x.tanggal+'|'+(x.sampai||'')+'|'+x.jenis,x.tanggal+'|'+(x.ket||'')])),
          baru=ambil().filter(r=>r.pilih&&r.ket&&!kunci.has(r.tanggal+'|'+(r.sampai||'')+'|'+r.jenis)&&!kunci.has(r.tanggal+'|'+r.ket))
            .map(({tanggal,sampai,jenis,ket})=>({tanggal,sampai,jenis,ket}));
        if(!baru.length)return S.toast('Tidak ada agenda baru untuk disimpan');
        await S.db.addMany('kalender',baru);$('kr').innerHTML='';S.toast(baru.length+' agenda diimpor');muat()}
      catch(er){S.toast(er.message,1)}}}

  $('ki').onclick=async()=>{
    try{const ada=await S.db.list('kalender',{},1),kunci=new Set(ada.map(x=>x.tanggal+'|'+(x.ket||''))),
        baru=KONSEL_2425.filter(([t,,,k])=>!kunci.has(t+'|'+k)).map(([tanggal,sampai,jenis,ket])=>({tanggal,sampai,jenis,ket}));
      if(!baru.length)return S.toast('Semua agenda sudah ada');
      await S.db.addMany('kalender',baru);S.toast(baru.length+' agenda diimpor');muat()}
    catch(er){S.toast(er.message,1)}};
  $('kh').onclick=async()=>{const h=hbePerBulan(await S.db.list('kalender',{},1)),tot=Object.values(h).reduce((a,b)=>a+b,0);
    $('kr').innerHTML=tot||Object.keys(h).length?'<p style="margin-top:10px">'+Object.entries(h).map(([k,n])=>`<b>${e(k)}</b>: ${n} hari`).join(' · ')+`<br><b>Total: ${tot} hari</b> <span class="hint">(Senin–Sabtu, di luar agenda berjenis Libur)</span></p>`:'<p class="hint" style="margin-top:10px">Belum ada agenda kalender.</p>'};
  kalenderCrud($('kt'))}

/* ─── [J4] MENU: Pengaturan › Pengaturan Aplikasi (tahun ajaran, semester, batas hadir/poin, cadangan JSON) ─── */
async function aplikasi(v){const a=await app();
  v.innerHTML=`<div class="box" style="max-width:620px"><div class="fg"><div><label for="ta">Tahun ajaran</label><input id="ta" value="${e(a.tahun)}"></div><div><label for="sm">Semester</label><select id="sm">${opt(['Ganjil','Genap'],a.semester)}</select></div><div><label for="bh">Batas kehadiran minimal (%)</label><input id="bh" type="number" value="${a.hadir}"></div><div><label for="bp">Batas poin pelanggaran</label><input id="bp" type="number" value="${a.poin}"></div></div><button class="btn2" id="sv" style="margin-top:14px">Simpan</button></div>
  <h2>Cadangan data</h2><div class="box" style="max-width:620px"><p style="color:var(--mute);margin-bottom:10px">${S.db.mode==='lokal'?'Mode percobaan: data tersimpan di peramban ini. Unduh cadangan secara berkala.':'Data akun Anda tersimpan di Firebase.'}</p><button class="btn2 ghost" id="bk">Unduh cadangan (JSON)</button> ${S.db.mode==='lokal'?'<button class="btn2 del" id="rs">Hapus semua data akun ini</button>':''}</div>`;
  $('sv').onclick=async()=>{await save1('pengaturan',{tahun:$('ta').value.trim(),semester:$('sm').value,hadir:+$('bh').value,poin:+$('bp').value,lewati:a.lewati||[]});S.toast('Tersimpan')};
  $('bk').onclick=async()=>{const o={profil:{...G}};for(const c of S.db.KOLEKSI)o[c]=await S.db.list(c,{},1);const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));l.download='adm-cadangan.json';l.click()};
  if($('rs'))$('rs').onclick=async()=>{if(await ask('Hapus <b>SEMUA</b> data akun ini di peramban? Tindakan ini tidak bisa dibatalkan.','Hapus semua')){for(const c of S.db.KOLEKSI)for(const x of await S.db.list(c,{},1))await S.db.remove(c,x.id);U.hapusKolomLokal();S.toast('Data dihapus');muat()}}}

/* ─── [J5] MENU: Bantuan (panduan singkat) ─── */
function bantuan(v){
  const B=S.base+'pages/';
  const a=(p,t)=>`<a href="${B}${p}.html">${t}</a>`;
  const sec=(judul,isi,buka)=>`<details class="box" style="margin-bottom:10px"${buka?' open':''}><summary style="cursor:pointer;font-weight:700">${judul}</summary><div style="line-height:1.7;margin-top:8px">${isi}</div></details>`;
  v.innerHTML=`<div style="max-width:820px">`+
  sec('1. Langkah awal (urutan yang disarankan)',`<ol style="padding-left:20px">
    <li>Daftar atau masuk, lalu lengkapi ${a('pengaturan/profil','Pengaturan › Profil Guru')}: nama, mapel yang diajar, kelas yang diampu, dan foto.</li>
    <li>Isi ${a('pengaturan/sekolah','Profil Sekolah')} (nama sekolah, kepala sekolah, logo). Data ini dipakai pada kop laporan dan surat.</li>
    <li>Isi ${a('data-master/siswa','Data Siswa')} (satu per satu atau import Excel dari template).</li>
    <li>Atur ${a('data-master/mapel','Data Mapel')}: KKTP dan bobot Formatif/Sumatif/Ujian untuk tiap tingkat. <b>Isi sebelum memakai menu Penilaian.</b></li>
    <li>Isi ${a('pengaturan/jadwal','Jadwal Mengajar')} dan ${a('pengaturan/kalender','Kalender Akademik')} agar kartu presensi dan hari libur bekerja.</li>
    <li>Mulai bekerja: Presensi, Input Nilai, Jurnal, dan seterusnya.</li></ol>`,1)+
  sec('2. Cara kerja alur pembelajaran',`<p>Menu <b>Pembelajaran</b> saling terhubung dan dikerjakan berurutan:</p>
    <p><b>Materi Ajar</b> (BAB dan subbab) → <b>Tujuan Pembelajaran</b> (TP per subbab, kode otomatis) → <b>Jurnal Mengajar</b> (materi, TP, kegiatan, penilaian) → <b>Evaluasi Ketercapaian TP</b> (nilai tiap TP, status, dan tindak lanjut).</p>
    <p>Subbab atau TP yang sudah dipakai di tahap berikutnya tidak bisa dihapus, supaya data tidak putus. Nama BAB boleh diubah kapan saja.</p>`)+
  sec('3. Penilaian dan KKTP',`<p>${a('penilaian/input-nilai','Input Nilai')} berbentuk tabel: Formatif dikelompokkan per <b>LM</b> (bab) dan <b>TG</b> (tugas), lalu Sumatif (UH) dan Ujian (PTS, SAS). Susunan kolom diatur dengan tombol + / − dan disimpan per mapel dan tingkat.</p>
    <p>${a('penilaian/rekap-nilai','Rekap Nilai')} dan ${a('penilaian/nilai-akhir','Nilai Akhir')} mengikuti susunan itu. Nilai akhir = rata-rata tiap jenis × bobot di Data Mapel. Komponen yang belum diisi tidak dihitung nol.</p>
    <p><b>KKTP berlaku per tingkat</b> (VII, VIII, IX). Dasbor, Leger, Ketuntasan, Remedial, Pengayaan, Evaluasi TP, notifikasi, dan surat semuanya memakai KKTP tingkat siswa yang bersangkutan.</p>`)+
  sec('4. Presensi dan jurnal',`<p>Di ${a('presensi/input','Input Presensi')}, klik kartu jadwal, lalu pilih Hadir, Izin, Sakit, atau Alpa untuk tiap siswa. Presensi tersimpan otomatis setelah semua siswa terisi. Jadwal yang terlewat muncul di daftar tersendiri; hari <i>Libur</i> di Kalender Akademik dilewati otomatis.</p>
    <p>Data presensi dipakai di Jurnal (kolom H-S-I-A), Dasbor, Rekap, dan Notifikasi.</p>`)+
  sec('5. Pembinaan siswa',`<p><b>Remedial</b> dan <b>Pengayaan</b> menampilkan siswa di bawah atau di atas KKTP <b>per BAB</b>, dihitung dari nilai TG dan UH sesuai bobot. Ubah status remedial menjadi <i>Selesai</i> agar hilang dari peringatan Dasbor. <b>Pelanggaran</b> mengumpulkan poin; batas poin diatur di Pengaturan Aplikasi.</p>`)+
  sec('6. Laporan dan komunikasi',`<p>Laporan (Leger, Rekap Presensi, Laporan Siswa, Grafik) dihitung otomatis dan bisa dicetak. Di Komunikasi, ${a('komunikasi/notifikasi','Notifikasi Orang Tua')} membuka WhatsApp dengan pesan siap kirim (nomor HP diambil dari Data Siswa), dan ${a('komunikasi/surat','Surat Otomatis')} membuat surat cetak dengan kop sekolah.</p>`)+
  sec('7. Wali Murid (RCHK)',`<p>Siswa wali muncul otomatis di Identitas Siswa bila di Data Siswa kolom <i>Siswa wali saya</i> berisi <b>Ya</b>. Isi jumlah hari 7 Kebiasaan tiap bulan di Isi RCHK Bulanan, lalu lihat Rekap Bulan, Semester, dan Tahun. Siswa pindah atau baru masuk diatur lewat kolom Status.</p>`)+
  sec('8. Cadangan dan keamanan data',`<p>Unduh cadangan berkala di ${a('pengaturan/aplikasi','Pengaturan Aplikasi')}. Dengan Firebase, data tiap akun tersimpan terpisah dan hanya bisa dibuka akun itu. Pada mode percobaan, data hanya ada di peramban ini, jadi cadangan sangat penting.</p>`)+
  sec('9. Jika ada masalah',`<ul style="padding-left:20px">
    <li><b>Halaman kosong atau pesan "Terjadi kesalahan":</b> muat ulang (Ctrl+F5). Bila tetap, periksa koneksi internet lalu masuk ulang.</li>
    <li><b>Pilihan kelas kosong:</b> tambahkan kelas di Profil Guru.</li>
    <li><b>Remedial/Pengayaan kosong:</b> pastikan nilai TG dan UH tiap BAB sudah lengkap, dan bobot di Data Mapel sudah disimpan.</li>
    <li><b>Nilai akhir atau KKTP tidak sesuai:</b> cek Data Mapel untuk tingkat kelas tersebut.</li>
    <li><b>Siswa wali tidak muncul:</b> pastikan kolom <i>Siswa wali saya</i> = Ya di Data Siswa.</li>
    <li><b>Tidak bisa masuk dengan Google:</b> pastikan domain situs sudah ada di Firebase › Authentication › Authorized domains.</li>
    <li><b>Grafik atau import Excel gagal:</b> keduanya memerlukan internet untuk memuat pustaka.</li></ul>`)+
  `</div>`}

/* ─── [J6] MENU: Pengaturan › Profil Sekolah  (dipindah dari file [L])
       Satu profil untuk semua laporan: kop RCHK (Wali Murid) dan kop Rekap/Nilai Akhir (Penilaian).
       Isi: identitas sekolah + kepala sekolah + LOGO KIRI/KANAN.
       Data dibaca lewat U.wkp (didefinisikan di file [L]) dan disimpan di koleksi 'wkprofil'. ─── */

/* Logo: hanya http(s) atau data gambar hasil unggah (bukan SVG). */
const logoAman=x=>{
  const s=String(x||'').trim();
  return /^https?:\/\//i.test(s)||
    /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/i.test(s)?s:'';
};

/* Baca file gambar → dikecilkan (maks. 240 px) → data URL.
   PNG dipertahankan agar transparan; JPEG dipakai hanya bila PNG terlalu besar. */
const logoDariFile=file=>new Promise((ok,gagal)=>{
  if(!file||!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type))
    return gagal(new Error('Gunakan gambar PNG, JPG, atau WEBP.'));
  if(file.size>5*1024*1024)
    return gagal(new Error('Ukuran gambar maksimal 5 MB.'));
  const fr=new FileReader();
  fr.onerror=()=>gagal(new Error('Gagal membaca file gambar.'));
  fr.onload=()=>{
    const img=new Image();
    img.onerror=()=>gagal(new Error('File bukan gambar yang valid.'));
    img.onload=()=>{
      const r=Math.min(1,240/Math.max(img.width,img.height));
      const w=Math.max(1,Math.round(img.width*r));
      const h=Math.max(1,Math.round(img.height*r));
      const cv=document.createElement('canvas');
      cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      let out=cv.toDataURL('image/png');
      if(out.length>250000){
        const c2=document.createElement('canvas');
        c2.width=w;c2.height=h;
        const x=c2.getContext('2d');
        x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
        out=c2.toDataURL('image/jpeg',.85);
      }
      if(out.length>400000)
        return gagal(new Error('Gambar masih terlalu besar, gunakan gambar yang lebih sederhana.'));
      ok(out);
    };
    img.src=fr.result;
  };
  fr.readAsDataURL(file);
});

async function sekolah(v){
  const [p,a]=await Promise.all([U.wkp(),app()]);
  const F=[
    ['pemda','Kop baris 1 (pemerintah daerah)'],
    ['dinas','Kop baris 2 (dinas)'],
    ['sekolah','Nama sekolah'],
    ['alamat','Alamat sekolah (baris bawah kop)'],
    ['npsn','NPSN'],
    ['jenjang','Jenjang',['SD','MI','SMP','MTs','SMA','SMK','MA']],
    ['provinsi','Provinsi'],
    ['kab','Kota/Kabupaten'],
    ['kecamatan','Kecamatan'],
    ['kepsek','Nama kepala sekolah'],
    ['nipKepsek','NIP kepala sekolah']
  ];
  /* Contoh isian (placeholder) agar kop sesuai format surat resmi. */
  const PH={
    pemda:'Pemerintah Kabupaten Konawe Selatan',
    dinas:'Dinas Pendidikan dan Kebudayaan',
    sekolah:'SMP Negeri 20 Konawe Selatan',
    kecamatan:'Sabulakoa',
    alamat:'Jl. Sabulakoa - Landono Desa Sabulakoa Kec. Sabulakoa, Kode Pos 93373'
  };
  const L=[
    ['logoKiri','Logo kiri','mis. Tut Wuri Handayani'],
    ['logoKanan','Logo kanan','mis. logo sekolah / daerah']
  ];
  const logo={logoKiri:logoAman(p.logoKiri),logoKanan:logoAman(p.logoKanan)};

  v.innerHTML=`<div class="box" style="max-width:760px">
    <div class="fg">${F.map(([k,l,o])=>`<div><label for="w_${k}">${l}</label>${
      o?`<select id="w_${k}">${opt(o,p[k])}</select>`
       :`<input id="w_${k}" value="${e(p[k])}" placeholder="${e(PH[k]||'')}">`}</div>`).join('')}</div>

    <h4 style="margin:18px 0 8px">Logo kop laporan (opsional)</h4>
    <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      ${L.map(([k,l,h])=>`
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div id="lg_${k}" style="width:84px;height:84px;display:flex;
            align-items:center;justify-content:center;border:1px dashed var(--line);
            border-radius:10px;background:var(--soft);overflow:hidden;
            font-size:11px;color:var(--mute);text-align:center"></div>
          <div>
            <b style="display:block">${l}</b>
            <span style="display:block;font-size:11px;color:var(--mute);margin-bottom:6px">${h}</span>
            <label class="btn2 ghost" style="cursor:pointer;display:inline-block">
              Pilih gambar
              <input type="file" id="lf_${k}" accept="image/png,image/jpeg,image/webp"
                style="display:none">
            </label>
            <button type="button" class="btn2 ghost" id="lh_${k}">Hapus</button>
          </div>
        </div>`).join('')}
    </div>
    <p class="hint">Format PNG/JPG/WEBP, maksimal 5 MB, otomatis dikecilkan.
      PNG transparan disarankan.</p>

    <p class="hint">Data ini dipakai pada kop <b>RCHK (Wali Murid)</b> dan kop <b>Rekap Nilai / Nilai Akhir (Penilaian)</b>.
      Tahun ajaran: <b>${e(a.tahun)}</b> · Semester: <b>${e(a.semester)}</b> (ubah di Pengaturan › Pengaturan Aplikasi).
      Nama dan NIP guru/wali kelas diambil dari Profil Guru.</p>
    <button class="btn2" id="sv" style="margin-top:10px">Simpan</button>
  </div>`;

  const gambarLogo=k=>{
    $('lg_'+k).innerHTML=logo[k]?
      `<img src="${e(logo[k])}" alt="${k}" style="max-width:100%;max-height:100%;object-fit:contain">`:
      'Belum ada<br>logo';
  };
  L.forEach(([k])=>{
    gambarLogo(k);
    $('lf_'+k).addEventListener('change',async ev=>{
      const f=ev.target.files&&ev.target.files[0];
      ev.target.value='';
      if(!f)return;
      try{
        logo[k]=await logoDariFile(f);
        gambarLogo(k);
        S.toast('Logo dimuat. Tekan Simpan untuk menyimpan.');
      }catch(er){S.toast(er.message,1)}
    });
    $('lh_'+k).onclick=()=>{logo[k]='';gambarLogo(k)};
  });

  $('sv').onclick=async()=>{
    const d={};
    F.forEach(([k])=>d[k]=$('w_'+k).value.trim());
    d.kepsek=S.namaNorm(d.kepsek);
    d.logoKiri=logo.logoKiri;
    d.logoKanan=logo.logoKanan;
    try{await save1('wkprofil',d);S.toast('Tersimpan')}
    catch(er){S.toast(er.message,1)}
  };
}

Object.assign(U.PG,{sekolah:['Pengaturan','Profil Sekolah',sekolah],profil:['Pengaturan','Profil Guru',profil],jadwal:['Pengaturan','Jadwal Mengajar',jadwal],kalender:['Pengaturan','Kalender Akademik',kalender],aplikasi:['Pengaturan','Pengaturan Aplikasi',aplikasi],bantuan:['Bantuan','Bantuan',bantuan]});
})();