<template>
  <div class="changelog-page">
    <Navbar />
    <main class="changelog-container">
      <div class="changelog-header">
        <h1>Changelog - v3.1.0</h1>
        <p class="subtitle">Daftar perubahan dan fitur baru dalam versi terbaru</p>
      </div>

      <div class="changelog-content">
        <h2>Fitur Baru</h2>
        <ul>
          <li><strong>Multi-Tagging Sistem</strong> - Kategorisasi buku dengan hashtag untuk pencarian yang lebih cepat</li>
          <li><strong>Penyimpanan Stok Per Posisi</strong> - Breakdown inventaris buku berdasarkan lokasi fisik</li>
          <li><strong>Tracking Alokasi Pinjaman</strong> - Lihat ketersediaan stok per posisi saat melakukan pengajuan pinjam</li>
          <li><strong>Dark Mode Penuh</strong> - Tema gelap yang konsisten di semua halaman</li>
          <li><strong>Logging Terintegrasi</strong> - 26+ tipe aktivitas tercatat untuk audit trail</li>
          <li><strong>Mobile UX Improvements</strong> - Navigasi dan penyesuaian tampilan untuk perangkat mobile</li>
        </ul>

        <h2>Perbaikan</h2>
        <ul>
          <li>Performa kategori sidebar yang lebih baik</li>
          <li>Konsistensi theme tokens di seluruh aplikasi</li>
          <li>Keamanan transaksi untuk operasi stok dan pinjaman</li>
          <li>Kontras warna untuk aksesibilitas yang lebih baik</li>
          <li>Implementasi grayscale palette untuk antarmuka yang lebih netral</li>
        </ul>

        <h2>Detail Teknis</h2>
        <div class="tech-details">
          <h3>Backend (API)</h3>
          <ul>
            <li>Endpoint baru: <code>GET /loans/:id</code> - Detail pinjaman dengan alokasi stok</li>
            <li>Endpoint baru: <code>GET /books/:id/availability</code> - Ketersediaan stok per posisi</li>
            <li>Endpoint baru: <code>GET/PUT /books/:id/stock-breakdown</code> - Manajemen stok multi-lokasi</li>
            <li>Tabel baru: <code>book_stock_locations</code> & <code>loan_stock_allocations</code></li>
            <li>Algoritma alokasi greedy untuk distribusi stok otomatis</li>
          </ul>

          <h3>Frontend (Web)</h3>
          <ul>
            <li>Token theme system untuk consistency (theme.css)</li>
            <li>Komponen modal baru untuk detail pinjaman + ketersediaan</li>
            <li>Integrasi API untuk availability fetching real-time</li>
            <li>Mobile drawer untuk kategori sidebar</li>
            <li>Version footer dengan link changelog (v3.1.0)</li>
          </ul>
        </div>

        <h2>Kompatibilitas</h2>
        <p>✅ <strong>Backward Compatible</strong> - Semua perubahan bersifat tambahan. Database schema memiliki default values untuk kolom baru.</p>

        <h2>Upgrade Path</h2>
        <ol>
          <li>Jalankan migration SQL (schema.sql) untuk tabel baru</li>
          <li>Deploy backend binary terbaru</li>
          <li>Deploy frontend dengan npm build</li>
          <li>Verifikasi availability endpoint: <code>GET /books/1/availability</code></li>
        </ol>

        <h2>Roadmap Selanjutnya (Phase 4b-4z)</h2>
        <ul>
          <li><strong>Phase 4b:</strong> Inventory Transfer - Admin dapat memindahkan stok antar posisi</li>
          <li><strong>Phase 4c:</strong> Stock Stocktake - Rekonsiliasi stok fisik vs sistem</li>
          <li><strong>Phase 4d:</strong> Loan Audit Dashboard - Laporan alokasi pinjaman by posisi</li>
          <li><strong>Phase 4e:</strong> Member Archive - Profil & riwayat peminjam publik</li>
        </ul>

        <div class="divider"></div>
        <p class="footer-note">Untuk pertanyaan atau laporan bug, hubungi tim development: <a href="mailto:itbamuhammadkamil@gmail.com">Hexadev Technologies Mail</a></p>
      </div>
    </main>
  </div>
</template>

<script setup>
import Navbar from '../components/Navbar.vue'
</script>

<style scoped>
.changelog-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
}

.changelog-container {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  width: 100%;
}

.changelog-header {
  margin-bottom: 3rem;
  text-align: center;
}

.changelog-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
}

.changelog-content {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
}

.changelog-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 2rem 0 1rem;
  color: var(--text-primary);
  border-bottom: 2px solid var(--text-primary);
  padding-bottom: 0.5rem;
}

.changelog-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: var(--text-secondary);
}

.changelog-content ul {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0;
}

.changelog-content li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.6;
}

.changelog-content li:before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--text-secondary);
  font-weight: 600;
}

.changelog-content ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.changelog-content ol li {
  padding: 0.5rem 0;
  list-style-type: decimal;
  padding-left: 0.5rem;
  line-height: 1.6;
}

.tech-details {
  background: var(--bg-elevated);
  border-left: 4px solid var(--text-primary);
  padding: 1.5rem;
  border-radius: 6px;
  margin: 1.5rem 0;
}

.changelog-content code {
  background: var(--bg-page);
  border: 1px solid var(--border);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 2rem 0;
}

.footer-note {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 2rem;
}

.footer-note a {
  color: var(--text-primary);
  text-decoration: underline;
  transition: opacity 0.2s;
}

.footer-note a:hover {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .changelog-container {
    padding: 1rem;
  }

  .changelog-header h1 {
    font-size: 1.75rem;
  }

  .changelog-content {
    padding: 1.5rem;
  }

  .tech-details {
    padding: 1rem;
  }
}
</style>
