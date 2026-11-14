/* ═══════════════════════════════════════════════════════════════════════════
   [L] WALI MURID – RCHK (Rekapitulasi Catatan Harian Kelas, 7 Kebiasaan Anak Indonesia Hebat)
   (file: bagian/L-WALI-MURID-RCHK.js)
   [L2] Identitas Siswa  [L3] Isi RCHK Bulanan  [L4] Rekap Bulan/Semester/Tahun
   (Pengaturan › Profil Sekolah sekarang ada di file [J] sebagai [J6]; di sini hanya pembaca profil wkp.)
   Konstanta: BLN (urutan bulan tahun ajaran), KAIH (7 kebiasaan), STS (status siswa).
   Aturan kategori: kat1 (>20 hari = Sudah terbiasa, 11–20 = Cukup, ≤10 = Belum) dan katAkhir.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,$,tag,tbl,opt,byK,one,app,save1,tb}=U;
const BLN=['Juli','Agustus','September','Oktober','November','Desember','Januari','Februari','Maret','April','Mei','Juni'],KAIH=['Bangun Pagi','Taat Beribadah','Berolahraga','Makan Sehat dan Bergizi','Gemar Belajar','Aktif Bermasyarakat','Tidur Cepat'],STS=['Aktif','Pindah','Berhenti','Meninggal','Tidak'];
const kat1=n=>n==null||n===''?'Belum mengisi':n>20?'Sudah terbiasa':n>=11?'Cukup terbiasa':'Belum terbiasa';
const katAkhir=(st,h)=>{if(st!=='Aktif')return 'Tidak aktif';const c=h.map(kat1);if(c.includes('Belum mengisi'))return 'Belum mengisi';const n=t=>c.filter(x=>x===t).length,s=n('Sudah terbiasa'),m=n('Cukup terbiasa'),b=n('Belum terbiasa');return s>=m?(s>=b?'Sudah terbiasa':'Belum terbiasa'):(m>=b?'Cukup terbiasa':'Belum terbiasa')};
const kTag=x=>tag(x,{'Sudah terbiasa':'ok','Cukup terbiasa':'w','Belum terbiasa':'b'}[x]||'n');
/* Pembaca profil sekolah (dipakai RCHK, Data Kelas di file [D], dan laporan nilai di file [F]).
   Nilai bawaan memuat logoKiri/logoKanan agar logo dari Pengaturan › Profil Sekolah ikut terbaca. */
const wkp=async()=>{const [p,a]=await Promise.all([one('wkprofil',{sekolah:'',npsn:'',jenjang:'SMP',provinsi:'',kab:'',kepsek:'',nipKepsek:'',logoKiri:'',logoKanan:'',pemda:'',dinas:'',alamat:''}),app()]);return {...p,tahun:a.tahun,waliNama:G.nama,waliNip:G.nip}};
U.wkp=wkp;   // dipakai juga oleh Data Kelas di file [D], menu Profil Sekolah di file [J], dan laporan nilai di file [F]
const waliSis=all=>all.filter(s=>s.wali==='Ya').sort(byK);   // siswa yang menjadi wali murid guru ini (lintas kelas)
const hariBln=(b,ta)=>{const i=BLN.indexOf(b),y0=+String(ta||'2026/2027').split('/')[0];return new Date(i<6?y0:y0+1,[7,8,9,10,11,12,1,2,3,4,5,6][i],0).getDate()};

/* ─── [L2] MENU: Wali Murid › Identitas Siswa (otomatis dari Data Siswa, kolom "Siswa wali saya") ─── */
async function wkSiswa(v){const all=await S.db.list('siswa');
  const draw=()=>{const a=waliSis(all),non=all.filter(s=>s.wali!=='Ya').sort(byK);
    v.innerHTML=tb(`<b>${a.length} siswa wali</b><span class="hint" style="margin:0">L ${a.filter(s=>s.jk==='L').length} · P ${a.filter(s=>s.jk==='P').length} · dari ${new Set(a.map(s=>s.kelas)).size} kelas</span><span class="sp"></span><a class="btn2 ghost" href="${S.base}pages/data-master/siswa.html">Isi / Import Data Siswa</a>`)
    +`<div class="box"><label for="tw">Tambah siswa wali (dari kelas mana pun)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><select id="tw" style="flex:1;min-width:220px"><option value="">— pilih siswa —</option>${non.map(s=>`<option value="${e(s.id)}">${e(s.nama)} (${e(s.kelas)})</option>`).join('')}</select><button class="btn2" id="twb">Tambah</button></div></div>`
    +`<div class="box">${tbl(['No','NIS','Nama','Kelas','L/P','No. HP orang tua',''],a.map((s,i)=>[i+1,e(s.nis||'-'),e(s.nama),e(s.kelas),e(s.jk),e(s.hp||'-'),`<button class="btn2 ghost" data-x="${e(s.id)}">Keluarkan</button>`]),'Belum ada siswa wali. Tambahkan lewat pilihan di atas, atau set “Siswa wali saya = Ya” di Data Siswa.')}</div>`;
    const ubah=async(id,w)=>{const s=all.find(x=>x.id===id);if(!s)return;try{await S.db.update('siswa',id,{wali:w});s.wali=w;draw()}catch(er){S.toast(er.message,1)}};
    $('twb').onclick=()=>{const id=$('tw').value;if(id)ubah(id,'Ya')};
    v.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>ubah(b.dataset.x,'Tidak'))};
  draw()}

/* ─── [L3] MENU: Wali Murid › Isi RCHK Bulanan (status + jumlah hari 7 kebiasaan per siswa) ─── */
async function wkIsi(v){const [all,P,rc]=await Promise.all([S.db.list('siswa'),wkp(),S.db.list('wkrchk')]);const sis=waliSis(all);
  if(!sis.length)return v.innerHTML=`<div class="box empty">Belum ada siswa wali. Isi lewat <a href="${S.base}pages/data-master/siswa.html">Data Siswa</a>; siswa dengan “Siswa wali saya = Ya” otomatis tampil di sini.</div>`;
  v.innerHTML=tb(`<label for="bl" style="margin:0">Bulan</label><select id="bl">${opt(BLN,BLN[(new Date().getMonth()+6)%12])}</select><span class="chip" style="background:var(--brand2);color:var(--brand);border-radius:99px;padding:5px 12px;font-weight:700;font-size:12.5px">Tahun ajaran ${e(P.tahun)}</span><span class="sp"></span><button class="btn2" id="sv">Simpan RCHK</button>`)+'<div class="box"><p class="hint" style="margin:0 0 10px">Isi <b>jumlah hari</b> siswa melakukan tiap kebiasaan. &gt;20 hari = Sudah terbiasa · 11–20 = Cukup terbiasa · ≤10 = Belum terbiasa. Siswa baru: pilih status <b>Tidak</b> pada bulan sebelum ia masuk.</p><div class="tw" id="ls"></div></div>';
  const row=id=>{const st=document.querySelector(`[data-st="${id}"]`).value,ins=[...document.querySelectorAll(`[data-s="${id}"]`)];ins.forEach(i=>i.disabled=st!=='Aktif');
    $('k_'+id).innerHTML=kTag(katAkhir(st,ins.map(i=>i.value===''?null:+i.value)));};
  const draw=()=>{const b=$('bl').value,mx=hariBln(b,P.tahun),d=(rc.find(x=>x.bulan===b)||{}).data||{};
    $('ls').innerHTML=`<div class="tw"><table class="rt tstick" style="min-width:760px"><thead><tr><th>No</th><th class="nm">Nama</th><th>Kelas</th><th>L/P</th><th>Status</th>${KAIH.map(k=>`<th>${k}</th>`).join('')}<th>Kategori</th></tr></thead><tbody>${sis.map((s,i)=>{const r=d[s.id]||{status:'Aktif',h:[]};return `<tr><td>${i+1}</td><td>${e(s.nama)}</td><td>${e(s.kelas)}</td><td>${e(s.jk)}</td><td><select data-st="${s.id}" style="width:auto">${opt(STS,r.status)}</select></td>${KAIH.map((_,j)=>`<td><input class="nin" type="number" min="0" max="${mx}" data-s="${s.id}" data-j="${j}" value="${r.h[j]??''}" aria-label="${e(KAIH[j])} ${e(s.nama)}"></td>`).join('')}<td id="k_${s.id}"></td></tr>`}).join('')}</tbody></table></div><p class="hint">${b} memiliki ${mx} hari; nilai tiap kebiasaan 0–${mx}.</p>`;sis.forEach(s=>row(s.id))};
  $('bl').onchange=draw;
  $('ls').addEventListener('input',ev=>{const i=ev.target;if(i.dataset.s){const mx=+i.max;if(i.value!==''&&+i.value>mx)i.value=mx;if(+i.value<0)i.value=0;row(i.dataset.s)}});
  $('ls').addEventListener('change',ev=>{if(ev.target.dataset.st)row(ev.target.dataset.st)});
  $('sv').onclick=async()=>{const b=$('bl').value,data={};sis.forEach(s=>{data[s.id]={status:document.querySelector(`[data-st="${s.id}"]`).value,h:KAIH.map((_,j)=>{const x=document.querySelector(`[data-s="${s.id}"][data-j="${j}"]`).value;return x===''?null:+x})}});
    const ex=rc.find(x=>x.bulan===b),d={bulan:b,tahun:P.tahun,data};
    try{if(ex){await S.db.update('wkrchk',ex.id,d);Object.assign(ex,d)}else rc.push(await S.db.add('wkrchk',d));S.toast('RCHK '+b+' tersimpan')}catch(er){S.toast(er.message,1)}};
  draw()}

/* ─── [L4] MENU: Wali Murid › Rekap Bulan / Rekap Semester / Rekap Tahun (satu fungsi, mode='bulan'|'semester'|'tahun') ─── */
const wkRekap=mode=>async v=>{const [all,P,rc]=await Promise.all([S.db.list('siswa'),wkp(),S.db.list('wkrchk')]);const sis=waliSis(all);
  const SEM={'Semester I (Juli–Desember)':BLN.slice(0,6),'Semester II (Januari–Juni)':BLN.slice(6)};
  const pick=mode==='bulan'?`<select id="pl" aria-label="Bulan">${opt(BLN,BLN[(new Date().getMonth()+6)%12])}</select>`:mode==='semester'?`<select id="pl" aria-label="Semester">${opt(Object.keys(SEM))}</select>`:'';
  v.innerHTML=tb(`${pick}<span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button><button class="btn2" id="pc">Cetak</button>`)+'<div class="box" id="ls"></div>';let csv=[];
  const draw=()=>{const sel=mode==='bulan'?$('pl').value:null,ms=mode==='bulan'?[sel]:mode==='semester'?SEM[$('pl').value]:BLN,per=mode==='bulan'?sel:mode==='semester'?$('pl').value:'Satu tahun ajaran ('+P.tahun+')';
    const docs=ms.map(m=>rc.find(x=>x.bulan===m)).filter(Boolean);
    const R=sis.map(s=>{const rs=docs.map(d=>d.data[s.id]).filter(Boolean),akt=rs.filter(r=>r.status==='Aktif'),st=akt.length?'Aktif':(rs[rs.length-1]||{status:'Tidak'}).status;
      const h=KAIH.map((_,j)=>{const a=akt.map(r=>r.h[j]).filter(x=>x!=null);return a.length?S.avg(a):null});return {s,st,h,ak:katAkhir(st,h)}});
    const A=R.filter(x=>x.st==='Aktif'),C=['Sudah terbiasa','Cukup terbiasa','Belum terbiasa'],cn=(a,c)=>a.filter(x=>x.ak===c).length;
    const jk=g=>{const a=A.filter(x=>x.s.jk===g);return [a.length,...C.map(c=>cn(a,c))]},pr=jk('P'),lk=jk('L');
    const kal=a=>{const z=C.map((c,i)=>a[i+1]?a[i+1]+' '+c.replace('Sudah t','t').replace('Cukup t','cukup t').replace('Belum t','belum t'):'').filter(Boolean);return z.join(', ')};
    /* teks ringkasan otomatis di atas tabel */
    const txt=!A.length?'Belum ada data murid pada periode ini.':`Dari total ${A.length} murid; `+[pr[0]?`untuk ${pr[0]} murid perempuan terdapat ${kal(pr)||'data belum lengkap'}`:'',lk[0]?`untuk ${lk[0]} murid laki-laki terdapat ${kal(lk)||'data belum lengkap'}`:''].filter(Boolean).join('; sedangkan ')+` dalam menerapkan Gerakan 7 Kebiasaan Anak Indonesia Hebat (G7KAIH) pada ${mode==='bulan'?'bulan ':''}${per} tahun ajaran ${P.tahun}.`;
    const perK=KAIH.map((k,j)=>[k,...C.map(c=>A.filter(x=>kat1(x.h[j])===c).length)]);
    const H3=['No','Nama','Kelas','L/P','Status',...KAIH,'Kategori akhir'],f1=x=>x==null?'–':(+x%1?(+x).toFixed(1):x);
    const body=R.map((x,i)=>[i+1,x.s.nama,x.s.kelas,x.s.jk,x.st,...x.h.map(f1),x.ak]);
    csv=[['REKAPITULASI CATATAN HARIAN KELAS (RCHK)'],['Sekolah',P.sekolah,'NPSN',P.npsn],['Guru wali',P.waliNama,'NIP',P.waliNip],['Periode',per,'Tahun ajaran',P.tahun],[],H3,...body,[],[txt]];
    $('ls').innerHTML=`<h3 style="text-align:center">REKAPITULASI CATATAN HARIAN KELAS (RCHK)</h3><p style="text-align:center;color:var(--mute);margin-bottom:12px">${e(per)} · Tahun Ajaran ${e(P.tahun)}</p>
    <div class="rhead"><b>Sekolah (NPSN)</b><span>${e(P.sekolah||'–')} (${e(P.npsn||'–')})</span><b>Kota/Kab, Provinsi</b><span>${e([P.kab,P.provinsi].filter(Boolean).join(', ')||'–')}</span><b>Kepala sekolah</b><span>${e(P.kepsek||'–')} · NIP ${e(P.nipKepsek||'–')}</span><b>Guru wali</b><span>${e(P.waliNama||'–')} · NIP ${e(P.waliNip||'–')} · ${sis.length} siswa wali</span></div>
    ${docs.length?'':'<div class="empty">Belum ada data RCHK pada periode ini. Isi di menu Isi RCHK Bulanan.</div>'}
    <div class="sumtxt">${e(txt)}</div>
    ${mode!=='bulan'?'<p class="hint">Rekap semester/tahun memakai rata-rata jumlah hari per kebiasaan pada bulan-bulan yang berstatus Aktif.</p>':''}
    <h2>Menurut jenis kelamin</h2>${tbl(['Jenis kelamin','Jml siswa',...C],[['Perempuan',...pr],['Laki-laki',...lk],['<b>Total</b>',...pr.map((x,i)=>`<b>${x+lk[i]}</b>`)]])}
    <h2>Menurut jenis pembiasaan</h2>${tbl(['No','Pembiasaan',...C],perK.map((r,i)=>[i+1,...r]))}
    <h2>Rincian siswa <small>(jumlah hari${mode==='bulan'?'':', rata-rata'})</small></h2>${tbl(H3,body.map(r=>[...r.slice(0,5).map((x,i)=>i?e(x):x),...r.slice(5,-1),kTag(r[r.length-1])]),'Belum ada siswa.')}`};
  if($('pl'))$('pl').onchange=draw;$('pc').onclick=()=>print();$('ex').onclick=()=>S.csv('rchk-'+mode+'.csv',csv);draw()};

Object.assign(U.PG,{'wk-identitas':['Wali Murid (RCHK)','Identitas Siswa',wkSiswa],'wk-isi':['Wali Murid (RCHK)','Isi RCHK Bulanan',wkIsi],'wk-rekap-bulan':['Wali Murid (RCHK)','Rekap Bulan',wkRekap('bulan')],'wk-rekap-semester':['Wali Murid (RCHK)','Rekap Semester',wkRekap('semester')],'wk-rekap-tahun':['Wali Murid (RCHK)','Rekap Tahun',wkRekap('tahun')]});
})();