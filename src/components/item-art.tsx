import type { ItemId } from '@/domain/bond';

export function ItemArt({ item }: { item: ItemId }) {
  return (
    <svg viewBox="0 0 100 100" className={`item-art item-${item}`} aria-hidden="true" fill="none">
      <ellipse cx="50" cy="88" rx="25" ry="4" fill="#000" opacity=".16" />
      {item === 'whey' || item === 'smallWhey' ? (
        <g transform={item === 'smallWhey' ? 'translate(10 13) scale(.8)' : undefined}>
          <path
            d="M30 16L70 16L67 30L74 78Q50 90 26 78L33 30Z"
            fill="#c7dda7"
            stroke="#e4edc8"
            strokeWidth="1.5"
          />
          <path d="M32 24H68M32 30H68" stroke="#869e69" strokeWidth="2" />
          <path d="M29 49H71L72 71H28Z" fill="#355d40" />
          <path
            d="M43 64L50 53L57 64M46 60H54"
            stroke="#dcf0b7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M37 37L34 46" stroke="#f2f6da" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : item === 'goblet' ? (
        <g>
          <path
            d="M25 28H14V39Q14 55 32 55M75 28H86V39Q86 55 68 55"
            stroke="#c6a165"
            strokeWidth="5"
          />
          <path
            d="M25 21H75L72 43Q70 59 50 62Q30 59 28 43Z"
            fill="#c4a568"
            stroke="#eed096"
            strokeWidth="1.5"
          />
          <ellipse cx="50" cy="22" rx="25" ry="7" fill="#ecd49e" />
          <ellipse cx="50" cy="22" rx="20" ry="4" fill="#713f4f" />
          <path d="M46 61H54V78L67 83V87H33V83L46 78Z" fill="#c4a568" />
          <path d="M33 37H41V44H49V37H57V44H65V37" stroke="#785d35" strokeWidth="2" />
        </g>
      ) : item === 'grapes' ? (
        <g>
          <path d="M51 31Q44 18 56 12" stroke="#92ad70" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 25Q68 9 79 24Q66 38 50 25Z" fill="#93b37c" />
          {[
            [37, 38],
            [57, 38],
            [28, 53],
            [48, 54],
            [67, 52],
            [39, 69],
            [58, 68],
            [49, 81],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="11"
                fill={i % 2 ? '#9e89b8' : '#b09ac9'}
                stroke="#d2bce5"
                strokeWidth="1"
              />
              <circle cx={x - 3} cy={y - 3} r="2" fill="#e8d5f2" opacity=".65" />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <path
            d="M39 21H61V36Q73 43 73 62V76Q50 91 27 76V62Q27 43 39 36Z"
            fill="#d2ab63"
            stroke="#eecf8d"
            strokeWidth="1.5"
          />
          <path d="M37 17H63V24H37Z" fill="#8e9e71" />
          <path d="M29 60Q50 54 71 60V75Q50 87 29 75Z" fill="#f0cc7f" />
          <path d="M50 39L53 49L63 52L53 55L50 65L47 55L37 52L47 49Z" fill="#fff0bd" />
          <path d="M76 21L78 28L85 30L78 32L76 39L74 32L67 30L74 28Z" fill="#cfe4a9" />
        </g>
      )}
    </svg>
  );
}
