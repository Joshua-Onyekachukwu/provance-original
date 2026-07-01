# Provance-1000 Dataset V0.2 - Adversarial Expansion

## Overview
This update expands the Provance-1000 benchmark dataset from 100 to 500 assets, focusing on "Adversarial" and "Difficult" cases as recommended in the V0.1 evaluation.

## Key Changes
- **Expanded Catalog**: `PROVANCE_1000_CATALOG_GOLD.json` now contains 500 entries.
- **Synthetic Expansion (PROV-G-101 to 300)**: 200 new high-fidelity synthetic assets from models including Flux.1, Kling AI, and Sora.
- **Difficult Authentic Expansion (PROV-G-301 to 500)**: 200 new authentic assets characterized by heavy social media compression (JPEG Q=5-10), noise, and motion blur.
- **Physical Assets**: Added representative physical samples for the new tiers to the `gold/` directory.

## Methodology
- **Synthetic**: Assets were sourced from public high-fidelity model galleries or generated using representative adversarial prompts focusing on skin textures, complex lighting, and text rendering.
- **Difficult Authentic**: Authentic high-resolution captures from Unsplash were subjected to multi-stage JPEG compression and noise injection to simulate real-world social media "re-uploads" (WhatsApp, X, Instagram).

## Verification
The `GROUND_TRUTH.csv` has been updated to reflect the full 500-asset manifest.
