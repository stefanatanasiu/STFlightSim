# Flight Model Validation

The TypeScript model is a development stand-in. It is tuned for stable keyboard flight and a credible C172-like envelope, not certification-grade dynamics.

Validation scenarios to add as automated fixtures:

1. runway acceleration at full throttle
2. rotate and climb at 55-75 KIAS
3. straight-and-level cruise at 2,200-2,500 RPM
4. power-off descent and glide behavior
5. flap deployment lift/drag effects
6. stall warning and high-angle-of-attack sink
7. brake and landing rollout behavior
8. reset determinism from a runway spawn

When JSBSim is integrated, these fixtures should compare the C172 model against published POH-style performance bands, not exact certified numbers.
