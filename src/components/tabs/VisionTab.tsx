import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  SlidersHorizontal,
  Upload,
  Camera,
  Download,
  Eye,
  AlertCircle,
  RefreshCw,
  Scissors,
  Smile,
  Zap,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { FACE_PRESETS } from '../../constants/models';
import { executeInference } from '../../utils/api';

interface VisionTabProps {
  settings: AppSettings;
}

export const VisionTab: React.FC<VisionTabProps> = ({ settings }) => {
  const [subTab, setSubTab] = useState<'generate' | 'edit' | 'face' | 'inpaint' | 'analyze'>('generate');

  // Generate State
  const [prompt, setPrompt] = useState('Futuristic neon cyberpunk city with flying vehicles and glowing holographic billboards, ultra-detailed 8k');
  const [model, setModel] = useState(settings.defaultImageModel || '@cf/black-forest-labs/flux-2-klein-4b');
  const [width, setWidth] = useState(settings.imageWidth || 1024);
  const [height, setHeight] = useState(settings.imageHeight || 1024);

  // Edit / Face / Inpaint / Analyze Images
  const [image0, setImage0] = useState<File | null>(null);
  const [image0Preview, setImage0Preview] = useState<string | null>(null);
  const [image1, setImage1] = useState<File | null>(null);
  const [image1Preview, setImage1Preview] = useState<string | null>(null);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>(settings.defaultFacePreset || 'smile');

  // Outputs
  const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryInfo, setRetryInfo] = useState<string | null>(null);

  const fileInput0Ref = useRef<HTMLInputElement>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: '0' | '1' | 'mask') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (slot === '0') {
      setImage0(file);
      setImage0Preview(url);
    } else if (slot === '1') {
      setImage1(file);
      setImage1Preview(url);
    } else {
      setMaskImage(file);
      setMaskPreview(url);
    }
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setError(null);
    setRetryInfo(null);
    setOutputImageUrl(null);
    setAnalysisResult(null);

    try {
      if (subTab === 'generate') {
        const res = await executeInference(settings, {
          endpoint: '/image/generate',
          category: 'vision',
          model,
          promptText: prompt,
          body: {
            prompt,
            model,
            width,
            height,
            guidance: settings.imageGuidance,
            num_steps: settings.imageSteps,
          },
          onRetry: (att, max) => setRetryInfo(`Retrying generation (${att}/${max})...`),
        });

        if (res.data instanceof Blob) {
          setOutputImageUrl(URL.createObjectURL(res.data));
        } else if (typeof res.data === 'string' && res.data.startsWith('http')) {
          setOutputImageUrl(res.data);
        } else {
          setOutputImageUrl(URL.createObjectURL(new Blob([res.data], { type: 'image/png' })));
        }
      } else if (subTab === 'edit') {
        if (!image0) {
          throw new Error('Please upload an initial image (Image 0) to edit.');
        }
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('input_image_0', image0);
        if (image1) {
          formData.append('input_image_1', image1);
        }

        const res = await executeInference(settings, {
          endpoint: '/image/edit',
          category: 'vision',
          isFormData: true,
          promptText: prompt,
          body: formData,
        });

        if (res.data instanceof Blob) {
          setOutputImageUrl(URL.createObjectURL(res.data));
        }
      } else if (subTab === 'face') {
        if (!image0) {
          throw new Error('Please upload a face photo to apply presets.');
        }
        const formData = new FormData();
        formData.append('image', image0);
        if (selectedPreset) {
          formData.append('preset', selectedPreset);
        }
        if (prompt.trim()) {
          formData.append('prompt', prompt);
        }

        const res = await executeInference(settings, {
          endpoint: '/image/face',
          category: 'vision',
          isFormData: true,
          promptText: `Face preset: ${selectedPreset} - ${prompt}`,
          body: formData,
        });

        if (res.data instanceof Blob) {
          setOutputImageUrl(URL.createObjectURL(res.data));
        }
      } else if (subTab === 'inpaint') {
        if (!image0 || !maskImage) {
          throw new Error('Inpainting requires both a source image and a mask image.');
        }
        const formData = new FormData();
        formData.append('image', image0);
        formData.append('mask', maskImage);
        formData.append('prompt', prompt);

        const res = await executeInference(settings, {
          endpoint: '/image/inpaint',
          category: 'vision',
          isFormData: true,
          promptText: prompt,
          body: formData,
        });

        if (res.data instanceof Blob) {
          setOutputImageUrl(URL.createObjectURL(res.data));
        }
      } else if (subTab === 'analyze') {
        if (!image0) {
          throw new Error('Please upload an image to analyze.');
        }
        const formData = new FormData();
        formData.append('image', image0);
        if (prompt) {
          formData.append('prompt', prompt);
        }

        const res = await executeInference(settings, {
          endpoint: '/image/analyze',
          category: 'vision',
          isFormData: true,
          promptText: prompt || 'Analyze this image',
          body: formData,
        });

        setAnalysisResult(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Vision inference failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setSubTab('generate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'generate'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate Image</span>
          <span className="font-mono text-[10px] opacity-70">/image/generate</span>
        </button>

        <button
          onClick={() => setSubTab('edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'edit'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Image Edit</span>
          <span className="font-mono text-[10px] opacity-70">/image/edit</span>
        </button>

        <button
          onClick={() => setSubTab('face')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'face'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Smile className="w-3.5 h-3.5" />
          <span>Face Studio (33 Presets)</span>
          <span className="font-mono text-[10px] opacity-70">/image/face</span>
        </button>

        <button
          onClick={() => setSubTab('inpaint')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'inpaint'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Inpainting</span>
          <span className="font-mono text-[10px] opacity-70">/image/inpaint</span>
        </button>

        <button
          onClick={() => setSubTab('analyze')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            subTab === 'analyze'
              ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950 font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Vision QA & Analyze</span>
          <span className="font-mono text-[10px] opacity-70">/image/analyze</span>
        </button>
      </div>

      {/* Main Grid: Controls vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prompt Box */}
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
              {subTab === 'face'
                ? 'Optional Custom Face Refinement Prompt:'
                : subTab === 'analyze'
                ? 'Vision Question / Prompt:'
                : 'Creative Prompt Description:'}
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your desired visual output or modification..."
              className="w-full p-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            />

            {/* Model & Dimensions (for Generate) */}
            {subTab === 'generate' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <span className="block text-[11px] font-medium text-neutral-500 mb-1">Model</span>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="@cf/black-forest-labs/flux-2-klein-4b">FLUX.2 Klein 4B (Fast)</option>
                    <option value="@cf/black-forest-labs/flux-2-klein-9b">FLUX.2 Klein 9B (Ultra-HQ)</option>
                    <option value="@cf/leonardo/phoenix-1.0">Leonardo Phoenix 1.0</option>
                  </select>
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-neutral-500 mb-1">Width</span>
                  <select
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value={512}>512 px</option>
                    <option value={768}>768 px</option>
                    <option value={1024}>1024 px</option>
                  </select>
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-neutral-500 mb-1">Height</span>
                  <select
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value))}
                    className="w-full p-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value={512}>512 px</option>
                    <option value={768}>768 px</option>
                    <option value={1024}>1024 px</option>
                  </select>
                </div>
              </div>
            )}

            {/* Face Presets Picker */}
            {subTab === 'face' && (
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                  Select 1 of 33 Face Edit Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {Object.keys(FACE_PRESETS).map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPreset(key)}
                      className={`p-2 rounded-lg text-left text-xs transition border ${
                        selectedPreset === key
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750'
                      }`}
                    >
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
                {selectedPreset && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic bg-neutral-50 dark:bg-neutral-850 p-2 rounded-lg">
                    "{FACE_PRESETS[selectedPreset]}"
                  </p>
                )}
              </div>
            )}

            {/* Upload Inputs (Edit / Face / Inpaint / Analyze) */}
            {subTab !== 'generate' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {/* Image 0 */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Source Photo (Image 0):
                  </span>
                  <div
                    onClick={() => fileInput0Ref.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-xl p-3 text-center cursor-pointer transition bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    {image0Preview ? (
                      <img src={image0Preview} alt="Preview" className="h-28 mx-auto object-contain rounded-lg" />
                    ) : (
                      <div className="py-4 text-neutral-400 space-y-1">
                        <Upload className="w-5 h-5 mx-auto text-neutral-400" />
                        <span className="text-xs block font-medium">Upload input photo</span>
                      </div>
                    )}
                    <input
                      ref={fileInput0Ref}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, '0')}
                    />
                  </div>
                </div>

                {/* Second Upload (Image 1 or Mask) */}
                {subTab === 'edit' && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Reference Photo (Optional Image 1):
                    </span>
                    <div
                      onClick={() => fileInput1Ref.current?.click()}
                      className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer transition bg-neutral-50 dark:bg-neutral-800/50"
                    >
                      {image1Preview ? (
                        <img src={image1Preview} alt="Preview" className="h-28 mx-auto object-contain rounded-lg" />
                      ) : (
                        <div className="py-4 text-neutral-400 space-y-1">
                          <Upload className="w-5 h-5 mx-auto text-neutral-400" />
                          <span className="text-xs block font-medium">Upload reference</span>
                        </div>
                      )}
                      <input
                        ref={fileInput1Ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, '1')}
                      />
                    </div>
                  </div>
                )}

                {subTab === 'inpaint' && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Mask Image (Black & White):
                    </span>
                    <div
                      onClick={() => maskInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer transition bg-neutral-50 dark:bg-neutral-800/50"
                    >
                      {maskPreview ? (
                        <img src={maskPreview} alt="Mask" className="h-28 mx-auto object-contain rounded-lg" />
                      ) : (
                        <div className="py-4 text-neutral-400 space-y-1">
                          <Upload className="w-5 h-5 mx-auto text-neutral-400" />
                          <span className="text-xs block font-medium">Upload inpaint mask</span>
                        </div>
                      )}
                      <input
                        ref={maskInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'mask')}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error or Retry */}
            {retryInfo && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {retryInfo}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Processing Failed</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Action Trigger */}
            <div className="pt-2">
              <button
                onClick={handleProcess}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-neutral-950 flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inference in progress (approx 10-25s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Vision Output</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Output Column */}
        <div className="lg:col-span-5">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center min-h-[380px] relative">
            {isLoading ? (
              <div className="text-center space-y-3 py-16">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 animate-pulse">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    Processing Vision Model...
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Rendering high-resolution pixels with FLUX / Llama Vision
                  </p>
                </div>
              </div>
            ) : outputImageUrl ? (
              <div className="w-full space-y-3">
                <div className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 flex items-center justify-center">
                  <img
                    src={outputImageUrl}
                    alt="Output"
                    className="w-full h-auto max-h-[420px] object-contain"
                  />
                  <a
                    href={outputImageUrl}
                    download={`trill_vision_${Date.now()}.png`}
                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-900 text-white shadow-lg backdrop-blur-xs transition"
                    title="Download high-resolution image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Status: Generated successfully</span>
                  <a
                    href={outputImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-500 hover:underline flex items-center gap-1"
                  >
                    Open Full Size
                  </a>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="w-full space-y-2 text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Vision QA Analysis Result:
                </span>
                <pre className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-300 font-mono max-h-[360px] overflow-y-auto whitespace-pre-wrap">
                  {typeof analysisResult === 'string'
                    ? analysisResult
                    : JSON.stringify(analysisResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-16 text-neutral-400 space-y-2">
                <ImageIcon className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
                <p className="text-xs font-medium">Vision output will appear here</p>
                <p className="text-[11px] text-neutral-400">
                  Select parameters or upload an image and click Generate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
