import React from 'react';
import Kpi from './widgets/Kpi.jsx';
import Sparkline from './widgets/Sparkline.jsx';
import KpiStrip from './widgets/KpiStrip.jsx';
import LineW from './widgets/LineW.jsx';
import BarW from './widgets/BarW.jsx';
import TableW from './widgets/TableW.jsx';
import HeatmapW from './widgets/HeatmapW.jsx';
import GaugeW from './widgets/GaugeW.jsx';
import AvatarGrid from './widgets/AvatarGrid.jsx';
import WordCloud from './widgets/WordCloud.jsx';
import BubbleW from './widgets/BubbleW.jsx';
import CandlestickW from './widgets/CandlestickW.jsx';
import TimelineW from './widgets/TimelineW.jsx';
import KanbanW from './widgets/KanbanW.jsx';
import SankeyW from './widgets/SankeyW.jsx';

// Map each canonical widget type (CONTRACTS §4) to its renderer.
const REGISTRY = {
  kpi: Kpi,
  'kpi-sparkline': Sparkline,
  'kpi-strip': KpiStrip,
  line: LineW,
  multiline: LineW,
  bar: BarW,
  table: TableW,
  heatmap: HeatmapW,
  gauge: GaugeW,
  'avatar-grid': AvatarGrid,
  wordcloud: WordCloud,
  bubble: BubbleW,
  candlestick: CandlestickW,
  timeline: TimelineW,
  kanban: KanbanW,
  sankey: SankeyW,
};

// Generic fallback for unknown widget types: a table if rows exist, else raw JSON.
function GenericFallback({ data, meta }) {
  if (data && Array.isArray(data.rows)) {
    return <TableW data={data} />;
  }
  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <p className="w-note">Unknown widget type “{meta?.type}” — raw data:</p>
      <pre
        style={{
          fontSize: 11,
          background: 'var(--surface-inset)',
          padding: 10,
          borderRadius: 8,
          overflow: 'auto',
          margin: 0,
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function WidgetRenderer({ type, data, meta }) {
  const Component = REGISTRY[type];
  if (!Component) {
    return <GenericFallback data={data} meta={{ ...meta, type }} />;
  }
  return <Component data={data} meta={meta} />;
}
