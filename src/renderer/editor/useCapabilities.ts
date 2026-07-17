/**
 * useCapabilities — fetches and caches AppCapabilities from the host process.
 *
 * Returns a stable capabilities object and a pending flag. Falls back to an
 * all-unavailable sentinel on bridge errors so the editor can safely gate
 * optional features without conditional checks scattered across the tree.
 */

import { useState, useEffect } from 'react';
import type { AppCapabilities } from '../../shared/contracts/ipc';
import { useAppBridge } from './useAppBridge';

const CAPABILITIES_PENDING_REASON = 'Checking whether this capability is available...';
const CAPABILITIES_UNAVAILABLE_REASON = 'This build could not verify optional recording and export capabilities.';

function unavailableCapabilities(reason: string): AppCapabilities {
  const status = { available: false, reason };
  return {
    recorder: status,
    selectedWindow: status,
    systemAudio: status,
    microphone: status,
    webcam: status,
    presentationReplay: status,
    captions: status,
    mp4Export: status,
    gifExport: status,
  };
}

export function useCapabilities() {
  const bridge = useAppBridge();
  const [capabilities, setCapabilities] = useState<AppCapabilities>(() =>
    unavailableCapabilities(CAPABILITIES_PENDING_REASON),
  );
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    bridge.getAppCapabilities().then((caps) => {
      if (cancelled) return;
      if (
        caps?.recorder &&
        caps?.captions &&
        caps?.mp4Export &&
        caps?.gifExport
      ) {
        setCapabilities(caps);
      } else {
        setCapabilities(unavailableCapabilities(CAPABILITIES_UNAVAILABLE_REASON));
      }
      setIsPending(false);
    }).catch(() => {
      if (!cancelled) {
        setCapabilities(unavailableCapabilities(CAPABILITIES_UNAVAILABLE_REASON));
        setIsPending(false);
      }
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { capabilities, isPending };
}
