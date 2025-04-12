// Main JavaScript file for the site

document.addEventListener('DOMContentLoaded', () => {
  console.log('Site loaded successfully!');
  
  // Example of adding a class to highlight the current nav item
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-item a');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.parentElement.classList.add('current');
    }
  });
});
