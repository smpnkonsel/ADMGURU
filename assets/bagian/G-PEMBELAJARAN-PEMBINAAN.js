/* ═══════════════════════════════════════════════════════════════════════════
   [G] PEMBELAJARAN & PEMBINAAN SISWA   (file: bagian/G-PEMBELAJARAN-PEMBINAAN.js)
   Alur Pembelajaran: Materi Ajar → Tujuan Pembelajaran → Jurnal Mengajar → Evaluasi TP.
   Pembinaan Siswa (Pelanggaran, Catatan Sikap, Remedial, Pengayaan) memakai mesin crud di file [C];
   Remedial & Pengayaan berdasarkan nilai per BAB / LM (bukan lagi dikaitkan ke kode TP).

   KETERKAITAN DATA (penting):
   - Materi Ajar disimpan per SUBBAB (satu dokumen = satu subbab). Semua subbab dalam satu BAB
     memakai 'babId' yang sama. BAB/subbab dirujuk lewat ID, bukan nama, sehingga mengganti nama
     tidak memutus TP maupun jurnal.
   - Tujuan.materiId  → id subbab.   Jurnal.materiId → id subbab.
   - Evaluasi.tpId    → id TP.       Data lama Remedial/Pengayaan yang memakai kodeTP tetap dicek saat TP akan dihapus.
   - Subbab yang sudah dipakai TP/jurnal tidak bisa dihapus. Mengganti kelas/semester sebuah BAB
     hanya memperbarui datanya, tidak menghapus apa pun.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$,HARI,today,tag,app,crud,D,date,finals,fmt,opt,tb,tbl,ask}=U;
const db=S.db;

/* ── Pengaturan ── ubah daftar tingkat bila sekolah bukan SMP */
const TING=['VII','VIII','IX'], SEM=['Ganjil','Genap'];
const ST=['Belum dinilai','Tercapai','Belum tercapai'], TL=['-','Remedial','Pengayaan'];

/* ── Pembantu bersama ── */
const lvl=k=>(String(k||'').match(/^[IVX]+/)||[''])[0];            // 'VII A' → 'VII'
const sem0=()=>new Date().getMonth()>=6?'Ganjil':'Genap';          // Jul–Des = Ganjil
const kodeSem=s=>s==='Genap'?'N':'G';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const upd=(c,r,ch)=>{const {id,...x}={...r,...ch};return db.update(c,r.id,x)};
const num=(a,b)=>String(a||'').localeCompare(String(b||''),undefined,{numeric:true});
const norm=m=>({...m,kelas:m.kelas||'',semester:m.semester||'',babId:m.babId||m.id,babNo:m.babNo??'',
  babNama:m.babNama||(m.judul?'Materi lama':'-'),subNama:m.subNama||m.judul||'',urut:m.urut||0});
const babLabel=m=>(m.babNo!==''?`BAB ${m.babNo} – `:'')+m.babNama;
const byBab=(a,b)=>(+a.babNo||0)-(+b.babNo||0)||num(a.babNama,b.babNama);
const bySub=(a,b)=>(a.urut||0)-(b.urut||0)||num(a.subNama,b.subNama);
const byMat=(a,b)=>TING.indexOf(lvl(a.kelas))-TING.indexOf(lvl(b.kelas))||num(a.semester,b.semester)||byBab(a,b)||bySub(a,b);
const ops=(arr,sel)=>arr.map(([v,l])=>`<option value="${e(v)}"${v===sel?' selected':''}>${e(l)}</option>`).join('');
const F=(i,l,h)=>`<div><label for="${i}">${l}</label>${h}</div>`;

/* Pilihan bertingkat Kelas → Semester → BAB → Subbab (dari Materi Ajar).
   getM = fungsi yang mengembalikan daftar materi terbaru; st = {kelas,sem,bab,sub} diubah langsung.
   o.kelas: tampilkan pilihan kelas;  o.all: boleh "semua/belum dipilih" pada subbab (nilai ''). */
const cascade=(el,getM,st,cb,o={})=>{
  const B=()=>{const m=new Map();getM().filter(x=>lvl(x.kelas)===st.kelas&&x.semester===st.sem).sort(byBab).forEach(x=>{if(!m.has(x.babId))m.set(x.babId,x)});return[...m.values()]};
  const Sb=()=>getM().filter(x=>x.babId===st.bab&&lvl(x.kelas)===st.kelas&&x.semester===st.sem).sort(bySub);
  const draw=()=>{
    const bb=B();if(!bb.some(x=>x.babId===st.bab))st.bab=bb[0]?bb[0].babId:'';
    const ss=Sb();if(!ss.some(x=>x.id===st.sub))st.sub=o.all?'':(ss[0]?ss[0].id:'');
    const sp=[...(o.all?[['',o.allLabel||'Semua subbab']]:[]),...ss.map(x=>[x.id,x.subNama])];
    el.innerHTML=(o.kelas?`<div><label>Kelas</label><select data-c="kelas">${opt(TING,st.kelas)}</select></div>`:'')+
      `<div><label>Semester</label><select data-c="sem">${opt(SEM,st.sem)}</select></div>`+
      `<div><label>BAB</label><select data-c="bab">${bb.length?ops(bb.map(x=>[x.babId,babLabel(x)]),st.bab):'<option value="">(belum ada BAB)</option>'}</select></div>`+
      `<div><label>Subbab</label><select data-c="sub">${sp.length?ops(sp,st.sub):'<option value="">(belum ada subbab)</option>'}</select></div>`};
  el.onchange=ev=>{const c=ev.target.dataset.c;if(!c)return;st[c]=ev.target.value;draw();if(cb)cb()};
  return{draw}};

/* ═════════════ MENU: Pembelajaran › Materi Ajar (input banyak BAB & subbab sekaligus) ═════════════ */
const materi=async v=>{
  let M=[],T=[],J=[],q='',ed=null;
  const blank=()=>({id:'',nama:'',tautan:''});
  const nb=no=>({id:'',no,nama:'',ket:'',subs:[blank()]});
  const pakai=id=>T.filter(x=>x.materiId===id).length+J.filter(x=>x.materiId===id).length;
  const nextNo=()=>Math.max(0,...M.filter(x=>lvl(x.kelas)===ed.kelas&&x.semester===ed.sem).map(x=>+x.babNo||0),...ed.babs.map(b=>+b.no||0))+1;
  v.innerHTML=tb('<input id="q" placeholder="Cari…" aria-label="Cari"><span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button><button class="btn2" id="ad">+ Tambah BAB</button>')+
    '<div class="box hide" id="fm" style="margin-bottom:14px"></div><div class="box" id="tbl"></div>';
  const rows=()=>M.filter(x=>!q||JSON.stringify(Object.values(x)).toLowerCase().includes(q)).sort(byMat);
  const list=()=>{$('tbl').innerHTML=tbl(['Kelas','Smt','BAB','Subbab','Tautan','Keterangan','Aksi'],rows().map(r=>[e(lvl(r.kelas)||r.kelas),e(r.semester),e(babLabel(r)),e(r.subNama),
    r.tautan?`<a href="${e(r.tautan)}" target="_blank" rel="noopener">Buka</a>`:'-',e(r.ket||''),
    `<button class="btn2 ghost" data-e="${r.babId}">Ubah BAB</button> <button class="btn2 del" data-d="${r.id}">Hapus</button>`]),'Belum ada materi. Klik "+ Tambah BAB".')};
  const ld=async()=>{[M,T,J]=await Promise.all([db.list('materi'),db.list('tujuan'),db.list('jurnal')]);M=M.map(norm);list()};

  const draw=()=>{const f=$('fm');f.classList.remove('hide');
    f.innerHTML=`<h3 style="margin-bottom:6px">${ed.mode==='ubah'?'Ubah BAB':'Tambah BAB dan subbab'}</h3>
    <div class="fg">${F('m_k','Kelas',`<select id="m_k">${opt(TING,ed.kelas)}</select>`)}${F('m_s','Semester',`<select id="m_s">${opt(SEM,ed.sem)}</select>`)}</div>`+
    ed.babs.map((b,i)=>`<div class="box" data-b="${i}" style="margin-top:12px">
      <div class="fg">${F('','No. BAB *',`<input type="number" data-f="no" value="${e(b.no)}">`)}${F('','Nama BAB *',`<input data-f="nama" value="${e(b.nama)}">`)}</div>`+
      b.subs.map((s,j)=>`<div class="fg" data-s="${j}" style="margin-top:8px">${F('','Subbab *',`<input data-f="sn" value="${e(s.nama)}">`)}${F('','Tautan materi',`<input type="url" data-f="st" value="${e(s.tautan)}">`)}<div><label>&nbsp;</label><button type="button" class="btn2 del" data-act="xs">Hapus subbab</button></div></div>`).join('')+
      `<button type="button" class="btn2 ghost" data-act="as" style="margin-top:8px">+ Subbab</button>
      <div style="margin-top:10px">${F('','Keterangan BAB (berlaku untuk semua subbab BAB ini)',`<input data-f="ket" value="${e(b.ket)}">`)}</div>
      ${ed.mode==='baru'&&ed.babs.length>1?'<button type="button" class="btn2 del" data-act="xb" style="margin-top:10px">Hapus BAB ini</button>':''}</div>`).join('')+
    `${ed.mode==='baru'?'<button type="button" class="btn2 ghost" id="m_ab" style="margin-top:12px">+ Tambah BAB</button>':''}
    <div class="tb" style="margin:12px 0 0"><button type="button" class="btn2" id="m_sv">Simpan semua BAB dan subbab</button><button type="button" class="btn2 ghost" id="m_cn">Batal</button></div>`;
    f.scrollIntoView({block:'nearest'})};
  const sync=()=>{ed.kelas=$('m_k').value;ed.sem=$('m_s').value;
    $('fm').querySelectorAll('[data-b]').forEach(bx=>{const b=ed.babs[+bx.dataset.b],g=n=>bx.querySelector(`[data-f="${n}"]`).value;
      b.no=g('no');b.nama=g('nama');b.ket=g('ket');
      bx.querySelectorAll('[data-s]').forEach(sx=>{const s=b.subs[+sx.dataset.s];s.nama=sx.querySelector('[data-f="sn"]').value;s.tautan=sx.querySelector('[data-f="st"]').value})})};
  const fromBab=id=>{const L=M.filter(x=>x.babId===id).sort(bySub),f=L[0];
    return{mode:'ubah',kelas:lvl(f.kelas)||TING[0],sem:f.semester||SEM[0],hapus:[],
      babs:[{id,no:f.babNo,nama:f.babNama,ket:f.ket||'',subs:L.map(x=>({id:x.id,nama:x.subNama,tautan:x.tautan||''}))}]}};

  const save=async()=>{const adds=[],ups=[];
    for(const b of ed.babs){const nm=b.nama.trim();
      if(!nm){S.toast('Nama BAB wajib diisi',1);return}
      if(b.subs.some(s=>s.id&&!s.nama.trim())){S.toast('Nama subbab tidak boleh kosong; pakai "Hapus subbab"',1);return}
      const subs=b.subs.filter(s=>s.nama.trim());
      if(!subs.length){S.toast('Isi minimal satu subbab pada '+nm,1);return}
      const k=subs.map(s=>s.nama.trim().toLowerCase());
      if(new Set(k).size<k.length){S.toast('Ada subbab kembar pada '+nm,1);return}
      if(ed.mode==='baru'&&M.some(x=>lvl(x.kelas)===ed.kelas&&x.semester===ed.sem&&x.babNama.trim().toLowerCase()===nm.toLowerCase())){
        S.toast(nm+' sudah ada di kelas/semester ini. Gunakan "Ubah BAB".',1);return}
      const babId=b.id||uid();
      subs.forEach((s,j)=>{const d={kelas:ed.kelas,semester:ed.sem,babId,babNo:b.no===''?'':+b.no,babNama:nm,subNama:s.nama.trim(),judul:s.nama.trim(),tautan:s.tautan.trim(),ket:b.ket.trim(),urut:j+1};
        s.id?ups.push([s.id,d]):adds.push(d)})}
    try{for(const[id,d]of ups)await upd('materi',M.find(x=>x.id===id),d);
      if(adds.length)adds.length>1?await db.addMany('materi',adds):await db.add('materi',adds[0]);
      for(const id of ed.hapus)await db.remove('materi',id);
      S.toast('Tersimpan ('+(ups.length+adds.length)+' subbab)');$('fm').classList.add('hide');ed=null;ld()}catch(er){S.toast(er.message,1)}};

  $('fm').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.id==='m_cn'){$('fm').classList.add('hide');ed=null;return}
    sync();
    if(b.id==='m_sv'){save();return}
    if(b.id==='m_ab'){ed.babs.push(nb(nextNo()));draw();return}
    const bx=b.closest('[data-b]');if(!bx)return;const bi=+bx.dataset.b,bb=ed.babs[bi];
    if(b.dataset.act==='as')bb.subs.push(blank());
    if(b.dataset.act==='xs'){const j=+b.closest('[data-s]').dataset.s,s=bb.subs[j];
      if(s.id){const n=pakai(s.id);if(n){S.toast(`Subbab ini dipakai di ${n} TP/jurnal, tidak bisa dihapus`,1);return}ed.hapus.push(s.id)}
      bb.subs.splice(j,1);if(!bb.subs.length)bb.subs.push(blank())}
    if(b.dataset.act==='xb')ed.babs.splice(bi,1);
    draw()};
  $('q').oninput=ev=>{q=ev.target.value.toLowerCase();list()};
  $('ad').onclick=()=>{ed={mode:'baru',kelas:TING[0],sem:sem0(),babs:[],hapus:[]};ed.babs.push(nb(nextNo()));draw()};
  $('ex').onclick=()=>S.csv('materi.csv',[['Kelas','Semester','BAB','Subbab','Tautan','Keterangan'],...rows().map(r=>[lvl(r.kelas)||r.kelas,r.semester,babLabel(r),r.subNama,r.tautan||'',r.ket||''])]);
  $('tbl').onclick=async ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.e){ed=fromBab(b.dataset.e);draw()}
    else if(b.dataset.d){const n=pakai(b.dataset.d);
      if(n){S.toast(`Subbab ini dipakai di ${n} TP/jurnal, tidak bisa dihapus`,1);return}
      if(await ask('Hapus subbab ini?','Hapus')){await db.remove('materi',b.dataset.d);S.toast('Dihapus');ld()}}};
  ld();
};

/* ═════════════ MENU: Pembelajaran › Tujuan Pembelajaran (banyak TP, kode otomatis) ═════════════ */
const tujuan=async v=>{
  let M=[],T=[],E=[],R=[],P=[],baru=[];const st={kelas:TING[0],sem:sem0(),bab:'',sub:''};
  v.innerHTML=tb('<span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button>')+
    '<div class="box"><div class="fg" id="cs"></div></div><div class="box" id="tp" style="margin-top:14px"></div><div id="lg" style="margin-top:14px"></div>';
  const pre=()=>`TP-${st.kelas}-${kodeSem(st.sem)}-`;
  const kd=n=>pre()+String(n).padStart(3,'0');
  const maxNo=L=>Math.max(0,...L.filter(x=>String(x.kode||'').startsWith(pre())).map(x=>+(String(x.kode).match(/(\d+)\s*$/)||[0,0])[1]));
  const cur=()=>T.filter(x=>x.materiId===st.sub).sort((a,b)=>num(a.kode,b.kode));
  const sync=()=>{$('tp').querySelectorAll('[data-n]').forEach(t=>{baru[+t.dataset.n]=t.value})};
  const c=cascade($('cs'),()=>M,st,()=>{baru=[];drawTP()},{kelas:1});

  const drawTP=()=>{
    if(!st.sub){$('tp').innerHTML='<b>Belum ada subbab.</b> Isi BAB dan subbab dulu di menu Materi Ajar.';return}
    const m=M.find(x=>x.id===st.sub),ex=cur(),n0=maxNo(T);if(!ex.length&&!baru.length)baru=[''];
    $('tp').innerHTML=`<h3 style="margin-bottom:8px">Daftar Tujuan Pembelajaran — ${e(m.subNama)}</h3>`+
      ex.map((t,i)=>`<div class="fg" style="margin-top:10px"><div><label>TP ${i+1} · ${e(t.kode||'-')}</label><textarea rows="2" data-t="${t.id}">${e(t.tujuan||'')}</textarea></div><div><label>&nbsp;</label><button type="button" class="btn2 del" data-d="${t.id}">Hapus</button></div></div>`).join('')+
      baru.map((x,i)=>`<div class="fg" style="margin-top:10px"><div><label>TP ${ex.length+i+1} · ${kd(n0+i+1)} (kode otomatis)</label><textarea rows="2" data-n="${i}">${e(x)}</textarea></div><div><label>&nbsp;</label><button type="button" class="btn2 ghost" data-x="${i}">Hapus baris</button></div></div>`).join('')+
      '<div class="tb" style="margin:12px 0 0"><button type="button" class="btn2 ghost" id="ta">+ Tambah TP</button><button type="button" class="btn2" id="ts">Simpan semua TP</button></div>'};
  const drawLg=()=>{const L=T.filter(x=>!x.materiId);
    $('lg').innerHTML=L.length?`<div class="box"><b>TP lama (belum dikaitkan ke subbab):</b> pilih subbab di atas, lalu klik "Kaitkan".${tbl(['Kode','Kelas','Tujuan','Aksi'],L.map(t=>[e(t.kode||'-'),e(t.kelas||''),e(t.tujuan||''),`<button class="btn2 ghost" data-k="${t.id}">Kaitkan ke subbab terpilih</button>`]),'')}</div>`:''};

  const save=async()=>{sync();const ups=[];
    for(const t of cur()){const x=$('tp').querySelector(`[data-t="${t.id}"]`).value.trim();
      if(!x){S.toast('TP '+(t.kode||'')+' tidak boleh kosong; gunakan Hapus',1);return}
      if(x!==(t.tujuan||''))ups.push([t,x])}
    const nw=baru.map(x=>x.trim()).filter(Boolean);
    if(!ups.length&&!nw.length){S.toast('Tidak ada perubahan');return}
    try{for(const[t,x]of ups)await upd('tujuan',t,{tujuan:x});
      if(nw.length){const n=maxNo(await db.list('tujuan'));
        const d=nw.map((x,i)=>({kode:kd(n+i+1),kelas:st.kelas,semester:st.sem,materiId:st.sub,tujuan:x,urut:n+i+1}));
        d.length>1?await db.addMany('tujuan',d):await db.add('tujuan',d[0])}
      baru=[];S.toast('Tersimpan');await ld()}catch(er){S.toast(er.message,1)}};
  const ld=async()=>{[M,T,E,R,P]=await Promise.all(['materi','tujuan','evaluasi','remedial','pengayaan'].map(n=>db.list(n)));M=M.map(norm);c.draw();drawTP();drawLg()};

  $('tp').onclick=async ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.id==='ts'){save();return}
    sync();
    if(b.id==='ta'){baru.push('');drawTP()}
    else if(b.dataset.x){baru.splice(+b.dataset.x,1);drawTP()}
    else if(b.dataset.d){const t=T.find(x=>x.id===b.dataset.d);
      if(E.some(x=>x.tpId===t.id)||R.some(x=>x.kodeTP&&x.kodeTP===t.kode)||P.some(x=>x.kodeTP&&x.kodeTP===t.kode)){S.toast('TP ini sudah dipakai di Evaluasi/Remedial/Pengayaan, tidak bisa dihapus',1);return}
      if(await ask('Hapus TP ini?','Hapus')){await db.remove('tujuan',t.id);S.toast('Dihapus');ld()}}};
  $('lg').onclick=async ev=>{const b=ev.target.closest('button');if(!b||!b.dataset.k)return;
    if(!st.sub){S.toast('Pilih subbab dulu',1);return}
    const t=T.find(x=>x.id===b.dataset.k);
    try{await upd('tujuan',t,{materiId:st.sub,kelas:st.kelas,semester:st.sem,kode:t.kode||kd(maxNo(T)+1)});S.toast('Dikaitkan');ld()}catch(er){S.toast(er.message,1)}};
  $('ex').onclick=()=>S.csv('tujuan.csv',[['Kode','Kelas','Semester','BAB','Subbab','Tujuan'],...[...T].sort((a,b)=>num(a.kode,b.kode)).map(t=>{const m=M.find(x=>x.id===t.materiId);return[t.kode||'',lvl(t.kelas)||t.kelas||'',t.semester||'',m?babLabel(m):'',m?m.subNama:'',t.tujuan||'']})]);
  ld();
};

/* ═════════════ MENU: Pembelajaran › Jurnal Mengajar (format tabel resmi) ═════════════
   Sumber otomatis:  Hari/Tanggal, H-S-I-A ← Presensi  |  Kelas, Jam ke- ← Jadwal Mengajar
                     Materi Pokok (BAB) ← Materi Ajar  |  Tujuan Pembelajaran ← TP milik subbab terpilih
                     Kegiatan ← dibuat dari nama subbab (bervariasi bila subbab dipakai lagi; bisa diedit)
   Guru memilih: tanggal, jadwal, subbab, jenis penilaian formatif/sumatif. */
const FORMATIF=['Unjuk kerja','Tugas rumah','Kuis','Diskusi','Tanya jawab','Observasi','Praktik','Penugasan'];
const SUMATIF=['Ulangan Harian','Tes Tertulis','Tes Praktik','Proyek','Penilaian Akhir BAB'];
const KEG=[
  s=>`Peserta didik mengamati contoh pada materi ${s}, berdiskusi, dan menyelesaikan latihan penerapannya.`,
  s=>`Peserta didik mengerjakan latihan soal materi ${s} dan mempresentasikan strategi penyelesaiannya.`,
  s=>`Guru mengulas kembali materi ${s}; peserta didik berdiskusi dalam kelompok dan menyelesaikan soal pemecahan masalah.`,
  s=>`Peserta didik berlatih secara mandiri pada materi ${s}, kemudian bersama guru membahas kesalahan yang sering muncul.`,
  s=>`Peserta didik menyelesaikan soal kontekstual terkait materi ${s} dan menyimpulkan hasilnya secara bersama-sama.`,
  s=>`Peserta didik melakukan tanya jawab dan kuis singkat tentang materi ${s}, lalu merefleksikan pemahamannya.`];
const hariDari=t=>HARI[(new Date(t+'T00:00').getDay()+6)%7]||'';
const jamTampil=j=>String(j||'').replace(/\s*[-–]\s*/,'–');
const babPokok=m=>`BAB ${m.babNo!==''?m.babNo+' ':''}${m.babNama}`;

const jurnal=async v=>{
  let R=[],M=[],T=[],P=[],Jd=[],KL=[],WP={},q='',kf='',ap=null;
  try{ap=await app()}catch(_){}
  const SEMD=(ap&&ap.semester)||sem0();
  v.innerHTML=tb(`<input id="q" placeholder="Cari…" aria-label="Cari"><select id="kf" aria-label="Filter kelas"><option value="">Semua kelas</option>${opt(K)}</select><span class="sp"></span><button class="btn2" id="cj">Cek jurnal belum diisi</button><button class="btn2 ghost" id="xl">Unduh Excel</button><button class="btn2 ghost" id="wd">Unduh Word</button><button class="btn2 ghost" id="pd">Unduh PDF</button><button class="btn2 ghost" id="pc">Cetak</button>`)+
    '<div class="box" id="hr" style="margin-bottom:14px"></div><div class="box hide" id="cp" style="margin-bottom:14px"></div><div class="box hide" id="fm" style="margin-bottom:14px"></div><div class="box" id="tbl"></div>';

  /* Hitung H/S/I/A dari Presensi untuk tanggal+kelas+jam (presensi lama tanpa jam ikut terbaca, sama seperti di Input Presensi) */
  const hitung=(t,k,j)=>{let a=P.filter(x=>x.tanggal===t&&x.kelas===k&&(x.jam||'')===(j||''));
    if(!a.length&&j)a=P.filter(x=>x.tanggal===t&&x.kelas===k&&!x.jam);
    if(!a.length)return null;const c={H:0,S:0,I:0,A:0};a.forEach(x=>{if(c[x.status]!=null)c[x.status]++});return c};
  const tpDari=id=>T.filter(x=>x.materiId===id).sort((a,b)=>num(a.kode,b.kode)).map(x=>x.tujuan||'').filter(Boolean);
  const info=r=>{const m=M.find(x=>x.id===r.materiId);let tp=m?tpDari(m.id):[];if(!tp.length&&r.tp)tp=String(r.tp).split('\n').filter(Boolean);
    const c=hitung(r.tanggal,r.kelas,r.jam)||{H:r.hadir==null?'–':r.hadir,S:+r.sakit||0,I:+r.izin||0,A:+r.alpa||0};
    const fo=(r.formatif||[]).join(', ')||((!r.formatif&&!r.sumatif&&r.penilaian)?r.penilaian:'');
    const su=(r.sumatif||[]).map(x=>x==='Ulangan Harian'&&m&&m.babNo!==''?`${x} BAB ${m.babNo}`:x).join(', ');
    return{m,tp,c,pok:m?babPokok(m):(r.materi||''),fo,su,pn:[fo,su].filter(Boolean).join(', ')}};
  const list=()=>R.filter(r=>(!kf||r.kelas===kf)&&(!q||(JSON.stringify(Object.values(r))+info(r).pok).toLowerCase().includes(q))).sort((a,b)=>String(a.tanggal||'').localeCompare(String(b.tanggal||''))||String(a.jam||'').localeCompare(String(b.jam||'')));
  const draw=()=>{const L=list(),cl='style="text-align:center"';
    $('tbl').innerHTML=`<style>.jn th,.jn td{border:1px solid var(--line);padding:6px 8px;vertical-align:top}.jn th{background:var(--soft);text-align:center}@media print{@page{size:legal landscape}.jn-x,#cp,#fm,#hr{display:none!important}}</style>
    ${kop()}<div style="overflow-x:auto"><table class="jn" style="width:100%;border-collapse:collapse;font-size:13px"><thead>
    <tr><th rowspan="2">No.</th><th rowspan="2">Hari, Tanggal</th><th rowspan="2">Kelas</th><th rowspan="2">Jam ke-</th><th rowspan="2">Materi Pokok</th><th rowspan="2">Tujuan Pembelajaran</th><th rowspan="2">Kegiatan Pembelajaran</th><th rowspan="2">Penilaian Pembelajaran</th><th colspan="4">Kehadiran Peserta Didik</th><th rowspan="2" class="jn-x">Aksi</th></tr>
    <tr><th>H</th><th>S</th><th>I</th><th>A</th></tr></thead><tbody>`+
    (L.length?L.map((r,i)=>{const f=info(r);
      return`<tr><td ${cl}>${i+1}</td><td>${e(hariDari(r.tanggal))}, ${fmt(r.tanggal)}</td><td ${cl}>${e(r.kelas)}</td><td>${e(jamTampil(r.jam))}</td><td>${e(f.pok||'—')}</td>
      <td>${f.tp.length>1?`<ol style="margin:0;padding-left:18px">${f.tp.map(x=>`<li>${e(x)}</li>`).join('')}</ol>`:e(f.tp[0]||'—')}</td><td>${e(r.kegiatan||'—')}</td><td>${e(f.pn||'—')}</td>
      <td ${cl}>${e(f.c.H)}</td><td ${cl}>${e(f.c.S)}</td><td ${cl}>${e(f.c.I)}</td><td ${cl}>${e(f.c.A)}</td>
      <td class="jn-x"><button class="btn2 ghost" data-e="${r.id}">Ubah</button> <button class="btn2 del" data-d="${r.id}">Hapus</button></td></tr>`}).join(''):'<tr><td colspan="13" style="text-align:center;padding:16px">Belum ada jurnal. Klik "+ Tambah".</td></tr>')+
    '</tbody></table></div><p class="hint" style="margin-top:8px">H = Hadir, S = Sakit, I = Izin, A = Alpa (dihitung dari Presensi).</p>'+ttd();ceks()};

  /* Presensi yang sudah ada tetapi jurnalnya belum diisi (per tanggal + kelas + jam) */
  const belum=()=>{const g=new Map();
    P.forEach(x=>{const k=x.tanggal+'|'+x.kelas+'|'+(x.jam||'');if(!g.has(k))g.set(k,{t:x.tanggal,k:x.kelas,j:x.jam||''})});
    return[...g.values()].filter(s=>(!kf||s.k===kf)&&!R.some(r=>r.tanggal===s.t&&r.kelas===s.k&&(!s.j||!r.jam||r.jam===s.j)))
      .sort((a,b)=>a.t.localeCompare(b.t)||a.j.localeCompare(b.j))};
  const panel=()=>{const L=belum(),cp=$('cp');cp.classList.remove('hide');
    cp.innerHTML=`<div class="tb" style="margin:0 0 8px"><b>Presensi yang jurnalnya belum diisi</b>${L.length?tag(L.length,'w'):''}<span class="sp"></span><button class="btn2 ghost" type="button" data-z>Tutup</button></div>`+
      tbl(['Hari, Tanggal','Jam ke-','Kelas','H / S / I / A','Aksi'],L.map(s=>{const c=hitung(s.t,s.k,s.j)||{H:0,S:0,I:0,A:0};
        return[`${e(hariDari(s.t))}, ${fmt(s.t)}`,e(jamTampil(s.j)||'-'),e(s.k),`${c.H} / ${c.S} / ${c.I} / ${c.A}`,
          `<button class="btn2" type="button" data-t="${e(s.t)}" data-k="${e(s.k)}" data-j="${e(s.j)}">Isi jurnal</button>`]}),'Semua presensi sudah ada jurnalnya.')+
      '<p class="hint" style="margin:10px 0 0">Hanya jadwal yang presensinya sudah diisi yang muncul di sini. Baris hilang otomatis setelah jurnalnya disimpan.</p>'};
  const ceks=()=>{const n=belum().length;$('cj').textContent='Cek jurnal belum diisi'+(n?` (${n})`:'');if(!$('cp').classList.contains('hide'))panel()};

  /* Berkas unduhan (Word/Excel) dibuat dari tabel yang sama, kertas Legal lanskap */
  const fileHtml=()=>{const L=list(),b='border:1px solid #000;padding:4px;vertical-align:top',h=b+';text-align:center;background:#e8e8e8',c=b+';text-align:center',g=(S.guru&&S.guru.nama)||'';
    return`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>@page{size:35.56cm 21.59cm;mso-page-orientation:landscape;margin:1.5cm}body{font-family:Arial,sans-serif;font-size:10pt}table{border-collapse:collapse}</style></head><body>
    ${kop()}
    <table border="1" style="border-collapse:collapse"><thead><tr><th rowspan="2" style="${h}">No.</th><th rowspan="2" style="${h}">Hari, Tanggal</th><th rowspan="2" style="${h}">Kelas</th><th rowspan="2" style="${h}">Jam ke-</th><th rowspan="2" style="${h}">Materi Pokok</th><th rowspan="2" style="${h}">Tujuan Pembelajaran</th><th rowspan="2" style="${h}">Kegiatan Pembelajaran</th><th rowspan="2" style="${h}">Penilaian Pembelajaran</th><th colspan="4" style="${h}">Kehadiran Peserta Didik</th></tr>
    <tr><th style="${h}">H</th><th style="${h}">S</th><th style="${h}">I</th><th style="${h}">A</th></tr></thead><tbody>`+
    L.map((r,i)=>{const f=info(r);return`<tr><td style="${c}">${i+1}</td><td style="${b}">${e(hariDari(r.tanggal))}, ${fmt(r.tanggal)}</td><td style="${c}">${e(r.kelas)}</td><td style="${b}">${e(jamTampil(r.jam))}</td><td style="${b}">${e(f.pok||'—')}</td><td style="${b}">${f.tp.length>1?f.tp.map((x,j)=>`${j+1}. ${e(x)}`).join('<br>'):e(f.tp[0]||'—')}</td><td style="${b}">${e(r.kegiatan||'—')}</td><td style="${b}">${e(f.pn||'—')}</td><td style="${c}">${e(f.c.H)}</td><td style="${c}">${e(f.c.S)}</td><td style="${c}">${e(f.c.I)}</td><td style="${c}">${e(f.c.A)}</td></tr>`}).join('')+
    '</tbody></table><p>H = Hadir, S = Sakit, I = Izin, A = Alpa.</p>'+ttd()+'</body></html>'};
  const unduh=(nama,mime)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+fileHtml()],{type:mime}));a.download=nama;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
  /* Kotak "Jadwal mengajar hari ini": jadwal yang belum selesai; bila kosong, jelaskan sebabnya (libur / tidak ada jadwal / sudah lewat) */
  const hariIni=()=>{const box=$('hr');if(!box)return;
    const t=today(),h=hariDari(t),n=new Date(),nowM=n.getHours()*60+n.getMinutes(),
      mm=j=>[...String(j||'').matchAll(/(\d{1,2})[.:](\d{2})/g)].map(x=>+x[1]*60+ +x[2]),
      judul=`<b>Jadwal mengajar hari ini</b> <span style="color:var(--mute);font-size:12px">${e(h||'Minggu')}, ${fmt(t)}</span>`;
    let libur=false,ket='';
    try{libur=U.liburSet(KL).has(t);
      if(libur){const r=KL.find(x=>(U.isLibur?U.isLibur(x.jenis):/^libur/i.test(x.jenis||''))&&x.tanggal<=t&&t<=(x.sampai||x.tanggal));ket=r?(r.ket||r.jenis||''):''}}catch(_){}
    const js=h?Jd.filter(j=>j.hari===h).sort((a,b)=>String(a.jam||'').localeCompare(String(b.jam||''))):[];
    let isi;
    if(libur)isi=`${tag('Libur','b')} Hari ini libur${ket?': '+e(ket):''} menurut Kalender Akademik, jadi tidak ada pembelajaran.`;
    else if(!h)isi=`${tag('Tidak ada jadwal','n')} Hari Minggu, tidak ada jadwal mengajar.`;
    else if(!js.length)isi=`${tag('Tidak ada jadwal','n')} Tidak ada jadwal mengajar pada hari ${e(h)}. Atur di Pengaturan › Jadwal Mengajar bila seharusnya ada.`;
    else{const yet=js.filter(j=>{const z=mm(j.jam);return!z.length||nowM<z[z.length-1]});
      if(!yet.length)isi=`${tag('Selesai','ok')} Semua ${js.length} jadwal hari ini sudah lewat.`;
      else isi=`<div style="color:var(--mute);font-size:12px;margin:4px 0 8px">${yet.length} jadwal yang akan/sedang berlangsung dari ${js.length} jadwal hari ini</div><div style="display:flex;flex-wrap:wrap;gap:10px">`+
        yet.map(j=>{const z=mm(j.jam),mu=z.length&&nowM>=z[0],ada=R.some(r=>r.tanggal===t&&r.kelas===j.kelas&&(!r.jam||r.jam===j.jam));
          return`<div style="padding:9px 12px;border:1px solid var(--line);border-radius:9px"><b>${e(jamTampil(j.jam))}</b><div>Kelas ${e(j.kelas)}</div><div style="margin-top:4px">${tag(mu?'Sedang berlangsung':'Segera',mu?'ok':'w')}${ada?' '+tag('Jurnal sudah diisi','ok'):''}</div></div>`}).join('')+'</div>'}
    box.innerHTML=judul+'<div style="margin-top:6px">'+isi+'</div>'};
  /* Kop di atas tabel (Satuan Pendidikan, Mata Pelajaran, Semester, Tahun Pelajaran) dan tanda tangan di bawah tabel.
     Sumber: Profil Sekolah (nama sekolah, kepala sekolah, NIP, kota/kabupaten), Profil Guru (nama, NIP), Pengaturan Aplikasi (semester, tahun ajaran). */
  const BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglPanjang=t=>{const[y,m,d]=String(t).split('-').map(Number);return`${d} ${BLN[m-1]} ${y}`};
  const kop=()=>{const r=(l,x)=>`<tr><td style="border:0;padding:1px 0;font-weight:bold;white-space:nowrap">${l}</td><td style="border:0;padding:1px 10px 1px 14px">:</td><td style="border:0;padding:1px 0">${x}</td></tr>`;
    return`<h3 style="text-align:center;margin:0 0 14px">JURNAL MENGAJAR GURU</h3><table style="border:0;border-collapse:collapse;margin-bottom:12px;font-size:13px">`+
      r('Satuan Pendidikan',e(WP.sekolah||'-'))+r('Mata Pelajaran',e(G.mapel||'-'))+r('Semester',e(ap&&ap.semester||'-'))+r('Tahun Pelajaran',e(ap&&ap.tahun||'-'))+'</table>'};
  const ttd=()=>{const g=S.guru||{},kota=WP.kecamatan?e(WP.kecamatan)+', ':'',
      blok=(a1,a2,nama,nip)=>`<td style="border:0;text-align:center;width:50%;vertical-align:top">${a1}<br>${a2}<br><br><br><br><b><u>${e(nama||'..............................')}</u></b><br>NIP. ${e(nip||'-')}</td>`;
    return`<table style="width:100%;border:0;border-collapse:collapse;margin-top:28px;font-size:13px"><tr>${blok('Mengetahui,','Kepala Sekolah',WP.kepsek,WP.nipKepsek)}${blok(kota+tglPanjang(today()),'Guru Mata Pelajaran',g.nama,g.nip)}</tr></table>`};
  /* PDF: dokumen yang sama dibuka di jendela cetak tersembunyi; pilih "Simpan sebagai PDF" */
  const pdf=()=>{const f=document.createElement('iframe'),t0=document.title;
    f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);
    const d=f.contentDocument;d.open();d.write(fileHtml());d.close();document.title='Jurnal-Mengajar';
    const bersih=()=>{document.title=t0;setTimeout(()=>f.remove(),500)};
    setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.onafterprint=bersih;f.contentWindow.print()}catch(er){bersih();S.toast('Gagal membuka jendela cetak',1)}},350);
    setTimeout(bersih,120000);S.toast('Di jendela yang muncul, pilih "Simpan sebagai PDF"')};
  const ld=async()=>{[R,M,T,P,Jd,KL]=await Promise.all(['jurnal','materi','tujuan','presensi','jadwal','kalender'].map(n=>db.list(n).catch(()=>[])));
    try{WP=(await U.wkp())||{}}catch(_){}
    M=M.map(norm);Jd=Jd.filter(j=>!j.mapel||j.mapel===G.mapel);draw();hariIni()};

  const form=(r,pre)=>{const fm=$('fm'),m0=r&&M.find(x=>x.id===r.materiId);
    const cs={kelas:lvl(r?r.kelas:''),sem:m0?m0.semester:SEMD,bab:m0?m0.babId:'',sub:r&&r.materiId?r.materiId:''};let edKeg=!!(r&&r.kegiatan);
    const cb=(n,arr,sel)=>arr.map(x=>`<label style="display:inline-flex;gap:6px;align-items:center;margin:4px 16px 4px 0"><input type="checkbox" data-${n} value="${e(x)}" ${(sel||[]).includes(x)?'checked':''} style="width:auto">${e(x)}</label>`).join('');
    const nm=(i,l,k)=>F(i,l,`<input id="${i}" type="number" min="0" value="${r&&r[k]!=null?e(r[k]):''}">`);
    fm.classList.remove('hide');
    fm.innerHTML=`<h3 style="margin-bottom:6px">${r?'Ubah':'Tambah'} jurnal</h3>
    <div class="fg">${F('j_t','Tanggal *',`<input id="j_t" type="date" max="${today()}" value="${e(r?r.tanggal:(pre?pre.tanggal:today()))}">`)}${F('j_sl','Jadwal (kelas · jam) *','<select id="j_sl"></select>')}</div>
    <p class="hint" id="j_hr" style="margin:6px 0 0"></p>
    <div class="fg hide" id="jm" style="margin-top:8px">${F('j_mk','Kelas',`<select id="j_mk">${opt(K,r?r.kelas:K[0])}</select>`)}${F('j_mj','Jam ke-',`<input id="j_mj" value="${e(r?r.jam||'':'')}" placeholder="mis. 07.30-08.50">`)}</div>
    <div class="fg" id="jc" style="margin-top:10px"></div>
    <div class="box" id="jp" style="margin-top:10px"></div>
    <div style="margin-top:10px">${F('j_keg','Kegiatan pembelajaran (otomatis dari subbab, boleh diedit)','<textarea id="j_keg" rows="3"></textarea>')}<button type="button" class="btn2 ghost" id="j_re" style="margin-top:6px">Buat ulang otomatis</button></div>
    <h4 style="margin:16px 0 4px">Penilaian Pembelajaran</h4>
    <div><b>Formatif</b> <small>(boleh pilih lebih dari satu)</small><br>${cb('f',FORMATIF,r&&r.formatif)}</div>
    <div style="margin-top:8px"><b>Sumatif</b> <small>(kosongkan bila pertemuan ini tidak ada penilaian sumatif)</small><br>${cb('s',SUMATIF,r&&r.sumatif)}</div>
    <h4 style="margin:16px 0 4px">Kehadiran Peserta Didik</h4>
    <div class="fg">${nm('j_h','Hadir (H)','hadir')}${nm('j_s','Sakit (S)','sakit')}${nm('j_i','Izin (I)','izin')}${nm('j_a','Alpa (A)','alpa')}</div>
    <p class="hint" id="j_hh" style="margin:6px 0 0"></p>
    <details style="margin-top:12px"><summary>Catatan tambahan (opsional)</summary><div class="fg" style="margin-top:8px">${F('j_kd','Kendala',`<textarea id="j_kd" rows="2">${e(r?r.kendala||'':'')}</textarea>`)}${F('j_tl','Tindak lanjut',`<textarea id="j_tl" rows="2">${e(r?r.tindak||'':'')}</textarea>`)}</div></details>
    <div class="tb" style="margin:12px 0 0"><button class="btn2" id="sv">Simpan</button><button class="btn2 ghost" id="cn">Batal</button></div>`;
    $('j_keg').value=r?(r.kegiatan||''):'';

    const getSlot=()=>{const s=$('j_sl').value;if(s==='__m')return{kelas:$('j_mk').value,jam:$('j_mj').value.trim()};
      const i=s.indexOf('|');return i<0?{kelas:'',jam:''}:{kelas:s.slice(0,i),jam:s.slice(i+1)}};
    const slots=t=>{const h=hariDari(t),o=[],ada=k=>o.some(x=>x.v===k);
      Jd.filter(j=>j.hari===h).sort((a,b)=>String(a.jam||'').localeCompare(String(b.jam||''))).forEach(j=>o.push({v:j.kelas+'|'+j.jam,l:`${jamTampil(j.jam)} · Kelas ${j.kelas}`}));
      P.filter(x=>x.tanggal===t).forEach(x=>{const k=x.kelas+'|'+(x.jam||'');if(ada(k)||(!x.jam&&o.some(z=>z.v.startsWith(x.kelas+'|'))))return;o.push({v:k,l:`${x.jam?jamTampil(x.jam)+' · ':''}Kelas ${x.kelas} (di luar jadwal)`})});
      if(r&&r.tanggal===t){const k=r.kelas+'|'+(r.jam||'');if(!ada(k))o.push({v:k,l:`${r.jam?jamTampil(r.jam)+' · ':''}Kelas ${r.kelas} (data lama)`})}
      return o};
    const autoKeg=()=>{const m=M.find(x=>x.id===cs.sub);if(!m)return'';const n=R.filter(x=>x.materiId===m.id&&(!r||x.id!==r.id)).length;return KEG[n%KEG.length](m.subNama)};
    const prev=()=>{const m=M.find(x=>x.id===cs.sub),tp=m?tpDari(m.id):[];
      $('jp').innerHTML=m?`<b>Materi pokok:</b> ${e(babPokok(m))}<br><b>Tujuan Pembelajaran</b> (subbab ${e(m.subNama)}):`+(tp.length?`<ol style="margin:4px 0 0;padding-left:20px">${tp.map(x=>`<li>${e(x)}</li>`).join('')}</ol>`:' <i>belum ada TP untuk subbab ini (isi di menu Tujuan Pembelajaran).</i>'):'<small>Pilih BAB dan subbab dari Materi Ajar.</small>'};
    const cbk=()=>{prev();if(!edKeg)$('j_keg').value=autoKeg()};
    const c=cascade($('jc'),()=>M,cs,cbk,{all:1,allLabel:'— pilih subbab —'});
    const hadir=()=>{const sl=getSlot(),h=sl.kelas?hitung($('j_t').value,sl.kelas,sl.jam):null;
      [['j_h','H'],['j_s','S'],['j_i','I'],['j_a','A']].forEach(([i,k])=>{const el=$(i);if(h){el.value=h[k];el.readOnly=true}else el.readOnly=false});
      $('j_hh').textContent=h?'Dihitung otomatis dari Presensi.':'Presensi untuk jadwal ini belum diisi. Isi Presensi dulu, atau isi jumlahnya manual.'};
    const efek=()=>{const sl=getSlot();$('jm').classList.toggle('hide',$('j_sl').value!=='__m');cs.kelas=lvl(sl.kelas);c.draw();cbk();hadir()};
    const isiSlot=()=>{const t=$('j_t').value,o=slots(t),sel=$('j_sl'),cur=sel.value||(r?r.kelas+'|'+(r.jam||''):(pre?pre.kelas+'|'+pre.jam:''));
      sel.innerHTML='<option value="">— pilih jadwal —</option>'+o.map(x=>{const dis=R.some(z=>z.tanggal===t&&z.kelas+'|'+(z.jam||'')===x.v&&(!r||z.id!==r.id));return`<option value="${e(x.v)}"${dis?' disabled':''}>${e(x.l)}${dis?' — sudah ada jurnal':''}</option>`}).join('')+'<option value="__m">Isi manual (di luar jadwal)…</option>';
      if([...sel.options].some(x=>x.value===cur&&!x.disabled))sel.value=cur;
      else if(pre&&[...sel.options].some(x=>x.value.startsWith(pre.kelas+'|')&&!x.disabled))sel.value=[...sel.options].find(x=>x.value.startsWith(pre.kelas+'|')&&!x.disabled).value;
      else if(!r&&!pre){const f=[...sel.options].find(x=>x.value&&x.value!=='__m'&&!x.disabled);if(f)sel.value=f.value}
      $('j_hr').textContent=t?`${hariDari(t)}, ${fmt(t)}`+(Jd.some(j=>j.hari===hariDari(t))?'':' · tidak ada jadwal pada hari ini (atur di Pengaturan › Jadwal Mengajar, atau pilih "Isi manual")'):'';
      efek()};
    $('j_t').onchange=isiSlot;$('j_sl').onchange=efek;$('j_mk').onchange=efek;$('j_mj').oninput=hadir;
    $('j_keg').oninput=()=>{edKeg=true};
    $('j_re').onclick=()=>{edKeg=false;$('j_keg').value=autoKeg()};
    $('cn').onclick=()=>fm.classList.add('hide');
    isiSlot();

    $('sv').onclick=async()=>{const t=$('j_t').value,sl=getSlot(),n=i=>+$(i).value||0;
      if(!t){S.toast('Tanggal wajib diisi',1);return}
      if(!sl.kelas){S.toast('Pilih jadwal, atau isi kelas dan jam secara manual',1);return}
      if(R.some(x=>x.tanggal===t&&x.kelas===sl.kelas&&(x.jam||'')===sl.jam&&(!r||x.id!==r.id))){S.toast('Jurnal untuk kelas dan jam ini sudah ada. Gunakan Ubah.',1);return}
      if(!cs.sub&&!(r&&!r.materiId&&r.materi)){S.toast('Pilih BAB dan subbab (isi dulu di Materi Ajar)',1);return}
      const m=M.find(x=>x.id===cs.sub),h=hitung(t,sl.kelas,sl.jam),fo=[...fm.querySelectorAll('[data-f]:checked')].map(x=>x.value),su=[...fm.querySelectorAll('[data-s]:checked')].map(x=>x.value),
        tp=m?tpDari(m.id):(r&&r.tp?String(r.tp).split('\n'):[]);
      const d={tanggal:t,kelas:sl.kelas,jam:sl.jam,materiId:cs.sub,semester:m?m.semester:(r?r.semester||'':cs.sem),materi:m?babPokok(m):(r?r.materi||'':''),tp:tp.join('\n'),
        kegiatan:$('j_keg').value.trim(),formatif:fo,sumatif:su,penilaian:[fo.length?'Formatif: '+fo.join(', '):'',su.length?'Sumatif: '+su.join(', '):''].filter(Boolean).join('; '),
        hadir:h?h.H:n('j_h'),sakit:h?h.S:n('j_s'),izin:h?h.I:n('j_i'),alpa:h?h.A:n('j_a'),kendala:$('j_kd').value.trim(),tindak:$('j_tl').value.trim()};
      try{r?await upd('jurnal',r,d):await db.add('jurnal',d);S.toast('Tersimpan');fm.classList.add('hide');ld()}catch(er){S.toast(er.message,1)}};
    fm.scrollIntoView({block:'nearest'})};

  $('q').oninput=ev=>{q=ev.target.value.toLowerCase();draw()};$('kf').onchange=ev=>{kf=ev.target.value;draw()};
  $('pc').onclick=()=>print();
  $('pd').onclick=pdf;
  const iv=setInterval(()=>{if(!$('hr'))return clearInterval(iv);hariIni()},6e4);
  $('xl').onclick=()=>unduh('jurnal-mengajar.xls','application/vnd.ms-excel');
  $('wd').onclick=()=>unduh('jurnal-mengajar.doc','application/msword');
  $('cj').onclick=()=>{if($('cp').classList.contains('hide'))panel();else $('cp').classList.add('hide')};
  $('cp').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-z'))$('cp').classList.add('hide');
    else if(b.dataset.t)form(null,{tanggal:b.dataset.t,kelas:b.dataset.k,jam:b.dataset.j})};
  $('tbl').onclick=async ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.dataset.e)form(R.find(r=>r.id===b.dataset.e));
    else if(b.dataset.d&&await ask('Hapus data ini?','Hapus')){await db.remove('jurnal',b.dataset.d);S.toast('Dihapus');ld()}};
  ld();
};

/* ═════════════ MENU: Pembelajaran › Evaluasi Ketercapaian TP (menu baru) ═════════════ */
const evaluasi=async v=>{
  let M=[],T=[],E=[],kk=null;const st={kelas:TING[0],sem:sem0(),bab:'',sub:''};
  v.innerHTML=tb('<span class="sp"></span><button class="btn2 ghost" id="ex">Ekspor CSV</button><button class="btn2" id="sv">Simpan evaluasi</button>')+
    '<div class="box"><div class="fg" id="cs"></div></div><div class="box" id="tbl" style="margin-top:14px"></div>';
  /* KKTP mengikuti Data Mapel untuk mapel aktif + tingkat yang dipilih. */
  const muatKktp=async()=>{try{kk=await U.kktpFor(S.mapelAktif||G.mapel,st.kelas)}catch(_){kk=null}};
  await muatKktp();
  const scope=()=>T.filter(t=>{const m=M.find(x=>x.id===t.materiId);return m&&m.babId===st.bab&&lvl(m.kelas)===st.kelas&&m.semester===st.sem&&(!st.sub||m.id===st.sub)}).sort((a,b)=>num(a.kode,b.kode));
  const draw=()=>{const L=scope();
    $('tbl').innerHTML=(kk!=null?`<small>Nilai ≥ KKTP (${e(kk)}) otomatis diberi status Tercapai; di bawahnya Belum tercapai + Remedial. Anda tetap bisa mengubahnya.</small>`:'')+
      tbl(['Kode TP','Tujuan Pembelajaran','Nilai','Status','Tindak lanjut'],L.map(t=>{const ev=E.find(x=>x.tpId===t.id)||{},m=M.find(x=>x.id===t.materiId);
        return[e(t.kode||'-'),e(t.tujuan||'')+(st.sub?'':`<br><small>${e(m.subNama)}</small>`),
          `<input type="number" step="any" data-w="n" data-tp="${t.id}" value="${e(ev.nilai??'')}" style="width:90px">`,
          `<select data-w="s" data-tp="${t.id}">${opt(ST,ev.status||ST[0])}</select>`,
          `<select data-w="a" data-tp="${t.id}">${opt(TL,ev.tindak||TL[0])}</select>`]}),'Belum ada TP pada pilihan ini. Isi dulu di menu Tujuan Pembelajaran.')};
  const c=cascade($('cs'),()=>M,st,async()=>{await muatKktp();draw()},{kelas:1,all:1});
  const ld=async()=>{[M,T,E]=await Promise.all(['materi','tujuan','evaluasi'].map(n=>db.list(n)));M=M.map(norm);c.draw();await muatKktp();draw()};
  const q1=(w,id)=>v.querySelector(`[data-w="${w}"][data-tp="${id}"]`);
  $('tbl').oninput=ev=>{const t=ev.target;if(t.dataset.w!=='n'||kk==null||t.value==='')return;
    const ok=+t.value>=kk,a=q1('a',t.dataset.tp);q1('s',t.dataset.tp).value=ok?'Tercapai':'Belum tercapai';
    if(a.value!=='Pengayaan'||!ok)a.value=ok?'-':'Remedial'};
  $('sv').onclick=async()=>{const adds=[];let n=0;
    try{for(const s of v.querySelectorAll('[data-w="s"]')){const id=s.dataset.tp,t=T.find(x=>x.id===id),m=M.find(x=>x.id===t.materiId),nv=q1('n',id).value.trim(),a=q1('a',id).value,old=E.find(x=>x.tpId===id);
        if(!old&&s.value===ST[0]&&nv===''&&a==='-')continue;
        const d={tpId:id,kode:t.kode||'',materiId:t.materiId,kelas:lvl(m.kelas),semester:m.semester,nilai:nv===''?'':+nv,status:s.value,tindak:a,tanggal:today()};
        if(old){if(String(old.nilai??'')===String(d.nilai)&&old.status===d.status&&old.tindak===d.tindak)continue;await upd('evaluasi',old,d)}else adds.push(d);n++}
      if(adds.length)adds.length>1?await db.addMany('evaluasi',adds):await db.add('evaluasi',adds[0]);
      S.toast(n?`Tersimpan (${n} TP)`:'Tidak ada perubahan');await ld()}catch(er){S.toast(er.message,1)}};
  $('ex').onclick=()=>S.csv('evaluasi-tp.csv',[['Kode TP','Tujuan','Nilai','Status','Tindak lanjut'],...scope().map(t=>{const ev=E.find(x=>x.tpId===t.id)||{};return[t.kode||'',t.tujuan||'',ev.nilai??'',ev.status||ST[0],ev.tindak||'-']})]);
  ld();
};

/* ═══════════════════════════════════════════════════════════════
   PEMBINAAN SISWA
   REMEDIAL DAN PENGAYAAN BERDASARKAN BAB / LM
   LM 1 = BAB 1, LM 2 = BAB 2, dst.
   Nilai BAB = (Rata-rata TG × bf + UH × bs) / (bf + bs)
   ═══════════════════════════════════════════════════════════════ */

/* Isian pilih siswa bersama */
const SS={k:'siswaId',l:'Siswa',t:'siswa'};

/* Pilihan BAB dinamis */
const opR=[''],opP=[''];

/* ─────────────────────────────────────────────────────────────
   HELPER: KONVERSI NILAI
   ───────────────────────────────────────────────────────────── */
const angkaPembinaan=v=>{
  if(v===null||v===undefined||v==='')return null;
  const n=Number(String(v).replace(',','.'));
  return Number.isFinite(n)?n:null;
};

/* ─────────────────────────────────────────────────────────────
   HELPER: AMBIL KONFIGURASI LM / TG
   Mengikuti konfigurasi Input Nilai:
   adm_nilai_kolom_MAPEL_TINGKAT
   Contoh lm:[2,3,1]
   ───────────────────────────────────────────────────────────── */
const ambilKonfigPembinaan=(mapel,kelas)=>{
  const tk=S.tingkat?S.tingkat(kelas):(lvl(kelas)||kelas);
  const keys=[
    `adm_nilai_kolom_${encodeURIComponent(mapel)}_${encodeURIComponent(tk)}`,
    `adm_nilai_kolom_${mapel}_${tk}`
  ];

  for(const key of keys){
    try{
      const raw=localStorage.getItem(key);
      if(!raw)continue;

      const data=JSON.parse(raw);
      const lm=Array.isArray(data)?data:data?.lm;

      if(Array.isArray(lm)&&lm.length){
        return lm.map((x,i)=>({
          bab:i+1,
          jumlahTG:Math.max(0,Number(
            typeof x==='object'?(x.jumlahTG??x.tg??x.jumlah??0):x
          )||0)
        })).filter(x=>x.jumlahTG>0);
      }
    }catch(err){
      console.warn('Gagal membaca konfigurasi LM:',err);
    }
  }
  return [];
};

/* ─────────────────────────────────────────────────────────────
   HELPER: AMBIL DATA NILAI + PENGATURAN PER KELAS
   KKTP, bobot, dan jumlah TG per BAB berbeda tiap TINGKAT
   (VII, VIII, IX), jadi dihitung terpisah untuk setiap kelas.
   ───────────────────────────────────────────────────────────── */
const dataNilaiPembinaan=async()=>{
  const f=await finals();
  const rows=f.rows||[];
  const mapel=S.mapelAktif||G.mapel||'';

  const [daftarMapel,nilai]=await Promise.all([
    db.list('mapel'),
    db.list('nilai')
  ]);

  const kelasList=[...new Set(rows.map(r=>(r.s||r).kelas).filter(Boolean))];
  const perKelas={};

  kelasList.forEach(kelas=>{
    const tk=S.tingkat?S.tingkat(kelas):(lvl(kelas)||kelas);
    const dm=
      daftarMapel.find(x=>x.mapel===mapel&&(x.kelas===tk||x.kelas===kelas))||
      daftarMapel.find(x=>x.mapel===mapel&&!x.kelas)||
      f.c||{};
    perKelas[kelas]={
      tingkat:tk,
      kktp:angkaPembinaan(dm.kktp)??75,
      bf:angkaPembinaan(dm.bf)??0,
      bs:angkaPembinaan(dm.bs)??0,
      konfigurasi:ambilKonfigPembinaan(mapel,kelas)
    };
  });

  /* Daftar BAB gabungan (1 … terbanyak) untuk pilihan di formulir */
  const maxBab=Math.max(0,...Object.values(perKelas).map(x=>x.konfigurasi.length));
  const konfigurasi=Array.from({length:maxBab},(_,i)=>({bab:i+1}));

  /* Ringkasan pengaturan per tingkat, mis. "VII: KKTP 75 · formatif 30% · sumatif 30%" */
  const ringkas=[...new Map(Object.values(perKelas).map(x=>[x.tingkat,x])).values()]
    .sort((a,b)=>String(a.tingkat).localeCompare(String(b.tingkat),'id',{numeric:true}))
    .map(x=>`${x.tingkat}: KKTP ${x.kktp} · formatif ${x.bf}% · sumatif ${x.bs}%`)
    .join(' | ');

  return{f,rows,mapel,perKelas,konfigurasi,nilai,ringkas};
};

/* ─────────────────────────────────────────────────────────────
   HELPER: HITUNG NILAI SATU BAB UNTUK SATU SISWA
   - Rata-rata semua TG dalam LM/BAB
   - UH sesuai nomor BAB
   - Bobot mengikuti Data Mapel
   - Nilai yang belum diinput tidak dianggap nol
   ───────────────────────────────────────────────────────────── */
const hitungNilaiBAB=(s,bab,data)=>{
  const {nilai,bf,bs,konfigurasi}=data;

  const konfig=konfigurasi.find(x=>x.bab===bab);
  if(!konfig)return null;

  const milikSiswa=nilai.filter(x=>
    String(x.siswaId)===String(s.id)&&
    (!x.kelas||x.kelas===s.kelas)&&
    (!x.mapel||x.mapel===data.mapel)
  );

  /* Ambil nilai TG pada LM yang sesuai */
  const tugas=[];

  for(let tg=1;tg<=konfig.jumlahTG;tg++){
    const judul=`LM ${bab} - TG ${tg}`;

    const record=milikSiswa.find(x=>
      x.judul===judul&&
      x.jenis==='Formatif'
    );

    const n=angkaPembinaan(record?.nilai);
    if(n!==null)tugas.push(n);
  }

  /* Ambil UH sesuai BAB */
  const uhRecord=milikSiswa.find(x=>
    x.judul===`UH ${bab}`&&
    x.jenis==='Sumatif'
  );

  const nilaiUH=angkaPembinaan(uhRecord?.nilai);

  /* Hitung komponen berdasarkan bobot yang aktif */
  const komponen=[];

  if(bf>0){
    if(!tugas.length)return null;
    const rataTG=tugas.reduce((a,b)=>a+b,0)/tugas.length;
    komponen.push({nilai:rataTG,bobot:bf});
  }

  if(bs>0){
    if(nilaiUH===null)return null;
    komponen.push({nilai:nilaiUH,bobot:bs});
  }

  const totalBobot=komponen.reduce((a,b)=>a+b.bobot,0);
  if(!totalBobot)return null;

  const hasil=komponen.reduce(
    (a,b)=>a+(b.nilai*b.bobot),0
  )/totalBobot;

  return{
    bab,
    nilai:hasil,
    rataTG:tugas.length?tugas.reduce((a,b)=>a+b,0)/tugas.length:null,
    jumlahTG:tugas.length,
    nilaiUH,
    kktp:data.kktp,
    status:hasil<data.kktp?'Remedial':'Tuntas'
  };
};

/* ─────────────────────────────────────────────────────────────
   HELPER: SIAPKAN DATA SELURUH SISWA PER BAB
   ───────────────────────────────────────────────────────────── */
const rekapPembinaanBAB=async()=>{
  const data=await dataNilaiPembinaan();

  const hasil=[];

  for(const item of data.rows){
    const s=item.s||item;
    const dk=data.perKelas[s.kelas];
    if(!dk)continue;

    const dd={...dk,nilai:data.nilai,mapel:data.mapel};

    for(const lm of dk.konfigurasi){
      const nilaiBAB=hitungNilaiBAB(s,lm.bab,dd);

      if(nilaiBAB){
        hasil.push({
          s,
          bab:lm.bab,
          ...nilaiBAB
        });
      }
    }
  }

  return{data,hasil};
};

/* ─────────────────────────────────────────────────────────────
   HELPER: SIAPKAN PILIHAN BAB DINAMIS
   ───────────────────────────────────────────────────────────── */
const isiPilihanBAB=(arr,konfigurasi)=>{
  arr.length=0;
  arr.push('',...konfigurasi.map(x=>`BAB ${x.bab}`));
};

const nomorBAB=v=>{
  const m=String(v||'').match(/\d+/);
  return m?Number(m[0]):null;
};

/* ═══════════════════════════════════════════════════════════════
   MENU: PELANGGARAN
   ═══════════════════════════════════════════════════════════════ */
const pelanggaran=crud({
  coll:'pelanggaran',

  before:async(r)=>{
    const a=await app(),t={};

    r.forEach(x=>{
      t[x.nama]=(t[x.nama]||0)+(+x.poin||0);
    });

    const o=Object.entries(t).filter(z=>z[1]>=a.poin);

    return o.length
      ?`<div class="box" style="margin-bottom:14px">
          <b>Melewati batas ${a.poin} poin:</b>
          ${o.map(z=>tag(`${e(z[0])} (${z[1]})`,'b')).join(' ')}
        </div>`
      :'';
  },

  f:[
    date('tanggal','Tanggal'),
    SS,
    {k:'jenis',l:'Jenis pelanggaran',r:1},
    {k:'poin',l:'Poin',t:'number',r:1}
  ],

  cols:[
    D('tanggal','Tanggal',1),
    ['nama','Siswa'],
    ['kelas','Kelas'],
    ['jenis','Pelanggaran'],
    ['poin','Poin']
  ]
});

/* ═══════════════════════════════════════════════════════════════
   MENU: CATATAN SIKAP
   ═══════════════════════════════════════════════════════════════ */
const sikap=crud({
  coll:'sikap',

  f:[
    date('tanggal','Tanggal'),
    SS,
    {k:'jenis',l:'Jenis',t:'select',o:['Positif','Perlu pembinaan']},
    {k:'catatan',l:'Catatan',t:'area',r:1}
  ],

  cols:[
    D('tanggal','Tanggal',1),
    ['nama','Siswa'],
    ['kelas','Kelas'],
    ['jenis','Jenis',r=>tag(e(r.jenis),r.jenis==='Positif'?'ok':'w')],
    ['catatan','Catatan']
  ]
});

/* ═══════════════════════════════════════════════════════════════
   MENU: REMEDIAL
   Siswa di bawah KKTP ditampilkan per BAB.
   BAB dipilih dari konfigurasi LM.
   ═══════════════════════════════════════════════════════════════ */
const remedial=crud({
  coll:'remedial',

  before:async()=>{
    const {data,hasil}=await rekapPembinaanBAB();

    isiPilihanBAB(opR,data.konfigurasi);

    const belum=hasil.filter(x=>x.nilai<x.kktp);

    const daftar=data.konfigurasi.map(lm=>{
      const siswa=belum.filter(x=>x.bab===lm.bab);

      return`
        <div style="margin:8px 0;padding:9px 11px;
          border:1px solid var(--line);border-radius:9px">
          <b>BAB ${lm.bab}</b>
          <span style="color:var(--mute);font-size:12px">
            (${siswa.length} siswa)
          </span>
          <div style="margin-top:6px">
            ${siswa.length
              ?siswa.map(x=>tag(
                `${e(x.s.nama)} · ${e(x.s.kelas)} (${x.nilai.toFixed(1)})`,'w'
              )).join(' ')
              :'Tidak ada siswa di bawah KKTP.'}
          </div>
        </div>`;
    }).join('');

    return`
      <div class="box" style="margin-bottom:14px">
        <b>Daftar siswa yang belum mencapai KKTP</b>
        <div style="font-size:12px;color:var(--mute);margin-top:5px">
          ${e(data.mapel)} · ${e(data.ringkas||'Belum ada pengaturan')}
        </div>
        ${daftar||'Belum ada konfigurasi BAB.'}
        <div style="font-size:11px;color:var(--mute);margin-top:8px">
          Nilai yang belum lengkap tidak dimasukkan dalam daftar.
        </div>
      </div>`;
  },

  f:[
    SS,
    {
      k:'bab',
      l:'BAB yang diremedial',
      t:'select',
      o:opR,
      r:1
    },
    {
      k:'nilaiAwal',
      l:'Nilai awal BAB',
      t:'number'
    },
    {
      k:'tanggal',
      l:'Tanggal remedial',
      t:'date',
      d:today
    },
    {
      k:'nilaiRemedial',
      l:'Nilai setelah remedial',
      t:'number'
    },
    {
      k:'status',
      l:'Status',
      t:'select',
      o:['Terjadwal','Selesai']
    }
  ],

  cols:[
    ['nama','Siswa'],
    ['kelas','Kelas'],
    ['bab','BAB'],
    ['nilaiAwal','Nilai awal'],
    D('tanggal','Tanggal',1),
    ['nilaiRemedial','Nilai remedial'],
    ['status','Status',r=>tag(
      e(r.status),r.status==='Selesai'?'ok':'w'
    )]
  ]
});

/* ═══════════════════════════════════════════════════════════════
   MENU: PENGAYAAN
   Siswa yang mencapai KKTP ditampilkan per BAB.
   ═══════════════════════════════════════════════════════════════ */
const pengayaan=crud({
  coll:'pengayaan',

  before:async()=>{
    const {data,hasil}=await rekapPembinaanBAB();

    isiPilihanBAB(opP,data.konfigurasi);

    const tuntas=hasil.filter(x=>x.nilai>=x.kktp);

    const daftar=data.konfigurasi.map(lm=>{
      const siswa=tuntas.filter(x=>x.bab===lm.bab);

      return`
        <div style="margin:8px 0;padding:9px 11px;
          border:1px solid var(--line);border-radius:9px">
          <b>BAB ${lm.bab}</b>
          <span style="color:var(--mute);font-size:12px">
            (${siswa.length} siswa)
          </span>
          <div style="margin-top:6px">
            ${siswa.length
              ?siswa.map(x=>tag(
                `${e(x.s.nama)} · ${e(x.s.kelas)} (${x.nilai.toFixed(1)})`,'ok'
              )).join(' ')
              :'Belum ada siswa yang mencapai KKTP.'}
          </div>
        </div>`;
    }).join('');

    return`
      <div class="box" style="margin-bottom:14px">
        <b>Daftar siswa yang telah mencapai KKTP</b>
        <div style="font-size:12px;color:var(--mute);margin-top:5px">
          ${e(data.mapel)} · ${e(data.ringkas||'Belum ada pengaturan')}
        </div>
        ${daftar||'Belum ada konfigurasi BAB.'}
        <div style="font-size:11px;color:var(--mute);margin-top:8px">
          Pengayaan diberikan berdasarkan ketuntasan masing-masing BAB.
        </div>
      </div>`;
  },

  f:[
    SS,
    {
      k:'bab',
      l:'BAB pengayaan',
      t:'select',
      o:opP,
      r:1
    },
    {
      k:'tugas',
      l:'Tugas pengayaan',
      r:1
    },
    {
      k:'status',
      l:'Status',
      t:'select',
      o:['Belum','Dikerjakan','Selesai']
    }
  ],

  cols:[
    ['nama','Siswa'],
    ['kelas','Kelas'],
    ['bab','BAB'],
    ['tugas','Tugas'],
    ['status','Status',r=>tag(
      e(r.status),
      r.status==='Selesai'?'ok':
      r.status==='Dikerjakan'?'w':'n'
    )]
  ]
});

Object.assign(U.PG,{materi:['Pembelajaran','Materi Ajar',materi],tujuan:['Pembelajaran','Tujuan Pembelajaran',tujuan],jurnal:['Pembelajaran','Jurnal Mengajar',jurnal],evaluasi:['Pembelajaran','Evaluasi Ketercapaian TP',evaluasi],
pelanggaran:['Pembinaan Siswa','Pelanggaran',pelanggaran],sikap:['Pembinaan Siswa','Catatan Sikap',sikap],remedial:['Pembinaan Siswa','Remedial',remedial],pengayaan:['Pembinaan Siswa','Pengayaan',pengayaan]});
})();