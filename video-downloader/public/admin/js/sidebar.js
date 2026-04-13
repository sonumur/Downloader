// Sidebar navigation items
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>` },
  { href: '/admin/blogs', label: 'Blogs', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>` },
  { href: '/admin/enquiries', label: 'Enquiries', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>` },
  { href: '/admin/faqs', label: 'FAQs', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>` },
  { href: '/admin/pages', label: 'Pages', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>` },
  { href: '/admin/settings', label: 'Settings', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>` },
  { href: '/admin/users', label: 'Users', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>` },
];

function buildSidebar(activePage) {
  const nav = document.getElementById('adminSidebarNav');
  if (!nav) return;
  nav.innerHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.label ? 'active' : ''}">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${item.icon}</svg>
      <span class="nav-item-text">${item.label}</span>
    </a>
  `).join('');

  // Add overlay if it doesn't exist
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = toggleSidebar;
    document.body.appendChild(overlay);
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
}

function buildHeader() {
  const header = document.getElementById('adminTopHeader');
  if (!header) return;

  // Add toggle button if it doesn't exist
  if (!header.querySelector('.sidebar-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    `;
    toggleBtn.onclick = toggleSidebar;
    header.prepend(toggleBtn);
  }

  // Show user initials from Firebase if logged in
  if (window.firebase && firebase.apps.length) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        const initial = (user.email || 'A').charAt(0).toUpperCase();
        const avatar = header.querySelector('.user-avatar');
        if (avatar) avatar.textContent = initial;
      }
    });
  }
}

// Automatically build header on DOM load
document.addEventListener('DOMContentLoaded', () => {
  buildHeader();
});
