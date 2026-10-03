import { AtlasProvider } from './state/atlas.jsx';
import { SourceProvider } from './components/Source.jsx';
import { SpeechProvider } from './components/Speech.jsx';
import Space from './components/Space.jsx';
import Overlay from './components/Overlay.jsx';
import TopBar from './components/TopBar.jsx';
import ReadingPanel from './components/ReadingPanel.jsx';
import DrT from './components/DrT.jsx';

export default function App() {
  return (
    <AtlasProvider>
      <SourceProvider>
        <SpeechProvider>
          <Space />
          <Overlay />
          <TopBar />
          <ReadingPanel />
          <DrT />
        </SpeechProvider>
      </SourceProvider>
    </AtlasProvider>
  );
}
