import { TimelineStrip } from './components/TimelineStrip';
import { useTimeState } from './state/useTimeState';

export default function App() {
  const t = useTimeState();
  return (
    <div className="app">
      <header className="app-header">
        <h1>The Greatest History</h1>
      </header>
      <main className="map-area" />
      <aside className="panel-area" />
      <TimelineStrip
        year={t.year}
        view={t.view}
        playing={t.playing}
        onYear={t.setYear}
        onView={t.setView}
        onTogglePlay={t.togglePlaying}
      />
    </div>
  );
}
