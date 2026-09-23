document.addEventListener("DOMContentLoaded", function () {
  document.body.classList.add("js-siap");

  var semuaHalaman = document.querySelectorAll(".halaman");
  var semuaTombolNav = document.querySelectorAll("[data-tujuan]");
  var menuNavigasi = document.querySelector(".nav-menu");
  var tombolHamburger = document.querySelector(".nav-toggle");

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
});