import { getBluboIcon } from '../../utils/bluboIcons';

export default function BluboAvatar({ iconIndex = 0, size = 60, className = '', glow = true }) {
  const src = getBluboIcon(iconIndex);

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt="Blubo"
        className="rounded-lg"
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          border: '2px solid rgba(0,191,255,0.6)',
          boxShadow: glow ? '0 0 15px rgba(0,191,255,0.4)' : 'none',
        }}
      />
    </div>
  );
}
