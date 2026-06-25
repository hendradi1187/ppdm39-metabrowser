<div class="card">
  <h2 style="margin-top:0">Audit (Target DB)</h2>
  <p class="small">
    Audit dinonaktifkan. Aktifkan dengan mengubah <code>config/config.php</code>:
  </p>
  <pre> 'target_db' =&gt; ['enabled' =&gt; true, ...]</pre>
  <p class="small">Setelah aktif, halaman ini akan membandingkan Meta vs Target DB dan menjalankan beberapa cek integritas (orphan FK, missing objects).</p>
</div>
