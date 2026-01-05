export type Position =
  | 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

export type BaseStatus = 'empty' | 'occupied';

export type AgeLevel =
  | 'tball'
  | '8u'
  | '10u'
  | '12u'
  | '14u'
  | '16u'
  | '18u'
  | 'high-school'
  | 'travel';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface BaseRunners {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface GameSituation {
  id: string;
  name: string;
  description: string;
  outs: number;
  runners: BaseRunners;
  playType: string;
  ballLocation?: string;
  ageLevel: AgeLevel[];
  skillLevel: SkillLevel[];
  positions: PlayerPositions;
}

export interface PlayerPositions {
  P: { x: number; y: number; instruction: string };
  C: { x: number; y: number; instruction: string };
  '1B': { x: number; y: number; instruction: string };
  '2B': { x: number; y: number; instruction: string };
  '3B': { x: number; y: number; instruction: string };
  SS: { x: number; y: number; instruction: string };
  LF: { x: number; y: number; instruction: string };
  CF: { x: number; y: number; instruction: string };
  RF: { x: number; y: number; instruction: string };
}

export interface Rule {
  id: string;
  organization: string;
  category: string;
  title: string;
  content: string;
  ageLevel?: AgeLevel[];
}

export interface AIScenarioRequest {
  description: string;
  ageLevel: AgeLevel;
  skillLevel: SkillLevel;
  organization: string;
}
