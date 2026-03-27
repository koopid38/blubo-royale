import { useState, useCallback, useRef } from 'react';
import { useGame } from '../../hooks/useGameState';
import { createDeck, dealBlackjack, handValue, resolveBlackjack, isBlackjack } from '../../utils/gameLogic';
import MysteryBox from '../Powerups/MysteryBox';
import { sfx } from '../../utils/sounds';

function Card({ card, faceDown = false, dealDelay = 0 }) {
  if (faceDown) {
    return (
      <div
        className="playing-card face-down card-deal-in"
        style={{ animationDelay: `${dealDelay}ms` }}
      >
        <div className="text-lg">🎲</div>
      </div>
    );
  }
  return (
    <div
      className={`playing-card ${card.color === 'red' ? 'red' : ''} card-deal-in`}
      style={{ animationDelay: `${dealDelay}ms` }}
    >
      <div className="text-[10px]">{card.rank}</div>
      <div className="text-lg">{card.suit}</div>
    </div>
  );
}

export default function Blackjack() {
  const { state, dispatch, checkPowerupDrop } = useGame();
  const player = state.players.find(p => p.id === state.humanPlayerId);
  const [deck, setDeck] = useState(() => createDeck());
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [bet, setBet] = useState(state.minBet);
  const [gamePhase, setGamePhase] = useState('betting'); // betting, playing, dealer, result
  const [result, setResult] = useState(null);
  const [payout, setPayout] = useState(0);
  const [droppedPowerup, setDroppedPowerup] = useState(null);
  const [dealKey, setDealKey] = useState(0);

  const canBet = player && !player.eliminated && player.bankroll >= state.minBet && !state.bankrollFrozen;

  const handleDeal = useCallback(() => {
    if (!canBet || bet > player.bankroll) return;
    let d = deck.length < 15 ? createDeck() : [...deck];
    const dealt = dealBlackjack(d);
    sfx.cardDeal();
    setTimeout(() => sfx.cardDeal(), 200);
    setDealKey(k => k + 1);
    setDeck(dealt.deck);
    setPlayerCards(dealt.playerCards);
    setDealerCards(dealt.dealerCards);
    setGamePhase('playing');
    setResult(null);
    dispatch({ type: 'SET_MID_HAND', midHand: true });
    dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: -bet });
    dispatch({ type: 'RECORD_BET', playerId: player.id });

    // Check for immediate blackjack
    if (isBlackjack(dealt.playerCards)) {
      finishHand(dealt.playerCards, dealt.dealerCards, dealt.deck, bet);
    }
  }, [canBet, bet, deck, player]);

  const handleHit = () => {
    sfx.cardDeal();
    const d = [...deck];
    const newCards = [...playerCards, d.pop()];
    setDeck(d);
    setPlayerCards(newCards);

    if (handValue(newCards) > 21) {
      finishHand(newCards, dealerCards, d, bet);
    }
  };

  const handleStand = () => {
    dealerPlay([...deck], [...dealerCards]);
  };

  const handleDoubleDown = () => {
    if (player.bankroll < bet) return;
    sfx.cardDeal();
    dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: -bet });
    const d = [...deck];
    const newCards = [...playerCards, d.pop()];
    setDeck(d);
    setPlayerCards(newCards);
    const doubleBet = bet * 2;

    if (handValue(newCards) > 21) {
      finishHand(newCards, dealerCards, d, doubleBet);
    } else {
      dealerPlay(d, [...dealerCards], newCards, doubleBet);
    }
  };

  const dealerPlay = (d, dCards, pCards = playerCards, currentBet = bet) => {
    setGamePhase('dealer');
    let dc = [...dCards];

    const dealerDraw = () => {
      while (handValue(dc) < 17) {
        dc = [...dc, d.pop()];
      }
      setDealerCards(dc);
      setDeck(d);
      finishHand(pCards, dc, d, currentBet);
    };

    setTimeout(dealerDraw, 500);
  };

  const finishHand = (pCards, dCards, d, currentBet) => {
    const { result: res, payout: pay } = resolveBlackjack(pCards, dCards, currentBet);

    // Check for active effects
    let finalPayout = pay;
    const hasHotHand = player.activeEffects.some(e => e.id === 'hot_hand');
    const hasShield = player.activeEffects.some(e => e.id === 'double_down_shield');
    const hasWrath = player.activeEffects.some(e => e.id === 'blubos_wrath');

    if (finalPayout > 0 && hasHotHand) finalPayout *= 2;
    if (finalPayout < 0 && hasShield) {
      finalPayout = 0;
      // Remove shield effect
    }
    if (finalPayout < 0 && hasWrath) finalPayout *= 2;

    if (finalPayout > 0) {
      dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: finalPayout + currentBet });
      dispatch({ type: 'SCREEN_SHAKE' });
      setTimeout(() => dispatch({ type: 'CLEAR_SHAKE' }), 400);
    } else if (finalPayout === 0 && res === 'push') {
      dispatch({ type: 'UPDATE_BANKROLL', playerId: player.id, amount: currentBet });
    }

    if (res === 'blackjack') sfx.blackjackWin();
    else if (res === 'bust') sfx.bust();
    else if (res === 'push') sfx.push();
    else if (finalPayout > 0) sfx.win();
    else sfx.lose();

    setResult(res);
    setPayout(finalPayout);
    setGamePhase('result');
    dispatch({ type: 'SET_MID_HAND', midHand: false });

    // Check for powerup drop
    const drop = checkPowerupDrop();
    if (drop) setDroppedPowerup(drop);
  };

  const newHand = () => {
    setGamePhase('betting');
    setPlayerCards([]);
    setDealerCards([]);
    setResult(null);
    setPayout(0);
    setDroppedPowerup(null);
    setBet(Math.max(state.minBet, bet));
  };

  const pv = handValue(playerCards);
  const dv = handValue(dealerCards);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-[10px] neon-text" style={{ color: '#00bfff' }}>BLACKJACK</h3>

      {/* Dealer area */}
      <div className="text-center">
        <div className="text-[7px] text-gray-400 mb-2">DEALER {gamePhase !== 'betting' && gamePhase !== 'playing' ? `(${dv})` : ''}</div>
        <div className="flex gap-2 justify-center min-h-[100px]">
          {dealerCards.map((card, i) => (
            <Card key={`d-${dealKey}-${i}`} card={card} faceDown={i === 1 && gamePhase === 'playing'} dealDelay={i < 2 ? i * 200 + 100 : (i - 2) * 150} />
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`text-sm bounce-in ${payout > 0 ? 'neon-text-green' : payout < 0 ? '' : 'neon-text'}`}
          style={{ color: payout > 0 ? '#b8d767' : payout < 0 ? '#ff4444' : '#00bfff' }}>
          {result === 'blackjack' ? 'BLACKJACK!' : result === 'bust' ? 'BUST!' : result.toUpperCase()}
          {payout !== 0 && ` (${payout > 0 ? '+' : ''}$${payout})`}
        </div>
      )}

      {/* Player area */}
      <div className="text-center">
        <div className="flex gap-2 justify-center min-h-[100px]">
          {playerCards.map((card, i) => (
            <Card key={`p-${dealKey}-${i}`} card={card} dealDelay={i < 2 ? i * 200 : 0} />
          ))}
        </div>
        <div className="text-[7px] text-gray-400 mt-2">
          YOUR HAND {playerCards.length > 0 ? `(${pv})` : ''}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        {gamePhase === 'betting' && (
          <>
            <div className="flex items-center gap-3">
              <button className="game-btn text-[8px] px-3 py-2" onClick={() => setBet(Math.max(state.minBet, bet - state.minBet))}>-</button>
              <div className="text-sm neon-text" style={{ color: '#00bfff', minWidth: 60, textAlign: 'center' }}>${bet}</div>
              <button className="game-btn text-[8px] px-3 py-2" onClick={() => setBet(Math.min(player?.bankroll || 0, state.minBet * 10, bet + state.minBet))}>+</button>
            </div>
            <div className="flex gap-2">
              <button className="game-btn text-[7px] px-2 py-1" onClick={() => setBet(state.minBet)}>MIN</button>
              <button className="game-btn text-[7px] px-2 py-1" onClick={() => setBet(Math.min(player?.bankroll || 0, state.minBet * 5))}>HALF</button>
              <button className="game-btn text-[7px] px-2 py-1" onClick={() => setBet(Math.min(player?.bankroll || 0, state.minBet * 10))}>MAX</button>
            </div>
            <button
              className="game-btn game-btn-green text-xs px-6 py-3"
              onClick={handleDeal}
              disabled={!canBet || bet < state.minBet}
              style={{ opacity: canBet && bet >= state.minBet ? 1 : 0.5 }}
            >
              DEAL
            </button>
          </>
        )}

        {gamePhase === 'playing' && (
          <div className="flex gap-2">
            <button className="game-btn text-[9px] px-4 py-2" onClick={handleHit}>HIT</button>
            <button className="game-btn game-btn-green text-[9px] px-4 py-2" onClick={handleStand}>STAND</button>
            {playerCards.length === 2 && player.bankroll >= bet && (
              <button className="game-btn text-[9px] px-4 py-2" style={{ borderColor: '#ffd700', color: '#ffd700' }} onClick={handleDoubleDown}>
                2X
              </button>
            )}
          </div>
        )}

        {gamePhase === 'dealer' && (
          <div className="text-[8px] text-gray-400">Dealer playing...</div>
        )}

        {gamePhase === 'result' && (
          <button className="game-btn game-btn-green text-[9px] px-6 py-2" onClick={newHand}>
            NEW HAND
          </button>
        )}
      </div>

      {droppedPowerup && (
        <MysteryBox powerup={droppedPowerup} onClose={() => setDroppedPowerup(null)} />
      )}
    </div>
  );
}
