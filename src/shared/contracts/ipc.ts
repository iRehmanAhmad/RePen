export type IpcChannel =
  | 'system:get-capabilities'
  | 'recording:start'
  | 'recording:stop'
  | 'recording:pause'
  | 'recording:resume'
  | 'recording:cancel'
  | 'recording:get-sources'
  | 'project:save'
  | 'project:load'
  | 'project:export'
  | 'settings:get-all'
  | 'settings:set-key';

export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AppCapabilities {
  nativeRecording: boolean;
  webcamRecording: boolean;
  audioRecording: boolean;
  speechToText: boolean;
}

export interface RecordingStartOptions {
  sourceId: string;
  microphoneId?: string;
  webcamId?: string;
  recordSystemAudio: boolean;
  enablePresenterTrack: boolean;
}
