import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 503) {
            const msg = error.response.data?.message
                || 'Impossible de se connecter à la base de données. Veuillez réessayer plus tard.';
            // Show a non-intrusive alert banner if not already shown
            if (!document.getElementById('db-error-banner')) {
                const banner = document.createElement('div');
                banner.id = 'db-error-banner';
                banner.style.cssText = [
                    'position:fixed', 'top:16px', 'left:50%', 'transform:translateX(-50%)',
                    'z-index:99999', 'background:#fee2e2', 'color:#991b1b',
                    'border:1px solid #fca5a5', 'border-radius:8px',
                    'padding:12px 20px', 'font-size:14px', 'font-family:sans-serif',
                    'box-shadow:0 4px 12px rgba(0,0,0,0.15)', 'max-width:480px',
                    'display:flex', 'align-items:center', 'gap:10px'
                ].join(';');
                banner.innerHTML = `<span>⚠️</span><span>${msg}</span>
                    <button onclick="this.parentElement.remove()" style="margin-left:12px;background:none;border:none;cursor:pointer;font-size:16px;color:#991b1b">✕</button>`;
                document.body.appendChild(banner);
                setTimeout(() => banner?.remove(), 8000);
            }
        }
        return Promise.reject(error);
    }
);
