const Storage = (() => {
  const KEY = 'memoryapp';

  function defaults() {
    return {
      cards: [],
      settings: { newCardsPerDay: 20 },
      stats: { streak: 0, lastReviewDate: null },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return { ...defaults(), ...JSON.parse(raw) };
    } catch {
      return defaults();
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `memoryapp-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importJSON(text) {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.cards)) throw new Error('Invalid format');
      save(data);
      return true;
    } catch {
      return false;
    }
  }

  return { load, save, exportJSON, importJSON };
})();
