/**
 * CaptionsPanel — sidebar panel for the Captions tab.
 * Controls: trigger transcription, download model, caption list with inline editing,
 * split/merge actions.
 */

import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { AnnotationRegion } from '../../shared/editor/types';
import type { AppCapabilities } from '../../shared/contracts/ipc';
import { PropertyCard } from './PropertyCard';

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
      {/* Transcription Engine Status */}
      <PropertyCard title="Transcription Model" description="Offline local Whisper transcription model">
        {!capabilities.captions?.available ? (
          <div style={{ padding: 10, borderRadius: 6, border: '1px dashed var(--line)', background: 'var(--surface-3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{"\u26A0\uFE0F"} {capabilities.captions?.reason || 'Offline transcription is not installed.'}</span>
            {downloadingModel ? (
              <div style={{ padding: '4px 0', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span>{downloadTask}</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s' }} />
                </div>
                <button className="btn-secondary" style={{ marginTop: 8, width: '100%', fontSize: 11, padding: '4px 0' }} onClick={onCancelDownload}>
                  Cancel Download
                </button>
              </div>
            ) : (
              <button className="btn-primary" style={{ fontSize: 11.5, padding: '6px 0' }} onClick={onDownloadModel}>Download Whisper-Tiny (~78MB)</button>
            )}
          </div>
        ) : (
          <button className="btn-primary" style={{ width: '100%' }} onClick={onTranscribe} aria-label={t('autoTranscribe')}>{t('autoTranscribe')}</button>
        )}
      </PropertyCard>

      {/* Editing Actions */}
      <PropertyCard title="Caption Segmentation" description="Split or merge selected caption segments">
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-secondary" style={{ flex: 1, padding: '6px 0', fontSize: 11.5 }} onClick={onSplitCaption} disabled={!selectedCaptionId}>{t('split')}</button>
          <button className="btn-secondary" style={{ flex: 1, padding: '6px 0', fontSize: 11.5 }} onClick={onMergeCaption} disabled={!selectedCaptionId}>{t('merge')}</button>
        </div>
      </PropertyCard>

      {/* Caption List */}
      <PropertyCard title="Transcribed Segments" description="Click a segment below to edit its text inline">
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {autoCaptions.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>No captions generated yet</span>
          )}
          {autoCaptions.map((ann: AnnotationRegion) => (
            <div
              key={ann.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                background: selectedCaptionId === ann.id ? 'var(--surface-3)' : 'transparent',
                border: '1px solid ' + (selectedCaptionId === ann.id ? 'var(--accent)' : 'var(--line)'),
              }}
              onClick={() => onSelectCaption(ann.id)}
            >
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{Math.round(ann.startMs / 1000)}s – {Math.round(ann.endMs / 1000)}s</span>
              <input
                type="text"
                style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontSize: 12, marginTop: 4, padding: 0, width: '100%' }}
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
      </PropertyCard>
    </div>
  );
};
