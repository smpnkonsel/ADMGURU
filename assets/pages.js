/* ADM Guru Pembelajaran – PEMUAT BAGIAN (satu-satunya file yang perlu dimuat di HTML, setelah sidebar.js).
   Memuat file di folder bagian/ berurutan [A]→[N]. Halaman HTML tetap cukup memanggil ADM.page('kunci');
   bila dipanggil sebelum semua bagian selesai dimuat, panggilan ditunda otomatis lalu dijalankan.
   Letakkan folder "bagian" sejajar dengan file ini. Urutan WAJIB: A, B, C dulu; N paling akhir. */
(function(){
const S=window.ADM,cs=document.currentScript,dir=cs?cs.src.replace(/[^\/]*$/,'')+'bagian/':'bagian/';
const FILES=['A-ALAT-BANTU','B-NILAI-AKHIR','C-MESIN-TABEL','D-DATA-MASTER','E-PRESENSI','F-PENILAIAN','G-PEMBELAJARAN-PEMBINAAN','H-LAPORAN','I-KOMUNIKASI','J-PENGATURAN','K-DASHBOARD','L-WALI-MURID-RCHK','M-TEKS-BANTUAN','N-PETA-HALAMAN'];
const antre=[];
S.page=(...a)=>new Promise(ok=>antre.push([a,ok]));   // sementara, diganti oleh bagian [N]
let i=0;
const muat=()=>{if(i>=FILES.length){antre.forEach(([a,ok])=>ok(S.page(...a)));return}
  const s=document.createElement('script');s.src=dir+FILES[i++]+'.js';
  s.onload=muat;s.onerror=()=>console.error('ADM: gagal memuat bagian/'+s.src.split('/').pop());
  document.head.appendChild(s)};
muat();
})();
