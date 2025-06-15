function setRipple(e: MouseEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.className = 'v-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    el.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

export default {
    mounted(el: HTMLElement) {
        el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.addEventListener('click', (e) => setRipple(e as MouseEvent, el));
    },
    unmounted(el: HTMLElement) {
        el.removeEventListener('click', (e) => setRipple(e as MouseEvent, el));
    }
};
