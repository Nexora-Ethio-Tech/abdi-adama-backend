
export const ShootingStars = () => {
  const colors = ['#5f91ff', '#ff5f91', '#91ff5f', '#ffda5f', '#ffffff'];
  const starCount = 3 + Math.floor(Math.random() * 4); // Random between 3 and 6

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="shooting-stars-container w-full h-full">
        {[...Array(starCount)].map((_, i) => {
          const color = colors[Math.floor(Math.random() * colors.length)];
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;
          const angle = Math.random() * 360;
          const duration = 3 + Math.random() * 12;
          const delay = Math.random() * 25;
          const travel = 800 + Math.random() * 2000;
          const size = 1 + Math.random() * 2;

          return (
            <div
              key={i}
              className="shooting-star"
              style={{
                top: `${startY}vh`,
                left: `${startX}vw`,
                height: `${size}px`,
                background: `linear-gradient(90deg, ${color}, transparent)`,
                filter: `drop-shadow(0 0 15px ${color})`,
                transform: `rotate(${angle}deg)`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                ['--travel-dist' as any]: `${travel}px`,
                ['--star-color' as any]: color,
                opacity: 0.1 + Math.random() * 0.5
              }}
            />
          );
        })}
      </div>
      <style>{`
        .shooting-star {
          position: absolute;
          width: 0;
          border-radius: 999px;
          animation: fly-across var(--animation-duration, 5s) linear infinite;
        }
        @keyframes fly-across {
          0% {
            width: 0;
            transform: rotate(inherit) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            width: 150px;
          }
          90% {
            opacity: 1;
            width: 150px;
          }
          100% {
            width: 0;
            transform: rotate(inherit) translateX(var(--travel-dist, 1000px));
            opacity: 0;
          }
        }
        .shooting-star::before {
          content: '';
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          width: 4px;
          height: 4px;
          background: var(--star-color);
          border-radius: 50%;
          box-shadow: 0 0 15px 2px var(--star-color);
        }
      `}</style>
    </div>
  );
};
