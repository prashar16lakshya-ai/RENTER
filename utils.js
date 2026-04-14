export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const typeStyles = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-white',
    info: 'bg-slate-800 text-white'
  };

  const toast = document.createElement('div');
  toast.className = `px-4 py-2 rounded-lg shadow-soft text-sm ${typeStyles[type] ?? typeStyles.info}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

export function showLoader(ms = 500) {
  const loader = document.getElementById('loader');
  if (!loader) return;

  loader.classList.remove('hidden');
  loader.classList.add('flex');

  setTimeout(() => {
    loader.classList.add('hidden');
    loader.classList.remove('flex');
  }, ms);
}

export function customConfirm(message, callback, type = 'info') {
  const okay = window.confirm(`[${type.toUpperCase()}] ${message}`);
  callback(okay);
}

export function generateId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}_${Date.now().toString(36)}`;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to convert file.'));
    reader.readAsDataURL(file);
  });
}
