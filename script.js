document.addEventListener("DOMContentLoaded", function () {
  document.body.classList.add("js-siap");

  var semuaHalaman = document.querySelectorAll(".halaman");
  var semuaTombolNav = document.querySelectorAll("[data-tujuan]");
  var menuNavigasi = document.querySelector(".nav-menu");
  var tombolHamburger = document.querySelector(".nav-toggle");

  var daftarInstanceGrafik = [];

  function tampilkanHalaman(idTujuan) {
    for (var i = 0; i < semuaHalaman.length; i++) {
      var halaman = semuaHalaman[i];
      var cocok = halaman.id === "halaman-" + idTujuan;
      if (cocok) {
        halaman.classList.add("aktif");
      } else {
        halaman.classList.remove("aktif");
      }
    }

    for (var j = 0; j < semuaTombolNav.length; j++) {
      var tombol = semuaTombolNav[j];
      var cocokTombol = tombol.getAttribute("data-tujuan") === idTujuan;
      if (cocokTombol) {
        tombol.classList.add("aktif");
      } else {
        tombol.classList.remove("aktif");
      }
    }

    window.scrollTo(0, 0);

    history.replaceState(null, "", "#" + idTujuan);

    if (menuNavigasi) {
      menuNavigasi.classList.remove("terbuka");
    }

    // Jika berpindah ke halaman data-fakta, trigger resize agar Chart.js menyesuaikan ukuran kontainer
    if (idTujuan === "data-fakta") {
      setTimeout(function () {
        for (var g = 0; g < daftarInstanceGrafik.length; g++) {
          if (daftarInstanceGrafik[g]) {
            daftarInstanceGrafik[g].resize();
          }
        }
      }, 50);
    }
  }

  for (var k = 0; k < semuaTombolNav.length; k++) {
    (function buatTombolNav(tombol) {
      tombol.addEventListener("click", function () {
        var tujuan = tombol.getAttribute("data-tujuan");
        tampilkanHalaman(tujuan);
      });
    })(semuaTombolNav[k]);
  }

  if (tombolHamburger && menuNavigasi) {
    tombolHamburger.addEventListener("click", function () {
      menuNavigasi.classList.toggle("terbuka");
    });
  }

  var halamanAwal = window.location.hash.replace("#", "") || "beranda";
  tampilkanHalaman(halamanAwal);

  // =========================================================================
  // FASE 2: MEMBACA FILE JSON & MEMBUAT GRAFIK MENGGUNAKAN CHART.JS
  // =========================================================================

  async function ambilDataKuesioner() {
    // 1. Membaca file data-perilaku-energi.json sesuai instruksi tugas
    try {
      var respon = await fetch("data-perilaku-energi.json");
      if (respon.ok) {
        var dataJson = await respon.json();
        console.log("✓ Berhasil membaca data dari file data-perilaku-energi.json", dataJson);
        return dataJson;
      }
    } catch (err) {
      console.warn("Fetch JSON dibatasi oleh browser lokal (misal protokol file://). Menggunakan fallback aman window.DATA_ENERGI.", err);
    }

    // 2. Fallback aman jika halaman dibuka langsung secara offline dari disk (file://)
    if (typeof DATA_ENERGI !== "undefined") {
      console.log("✓ Menggunakan data dari window.DATA_ENERGI (fallback aman)");
      return DATA_ENERGI;
    }

    console.error("Gagal memuat data perilaku energi.");
    return null;
  }

  function formatAngka(num, desimal) {
    return Number(num).toFixed(desimal !== undefined ? desimal : 2);
  }

  function inisialisasiGrafik(data) {
    if (typeof Chart === "undefined") {
      console.error("Chart.js belum dimuat dari CDN!");
      return;
    }

    // Konfigurasi default Chart.js agar selaras dengan palet tema EnergiKita
    Chart.defaults.font.family = "'Karla', -apple-system, Segoe UI, sans-serif";
    Chart.defaults.color = "#22302b";
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.backgroundColor = "#1b4332";
    Chart.defaults.plugins.tooltip.titleFont = { weight: "bold", family: "'Bricolage Grotesque', sans-serif" };

    // Update elemen stat card di DOM dengan data riil kuesioner
    if (data.meta && data.ringkasan) {
      var elResponden = document.getElementById("stat-responden");
      var elSkor = document.getElementById("stat-skor");
      var elPositif = document.getElementById("stat-positif");
      var elTertinggi = document.getElementById("stat-tertinggi");

      if (elResponden) elResponden.textContent = data.meta.jumlah_responden;
      if (elSkor) elSkor.innerHTML = formatAngka(data.ringkasan.rata_rata_skor, 2) + ' <small style="font-size: 1.1rem; color: var(--teks-muted);">/ 4.00</small>';
      if (elPositif) elPositif.textContent = formatAngka(data.ringkasan.persen_sering_rata_rata, 1) + "%";
      if (elTertinggi && data.ringkasan.sorotan && data.ringkasan.sorotan.butir_tertinggi.length > 0) {
        elTertinggi.textContent = formatAngka(data.ringkasan.sorotan.butir_tertinggi[0].rata_rata, 2);
      }
    }

    // -----------------------------------------------------------------------
    // GRAFIK 1: Rata-Rata Skor per Butir Indikator (Horizontal Bar Chart)
    // -----------------------------------------------------------------------
    var canvasButir = document.getElementById("grafikButir");
    if (canvasButir && data.per_butir) {
      var labelSingkat = [
        "P01: Praktik Hemat Sehari-hari",
        "P02: Tindakan Nyata Bengkel/Lab",
        "P03: Matikan Lampu/AC Saat Kosong",
        "P04: Batasi Penggunaan Laptop",
        "P05: Transportasi Hemat Energi",
        "P06: Cabut Charger & Steker",
        "P07: Buka Tirai / Cahaya Alami",
        "P08: Atur Suhu AC/Kipas Bijak",
        "P09: Berani Menegur Teman",
        "P10: Cek Alat Mati Sebelum Pulang"
      ];
      var skorButir = data.per_butir.map(function (b) { return b.rata_rata; });

      // Warna batang: highlight butir terendah (P04 & P09) dengan warna aksen kuning
      var warnaBatang = skorButir.map(function (skor) {
        if (skor <= 3.25) return "#ffc145"; // skor butuh perhatian kampanye
        if (skor >= 3.45) return "#1b4332"; // skor sangat tinggi
        return "#40916c"; // skor baik
      });

      var chartButir = new Chart(canvasButir, {
        type: "bar",
        data: {
          labels: labelSingkat,
          datasets: [{
            label: "Rata-Rata Skor (Skala 1 - 4)",
            data: skorButir,
            backgroundColor: warnaBatang,
            borderColor: "#1b4332",
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              min: 2.5,
              max: 4.0,
              ticks: {
                stepSize: 0.25,
                callback: function (val) { return val.toFixed(2); }
              },
              grid: { color: "rgba(0,0,0,0.06)" }
            },
            y: {
              grid: { display: false },
              ticks: { font: { weight: "600" } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: function (context) {
                  var item = data.per_butir[context.dataIndex];
                  return item ? item.pertanyaan : "";
                }
              }
            }
          }
        }
      });
      daftarInstanceGrafik.push(chartButir);
    }

    // -----------------------------------------------------------------------
    // GRAFIK 2: Proporsi Kategori Perilaku Siswa (Doughnut Chart)
    // -----------------------------------------------------------------------
    var canvasKategori = document.getElementById("grafikKategori");
    if (canvasKategori && data.ringkasan && data.ringkasan.kategori_persen) {
      var kat = data.ringkasan.kategori_persen;
      var labelKategori = [
        "Sangat Baik (3.26 - 4.00)",
        "Baik (2.51 - 3.25)",
        "Cukup (1.76 - 2.50)",
        "Kurang (1.00 - 1.75)"
      ];
      var nilaiKategori = [
        kat["Sangat Baik"],
        kat["Baik"],
        kat["Cukup"],
        kat["Kurang"]
      ];

      var chartKategori = new Chart(canvasKategori, {
        type: "doughnut",
        data: {
          labels: labelKategori,
          datasets: [{
            data: nilaiKategori,
            backgroundColor: ["#1b4332", "#40916c", "#ffc145", "#e76f51"],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 14,
                padding: 12,
                font: { size: 11.5, weight: "600" }
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var label = ctx.label || "";
                  var val = ctx.raw || 0;
                  return " " + label + ": " + val + "%";
                }
              }
            }
          },
          cutout: "60%"
        }
      });
      daftarInstanceGrafik.push(chartKategori);
    }

    // -----------------------------------------------------------------------
    // GRAFIK 3: Rata-Rata Skor per Program Keahlian / Jurusan (Vertical Bar)
    // -----------------------------------------------------------------------
    var canvasJurusan = document.getElementById("grafikJurusan");
    if (canvasJurusan && data.per_jurusan) {
      var labelJurusan = data.per_jurusan.map(function (j) { return j.kode; });
      var skorJurusan = data.per_jurusan.map(function (j) { return j.rata_rata_skor; });
      var warnaJurusan = data.per_jurusan.map(function (j) {
        if (j.kode === "PPLG") return "#ffc145"; // highlight jurusan PPLG
        return "#40916c";
      });

      var chartJurusan = new Chart(canvasJurusan, {
        type: "bar",
        data: {
          labels: labelJurusan,
          datasets: [{
            label: "Rata-Rata Skor",
            data: skorJurusan,
            backgroundColor: warnaJurusan,
            borderColor: "#1b4332",
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 2.8,
              max: 3.8,
              ticks: {
                stepSize: 0.2,
                callback: function (val) { return val.toFixed(2); }
              },
              grid: { color: "rgba(0,0,0,0.06)" }
            },
            x: {
              grid: { display: false },
              ticks: { font: { weight: "700" } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function (items) {
                  if (!items.length) return "";
                  var idx = items[0].dataIndex;
                  return data.per_jurusan[idx].nama + " (" + data.per_jurusan[idx].kode + ")";
                },
                label: function (ctx) {
                  var idx = ctx.dataIndex;
                  var j = data.per_jurusan[idx];
                  return " Rata-rata: " + j.rata_rata_skor.toFixed(2) + " (" + j.jumlah_responden + " siswa)";
                }
              }
            }
          }
        }
      });
      daftarInstanceGrafik.push(chartJurusan);
    }

    // -----------------------------------------------------------------------
    // GRAFIK 4: Distribusi Frekuensi Jawaban per Butir (Stacked Bar Chart 100%)
    // -----------------------------------------------------------------------
    var canvasDistribusi = document.getElementById("grafikDistribusi");
    if (canvasDistribusi && data.per_butir) {
      var labelKodeButir = data.per_butir.map(function (b) { return b.kode; });
      var dataSkor4 = data.per_butir.map(function (b) { return b.persen_per_skor["4"]; });
      var dataSkor3 = data.per_butir.map(function (b) { return b.persen_per_skor["3"]; });
      var dataSkor2 = data.per_butir.map(function (b) { return b.persen_per_skor["2"]; });
      var dataSkor1 = data.per_butir.map(function (b) { return b.persen_per_skor["1"]; });

      var chartDistribusi = new Chart(canvasDistribusi, {
        type: "bar",
        data: {
          labels: labelKodeButir,
          datasets: [
            {
              label: "Selalu / Sangat Sering (Skor 4)",
              data: dataSkor4,
              backgroundColor: "#1b4332",
              borderWidth: 0
            },
            {
              label: "Sering (Skor 3)",
              data: dataSkor3,
              backgroundColor: "#40916c",
              borderWidth: 0
            },
            {
              label: "Jarang (Skor 2)",
              data: dataSkor2,
              backgroundColor: "#ffc145",
              borderWidth: 0
            },
            {
              label: "Tidak Pernah / Sangat Jarang (Skor 1)",
              data: dataSkor1,
              backgroundColor: "#e76f51",
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { font: { weight: "700" } }
            },
            y: {
              stacked: true,
              max: 100,
              ticks: {
                callback: function (val) { return val + "%"; }
              },
              grid: { color: "rgba(0,0,0,0.06)" }
            }
          },
          plugins: {
            legend: {
              position: "top",
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                title: function (items) {
                  if (!items.length) return "";
                  var idx = items[0].dataIndex;
                  return data.per_butir[idx].kode + " - " + data.per_butir[idx].label;
                },
                label: function (ctx) {
                  return " " + ctx.dataset.label + ": " + ctx.raw + "%";
                }
              }
            }
          }
        }
      });
      daftarInstanceGrafik.push(chartDistribusi);
    }
  }

  // Panggil pembacaan data JSON dan inisialisasi grafik
  ambilDataKuesioner().then(function (data) {
    if (data) {
      inisialisasiGrafik(data);
    }
  });

  // =========================================================================
  // FASE 3: INTERAKSI AJAKAN BERTINDAK (TANTANGAN 7 HARI, TIPS, IKRAR KOMITMEN)
  // =========================================================================

  // 1. TANTANGAN 7 HARI HEMAT ENERGI
  function inisialisasiTantangan() {
    var daftarCheckbox = document.querySelectorAll("#daftarTantangan input[type='checkbox']");
    var progressIsi = document.getElementById("progressTantanganIsi");
    var labelPersen = document.getElementById("labelTantanganPersen");
    var labelCount = document.getElementById("labelTantanganCount");
    var notifSelesai = document.getElementById("notifTantangan");

    if (!daftarCheckbox.length) return;

    var statusTersimpan = {};
    try {
      var dataLS = localStorage.getItem("energikita_tantangan");
      if (dataLS) statusTersimpan = JSON.parse(dataLS);
    } catch (e) {
      console.warn("LocalStorage tidak dapat diakses", e);
    }

    function perbaruiProgress() {
      var selesai = 0;
      var total = daftarCheckbox.length;

      daftarCheckbox.forEach(function (cb) {
        var hari = cb.getAttribute("data-hari");
        var itemWrap = cb.closest(".item-tantangan");
        if (cb.checked) {
          selesai++;
          if (itemWrap) itemWrap.classList.add("selesai");
          statusTersimpan[hari] = true;
        } else {
          if (itemWrap) itemWrap.classList.remove("selesai");
          delete statusTersimpan[hari];
        }
      });

      var persen = Math.round((selesai / total) * 100);
      if (progressIsi) progressIsi.style.width = persen + "%";
      if (labelPersen) labelPersen.textContent = persen + "% Selesai";
      if (labelCount) labelCount.textContent = selesai + " dari " + total + " Misi";

      if (notifSelesai) {
        notifSelesai.style.display = selesai === total ? "block" : "none";
      }

      try {
        localStorage.setItem("energikita_tantangan", JSON.stringify(statusTersimpan));
      } catch (e) {}
    }

    // Pasang status awal dari storage
    daftarCheckbox.forEach(function (cb) {
      var hari = cb.getAttribute("data-hari");
      if (statusTersimpan[hari]) {
        cb.checked = true;
      }
      cb.addEventListener("change", perbaruiProgress);
    });

    perbaruiProgress();
  }

  // 2. KAPSUL TIPS HARIAN DINAMIS
  function inisialisasiTipsHarian() {
    var btnAcak = document.getElementById("btnAcakTips");
    var elJudul = document.getElementById("judulTipsHarian");
    var elDesk = document.getElementById("deskripsiTipsHarian");
    var elEst = document.getElementById("estimasiTipsHarian");

    var koleksiTips = [
      {
        judul: "Atur Suhu AC Optimal di 24°C–25°C",
        deskripsi: "Setiap kenaikan 1°C pada setelan AC (misal dari 20°C ke 24°C) dapat menghemat konsumsi listrik hingga 7–10% tanpa mengurangi kenyamanan sejuk di dalam kelas.",
        estimasi: "⚡ Hemat: ~250 Watt per jam per AC"
      },
      {
        judul: "Cabut Steker Charger yang Menganggur",
        deskripsi: "Charger HP atau laptop yang tetap tertancap di stopkontak tanpa gawai tetap menyedot listrik siluman (vampire power) sebesar 0,25–0,5 Watt per jam secara nonstop.",
        estimasi: "⚡ Hemat: Mencegah 4-6 kWh kebocoran listrik/bulan"
      },
      {
        judul: "Optimalkan Kecerahan Layar Laptop",
        deskripsi: "Menurunkan tingkat kecerahan layar laptop dari 100% ke 70% dapat memperpanjang masa pakai baterai hingga 30 menit dan mengurangi frekuensi pengisian daya listrik.",
        estimasi: "⚡ Hemat: ~15–20 Watt per jam pemakaian"
      },
      {
        judul: "Tutup Gorden saat Matahari Mulai Terik",
        deskripsi: "Setelah jam 11.30 WIB ketika matahari semakin terik, menutup tirai jendela membantu menjaga suhu ruang tetap stabil dan meringankan beban kerja kompresor pendingin ruangan.",
        estimasi: "⚡ Hemat: Beban kompresor turun hingga 15%"
      },
      {
        judul: "Aktifkan Fitur Sleep Mode 5 Menit",
        deskripsi: "Mode sleep otomatis pada PC lab komputer memangkas konsumsi daya dari 80-120 Watt menjadi kurang dari 5 Watt saat siswa meninggalkan meja untuk istirahat.",
        estimasi: "⚡ Hemat: ~90% daya saat jeda kelas"
      },
      {
        judul: "Matikan Saklar Proyektor LCD",
        deskripsi: "Lampu proyektor LCD mengonsumsi daya rata-rata 250–350 Watt. Mematikannya segera setelah presentasi selesai sangat signifikan bagi efisiensi energi kelas.",
        estimasi: "⚡ Hemat: ~300 Watt per jam proyektor mati"
      }
    ];

    var indeksTerakhir = 0;

    function tampilkanTips(idx) {
      var t = koleksiTips[idx];
      if (elJudul) elJudul.textContent = t.judul;
      if (elDesk) elDesk.textContent = t.deskripsi;
      if (elEst) elEst.textContent = t.estimasi;
    }

    if (btnAcak) {
      btnAcak.addEventListener("click", function () {
        var idxBaru;
        do {
          idxBaru = Math.floor(Math.random() * koleksiTips.length);
        } while (idxBaru === indeksTerakhir && koleksiTips.length > 1);
        indeksTerakhir = idxBaru;
        tampilkanTips(idxBaru);
      });
    }
  }

  // 3. IKRAR KOMITMEN SISWA
  function inisialisasiFormIkrar() {
    var form = document.getElementById("formIkrar");
    var elJumlah = document.getElementById("jumlahIkrar");
    var elDaftar = document.getElementById("daftarIkrarTerbaru");

    var ikrarDefault = [
      { nama: "Tubagus Erlangga", rombel: "PPLG", aksi: "Cabut Steker, Matikan Listrik" },
      { nama: "Hazel Anthony", rombel: "PPLG", aksi: "Protokol Layar Istirahat" },
      { nama: "Ahmad Gerry", rombel: "PPLG", aksi: "Ranger Energi Rombel" },
      { nama: "Siti Rahma", rombel: "PMN", aksi: "Matikan AC Saat Kosong" },
      { nama: "Budi Santoso", rombel: "TJKT", aksi: "Audit Meja Praktik" }
    ];

    var daftarIkrar = [];
    try {
      var dataTersimpan = localStorage.getItem("energikita_ikrar_list");
      if (dataTersimpan) {
        daftarIkrar = JSON.parse(dataTersimpan);
      } else {
        daftarIkrar = ikrarDefault;
        localStorage.setItem("energikita_ikrar_list", JSON.stringify(daftarIkrar));
      }
    } catch (e) {
      daftarIkrar = ikrarDefault;
    }

    function renderIkrar() {
      if (elJumlah) {
        elJumlah.textContent = 25 + daftarIkrar.length;
      }

      if (elDaftar) {
        elDaftar.innerHTML = "";
        daftarIkrar.slice(0, 8).forEach(function (item) {
          var row = document.createElement("div");
          row.className = "item-ikrar";
          row.innerHTML =
            '<div><span class="item-ikrar-nama">' +
            escapeHtml(item.nama) +
            " (" +
            escapeHtml(item.rombel) +
            ")</span></div>" +
            '<div class="item-ikrar-aksi">✓ ' +
            escapeHtml(item.aksi) +
            "</div>";
          elDaftar.appendChild(row);
        });
      }
    }

    function escapeHtml(text) {
      var div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var inpNama = document.getElementById("namaIkrar");
        var inpRombel = document.getElementById("rombelIkrar");
        var checkedAksi = document.querySelectorAll("input[name='aksiPilihan']:checked");

        if (!inpNama || !inpRombel || !inpNama.value.trim() || !inpRombel.value) return;

        var daftarAksiPilihan = [];
        checkedAksi.forEach(function (c) {
          daftarAksiPilihan.push(c.value);
        });

        var teksAksi = daftarAksiPilihan.length ? daftarAksiPilihan[0] : "Duta Hemat Energi";

        var ikrarBaru = {
          nama: inpNama.value.trim(),
          rombel: inpRombel.value,
          aksi: teksAksi
        };

        daftarIkrar.unshift(ikrarBaru);
        try {
          localStorage.setItem("energikita_ikrar_list", JSON.stringify(daftarIkrar));
        } catch (err) {}

        renderIkrar();
        form.reset();
        alert("Terima kasih, " + ikrarBaru.nama + "! Komitmenmu telah tercatat sebagai Duta EnergiKita.");
      });
    }

    renderIkrar();
  }

  // Jalankan inisialisasi fitur Fase 3
  inisialisasiTantangan();
  inisialisasiTipsHarian();
  inisialisasiFormIkrar();
});
