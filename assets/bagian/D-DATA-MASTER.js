/* ═══════════════════════════════════════════════════════════════════════════
   [D] DATA MASTER   (file: bagian/D-DATA-MASTER.js)
   [D1] Data Siswa (+ Import Excel, Rapikan nama & kelas)   [D2] Data Kelas
   [D3] Data Mapel (KKTP + bobot)                           [D4] Data Guru
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{e,G,K,$,tag,tbl,opt,nm,byK,muat,crud}=U;

/* Tingkat kelas: "VIII A", "viii b", "8C" -> "VIII". Dipakai agar KKTP & bobot berlaku per tingkat, bukan per rombel.
   Tersedia juga di S.tingkat untuk halaman lain (nilai, rekap, ketuntasan). */
const tingkat=k=>{const t=String(k??'').trim().toUpperCase().replace(/^KELAS\s*/,''),
  m=t.match(/^(VIII|VII|VI|IV|IX|V|XII|XI|X|III|II|I|\d{1,2})/);
  if(!m)return t;const a={7:'VII',8:'VIII',9:'IX',10:'X',11:'XI',12:'XII'};return a[m[1]]||m[1]};
S.tingkat=S.tingkat||tingkat;

/* ─── [D1] MENU: Data Master › Data Siswa (+ Import Excel, Rapikan nama & kelas) ─── */
const XURL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',norm=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const loadX=()=>window.XLSX?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src=XURL;s.onload=ok;s.onerror=()=>no(new Error('Pembaca Excel gagal dimuat. Periksa koneksi internet.'));document.head.appendChild(s)});
async function bacaSiswa(file){await loadX();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),ws=wb.Sheets['Data Siswa']||wb.Sheets[wb.SheetNames[0]],a=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
  const hd=(a[0]||[]).map(norm),col=(...k)=>hd.findIndex(h=>k.some(z=>h===z||h.startsWith(z))),c={nis:col('nis','nisn'),nama:col('nama'),kelas:col('kelas','rombel'),jk:col('lp','jk','jeniskelamin'),hp:col('hp','nohp','telepon'),wali:col('wali','siswawali','walimurid','guruwali')};
  if(c.nama<0||c.kelas<0)throw new Error('Kolom "Nama" dan "Kelas" tidak ditemukan. Gunakan template dari tombol Unduh template.');
  const ok=[],bad=[];a.slice(1).forEach((r,i)=>{const g=k=>c[k]<0?'':String(r[c[k]]??'').trim();if(!r.some(x=>String(x).trim()))return;
    const nama=S.namaNorm(g('nama')),kelas=S.kelasNorm(g('kelas')),j=norm(g('jk')),jk=/^(l|laki)/.test(j)?'L':/^(p|perempuan)/.test(j)?'P':'';
    if(!nama)bad.push([i+2,'Nama kosong']);else if(!kelas)bad.push([i+2,nama+': kelas kosong']);else if(!jk)bad.push([i+2,nama+': L/P harus L atau P']);else ok.push({nis:g('nis'),nama,kelas,jk,hp:g('hp'),...(c.wali<0?{}:{wali:/^(t|n|0)/i.test(g('wali'))?'Tidak':'Ya'})})});
  return {ok,bad}}
const siswa=async v=>{let pend=null;
  await crud({coll:'siswa',sort:byK,fix:{nama:S.namaNorm},kel:S.guru.semuaKelas,f:[{k:'nis',l:'NIS'},{k:'nama',l:'Nama',r:1},{k:'kelas',l:'Kelas',t:'select',o:S.guru.semuaKelas},{k:'jk',l:'L/P',t:'select',o:['L','P']},{k:'hp',l:'No. HP orang tua'},{k:'wali',l:'Siswa wali saya (tampil di menu Wali Murid)',t:'select',o:['Ya','Tidak'],d:'Tidak'}],cols:[['nis','NIS'],['nama','Nama'],['kelas','Kelas'],['jk','L/P'],['hp','No. HP orang tua'],['','Wali murid',r=>r.wali==='Ya'?tag('Ya','ok'):tag('Tidak','n')]],
  before:async()=>`<div class="box noprint" style="margin-bottom:14px"><div class="tb" style="margin:0"><b>Import data siswa</b><span class="sp"></span><a class="btn2 ghost" href="${S.base}assets/template/TEMPLATE_DATA_SISWA.xlsm" download>⬇ Unduh template (.xlsm)</a><button class="btn2 ghost" id="rpk" title="Seragamkan penulisan nama dan kelas pada data yang sudah ada">✨ Rapikan nama &amp; kelas</button><button class="btn2" id="bi">⬆ Import dari Excel</button><input type="file" id="fi" accept=".xlsm,.xlsx,.xls,.csv" hidden></div><div id="imp"></div></div>`})(v);
  v.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;
    if(b.id==='bi')$('fi').click();
    if(b.id==='rpk'){b.disabled=true;let n=0;const all=await S.db.list('siswa');
      try{for(const s of all){const d={nama:S.namaNorm(s.nama),kelas:S.kelasNorm(s.kelas)};if(d.nama!==s.nama||d.kelas!==s.kelas){await S.db.update('siswa',s.id,d);n++}}
        await S.profile.save({kelas:[...S.guru.semuaKelas,...all.map(s=>s.kelas)]});S.toast(n+' data dirapikan');muat()}catch(er){S.toast(er.message,1);b.disabled=false}}
    if(b.id==='ib'){pend=null;$('imp').innerHTML=''}
    if(b.id==='ig'&&pend){b.disabled=true;let n=0;const st=$('ist');
      try{const baru=pend.ok.filter(r=>!r.x).map(({x,...d})=>d),ubah=pend.ok.filter(r=>r.x);
        st.textContent='Menyimpan…';
        if(baru.length)await S.db.addMany('siswa',baru);                       // siswa baru: satu batch
        for(let i=0;i<ubah.length;i+=10)await Promise.all(ubah.slice(i,i+10).map(({x,...d})=>S.db.update('siswa',x,d)));   // yang diperbarui: 10 paralel
        n=pend.ok.length;
        if(pend.baru.length)await S.profile.save({kelas:[...S.guru.semuaKelas,...pend.baru]});
        S.toast(n+' siswa diproses');muat()}catch(er){S.toast(er.message,1);b.disabled=false}}});
  v.addEventListener('change',async ev=>{if(ev.target.id!=='fi'||!ev.target.files[0])return;const box=$('imp');box.innerHTML='<p class="hint">Membaca file…</p>';
    try{const {ok,bad}=await bacaSiswa(ev.target.files[0]),ex=await S.db.list('siswa'),key=s=>S.namaNorm(s.nama).toLowerCase()+'|'+S.kelasNorm(s.kelas);let baru=0,ubah=0;
      const rows=ok.map(r=>{const m=ex.find(s=>(r.nis&&s.nis===r.nis)||key(s)===key(r));m?ubah++:baru++;return {...r,x:m&&m.id}});
      const kb=[...new Set(ok.map(r=>r.kelas).filter(k=>!S.guru.semuaKelas.some(x=>S.kelasNorm(x)===k)))];ev.target.value='';
      pend={ok:rows,baru:kb};
      box.innerHTML=`<div class="sumtxt"><b>${ok.length} siswa terbaca</b> · ${baru} baru · ${ubah} diperbarui (NIS atau nama+kelas sudah ada)${kb.length?`<br>Kelas baru yang akan ditambahkan ke kelas diampu: <b>${e(kb.join(', '))}</b>`:''}${bad.length?`<br><span style="color:var(--bad)">${bad.length} baris dilewati: ${e(bad.slice(0,6).map(x=>'baris '+x[0]+' ('+x[1]+')').join('; '))}${bad.length>6?' …':''}</span>`:''}</div>${ok.length?`<button class="btn2" id="ig">Impor ${ok.length} siswa</button> `:''}<button class="btn2 ghost" id="ib">Batal</button> <span id="ist" class="hint"></span>`}
    catch(er){box.innerHTML='';S.toast(er.message,1)}})};



/* ─── [D2] MENU: Data Master › Data Kelas ─── */
async function kelas(v) {
  const [sis, P] = await Promise.all([
    S.db.list('siswa'),
    U.wkp()
  ]);

  // Hanya kelas yang diampu guru
  const all = [...new Set(S.guru.semuaKelas || [])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'id'));

  if (!all.length) {
    return v.innerHTML = `
      <div class="box empty">
        Belum ada kelas yang diampu.
        <br>
        Tambahkan kelas melalui
        <a href="${S.base}pages/pengaturan/profil.html">
          Pengaturan › Profil Guru
        </a>.
      </div>`;
  }

  // Mengelompokkan siswa berdasarkan kelas (penulisan kelas dinormalkan agar "vii a" = "VII A")
  const data = all.map(k => {
    const siswa = sis
      .filter(s => S.kelasNorm(s.kelas) === S.kelasNorm(k))
      .sort(nm);

    return {
      kelas: k,
      siswa,
      total: siswa.length,
      laki: siswa.filter(s => s.jk === 'L').length,
      perempuan: siswa.filter(s => s.jk === 'P').length
    };
  });

  const totalSiswa = data.reduce((n, k) => n + k.total, 0);

  v.innerHTML = `
    <div class="tb noprint">
      <b>${all.length} Kelas Diampu</b>
      <span class="sp"></span>
      <b>${totalSiswa} Siswa</b>
      <a class="btn2 ghost"
         href="${S.base}pages/data-master/siswa.html">
         Kelola / Import Siswa
      </a>
    </div>

    <div class="kelas-grid">
      ${data.map((k, i) => `
        <details class="kelas-card"
                 name="kelas-guru"
                 ${all.length === 1 ? 'open' : ''}>

          <summary class="kelas-head">

            <div class="kelas-icon">
              <i class="fa-solid fa-users"></i>
            </div>

            <div class="kelas-info">
              <b>${e(k.kelas)}</b>
              <span>${k.total} Siswa Terdaftar</span>
            </div>

            <div class="kelas-arrow">
              <i class="fa-solid fa-chevron-down"></i>
            </div>

            <div class="kelas-stat">
              <span>
                <i class="fa-solid fa-mars"></i>
                ${k.laki} Laki-laki
              </span>

              <span>
                <i class="fa-solid fa-venus"></i>
                ${k.perempuan} Perempuan
              </span>
            </div>

          </summary>

          <div class="kelas-content">

            <div class="kelas-content-head">
              <b>Daftar Siswa ${e(k.kelas)}</b>
              <span>${k.total} Siswa</span>
            </div>

            ${k.total ? `
              <div class="kelas-siswa-list">
                ${k.siswa.map((s, j) => `
                  <div class="kelas-siswa-item">

                    <div class="kelas-no">
                      ${j + 1}
                    </div>

                    <div class="kelas-siswa-info">
                      <b>${e(s.nama)}</b>
                      <span>NIS: ${e(s.nis || '-')}</span>
                    </div>

                    <div class="kelas-jk ${s.jk === 'P' ? 'jk-p' : 'jk-l'}">
                      ${s.jk === 'P' ? 'P' : 'L'}
                    </div>

                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="kelas-empty">
                <i class="fa-solid fa-user-group"></i>
                <br>
                Belum ada siswa di kelas ini.
              </div>
            `}

          </div>
        </details>
      `).join('')}
    </div>
  `;

  // Memastikan hanya satu kartu kelas terbuka
  const kartuKelas = [...v.querySelectorAll('.kelas-card')];

  kartuKelas.forEach(card => {
    card.addEventListener('toggle', () => {
      if (card.open) {
        kartuKelas.forEach(other => {
          if (other !== card && other.open) {
            other.open = false;
          }
        });
      }
    });
  });

  // CSS tampilan kartu kelas
  if (!document.getElementById('kelas-card-style')) {
    const style = document.createElement('style');
    style.id = 'kelas-card-style';

    style.textContent = `

      /* ===== GRID KELAS ===== */

      .kelas-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        margin-top: 20px;
        align-items: start;
      }

      /* ===== KARTU KELAS ===== */

      .kelas-card {
        background: var(--card, #fff);
        border: 1px solid var(--line, #e5eaf1);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 5px 18px rgba(15, 35, 65, .07);
        transition: box-shadow .25s ease, transform .25s ease;
      }

      .kelas-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 28px rgba(15, 35, 65, .13);
        border-color: #b8d3ff;
      }

      .kelas-card[open] {
        border-color: #1877f2;
        box-shadow: 0 8px 25px rgba(24, 119, 242, .13);
      }

      /* ===== HEADER KELAS ===== */

      .kelas-head {
        min-height: 90px;
        padding: 18px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 13px;
        cursor: pointer;
        list-style: none;
        position: relative;
      }

      .kelas-head::-webkit-details-marker {
        display: none;
      }

      .kelas-icon {
        width: 54px;
        height: 54px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 16px;
        color: white;
        font-size: 22px;
        background: linear-gradient(135deg, #1877f2, #0752b5);
        box-shadow: 0 5px 12px rgba(24, 119, 242, .25);
      }

      .kelas-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .kelas-info b {
        font-size: 17px;
        font-weight: 800;
        color: var(--text, #172b4d);
      }

      .kelas-info span {
        font-size: 12px;
        color: var(--muted, #8290a5);
      }

      .kelas-arrow {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #edf4ff;
        color: #1877f2;
        transition: transform .3s ease, background .3s ease;
      }

      .kelas-card[open] .kelas-arrow {
        transform: rotate(180deg);
        background: #1877f2;
        color: white;
      }

      /* ===== STATISTIK SISWA ===== */

      .kelas-stat {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 12px 18px;
        padding-top: 13px;
        border-top: 1px solid var(--line, #e5eaf1);
        font-size: 12px;
        color: var(--muted, #8290a5);
      }

      .kelas-stat span {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }

      .kelas-stat span:first-child i {
        color: #1877f2;
      }

      .kelas-stat span:last-child i {
        color: #df5b9b;
      }

      /* ===== ISI KARTU ===== */

      .kelas-content {
        border-top: 1px solid var(--line, #e5eaf1);
        padding: 17px;
        background: var(--bg, #f6f9fe);
        animation: kelasMasuk .25s ease;
      }

      @keyframes kelasMasuk {
        from {
          opacity: 0;
          transform: translateY(-7px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .kelas-content-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 14px;
        font-size: 13px;
      }

      .kelas-content-head b {
        color: var(--text, #172b4d);
      }

      .kelas-content-head span {
        padding: 5px 10px;
        border-radius: 20px;
        background: #e5efff;
        color: #1877f2;
        font-size: 11px;
        font-weight: 700;
      }

      /* ===== DAFTAR SISWA ===== */

      .kelas-siswa-list {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .kelas-siswa-item {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px;
        border: 1px solid var(--line, #e5eaf1);
        border-radius: 13px;
        background: var(--card, #fff);
        transition: .2s ease;
      }

      .kelas-siswa-item:hover {
        border-color: #a9caff;
        transform: translateX(3px);
      }

      .kelas-no {
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: #eaf2ff;
        color: #1877f2;
        font-size: 12px;
        font-weight: 800;
      }

      .kelas-siswa-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .kelas-siswa-info b {
        font-size: 13px;
        color: var(--text, #172b4d);
        overflow-wrap: anywhere;
      }

      .kelas-siswa-info span {
        font-size: 11px;
        color: var(--muted, #8290a5);
      }

      /* ===== JENIS KELAMIN ===== */

      .kelas-jk {
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 800;
      }

      .jk-l {
        background: #e6f1ff;
        color: #1877f2;
      }

      .jk-p {
        background: #fce8f2;
        color: #d65391;
      }

      /* ===== KELAS KOSONG ===== */

      .kelas-empty {
        padding: 25px 12px;
        text-align: center;
        background: var(--card, #fff);
        border: 1px dashed var(--line, #dce3ed);
        border-radius: 12px;
        color: var(--muted, #8290a5);
        font-size: 13px;
      }

      .kelas-empty i {
        font-size: 25px;
        margin-bottom: 8px;
        color: #9aabc1;
      }

      /* ===== RESPONSIVE HP ===== */

      @media(max-width:600px) {
        .kelas-grid {
          grid-template-columns: 1fr;
          gap: 13px;
        }

        .kelas-head {
          padding: 15px;
        }

        .kelas-content {
          padding: 13px;
        }
      }

    `;

    document.head.appendChild(style);
  }
}


/* ─── [D3] MENU: Data Master › Data Mapel (KKTP + bobot per MAPEL per TINGKAT, praktek opsional) ─── */
async function mapel(v){const ml=S.guru.mapelList;
  if(!ml.length)return v.innerHTML='<div class="box empty">Belum ada mata pelajaran. Tambahkan di <a href="'+S.base+'pages/pengaturan/profil.html">Pengaturan › Profil Guru</a>; kartunya akan muncul di sini otomatis.</div>';
  const rows=await S.db.list('mapel',{},1),D={kktp:75,bf:30,bs:30,bu:40,bp:0,praktek:false};
  const F=[['kktp','KKTP'],['bf','Bobot Formatif (%)'],['bs','Bobot Sumatif (%)'],['bu','Bobot Ujian (%)']];
  const FP=['bp','Bobot Praktek (%)'];

  /* Satu unit per mapel x TINGKAT (VII, VIII, IX). Rombel A/B/C/D sekelas memakai pengaturan yang sama.
     Dinamai UL agar tidak menimpa U = S.u di atas. */
  const urut=t=>{const i=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'].indexOf(t);return i<0?99:i};
  const UL=[];
  ml.forEach((m,mi)=>{
    if(m.kelas&&m.kelas.length){
      const g={};
      m.kelas.forEach(k=>{const t=tingkat(k);(g[t]=g[t]||[]).push(String(k))});
      Object.keys(g).sort((a,b)=>urut(a)-urut(b)||a.localeCompare(b)).forEach(t=>UL.push({nama:m.nama,kelas:t,rombel:g[t].sort((a,b)=>a.localeCompare(b,'id')),mi}));
    }else UL.push({nama:m.nama,kelas:'',rombel:[],mi});
  });

  const cari=u=>rows.find(x=>x.mapel===u.nama&&(x.kelas||'')===u.kelas);
  /* Nilai awal dari data lama: record per rombel (mis. "VIII A") atau record tanpa kelas. Belum dianggap tersimpan. */
  const lama=u=>rows.find(x=>x.mapel===u.nama&&x.kelas&&x.kelas!==u.kelas&&tingkat(x.kelas)===u.kelas)||rows.find(x=>!x.kelas&&(x.mapel===u.nama||(!x.mapel&&u.mi===0)));
  const stat=(c,ada)=>{c.querySelector('[data-t]').innerHTML=ada?tag('Tersimpan','ok'):tag('Belum disimpan','w')};
  const tampilBp=c=>{const on=c.querySelector('[data-p]').checked;c.querySelector('[data-bp]').style.display=on?'':'none';if(!on)c.querySelector('input[data-k="bp"]').value=0};
  const angka=x=>x.value.trim()===''?NaN:+x.value;

  v.innerHTML=UL.map((u,i)=>{const r=cari(u),d={...D,...(r||lama(u)||{})},p=!!d.praktek||+d.bp>0,dis=r?'disabled':'';
    return `<div class="box mp" data-i="${i}" style="max-width:720px;margin-bottom:14px"><div class="tb" style="margin:0 0 6px"><h3>${e(u.nama)}${u.kelas?' — Kelas '+e(u.kelas):''}</h3><span class="hint" style="margin:0">${u.kelas?'Berlaku untuk '+e(u.rombel.join(', ')):'Semua kelas diampu'}</span><span class="sp"></span><span data-t></span></div>
      <label style="display:flex;align-items:center;gap:8px;margin:0 0 10px;cursor:pointer"><input type="checkbox" data-p ${p?'checked':''} ${dis}> Ada praktek</label>
      <div class="fg">${F.map(([k,l])=>`<div><label>${l}</label><input type="number" min="0" max="100" data-k="${k}" value="${d[k]}" ${dis}></div>`).join('')}<div data-bp style="${p?'':'display:none'}"><label>${FP[1]}</label><input type="number" min="0" max="100" data-k="${FP[0]}" value="${p?d.bp:0}" ${dis}></div></div>
      <div class="tb" style="margin:12px 0 0"><button class="btn2" data-a>${r?'Edit':'Simpan'}</button></div></div>`}).join('');
  v.querySelectorAll('.mp').forEach((c,i)=>stat(c,!!cari(UL[i])));

  /* onchange/onclick (bukan addEventListener) agar tidak menumpuk kalau halaman dirender ulang */
  v.onchange=ev=>{const k=ev.target.closest('[data-p]');if(k)tampilBp(k.closest('.mp'))};

  v.onclick=async ev=>{const b=ev.target.closest('[data-a]');if(!b)return;const c=b.closest('.mp'),i=+c.dataset.i,u=UL[i],ins=[...c.querySelectorAll('input')];
    if(b.textContent==='Edit'){ins.forEach(x=>x.disabled=false);b.textContent='Simpan';c.querySelector('input[data-k="kktp"]').focus();c.querySelector('[data-t]').innerHTML=tag('Sedang diedit','n');return}
    const p=c.querySelector('[data-p]').checked,d={praktek:p};
    ins.forEach(x=>{if(x.dataset.k)d[x.dataset.k]=angka(x)});
    if(!p)d.bp=0;
    if(['kktp','bf','bs','bu','bp'].some(k=>!Number.isFinite(d[k])||d[k]<0))return S.toast('Semua isian harus diisi angka 0 atau lebih',1);
    if(d.kktp>100)return S.toast('KKTP harus 0 sampai 100',1);
    if(p&&d.bp<=0)return S.toast('Bobot praktek harus lebih dari 0, atau hilangkan centang "Ada praktek"',1);
    const tot=Math.round((d.bf+d.bs+d.bu+d.bp)*100)/100;
    if(tot!==100)return S.toast('Jumlah bobot harus 100% (sekarang '+tot+'%)',1);
    b.disabled=true;
    try{const r=cari(u),data={...d,mapel:u.nama,kelas:u.kelas};
      if(r){await S.db.update('mapel',r.id,data);Object.assign(r,data)}
      else rows.push(await S.db.add('mapel',data));
      ins.forEach(x=>x.disabled=true);b.textContent='Edit';stat(c,true);S.toast('Tersimpan: '+u.nama+(u.kelas?' kelas '+u.kelas:''))}
    catch(er){S.toast(er.message,1)}b.disabled=false}}

/* ─── [D4] MENU: Data Master › Data Guru (ringkasan, hanya lihat) ─── */
async function guru(v){const [p,sis,kl]=await Promise.all([S.guru,S.db.list('siswa'),S.db.list('kelas')]);
  v.innerHTML=`<div class="box" style="max-width:620px"><h3>${e(p.nama)}</h3><p style="color:var(--mute);margin-bottom:10px">${S.email}</p>${tbl(['Data','Isi'],[['NIP',e(p.nip||'-')],['No. HP',e(p.hp||'-')],['Mata pelajaran',e(S.guru.mapelList.map(m=>m.nama).join(', ')||'-')],['Kelas diampu',e(S.guru.semuaKelas.join(', ')||'-')],['Jumlah siswa',sis.length]])}<p style="margin-top:12px;color:var(--mute);font-size:13px">Ubah data di Pengaturan › Profil Guru.</p></div>`}

/* Daftarkan ke peta halaman */
Object.assign(U.PG,{siswa:['Data Master','Data Siswa',siswa],kelas:['Data Master','Data Kelas',kelas],mapel:['Data Master','Data Mapel',mapel],guru:['Data Master','Data Guru',guru]});
})();