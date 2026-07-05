// audio/ImpactSoundMap.js
export const IMPACT_SOUNDS = {
  BALL_BALL:    { samples: ['ball_hit_1.wav','ball_hit_2.wav','ball_hit_3.wav'], minVel: 0.1, maxVel: 6, baseGain: 0.6 },
  BALL_CUSHION: { samples: ['cushion_1.wav','cushion_1.wav'], minVel: 0.05, maxVel: 5, baseGain: 0.5 },
  BALL_CUE:     { samples: ['cue_strike_1.wav','cue_strike_2.wav'], minVel: 0.5, maxVel: 12, baseGain: 0.9 },
  BALL_POCKET:  { samples: ['pocket_drop_1.wav'], minVel: 0, maxVel: 3, baseGain: 0.7 },
};