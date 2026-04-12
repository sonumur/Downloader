document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('mobileMenuToggle');
  const headerContent = document.querySelector('.header-content');

  if (!toggle || !headerContent) return;

  toggle.addEventListener('click', function () {
    const isOpen = headerContent.classList.toggle('mobile-nav-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', function (event) {
    if (!headerContent.contains(event.target)) {
      headerContent.classList.remove('mobile-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
});
