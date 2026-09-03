import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { AppSettings } from '../../types';
import { executeInference } from '../../utils/api';
import { streamTextAnimation } from '../../utils/streaming';

interface EducationTabProps {
  settings: AppSettings;
}

export const EducationTab: React.FC<EducationTabProps> = ({ settings }) => {
  const [topic, setTopic] = useState('How does General Relativity bend spacetime around supermassive black holes?');
  const [gradeLevel, setGradeLevel] = useState(settings.educationLevel || 'Undergraduate (Rigorous)');
  const [format, setFormat] = useState(settings.educationFormat || 'Concept Breakdown & Intuition');

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [fullOutput, setFullOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const gradeOptions = [
    'Elementary School (Simple & Fun)',
    'Middle School',
    'High School',
    'Undergraduate (Rigorous)',
    'Graduate / PhD Level',
    'Professional / Practitioner',
  ];

  const formatOptions = [
    'Concept Breakdown & Intuition',
    'Socratic Q&A Dialogue',
    'Step-by-Step Tutorial with Examples',
    'Interactive Quiz & Knowledge Check',
    'Analogies & Real-World Case Study',
  ];

  const quickTopics = [
    'Quantum Entanglement & Bell State',
    'Transformer Attention Mechanism',
    'Photosynthesis Light Reactions',
    'CRISPR-Cas9 Gene Editing',
    'Proof of the Pythagorean Theorem',
  ];

  const handleLearn = async () => {
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    setStreamedText('');
    setFullOutput('');

    try {
      const res = await executeInference(settings, {
        endpoint: '/learn',
        category: 'education',
        promptText: `Learn: ${topic} (${gradeLevel}, ${format})`,
        body: {
          topic,
          grade_level: gradeLevel,
          format,
        },
      });

      let content = '';
      if (res.data?.response) {
        content = typeof res.data.response === 'string' ? res.data.response : JSON.stringify(res.data.response, null, 2);
      } else if (res.data?.content) {
        content = res.data.content;
      } else {
        content = JSON.stringify(res.data, null, 2);
      }

      setFullOutput(content);
      setIsStreaming(true);

      streamTextAnimation(
        content,
        settings.streamSpeed,
        (u) => {
          setStreamedText(u.text);
          if (u.isComplete) setIsStreaming(false);
        },
        () => setIsStreaming(false)
      );
    } catch (err: any) {
      setError(err.message || 'Educational generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const txt = streamedText || fullOutput;
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Adaptive Education Engine
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Personalized tutoring and pedagogical breakdowns powered by <code className="font-mono text-[11px]">POST /learn</code>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Topic Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
          Explore Topics:
        </span>
        {quickTopics.map((t, idx) => (
          <button
            key={idx}
            onClick={() => setTopic(t)}
            className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition whitespace-nowrap"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Subject or Concept to Master:
              </label>
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter any academic topic, formula, or historical event..."
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Target Audience & Depth:
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                {gradeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Pedagogical Format:
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                {formatOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Teaching Generation Failed</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLearn}
              disabled={isLoading || !topic.trim()}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-600 text-neutral-950 flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Lesson Plan...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Generate Educational Lesson</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lesson View Area */}
        <div className="lg:col-span-7">
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Lesson Output:
                  </span>
                  {isStreaming && (
                    <span className="text-[10px] text-emerald-500 font-mono animate-pulse">
                      Streaming lesson...
                    </span>
                  )}
                </div>

                {(streamedText || fullOutput) && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Lesson'}</span>
                  </button>
                )}
              </div>

              <div className="py-4 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed font-sans whitespace-pre-wrap">
                {isLoading && !streamedText ? (
                  <div className="flex items-center gap-2 text-neutral-400 py-12">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Structuring curriculum and explanations...</span>
                  </div>
                ) : streamedText || fullOutput ? (
                  <>
                    {streamedText || fullOutput}
                    {isStreaming && <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1" />}
                  </>
                ) : (
                  <div className="text-center py-16 text-neutral-400 space-y-2">
                    <GraduationCap className="w-10 h-10 mx-auto opacity-40" />
                    <p className="text-xs font-medium">Educational Lesson Viewer</p>
                    <p className="text-[11px] text-neutral-400">
                      Choose any topic, academic grade level, and teaching format.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(streamedText || fullOutput) && !isStreaming && (
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lesson Generated
                </span>
                <span>Audience: {gradeLevel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
