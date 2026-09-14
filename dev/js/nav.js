// ======================================================
//  共用導覽列功能
// ======================================================

function initNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .bnav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('menu-overlay');

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      overlay && overlay.classList.toggle('show');
    });
    overlay && overlay.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

document.addEventListener('DOMContentLoaded', initNav);
