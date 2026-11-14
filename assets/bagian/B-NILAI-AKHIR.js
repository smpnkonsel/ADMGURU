
/* ═══════════════════════════════════════════════════════════════════════════
   [B] HITUNG NILAI AKHIR PER SISWA
   Bobot diambil dari Data Mapel berdasarkan MAPEL + TINGKAT KELAS.
   Berlaku untuk seluruh rombel dalam tingkat yang sama.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
const S=window.ADM,U=S.u,{byK,JN}=U;

async function finals(){

  const [sis,nl,mp,c]=await Promise.all([
    S.db.list('siswa'),
    S.db.list('nilai'),
    S.db.list('mapel',{},1),
    U.cfg()
  ]);

  const rows=U.diampu(sis).sort(byK).map(s=>{

    const m=nl.filter(n=>n.siswaId===s.id);
    const r={s,nl:m};

    // Rata-rata setiap jenis penilaian
    JN.forEach(j=>{
      const a=m
        .filter(n=>n.jenis===j)
        .map(n=>+n.nilai)
        .filter(Number.isFinite);

      r[j]=a.length?S.avg(a):null;
    });

    // Cari pengaturan Data Mapel berdasarkan mapel dan tingkat
    const tingkat=S.tingkat(s.kelas);

    const pengaturan=mp.find(x=>
      x.mapel===(S.mapelAktif||S.guru.mapel) &&
      (x.kelas||'')===tingkat
    );

    // Gunakan bobot Data Mapel.
    // Jika belum tersedia, gunakan konfigurasi lama.
    const w={
      Formatif:pengaturan?+pengaturan.bf:+c.bf,
      Sumatif:pengaturan?+pengaturan.bs:+c.bs,
      Ujian:pengaturan?+pengaturan.bu:+c.bu
    };

    // Hitung nilai akhir berbobot
    const t=JN.reduce((a,j)=>
      r[j]==null?a:a+(Number.isFinite(w[j])?w[j]:0),0
    );

    r.akhir=t
      ?JN.reduce((a,j)=>
          r[j]==null?a:a+r[j]*(Number.isFinite(w[j])?w[j]:0),0
        )/t
      :null;

    // Rata-rata seluruh nilai
    r.rata=m.length
      ?S.avg(m.map(n=>+n.nilai).filter(Number.isFinite))
      :null;

    // Sertakan pengaturan agar halaman lain dapat menggunakannya
    r.pengaturanMapel=pengaturan||null;
    // KKTP per tingkat dari Data Mapel; bila belum diisi, pakai konfigurasi lama, lalu 75.
    r.kktp=pengaturan&&Number.isFinite(+pengaturan.kktp)?+pengaturan.kktp:(Number.isFinite(+c.kktp)?+c.kktp:75);
    r.bobot=w;

    return r;
  });

  return {rows,c,nl};
}

/* KKTP untuk satu mapel + tingkat/kelas (dipakai halaman yang belum punya baris siswa, mis. Evaluasi TP). */
async function kktpFor(mapel,kelas){
  const mp=await S.db.list('mapel',{},1),t=S.tingkat(kelas);
  const p=mp.find(x=>x.mapel===mapel&&(x.kelas||'')===t)||mp.find(x=>x.mapel===mapel&&!x.kelas);
  const k=p?+p.kktp:NaN;
  if(Number.isFinite(k))return k;
  const c=await U.cfg();return Number.isFinite(+c.kktp)?+c.kktp:75;
}

/* ─── Susunan kolom nilai (LM → TG, jumlah UH, Praktik) per mapel + tingkat ───
   Dipakai Input Nilai, Rekap, Nilai Akhir, Remedial, Pengayaan lewat localStorage (cepat, sinkron).
   Salinannya disimpan di koleksi 'kolomnilai' supaya ikut cadangan dan tidak hilang saat ganti
   perangkat/peramban. hidrasiKolom() dijalankan sekali per sesi (lihat file N):
   - pertama kali: isi lokal yang sudah ada dinaikkan ke akun (migrasi),
   - seterusnya: isi akun menjadi sumber, ditulis ke localStorage. */
const KPFX='adm_nilai_kolom_';
const kolomLokal=()=>{const a=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(KPFX))a.push(k)}}catch(_){}return a};
let antreKolom=Promise.resolve();
const simpanKolom=(key,konfigurasi)=>{
  antreKolom=antreKolom.then(async()=>{
    try{
      const rows=await S.db.list('kolomnilai',{},1),r=rows.find(x=>x.key===key),d={key,konfigurasi};
      r?await S.db.update('kolomnilai',r.id,d):await S.db.add('kolomnilai',d);
    }catch(er){console.warn('Konfigurasi kolom nilai belum tersinkron:',er)}
  });
  return antreKolom;
};
async function hidrasiKolom(){
  const rows=await S.db.list('kolomnilai',{},1),tanda='adm_kolom_sinkron_'+S.uid;
  let sudah='';try{sudah=localStorage.getItem(tanda)||''}catch(_){}
  if(!sudah){
    const ada=new Set(rows.map(r=>r.key));
    for(const k of kolomLokal()){
      if(ada.has(k))continue;
      try{await simpanKolom(k,JSON.parse(localStorage.getItem(k)))}catch(_){}
    }
    try{localStorage.setItem(tanda,'1')}catch(_){}
    return;
  }
  rows.forEach(r=>{try{if(r.key&&r.key.startsWith(KPFX)&&r.konfigurasi)localStorage.setItem(r.key,JSON.stringify(r.konfigurasi))}catch(_){}});
}

U.finals=finals;
U.kktpFor=kktpFor;
U.simpanKolom=simpanKolom;
U.hidrasiKolom=hidrasiKolom;
U.hapusKolomLokal=()=>kolomLokal().forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
})();
