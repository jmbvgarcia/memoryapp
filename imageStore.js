const ImageStore = (() => {
  const DB_NAME = 'memoryapp-images';
  const STORE   = 'images';
  let db = null;

  function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => { db = req.result; resolve(); };
      req.onerror   = () => reject(req.error);
    });
  }

  function resizeImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  function save(file) {
    return resizeImage(file).then(blob => {
      const key = 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(blob, key);
        tx.oncomplete = () => resolve(key);
        tx.onerror    = () => reject(tx.error);
      });
    });
  }

  function get(key) {
    if (!key) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => req.result ? resolve(URL.createObjectURL(req.result)) : resolve(null);
      req.onerror   = () => reject(req.error);
    });
  }

  function del(key) {
    if (!key) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(dataUrl) {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const bin  = atob(data);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function exportAll(keys) {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length === 0) return Promise.resolve({});
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const result = {};
      let pending = validKeys.length;
      validKeys.forEach(key => {
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) {
            blobToBase64(req.result).then(b64 => {
              result[key] = b64;
              if (--pending === 0) resolve(result);
            });
          } else {
            if (--pending === 0) resolve(result);
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  function importAll(map) {
    if (!map || Object.keys(map).length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const [key, b64] of Object.entries(map)) {
        store.put(base64ToBlob(b64), key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  return { init, save, get, del, exportAll, importAll };
})();
