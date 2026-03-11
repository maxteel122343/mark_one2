import React from 'react';
import { Connection, CardData } from '../types';
import { Scissors } from 'lucide-react';

interface ConnectionLayerProps {
  connections: Connection[];
  cards: CardData[];
  visibleCardIds: Set<string>;
  connectionStyle?: 'curved' | 'straight';
  strokeWidth?: number;
  showLabels?: boolean;
  connectingFromId?: string | null;
  connectingMousePos?: { x: number, y: number };
  onUpdateCard?: (id: string, updates: Partial<CardData>) => void;
}

const getCardCenter = (id: string, cards: CardData[]) => {
  const card = cards.find((c) => c.id === id);
  if (!card) return { x: 0, y: 0 };
  const cardWidth = card.width || (card.shape === 'circle' ? 256 : 256);
  const cardHeight = card.height || (card.shape === 'circle' ? 256 : 300);
  return { x: card.x + cardWidth / 2, y: card.y + cardHeight / 2 };
};

const ConnectionLayer: React.FC<ConnectionLayerProps> = React.memo(({
  connections,
  cards,
  visibleCardIds,
  connectionStyle = 'curved',
  strokeWidth = 2,
  showLabels = false,
  connectingFromId,
  connectingMousePos,
  onUpdateCard
}) => {

  return (
    <svg className={`absolute top-0 left-0 pointer-events-none overflow-visible ${connectingFromId ? 'z-50' : 'z-0'}`} style={{ width: 1, height: 1 }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
        </marker>
        <marker
          id="arrowhead-active"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
        </marker>
      </defs>

      {/* Manual connections */}
      {connections.map((conn) => {
        // Only show manual connection if BOTH ends are visible
        if (!visibleCardIds.has(conn.fromId) || !visibleCardIds.has(conn.toId)) return null;

        const start = getCardCenter(conn.fromId, cards);
        const end = getCardCenter(conn.toId, cards);

        let path = '';
        let midX = 0;
        let midY = 0;

        if (connectionStyle === 'curved') {
          const dx = Math.abs(end.x - start.x) * 0.5;
          path = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
          const p0 = start;
          const p1 = { x: start.x + dx, y: start.y };
          const p2 = { x: end.x - dx, y: end.y };
          const p3 = end;
          midX = 0.125 * p0.x + 0.375 * p1.x + 0.375 * p2.x + 0.125 * p3.x;
          midY = 0.125 * p0.y + 0.375 * p1.y + 0.375 * p2.y + 0.125 * p3.y;
        } else {
          path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          midX = (start.x + end.x) / 2;
          midY = (start.y + end.y) / 2;
        }

        const labelText = conn.label || conn.id.slice(0, 4);

        return (
          <g key={conn.id}>
            <path
              d={path}
              stroke="#4b5563"
              strokeWidth={strokeWidth}
              fill="none"
              markerEnd="url(#arrowhead)"
              strokeDasharray={strokeWidth > 3 ? "none" : "5,5"}
              className="opacity-50 transition-all duration-300 ease-in-out"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {showLabels && (
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x="-20" y="-10" width="40" height="20" rx="4"
                  fill="#18181b" stroke="#4b5563" strokeWidth="1"
                  className="opacity-90"
                />
                <text
                  x="0" y="0" dy="1" textAnchor="middle" dominantBaseline="middle"
                  fill="#9ca3af" fontSize="10" fontFamily="monospace"
                  className="pointer-events-none select-none"
                >
                  {labelText}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Parent-Child connections (Dockable/Undockable Notes) */}
      {cards.map(card => {
        if (!card.parentId) return null;

        // Only show parent-child line if BOTH the parent and child are visible
        // (Internal notes are NOT visible on canvas, so their parent-child line should be hidden here)
        if (!visibleCardIds.has(card.parentId) || !visibleCardIds.has(card.id)) return null;

        const start = getCardCenter(card.parentId, cards);
        const end = getCardCenter(card.id, cards);

        let path = '';
        let midX = 0;
        let midY = 0;

        if (connectionStyle === 'curved') {
          const dx = Math.abs(end.x - start.x) * 0.5;
          path = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
          const p0 = start;
          const p1 = { x: start.x + dx, y: start.y };
          const p2 = { x: end.x - dx, y: end.y };
          const p3 = end;
          midX = 0.125 * p0.x + 0.375 * p1.x + 0.375 * p2.x + 0.125 * p3.x;
          midY = 0.125 * p0.y + 0.375 * p1.y + 0.375 * p2.y + 0.125 * p3.y;
        } else {
          path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          midX = (start.x + end.x) / 2;
          midY = (start.y + end.y) / 2;
        }

        return (
          <g key={`pc-grp-${card.id}`} className="group/conn">
            {!card.isConnectionHidden && (
              <path
                d={path}
                stroke={card.color === 'red' ? '#ef4444' : card.color === 'blue' ? '#3b82f6' : '#4b5563'}
                strokeWidth={strokeWidth}
                fill="none"
                strokeOpacity="0.3"
                strokeDasharray="4,4"
                className="transition-all duration-300"
              />
            )}

            {/* Clickable toggle in the middle */}
            <g
              transform={`translate(${midX}, ${midY})`}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateCard?.(card.id, { isConnectionHidden: !card.isConnectionHidden });
              }}
            >
              <circle
                r="10"
                fill="white"
                className={`transition-all duration-200 stroke-gray-200 hover:scale-125 shadow-sm ${card.isConnectionHidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
                strokeWidth="1"
              />
              <circle
                r="3"
                fill={card.isConnectionHidden ? '#9ca3af' : (card.color === 'blue' ? '#3b82f6' : '#4b5563')}
                className="transition-colors"
              />

              {/* Tooltip hint on hover */}
              <rect x="12" y="-10" width="80" height="20" rx="4" fill="black" className="opacity-0 group-hover/conn:opacity-80 transition-opacity" />
              <text x="52" y="0" dy="1" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" className="opacity-0 group-hover/conn:opacity-100 pointer-events-none select-none">
                {card.isConnectionHidden ? 'Mostrar Conexão' : 'Ocultar Conexão'}
              </text>
            </g>
          </g>
        );
      })}

      {/* Draft Connection */}
      {connectingFromId && connectingMousePos && (
        <path
          d={(() => {
            const start = getCardCenter(connectingFromId, cards);
            const end = connectingMousePos;
            if (connectionStyle === 'curved') {
              const dx = Math.abs(end.x - start.x) * 0.5;
              return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
            }
            return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          })()}
          stroke="#3b82f6"
          strokeWidth={strokeWidth * 1.5}
          fill="none"
          strokeDasharray="5,5"
          markerEnd="url(#arrowhead-active)"
          className="opacity-100 animate-pulse"
          style={{ filter: 'drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))' }}
        />
      )}
    </svg>
  );
});

export default ConnectionLayer;