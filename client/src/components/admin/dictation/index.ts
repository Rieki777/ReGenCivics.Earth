export { DictationButton, type DictationButtonProps } from "./DictationButton";
export {
  useDictation,
  dictationSupported,
  DICTATION_UNSUPPORTED_MESSAGE,
  DICTATION_DENIED_MESSAGE,
  DICTATION_NO_SPEECH_MESSAGE,
  DICTATION_NETWORK_MESSAGE,
  DICTATION_NO_MIC_MESSAGE,
  DICTATION_GENERIC_ERROR,
  DICTATION_SENSITIVE_MESSAGE,
  DICTATION_BLOCKED_TITLE,
  DICTATION_BLOCKED_LEAD,
  DICTATION_BLOCKED_STEPS,
  type UseDictationOptions,
  type UseDictationResult,
  type DictationState,
} from "./useDictation";
export { queryMicrophonePermission, requestMicrophoneAccess, type MicPermission } from "./micPermission";
export { insertTranscript } from "./insertTranscript";
export { isSensitiveField } from "./sensitiveField";
