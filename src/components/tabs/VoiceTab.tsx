import React, { useState, useRef } from 'react';
import {
  Mic,
  Volume2,
  Languages,
  Upload,
  Radio,
  Play,
  Pause,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Wifi,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { DEFAULT_WS_URL, POPULAR_LANGUAGES } from '../../constants/models';
import { executeInference } from '../../utils/api';

interface VoiceTabProps {
  settings: AppSettings;
}

export const VoiceTab: React.FC<VoiceTabProps> = ({ settings }) => {
  const [subTab, setSubTab] = useState<'speak' | 'transcribe' | 'translate' | 'live'>('speak');

  // Text to Speech
  const [speakText, setSpeakText] = useState('Welcome to Trill AI. High performance multi-modal inference is now active.');
  const [ttsVoice, setTtsVoice] = useState('aura-1');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  // Transcription & Translation
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('hi');
  const [targetLang, setTargetLang] = useState('en');
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Live WebSocket
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFile(recordedFile);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError('Microphone access denied or not available: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Live WS Connect
  const toggleLiveWebSocket = () => {
    if (wsConnected) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setWsConnected(false);
      return;
    }

    try {
      const wsUrl = `${DEFAULT_WS_URL}/voice/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setLiveTranscript((prev) => [...prev, `[Connected to ${wsUrl}] Ready for live voice streaming.`]);
      };

      ws.onmessage = (event) => {
        setLiveTranscript((prev) => [...prev, `Worker: ${event.data}`]);
      };

      ws.onerror = (e) => {
        setLiveTranscript((prev) => [...prev, `[WebSocket Notice] Server connection update.`]);
      };

      ws.onclose = () => {
        setWsConnected(false);
        setLiveTranscript((prev) => [...prev, `[WebSocket Disconnected]`]);
      };
    } catch (err: any) {
      setError('Could not connect to live voice WebSocket: ' + err.message);
    }
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (subTab === 'speak') {
        const res = await executeInference(settings, {
          endpoint: '/voice/speak',
          category: 'voice',
          promptText: speakText,
          body: {
            text: speakText,
            voice: ttsVoice,
            model: settings.defaultVoiceModel,
          },
        });

        if (res.data instanceof Blob) {
          setTtsAudioUrl(URL.createObjectURL(res.data));
        } else if (res.data?.audio) {
          setTtsAudioUrl(res.data.audio);
        } else {
          setTranscriptionResult(JSON.stringify(res.data, null, 2));
        }
      } else if (subTab === 'transcribe') {
        if (!audioFile) {
          throw new Error('Please upload or record an audio clip to transcribe.');
        }
        const formData = new FormData();
        formData.append('audio', audioFile);

        const res = await executeInference(settings, {
          endpoint: '/voice/transcribe',
          category: 'voice',
          isFormData: true,
          promptText: 'Transcribe audio speech',
          body: formData,
        });

        const text = res.data?.text || res.data?.transcription || JSON.stringify(res.data, null, 2);
        setTranscriptionResult(text);
      } else if (subTab === 'translate') {
        if (!audioFile) {
          throw new Error('Please upload or record an audio clip to translate.');
        }
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('source_lang', sourceLang);
        formData.append('target_lang', targetLang);
        formData.append('tts', 'true');

        const res = await executeInference(settings, {
          endpoint: '/voice/translate',
          category: 'voice',
          isFormData: true,
          promptText: `Voice translate ${sourceLang} -> ${targetLang}`,
          body: formData,
        });

        if (res.data instanceof Blob) {
          setTtsAudioUrl(URL.createObjectURL(res.data));
        } else if (res.data?.translation) {
          setTranscriptionResult(res.data.translation);
        } else {
          setTranscriptionResult(JSON.stringify(res.data, null, 2));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Voice task failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <button
          onClick={() => setSubTab('speak')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'speak'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Text-to-Speech</span>
          <span className="font-mono text-[10px] opacity-70">/voice/speak</span>
        </button>

        <button
          onClick={() => setSubTab('transcribe')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'transcribe'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Transcribe Speech</span>
          <span className="font-mono text-[10px] opacity-70">/voice/transcribe</span>
        </button>

        <button
          onClick={() => setSubTab('translate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'translate'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Languages className="w-3.5 h-3.5" />
          <span>Voice Translation</span>
          <span className="font-mono text-[10px] opacity-70">/voice/translate</span>
        </button>

        <button
          onClick={() => setSubTab('live')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'live'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live WS Stream</span>
          <span className="font-mono text-[10px] opacity-70">WS /voice/live</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            {subTab === 'speak' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Text to Synthesize into Speech:
                  </label>
                  <textarea
                    rows={4}
                    value={speakText}
                    onChange={(e) => setSpeakText(e.target.value)}
                    placeholder="Enter sentences to synthesize..."
                    className="w-full p-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] font-medium text-neutral-500 mb-1">Voice Profile</span>
                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    >
                      <option value="aura-1">Deepgram Aura 1 (Conversational)</option>
                      <option value="aura-2-en">Deepgram Aura 2 EN (Ultra-Expressive)</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium text-neutral-500 mb-1">Model</span>
                    <input
                      type="text"
                      disabled
                      value="@cf/deepgram/aura-2-en"
                      className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    />
                  </div>
                </div>
              </div>
            ) : subTab === 'live' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                        WebSocket Voice Stream Channel
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      wsConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {wsConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Establishes a persistent bidirectional WebSocket connection to <code className="font-mono text-[11px]">{DEFAULT_WS_URL}/voice/live</code> for live audio streaming.
                  </p>

                  <button
                    onClick={toggleLiveWebSocket}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
                      wsConnected
                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950'
                    }`}
                  >
                    {wsConnected ? 'Disconnect WebSocket Stream' : 'Connect Live Voice WebSocket'}
                  </button>
                </div>
              </div>
            ) : (
              /* Transcribe / Voice Translate */
              <div className="space-y-4">
                {subTab === 'translate' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] font-medium text-neutral-500 mb-1">Source Audio Language</span>
                      <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      >
                        {POPULAR_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-[11px] font-medium text-neutral-500 mb-1">Target Language</span>
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      >
                        {POPULAR_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Audio Upload or Mic Recording */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                    Audio Input (Record from Microphone or Upload Audio File):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition ${
                        isRecording
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-600 animate-pulse'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      <Mic className={`w-6 h-6 ${isRecording ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <span className="text-xs font-semibold">
                        {isRecording ? 'Stop Recording' : 'Record from Mic'}
                      </span>
                    </button>

                    <div
                      onClick={() => audioInputRef.current?.click()}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 hover:bg-neutral-100 text-neutral-700 dark:text-neutral-300 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Upload className="w-6 h-6 text-cyan-500" />
                      <span className="text-xs font-semibold">
                        {audioFile ? audioFile.name : 'Upload Audio File'}
                      </span>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setAudioFile(f);
                        }}
                      />
                    </div>
                  </div>

                  {audioFile && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <span>Ready: {audioFile.name} ({(audioFile.size / 1024).toFixed(1)} KB)</span>
                      <audio controls src={URL.createObjectURL(audioFile)} className="h-6 w-40" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Voice Processing Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {subTab !== 'live' && (
              <button
                onClick={handleProcess}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-neutral-950 flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Voice Model...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Run Voice Inference</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Output Box */}
        <div className="lg:col-span-5">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-center min-h-[380px]">
            {subTab === 'live' ? (
              <div className="w-full h-full flex flex-col space-y-2">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" />
                  Live WebSocket Stream Log:
                </span>
                <div className="flex-1 min-h-[300px] p-3 rounded-lg bg-neutral-950 font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1">
                  {liveTranscript.length === 0 ? (
                    <span className="text-neutral-500">Live stream events will be logged here once connected...</span>
                  ) : (
                    liveTranscript.map((line, idx) => <div key={idx}>{line}</div>)
                  )}
                </div>
              </div>
            ) : ttsAudioUrl ? (
              <div className="w-full space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                  <Volume2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Synthesized Audio Stream
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Rendered via Deepgram Aura-2 / Nova engine
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <audio controls autoPlay src={ttsAudioUrl} className="w-full" />
                </div>
                <a
                  href={ttsAudioUrl}
                  download={`trill_speech_${Date.now()}.mp3`}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-500 hover:underline font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Audio File
                </a>
              </div>
            ) : transcriptionResult ? (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Transcribed Result:
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transcriptionResult);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 font-sans text-xs text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed max-h-[320px] overflow-y-auto border border-neutral-200 dark:border-neutral-800">
                  {transcriptionResult}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-neutral-400 space-y-2">
                <Mic className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
                <p className="text-xs font-medium">Speech & audio output player</p>
                <p className="text-[11px] text-neutral-400">
                  Speak text or upload voice audio to transcribe and translate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
