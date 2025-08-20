export type Dir = 'N' | 'E' | 'S' | 'W';
export type Terrain = 'desert' | 'jungle' | 'prairie' | 'ice';

export type Cell = {
  /** obstacle */
  o?: boolean;
  /** hit */
  h?: boolean;
  /** is my unit occupying */
  u?: boolean;
  /** optional unit name for tooltip */
  uname?: string;
};

export type Board = Cell[][];

export type Player = { id: string; name: string; ready?: boolean; me?: boolean };

export type RoomPhase = 'waiting' | 'placing' | 'playing' | 'ended' | 'coin';

export type Room = {
  code?: string;
  phase?: RoomPhase;
  players?: Player[];
  timers?: {
    placingEndsAt?: number | null;
    spinEndsAt?: number | null;
    fireEndsAt?: number | null;
    gameEndsAt?: number | null;
  };
  turn?: { current: string } | null;
};
