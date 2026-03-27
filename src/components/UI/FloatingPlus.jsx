const positions = [
  { top: '10%', left: '5%', color: '#ff69b4', delay: '0s' },
  { top: '20%', right: '8%', color: '#b8d767', delay: '1s' },
  { top: '60%', left: '3%', color: '#b8d767', delay: '2s' },
  { top: '80%', right: '5%', color: '#ff69b4', delay: '0.5s' },
  { top: '40%', left: '92%', color: '#ff69b4', delay: '1.5s' },
  { bottom: '15%', left: '8%', color: '#b8d767', delay: '3s' },
];

export default function FloatingPlus() {
  return (
    <>
      {positions.map((pos, i) => (
        <div
          key={i}
          className="floating-plus"
          style={{
            ...pos,
            color: pos.color,
            animationDelay: pos.delay,
          }}
        >
          +
        </div>
      ))}
    </>
  );
}
