# Third-Party Source Notice: OpenScreen

This directory contains code and assets adapted from the **OpenScreen** project.

* **Source Repository**: [github.com/siddharthvaddem/openscreen](https://github.com/siddharthvaddem/openscreen)
* **Pinned Commit Baseline**: `f57e36e25448b5af6c7b1b271066fe5beb9b8a49` (v1.5.0-era, 2026-06-16)
* **License**: MIT License

---

## License Text

```text
MIT License

Copyright (c) 2023 Siddharth Vaddem

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Adapted Subsystems

The following components from OpenScreen will be selectively ported, adapted, and hardened under RePen's boundaries:
1. **Windows Native Capture Helper**: C++ code using Windows Graphics Capture (WGC), WASAPI loopback, and Media Foundation APIs.
2. **Audio/Video Recording Hooks**: Main process state machines and renderer recording coordinators.
3. **Timeline Editor**: React timeline track, trims, waveforms, and visual composition.
4. **Offline Captions Worker**: Local transcription module utilizing Whisper.
5. **WebCodecs Exporter**: In-browser rendering pipeline to export MP4 and GIF.
