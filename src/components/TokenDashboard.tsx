import React, { useState, useMemo } from 'react';
import {
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  BarChart3,
  Cpu,
  Layers,
  Calendar,
  Sparkles,
  TrendingUp,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AggregatedMetrics, TokenUsageRecord, TimeBucketMetric } from '../types';
import { clearTokenMetrics, seedDemoTokenMetrics } from '../utils/metrics';

interface TokenDashboardProps {
  metrics: AggregatedMetrics;
  records: TokenUsageRecord[];
  onRefresh: () => void;
}

const COLORS = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export const TokenDashboard: React.FC<TokenDashboardProps> = ({ metrics, records, onRefresh }) => {
  const [timeBreakdown, setTimeBreakdown] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'tokens' | 'requests' | 'neurons'>('tokens');

  const handleClear = () => {
    if (window.confirm('Are you sure you want to reset all token tracking metrics?')) {
      clearTokenMetrics();
      onRefresh();
    }
  };

  const handleLoadDemoData = () => {
    seedDemoTokenMetrics();
    onRefresh();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trill_ai_token_metrics_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Timestamp', 'Date', 'Endpoint', 'Model', 'PromptTokens', 'CompletionTokens', 'TotalTokens', 'Neurons', 'LatencyMs', 'Status'];
    const rows = records.map((r) => [
      r.timestamp,
      new Date(r.timestamp).toISOString(),
      `"${r.endpoint}"`,
      `"${r.model}"`,
      r.promptTokens,
      r.completionTokens,
      r.totalTokens,
      r.neurons,
      r.latencyMs,
      r.success ? 'SUCCESS' : 'FAILURE',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trill_ai_token_usage_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Selected time breakdown data series
  const activeBreakdownData: TimeBucketMetric[] = useMemo(() => {
    if (timeBreakdown === 'weekly') {
      return metrics.weeklyBreakdown && metrics.weeklyBreakdown.length > 0
        ? metrics.weeklyBreakdown
        : metrics.dailyBreakdown;
    }
    if (timeBreakdown === 'monthly') {
      return metrics.monthlyBreakdown && metrics.monthlyBreakdown.length > 0
        ? metrics.monthlyBreakdown
        : metrics.dailyBreakdown;
    }
    return metrics.dailyBreakdown || [];
  }, [timeBreakdown, metrics]);

  // Model pie chart data
  const modelPieData = useMemo(() => {
    return (Object.entries(metrics.modelDistribution) as [string, number][])
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 6);
  }, [metrics.modelDistribution]);

  // Endpoint bar chart data
  const endpointChartData = useMemo(() => {
    return (Object.entries(metrics.endpointDistribution) as [string, number][])
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => Number(b.count) - Number(a.count));
  }, [metrics.endpointDistribution]);

  // Filtered table records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesModel = filterModel === 'all' || r.model.toLowerCase().includes(filterModel.toLowerCase());
      const matchesSearch =
        searchTableQuery === '' ||
        r.endpoint.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.model.toLowerCase().includes(searchTableQuery.toLowerCase());
      return matchesModel && matchesSearch;
    });
  }, [records, filterModel, searchTableQuery]);

  const successRate =
    metrics.totalRequests > 0
      ? Math.round((metrics.successfulRequests / metrics.totalRequests) * 100)
      : 100;

  const promptTokenPct =
    metrics.totalTokens > 0
      ? Math.round((metrics.totalPromptTokens / metrics.totalTokens) * 100)
      : 0;

  const completionTokenPct =
    metrics.totalTokens > 0
      ? Math.round((metrics.totalCompletionTokens / metrics.totalTokens) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Token Usage & Performance Metrics
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Live Gateway Analytics
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real-time tracking of consumed tokens, compute neurons, and throughput metrics across all endpoints.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {records.length === 0 && (
            <button
              onClick={handleLoadDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition shadow-xs"
              title="Populate realistic 30-day token telemetry"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Sample 30-Day Trends
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition disabled:opacity-50"
            title="Export metrics as CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition disabled:opacity-50"
            title="Export metrics as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            onClick={handleClear}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition disabled:opacity-50"
            title="Clear all records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tokens Card */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Tokens</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
              {metrics.totalTokens.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              tok
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <span title="Prompt Input Tokens">In: {metrics.totalPromptTokens.toLocaleString()} ({promptTokenPct}%)</span>
            <span title="Completion Output Tokens">Out: {metrics.totalCompletionTokens.toLocaleString()} ({completionTokenPct}%)</span>
          </div>
        </div>

        {/* Compute Neurons */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Neurons Compute</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
              {metrics.totalNeurons.toLocaleString()}
            </span>
            <span className="text-xs font-normal text-neutral-400">units</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Cloudflare Workers AI compute units
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Success Rate</span>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
              {successRate}%
            </span>
            <span className="text-xs text-neutral-400">({metrics.totalRequests} calls)</span>
          </div>
          <div className="mt-2 text-xs flex items-center gap-3">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {metrics.successfulRequests} ok
            </span>
            {metrics.failedRequests > 0 && (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {metrics.failedRequests} err
              </span>
            )}
          </div>
        </div>

        {/* Avg Latency */}
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Average Latency</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-white">
              {metrics.averageLatencyMs}
            </span>
            <span className="text-xs font-normal text-neutral-400">ms</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Across active inference calls
          </div>
        </div>
      </div>

      {/* Main Historical Breakdown Charts Card with Time Granularity Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Historical Token Consumption Breakdown
              </h3>
              <p className="text-xs text-neutral-400">
                Visualizing prompt input vs completion output tokens over time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric Mode Toggle */}
            <div className="flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs font-medium">
              <button
                onClick={() => setChartMetric('tokens')}
                className={`px-2.5 py-1 rounded-md transition ${
                  chartMetric === 'tokens'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setChartMetric('requests')}
                className={`px-2.5 py-1 rounded-md transition ${
                  chartMetric === 'requests'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Requests
              </button>
              <button
                onClick={() => setChartMetric('neurons')}
                className={`px-2.5 py-1 rounded-md transition ${
                  chartMetric === 'neurons'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Neurons
              </button>
            </div>

            {/* Daily / Weekly / Monthly Breakdown Selector */}
            <div className="flex items-center rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs font-medium">
              <button
                onClick={() => setTimeBreakdown('daily')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                  timeBreakdown === 'daily'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3 h-3" />
                Daily
              </button>
              <button
                onClick={() => setTimeBreakdown('weekly')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                  timeBreakdown === 'weekly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeBreakdown('monthly')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                  timeBreakdown === 'monthly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Chart Container */}
        <div className="h-72 w-full pt-2">
          {activeBreakdownData.length === 0 || metrics.totalTokens === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-2">
              <BarChart3 className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                No token records yet to plot {timeBreakdown} graph.
              </p>
              <button
                onClick={handleLoadDemoData}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Click here to load realistic 30-day usage trends
              </button>
            </div>
          ) : chartMetric === 'tokens' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="promptColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="completionColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as TimeBucketMetric;
                      return (
                        <div className="rounded-xl bg-neutral-900 text-white p-3 shadow-xl border border-neutral-800 text-xs space-y-1">
                          <p className="font-semibold text-emerald-400">{data.label} ({data.period})</p>
                          <div className="flex justify-between gap-4 text-neutral-300">
                            <span>Prompt Tokens:</span>
                            <span className="font-mono font-bold text-emerald-300">
                              {data.promptTokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-neutral-300">
                            <span>Completion Tokens:</span>
                            <span className="font-mono font-bold text-cyan-300">
                              {data.completionTokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-neutral-800 pt-1 text-white font-bold">
                            <span>Total Tokens:</span>
                            <span className="font-mono">
                              {data.totalTokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-[10px] text-neutral-400 pt-0.5">
                            <span>Compute Neurons:</span>
                            <span className="font-mono">{data.neurons}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[10px] text-neutral-400">
                            <span>Requests:</span>
                            <span className="font-mono">{data.requests} ({data.successfulRequests} ok)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="promptTokens"
                  name="Prompt Input Tokens"
                  stackId="1"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#promptColor)"
                />
                <Area
                  type="monotone"
                  dataKey="completionTokens"
                  name="Completion Output Tokens"
                  stackId="1"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#completionColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartMetric === 'requests' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [val, name]}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="successfulRequests" name="Successful Requests" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failedRequests" name="Failed Requests" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} neurons`, 'Compute Neurons']}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="neurons"
                  name="Workers AI Compute Neurons"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Breakdown Grid: Models & Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Distribution Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Token Distribution by Model
            </h3>
            <span className="text-[11px] text-neutral-400">
              Share of total consumed tokens
            </span>
          </div>

          {modelPieData.length === 0 ? (
            <p className="text-xs text-neutral-400 py-12 text-center">No model token records yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {modelPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()} tokens`, 'Tokens']}
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {modelPieData.map((entry, index) => {
                  const pct = metrics.totalTokens > 0 ? Math.round((entry.value / metrics.totalTokens) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[140px]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate font-mono text-neutral-700 dark:text-neutral-300" title={entry.name}>
                          {entry.name}
                        </span>
                      </div>
                      <span className="font-mono text-neutral-500 dark:text-neutral-400 shrink-0">
                        {pct}% ({entry.value.toLocaleString()})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Endpoint Request Volume Bar Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              Inference Calls by Endpoint
            </h3>
            <span className="text-[11px] text-neutral-400">
              Total network transactions
            </span>
          </div>

          {endpointChartData.length === 0 ? (
            <p className="text-xs text-neutral-400 py-12 text-center">No endpoint requests logged yet.</p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={endpointChartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                  <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="endpoint"
                    type="category"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} requests`, 'Calls']}
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                  />
                  <Bar dataKey="count" name="Calls" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Inference Logs Table with Search & Model Filters */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Recent Inference Transactions ({filteredRecords.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search endpoint or model..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 w-44"
              />
            </div>

            {/* Model Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-neutral-400" />
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
              >
                <option value="all">All Models</option>
                {Array.from(new Set(records.map((r) => r.model).filter(Boolean) as string[])).map((m) => (
                  <option key={m} value={m}>
                    {m.replace('@cf/', '')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 text-xs">
            No inference logs match the selected filter. Try submitting a prompt in the text, reasoning, or vision tabs!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-medium">
                <tr>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Endpoint</th>
                  <th className="pb-2">Model</th>
                  <th className="pb-2 text-right">Prompt</th>
                  <th className="pb-2 text-right">Completion</th>
                  <th className="pb-2 text-right">Total Tokens</th>
                  <th className="pb-2 text-right">Neurons</th>
                  <th className="pb-2 text-right">Latency</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                {filteredRecords.slice(0, 30).map((r, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                    <td className="py-2.5 text-neutral-500 dark:text-neutral-400">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 text-neutral-900 dark:text-neutral-200 font-medium">
                      {r.endpoint}
                    </td>
                    <td className="py-2.5 text-neutral-600 dark:text-neutral-400 truncate max-w-[150px]" title={r.model}>
                      {r.model.replace('@cf/', '').split('/')[1] || r.model}
                    </td>
                    <td className="py-2.5 text-right text-neutral-500">
                      {r.promptTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right text-neutral-500">
                      {r.completionTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {r.totalTokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right text-neutral-500">
                      {r.neurons}
                    </td>
                    <td className="py-2.5 text-right text-neutral-500">
                      {r.latencyMs}ms
                    </td>
                    <td className="py-2.5 text-center">
                      {r.success ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          ERR
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
