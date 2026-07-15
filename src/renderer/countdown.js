(function() {
  const el = document.getElementById('countdownVal');
  let count = 3;

  function pulse() {
    el.textContent = count;
    el.classList.remove('show');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('show');

    // Play a small beep sound using Web Audio API (completely local, offline)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(count === 1 ? 880 : 440, audioCtx.currentTime); // higher pitch beep on last count
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('Web Audio beep failed:', e);
    }
  }

  pulse();

  const timer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(timer);
      el.classList.remove('show');
    } else {
      pulse();
    }
  }, 1000);
})();
