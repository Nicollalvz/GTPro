// Efecto en la barra de navegación al bajar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.padding = '10px 0';
        navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    } else {
        navbar.style.padding = '15px 0';
        navbar.style.boxShadow = '0 2px 15px rgba(0,0,0,0.15)';
    }
});