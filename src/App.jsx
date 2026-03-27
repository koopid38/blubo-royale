import { useEffect } from 'react';
import { GameProvider, useGame } from './hooks/useGameState';
import { PvPProvider } from './hooks/usePvPSync';
import { GAME_PHASES } from './utils/constants';
import Lobby from './components/Lobby/Lobby';
import Countdown from './components/Countdown/Countdown';
import CasinoFloor from './components/Casino/CasinoFloor';
import Showdown from './components/Showdown/Showdown';
import Results from './components/Results/Results';
import { sfx } from './utils/sounds';

function GameRouter() {
  const { state } = useGame();

  switch (state.phase) {
    case GAME_PHASES.LOBBY:
      return <Lobby />;
    case GAME_PHASES.COUNTDOWN:
      return <Countdown />;
    case GAME_PHASES.PLAYING:
      return <CasinoFloor />;
    case GAME_PHASES.SHOWDOWN:
      return <Showdown />;
    case GAME_PHASES.RESULTS:
      return <Results />;
    default:
      return <Lobby />;
  }
}

function App() {
  // Global button click sound — fires for every non-disabled button press
  useEffect(() => {
    const onMouseDown = (e) => {
      const btn = e.target.closest('button');
      if (btn && !btn.disabled) sfx.click();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <PvPProvider>
      <GameProvider>
        <GameRouter />
      </GameProvider>
    </PvPProvider>
  );
}

export default App;
