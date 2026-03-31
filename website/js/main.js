// Navbar scroll shadow
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
});

// Mobile hamburger menu
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
}

// Mark active nav link
const currentPath = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
  const linkFile = link.getAttribute('href').split('/').pop();
  if (linkFile === currentPath || (currentPath === '' && linkFile === 'index.html')) {
    link.classList.add('active');
  }
});

// Contact form (Formspree)
const contactForm = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');
const formError = document.getElementById('form-error');

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;

    const data = new FormData(contactForm);

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        contactForm.style.display = 'none';
        formSuccess.classList.add('show');
      } else {
        throw new Error('Server error');
      }
    } catch {
      formError.classList.add('show');
      submitBtn.textContent = 'Send Message';
      submitBtn.disabled = false;
    }
  });
}
