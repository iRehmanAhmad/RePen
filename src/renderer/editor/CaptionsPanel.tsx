/**
 * CaptionsPanel — sidebar panel for the Captions tab.
 * Controls: trigger transcription, download model, caption list with inline editing,
 * split/merge actions.
 */

import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { AnnotationRegion } from '../../shared/editor/types';
import type { AppCapabilities } from '../../shared/contracts/ipc';

interface CaptionsPanelProps {
  project: EditorProjectData;
  capabilities: AppCapabilities;
  isTranscribing: boolean;
  transcriptionProgress: number;
  downloadingModel: boolean;
  downloadProgress: number;
  downloadTask: string;
  selectedCaptionId: string | null;
  t: (key: string) => string;
  onUpdate: (next: EditorProjectData) => void;
  onSelectCaption: (id: string | null) => void;
  onTranscribe: () => void;
  onDownloadModel: () => void;
  onCancelDownload: () => void;
  onSplitCaption: () => void;
  onMergeCaption: () => void;
}

export const CaptionsPanel: React.FC<CaptionsPanelProps> = ({
  project,
  capabilities,
  isTranscribing,
  transcriptionProgress,
  downloadingModel,
  downloadProgress,
  downloadTask,
  selectedCaptionId,
  t,
  onUpdate,
  onSelectCaption,
  onTranscribe,
  onDownloadModel,
  onCancelDownload,
  onSplitCaption,
  onMergeCaption,
}) => {
  const autoCaptions = project.editor.annotationRegions.filter(
    (a: AnnotationRegion) => a.annotationSource === 'auto-caption',
  );

  if (isTranscribing) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }} role="status" aria-live="polite">
        <h3>Generating Captions...</h3>
        <div style={{ width: '100%', height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ width: `${transcriptionProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!capabilities.captions?.available ? (
        <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--line)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>⚠️ {capabilities.captions?.reason || 'Offline transcription is not installed.'}</span>
          {downloadingModel ? (
            <div style={{ padding: '8px 0', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span>{downloadTask}</span>
                <span>{downloadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s' }} />
              </div>
              <button className="btn-secondary" style={{ marginTop: 10, width: '100%' }} onClick={onCancelDownload}>
                Cancel Download
              </button>
            </div>
          ) : (
            <button className="btn-primary" onClick={onDownloadModel}>Download Whisper-Tiny Model (~78MB)</button>
          )}
        </div>
      ) : (
        <button className="btn-primary" onClick={onTranscribe} aria-label={t('autoTranscribe')}>{t('autoTranscribe')}</button>
      )}

      {/* Split/Merge Controls */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onSplitCaption} disabled={!selectedCaptionId}>{t('split')}</button>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onMergeCaption} disabled={!selectedCaptionId}>{t('merge')}</button>
      </div>

      {/* Caption List */}
      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', padding: 6, borderRadius: 6 }}>
        {autoCaptions.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No captions yet. Run auto-transcription above.</span>
        )}
        {autoCaptions.map((ann: AnnotationRegion) => (
          <div
            key={ann.id}
            style={{ display: 'flex', flexDirection: 'column', padding: 8, borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedCaptionId === ann.id ? 'var(--surface-3)' : 'transparent' }}
            onClick={() => onSelectCaption(ann.id)}
          >
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{Math.round(ann.startMs / 1000)}s – {Math.round(ann.endMs / 1000)}s</span>
            <input
              type="text"
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontSize: 13, marginTop: 4 }}
              value={ann.content}
              onChange={(e) => {
                const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
                const idx = updated.editor.annotationRegions.findIndex((a: AnnotationRegion) => a.id === ann.id);
                if (idx !== -1) {
                  updated.editor.annotationRegions[idx].content = e.target.value;
                  onUpdate(updated);
                }
              }}
              aria-label="Caption segment text"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
