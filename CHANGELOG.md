# 1.0.0 (2026-05-14)


### Bug Fixes

* fix build command ([78b539a](https://github.com/amlan-roy/axiom-engine/commit/78b539a6549c3a47eb4ff70ff1c87c8a57aa2aa5))
* remove unused vi import from createEngine test ([f7045a3](https://github.com/amlan-roy/axiom-engine/commit/f7045a3cbc1dc48f0c923587a54add7091dcc891))
* removing workflows for now ([65d1254](https://github.com/amlan-roy/axiom-engine/commit/65d1254753807de903caddc32c3d2ff7b357a37a))
* resolve lint errors, remove dead ActionDef fields and followUps, wire decrementCooldowns ([a6d71e1](https://github.com/amlan-roy/axiom-engine/commit/a6d71e14525376d5b1e1e028d28e635a33a1654a))
* shadow ActionDef-specific fields as never, add JSDoc comments ([61b603c](https://github.com/amlan-roy/axiom-engine/commit/61b603cc5a616f90ac5d76f154eb2d840368f745))
* update node version in workflows ([e0bf806](https://github.com/amlan-roy/axiom-engine/commit/e0bf80681484b1a492c23ff1c4027f2138fc02a3))


### Features

* add core type definitions for state, config, and engine ([452c2e3](https://github.com/amlan-roy/axiom-engine/commit/452c2e32da5f5793e96ea1fd9b222f2ce1dd23d6))
* add undo with configurable snapshot depth ([6a21909](https://github.com/amlan-roy/axiom-engine/commit/6a21909ad581e74497d8e9ed754db8374c05aae5))
* expose public engine API and remove placeholder scaffold files ([e18f84b](https://github.com/amlan-roy/axiom-engine/commit/e18f84b7ee818c93afea2bd2ab187bf004b7b209))
* implement append-only history manager ([53da90b](https://github.com/amlan-roy/axiom-engine/commit/53da90b71bdcf5ff41ad9fe8079927344f659273))
* implement condition evaluator with ctx forwarding and short-circuit ([bbeecbb](https://github.com/amlan-roy/axiom-engine/commit/bbeecbb42f96332a5068b37ae276f3c9e2d487c8))
* implement createEngine factory with full public API ([601414e](https://github.com/amlan-roy/axiom-engine/commit/601414e3695ec7090ac43593a69df9c801b1a8fd))
* implement deterministic milestone event phase ([b2e971c](https://github.com/amlan-roy/axiom-engine/commit/b2e971c848c33e81c71dde5b41e6c46936065ac9))
* implement event cooldown manager ([2575b53](https://github.com/amlan-roy/axiom-engine/commit/2575b53b859b32f5c8326b9b870d17aa07974e4d))
* implement passive modifier phase with conditional and function-based deltas ([e9cd9e5](https://github.com/amlan-roy/axiom-engine/commit/e9cd9e5d730b244613cee588048a31c3a6c0ac62))
* implement probability pipeline with full gate chain and modifier support ([257533d](https://github.com/amlan-roy/axiom-engine/commit/257533d700498934ccf317a5834f07d2eb5cafcc))
* implement random event phase with probability pipeline and cooldown tracking ([c1a2ff7](https://github.com/amlan-roy/axiom-engine/commit/c1a2ff7c5c3028d2d818ff6a0b1b738f6be77f38))
* implement restriction evaluator with global-first short-circuit evaluation ([5bbceb7](https://github.com/amlan-roy/axiom-engine/commit/5bbceb7002645b3a0935f31ec7f88833b7150732))
* implement state manager with additive delta application and attribute clamping ([b9ffc16](https://github.com/amlan-roy/axiom-engine/commit/b9ffc161ad9ce3b5ae9ce76ea49c41e6fb068431))
* implement tick runner with ordered phase orchestration ([84a1c55](https://github.com/amlan-roy/axiom-engine/commit/84a1c5598de266b7ad52a2f61003ff52024fa414))

# Change Log

All notable changes to the "axiom-engine" project will be documented in this file.
