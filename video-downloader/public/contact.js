/**
 * Contact form submission — saves to Firebase Firestore 'enquiries' collection
 * Include this script + Firebase SDKs on any page with a contact form.
 */

async function submitContactForm(e) {
  e.preventDefault();

  const btn = document.getElementById('contactSubmitBtn');
  const successMsg = document.getElementById('contactSuccess');
  const errorMsg = document.getElementById('contactError');
  const form = document.getElementById('contactForm');

  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  if (!name || !email || !message) {
    errorMsg.textContent = 'Please fill in all required fields.';
    errorMsg.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';
  errorMsg.style.display = 'none';

  try {
    if (window.db) {
      // Save to Firebase Firestore
      await window.db.collection('enquiries').add({
        name,
        email,
        subject: subject || 'General Enquiry',
        message,
        status: 'New',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Fallback: send to server API
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error('Server error');
    }

    form.reset();
    successMsg.style.display = 'block';
    successMsg.textContent = '✓ Message sent successfully! We\'ll get back to you soon.';
    setTimeout(() => { successMsg.style.display = 'none'; }, 6000);
  } catch (err) {
    errorMsg.textContent = 'Failed to send message. Please try again.';
    errorMsg.style.display = 'block';
  }

  btn.disabled = false;
  btn.textContent = 'Send Message';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', submitContactForm);
});
