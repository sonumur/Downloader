document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.endsWith('login.html') || currentPath.endsWith('login');

  // Only allow mock/preview mode if Firebase SDK is completely absent (dev with no internet)
  const firebaseReady = window.firebase && typeof firebase.auth === 'function';
  if (!firebaseReady) {
    console.warn("Firebase SDK not loaded. Auth is mocked for offline preview only.");
    if (!isLoginPage) handleSignOutBtnMock();
    else handleLoginFormMock();
    return;
  }

  // Firebase Auth State Observer
  firebase.auth().onAuthStateChanged((user) => {
    if (!user && !isLoginPage) {
      // Not logged in -> Dashboard
      window.location.href = 'login';
      return;
    }
    
    if (user && isLoginPage) {
      // Logged in -> Login Page
      window.location.href = 'index';
      return;
    }

    // Setup events once auth state is known
    if (isLoginPage) setupLoginLogic();
    else setupDashboardLogic();
  });

  function setupLoginLogic() {
    const loginForm = document.getElementById('adminLoginForm');
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
        errorDiv.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
          await firebase.auth().signInWithEmailAndPassword(email, password);
          // Redirect handled by onAuthStateChanged
        } catch (error) {
          errorDiv.textContent = error.message;
          errorDiv.style.display = 'block';
          loginBtn.disabled = false;
          loginBtn.textContent = 'Sign in';
        }
      });
    }
  }

  function setupDashboardLogic() {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        try {
          await firebase.auth().signOut();
          // Redirect handled by onAuthStateChanged
        } catch (error) {
          console.error("Sign out error", error);
          alert('Error signing out.');
        }
      });
    }
  }

  function handleSignOutBtnMock() {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => { window.location.href = 'login'; });
    }
  }

  function handleLoginFormMock() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        window.location.href = 'index';
      });
    }
  }
});
