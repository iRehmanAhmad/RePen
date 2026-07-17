(function() {
  const elements = {
    tabScreens: document.getElementById('tabScreens'),
    tabWindows: document.getElementById('tabWindows'),
    sourcesGrid: document.getElementById('sourcesGrid'),
    systemAudio: document.getElementById('systemAudio'),
    micDevice: document.getElementById('micDevice'),
    micMeter: document.getElementById('micMeter'),
    micMeterFill: document.getElementById('micMeterFill'),
    webcamDevice: document.getElementById('webcamDevice'),
    webcamPreviewBox: document.getElementById('webcamPreviewBox'),
    webcamVideo: document.getElementById('webcamVideo'),
    destinationPath: document.getElementById('destinationPath'),
    browsePath: document.getElementById('browsePath'),
    diskSpaceInfo: document.getElementById('diskSpaceInfo'),
    fpsQuality: document.getElementById('fpsQuality'),
    captureCursor: document.getElementById('captureCursor'),
    setupMessage: document.getElementById('setupMessage'),
    cancelButton: document.getElementById('cancelButton'),
    startButton: document.getElementById('startButton'),
  };

  let activeTab = 'screens'; // 'screens' | 'windows'
  let rawSources = [];
  let selectedSourceId = null;
  let defaultDestination = '';
  let selectedDestination = '';
  let availableDiskSpace = 0;
  let micAudioContext = null;
  let micAnalyser = null;
  let micStream = null;
  let micMeterInterval = null;
  let webcamStream = null;
  let sourcesInterval = null;

  async function init() {
    setupEventListeners();
    await loadSystemInfo();
    await refreshSources();
    await enumerateAVDevices();

    // Poll for window/screen updates every 2.5 seconds
    sourcesInterval = setInterval(refreshSources, 2500);
  }

  function setupEventListeners() {
    elements.tabScreens.addEventListener('click', () => switchTab('screens'));
    elements.tabWindows.addEventListener('click', () => switchTab('windows'));
    elements.cancelButton.addEventListener('click', () => {
      stopStreams();
      window.appBridge.closeRecordingSetup();
    });

    elements.browsePath.addEventListener('click', async () => {
      const result = await window.appBridge.selectRecordingDirectory();
      if (result) {
        selectedDestination = result.path;
        availableDiskSpace = result.freeSpaceBytes;
        elements.destinationPath.value = selectedDestination;
        updateDiskSpaceDisplay();
        validateForm();
      }
    });

    elements.micDevice.addEventListener('change', async () => {
      await startMicMeter();
    });

    elements.webcamDevice.addEventListener('change', async () => {
      await startWebcamPreview();
    });

    elements.startButton.addEventListener('click', async () => {
      await startRecordingFlow();
    });
  }

  function switchTab(tabName) {
    activeTab = tabName;
    elements.tabScreens.classList.toggle('active', activeTab === 'screens');
    elements.tabWindows.classList.toggle('active', activeTab === 'windows');
    renderSources();
  }

  async function loadSystemInfo() {
    try {
      const info = await window.appBridge.getSystemInfo();
      defaultDestination = info.defaultDestination;
      if (!selectedDestination) {
        selectedDestination = defaultDestination;
      }
      availableDiskSpace = info.freeSpaceBytes;
      elements.destinationPath.value = selectedDestination;
      updateDiskSpaceDisplay();
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  }

  function updateDiskSpaceDisplay() {
    const freeGB = (availableDiskSpace / (1024 * 1024 * 1024)).toFixed(1);
    if (availableDiskSpace < 1024 * 1024 * 1024) { // Less than 1GB
      elements.diskSpaceInfo.className = 'disk-space-warning';
      elements.diskSpaceInfo.textContent = `Warning: Low space (${freeGB} GB available)`;
    } else {
      elements.diskSpaceInfo.className = 'disk-space-ok';
      elements.diskSpaceInfo.textContent = `${freeGB} GB available`;
    }
  }

  async function refreshSources() {
    try {
      rawSources = await window.appBridge.getRecordingSources();
      renderSources();
    } catch (err) {
      console.error('Failed to get sources:', err);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function safeImageUrl(value) {
    return typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) ? value : '';
  }

  function renderSources() {
    const scrollPos = elements.sourcesGrid.scrollTop;
    elements.sourcesGrid.innerHTML = '';

    const filtered = rawSources.filter((s) => {
      const isScreen = s.id.startsWith('screen:');
      return activeTab === 'screens' ? isScreen : !isScreen;
    });

    if (filtered.length === 0) {
      elements.sourcesGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--muted); font-size: 12px;">No sources found.</div>`;
      return;
    }

    filtered.forEach((source) => {
      const isSelected = selectedSourceId === source.id;
      const card = document.createElement('div');
      card.className = `source-card${isSelected ? ' selected' : ''}`;
      card.innerHTML = `
        <img class="source-thumbnail" src="${safeImageUrl(source.thumbnail)}" alt="${escapeHtml(source.name)}" />
        <div class="source-info">
          ${safeImageUrl(source.appIcon) ? `<img class="source-icon" src="${safeImageUrl(source.appIcon)}" alt="" />` : ''}
          <span class="source-name">${escapeHtml(source.name || 'Untitled source')}</span>
        </div>
        ${isSelected ? `<div class="check-badge">✓</div>` : ''}
      `;
      card.addEventListener('click', () => {
        selectedSourceId = source.id;
        renderSources();
        validateForm();
      });
      elements.sourcesGrid.appendChild(card);
    });

    elements.sourcesGrid.scrollTop = scrollPos;
  }

  async function enumerateAVDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      elements.micDevice.innerHTML = '<option value="none">Disabled</option>';
      elements.webcamDevice.innerHTML = '<option value="none">Disabled</option>';

      devices.forEach((device) => {
        if (device.kind === 'audioinput') {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `Microphone (${elements.micDevice.children.length})`;
          elements.micDevice.appendChild(option);
        } else if (device.kind === 'videoinput') {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `Camera (${elements.webcamDevice.children.length})`;
          elements.webcamDevice.appendChild(option);
        }
      });
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }

  async function startMicMeter() {
    stopMic();
    const deviceId = elements.micDevice.value;
    if (deviceId === 'none') {
      elements.micMeter.style.display = 'none';
      return;
    }

    elements.micMeter.style.display = 'block';
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });

      micAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = micAudioContext.createMediaStreamSource(micStream);
      micAnalyser = micAudioContext.createAnalyser();
      micAnalyser.fftSize = 256;
      source.connect(micAnalyser);

      const bufferLength = micAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      micMeterInterval = setInterval(() => {
        if (!micAnalyser) return;
        micAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const percent = Math.min(100, Math.round((average / 128) * 100));
        elements.micMeterFill.style.width = `${percent}%`;
      }, 50);
    } catch (err) {
      console.error('Failed to start microphone meter:', err);
      elements.micMeter.style.display = 'none';
    }
  }

  async function startWebcamPreview() {
    stopWebcam();
    const deviceId = elements.webcamDevice.value;
    if (deviceId === 'none') {
      elements.webcamPreviewBox.style.display = 'none';
      return;
    }

    elements.webcamPreviewBox.style.display = 'block';
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 320, height: 180 },
        audio: false,
      });
      elements.webcamVideo.srcObject = webcamStream;
    } catch (err) {
      console.error('Failed to start webcam preview:', err);
      elements.webcamPreviewBox.style.display = 'none';
    }
  }

  function stopMic() {
    if (micMeterInterval) {
      clearInterval(micMeterInterval);
      micMeterInterval = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (micAudioContext) {
      micAudioContext.close().catch(() => {});
      micAudioContext = null;
    }
    elements.micMeterFill.style.width = '0%';
  }

  function stopWebcam() {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      webcamStream = null;
    }
    elements.webcamVideo.srcObject = null;
  }

  function stopStreams() {
    stopMic();
    stopWebcam();
    if (sourcesInterval) {
      clearInterval(sourcesInterval);
      sourcesInterval = null;
    }
  }

  function validateForm() {
    const hasSource = selectedSourceId !== null;
    const hasSpace = availableDiskSpace >= 100 * 1024 * 1024; // Require at least 100MB

    const isValid = hasSource && hasSpace;
    elements.startButton.disabled = !isValid;

    if (!hasSource) {
      elements.setupMessage.textContent = 'Please select a screen or window source to record.';
      elements.setupMessage.style.color = 'var(--danger)';
    } else if (!hasSpace) {
      elements.setupMessage.textContent = 'Insufficient disk space in destination folder.';
      elements.setupMessage.style.color = 'var(--danger)';
    } else {
      elements.setupMessage.textContent = 'Setup is valid. Ready to record!';
      elements.setupMessage.style.color = 'var(--success)';
    }
  }

  async function startRecordingFlow() {
    const selectedSource = rawSources.find((s) => s.id === selectedSourceId);
    if (!selectedSource) return;

    stopStreams();

    const fpsQualityVal = elements.fpsQuality.value;
    const [fpsStr, qualityStr] = fpsQualityVal.split('_');
    const fps = parseInt(fpsStr);

    const recordingOptions = {
      sourceId: selectedSource.id,
      sourceType: selectedSource.id.startsWith('screen:') ? 'screen' : 'window',
      displayId: selectedSource.display_id ? parseInt(selectedSource.display_id) : 0,
      fps: fps,
      width: selectedSource.id.startsWith('screen:') ? 1920 : 1280,
      height: selectedSource.id.startsWith('screen:') ? 1080 : 720,
      captureSystemAudio: elements.systemAudio.checked,
      captureMic: elements.micDevice.value !== 'none',
      microphoneDeviceId: elements.micDevice.value !== 'none' ? elements.micDevice.value : null,
      webcamEnabled: elements.webcamDevice.value !== 'none',
      webcamDeviceId: elements.webcamDevice.value !== 'none' ? elements.webcamDevice.value : null,
      captureCursor: elements.captureCursor.checked,
      outputPath: `${selectedDestination}/recording-${Date.now()}.mp4`,
    };

    const showStartError = async (error) => {
      await window.appBridge.openRecordingSetup().catch(() => {});
      elements.setupMessage.textContent = `Recording failed to start: ${error}`;
      elements.setupMessage.style.color = 'var(--danger)';
      elements.startButton.disabled = false;
    };

    try {
      const countdownResult = await window.appBridge.startCountdown(recordingOptions.displayId, 3);
      if (!countdownResult.success) throw new Error(countdownResult.error || 'Unable to start countdown.');

      let secondsLeft = 3;
      const countdownTimer = setInterval(async () => {
        secondsLeft--;
        if (secondsLeft > 0) return;

        clearInterval(countdownTimer);
        try {
          const closeCountdownResult = await window.appBridge.closeCountdown();
          if (!closeCountdownResult.success) throw new Error(closeCountdownResult.error || 'Unable to close countdown.');
          const startResult = await window.appBridge.startRecording(recordingOptions);
          if (!startResult.success) throw new Error(startResult.error || 'Native recorder did not start.');
        } catch (error) {
          await showStartError(error?.message || String(error));
        }
      }, 1000);
    } catch (error) {
      await showStartError(error?.message || String(error));
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
