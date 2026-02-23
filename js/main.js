let menuToggle = document.querySelector('.menu-toggle');
let menuLinks = document.querySelector('.menu-links');

menuToggle.addEventListener('click', () => {
  menuLinks.classList.toggle('active');
});