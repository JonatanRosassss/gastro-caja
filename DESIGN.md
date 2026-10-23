# DESIGN.md — Caja & Cocina

## Mode & Visual Direction
- **Mode:** Operate (`achromatic-ledger`, dealt via `taste-skill` `draw.mjs --app`)
- **Face:** Stone ground (`#f4f3f1`) from the world of flour and oven stone, pure white flat panels (`#ffffff`) separated by 1px borders (`#e6e6e6`), near-black primary actions (`#141414`), and a single data hue (`#1d5fbf`) reserved strictly for the primary chart series and active focus indicators.
- **Typography:** `Geist` (`400`, `500`, `700` for money figures only) with `font-variant-numeric: tabular-nums` on all numeric columns, KPIs, and counters.
- **Icons:** 16px crisp 1.5px stroke inline SVGs only. Zero emojis, zero tinted icon squares, zero decorative gradients or shadows at rest.
- **Signature Elements:**
  1. **Árbol de Bolsillos y Compromisos** (Pinned left column on desktop, top summary card on mobile) showing Net Free Cash and the split between Replenishment Fund, Operating Expenses, and Church/Sever commitments.
  2. **Plan de Aportes Compartidos (Iglesia / Alquiler / Luz / Ofrendas)** rendered via `Charts.plan` and `Charts.bars` from real data.
