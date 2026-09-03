import React, { useState, useRef } from 'react';
import {
  Video,
  Sparkles,
  Upload,
  Play,
  Film,
  AlertCircle,
  RefreshCw,
  Download,
  Layers,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { executeInference } from '../../utils/api';

interface VideoTabProps {
  settings: AppSettings;
}

export const VideoTab: React.FC<VideoTabProps> = ({ settings }) => {
  const [subTab, setSubTab] = useState<'text2video' | 'image2video' | 'analyze'>('text2video');
  const [prompt, setPrompt] = useState('Cinematic shot of ocean waves crashing onto bioluminescent shores under star-filled night sky, 4k 60fps');
  const [duration, setDuration] = useState<number>(4);
  const [resolution, setResolution] = useState<string>('720p');

  // Files
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [frame0, setFrame0] = useState<File | null>(null);
  const [frame0Preview, setFrame0Preview] = useState<string | null>(null);
  const [frame1, setFrame1] = useState<File | null>(null);
  const [frame1Preview, setFrame1Preview] = useState<string | null>(null);

  // Results
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const frame0InputRef = useRef<HTMLInputElement>(null);
  const frame1InputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setAnalysisResult(null);

    try {
      if (subTab === 'text2video') {
        const res = await executeInference(settings, {
          endpoint: '/video/generate',
          category: 'video',
          promptText: prompt,
          body: {
            prompt,
            duration,
            resolution,
          },
        });

        if (res.data instanceof Blob) {
          setVideoUrl(URL.createObjectURL(res.data));
        } else if (res.data?.url) {
          setVideoUrl(res.data.url);
        } else {
          setAnalysisResult(res.data);
        }
      } else if (subTab === 'image2video') {
        if (!sourceImage) {
          throw new Error('Please upload an initial image to animate.');
        }
        const formData = new FormData();
        formData.append('image', sourceImage);
        if (prompt) formData.append('prompt', prompt);
        formData.append('duration', duration.toString());

        const res = await executeInference(settings, {
          endpoint: '/video/from-image',
          category: 'video',
          isFormData: true,
          promptText: prompt,
          body: formData,
        });

        if (res.data instanceof Blob) {
          setVideoUrl(URL.createObjectURL(res.data));
        } else if (res.data?.url) {
          setVideoUrl(res.data.url);
        } else {
          setAnalysisResult(res.data);
        }
      } else if (subTab === 'analyze') {
        if (!frame0) {
          throw new Error('Please upload at least Frame 0 for video analysis.');
        }
        const formData = new FormData();
        formData.append('frame0', frame0);
        if (frame1) formData.append('frame1', frame1);
        if (prompt) formData.append('prompt', prompt);

        const res = await executeInference(settings, {
          endpoint: '/video/analyze',
          category: 'video',
          isFormData: true,
          promptText: prompt || 'Analyze video motion between frames',
          body: formData,
        });

        setAnalysisResult(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Video task failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setSubTab('text2video')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            subTab === 'text2video'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Text-to-Video</span>
          <span className="font-mono text-[10px] opacity-70">/video/generate</span>
        </button>

        <button
          onClick={() => setSubTab('image2video')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            subTab === 'image2video'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Image-to-Video</span>
          <span className="font-mono text-[10px] opacity-70">/video/from-image</span>
        </button>

        <button
          onClick={() => setSubTab('analyze')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            subTab === 'analyze'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Video Frame Analysis</span>
          <span className="font-mono text-[10px] opacity-70">/video/analyze</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                {subTab === 'analyze' ? 'Motion / Frame Analysis Query:' : 'Motion & Scene Prompt:'}
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe camera movement, subject action, environment..."
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {subTab !== 'analyze' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] font-medium text-neutral-500 mb-1">Duration</span>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value={2}>2 Seconds</option>
                    <option value={4}>4 Seconds</option>
                    <option value={6}>6 Seconds</option>
                  </select>
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-neutral-500 mb-1">Resolution</span>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="480p">480p (Fast)</option>
                    <option value="720p">720p HD</option>
                    <option value="1080p">1080p Full HD</option>
                  </select>
                </div>
              </div>
            )}

            {/* Upload for Image-to-Video */}
            {subTab === 'image2video' && (
              <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Initial Image Frame:
                </span>
                <div
                  onClick={() => imgInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition bg-neutral-50 dark:bg-neutral-800/50"
                >
                  {sourceImagePreview ? (
                    <img src={sourceImagePreview} alt="Preview" className="h-32 mx-auto object-contain rounded-lg" />
                  ) : (
                    <div className="py-4 text-neutral-400 space-y-1">
                      <Upload className="w-5 h-5 mx-auto" />
                      <span className="text-xs block font-medium">Click to upload starting frame</span>
                    </div>
                  )}
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSourceImage(f);
                        setSourceImagePreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Uploads for Frame Analysis */}
            {subTab === 'analyze' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Frame 0 (Start):</span>
                  <div
                    onClick={() => frame0InputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    {frame0Preview ? (
                      <img src={frame0Preview} alt="Frame 0" className="h-24 mx-auto object-contain rounded-lg" />
                    ) : (
                      <div className="py-2 text-neutral-400">
                        <Upload className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-[11px] block">Upload Frame 0</span>
                      </div>
                    )}
                    <input
                      ref={frame0InputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFrame0(f);
                          setFrame0Preview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Frame 1 (End, optional):</span>
                  <div
                    onClick={() => frame1InputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    {frame1Preview ? (
                      <img src={frame1Preview} alt="Frame 1" className="h-24 mx-auto object-contain rounded-lg" />
                    ) : (
                      <div className="py-2 text-neutral-400">
                        <Upload className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-[11px] block">Upload Frame 1</span>
                      </div>
                    )}
                    <input
                      ref={frame1InputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFrame1(f);
                          setFrame1Preview(URL.createObjectURL(f));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Video Generation Interrupted</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-neutral-950 flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Video Frames (this can take 30-45s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Render Video Inference</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Output Box */}
        <div className="lg:col-span-5">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center min-h-[380px]">
            {isLoading ? (
              <div className="text-center space-y-3 py-16">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-500 animate-pulse">
                  <Film className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    Synthesizing Video Stream...
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Generating motion dynamics via Flux-3 Video / Wan 2.7
                  </p>
                </div>
              </div>
            ) : videoUrl ? (
              <div className="w-full space-y-3">
                <div className="rounded-xl overflow-hidden bg-black border border-neutral-200 dark:border-neutral-800">
                  <video src={videoUrl} controls autoPlay loop className="w-full h-auto max-h-[360px]" />
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Rendered successfully</span>
                  <a
                    href={videoUrl}
                    download={`trill_video_${Date.now()}.mp4`}
                    className="text-emerald-500 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </a>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="w-full space-y-2 text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Video Analysis Result:
                </span>
                <pre className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-300 font-mono max-h-[360px] overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(analysisResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-16 text-neutral-400 space-y-2">
                <Video className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
                <p className="text-xs font-medium">Video output player</p>
                <p className="text-[11px] text-neutral-400">
                  Configure scene parameters and render video.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
