# Provance Forensic Benchmark: Methodology
*Revision: 1.0*  
*Status: Draft*  
*Alignment: Trust Infrastructure GTM Strategy*

## 1. Executive Summary
The **Provance Forensic Benchmark** is a rigorous, public, and reproducible framework for evaluating the performance of media verification tools. In an industry plagued by "black-box scores" and "detection hype," Provance establishes a new standard for forensic defensibility.

This benchmark compares Provance’s multi-signal verification engine against generic AI detectors (e.g., Hive, Sensity, Reality Defender) across a standardized, high-difficulty dataset.

## 2. The Dataset (Provance-1000)
To ensure statistical significance and real-world relevance, the benchmark utilizes the **Provance-1000** dataset, consisting of 1,000 diverse media assets.

### 2.1 Asset Distribution
| Category | Count | Source Examples |
| :--- | :--- | :--- |
| **Authentic (A)** | 500 | iPhone/Android raw, Sony/Canon DSLR, News wire exports (AP/Reuters), Social media re-saves. |
| **Synthetic (S)** | 400 | Midjourney v6, Flux.1, DALL-E 3, SDXL, Sora, Kling AI, Luma Dream Machine. |
| **Manipulated (M)** | 100 | FaceForensics++, Adobe Generative Fill, Deepfake face-swaps, Metadata tampering. |

### 2.2 Difficulty Tiers
Assets are categorized into three tiers to test "edge case" resilience:
- **Tier 1: High Fidelity** — Direct exports from generators or cameras. No post-processing.
- **Tier 2: Production-Grade** — Resized, re-compressed (JPEG 80/90), and metadata-stripped (simulating social media uploads).
- **Tier 3: Adversarial/Edge** — Low-light, heavy motion, added film grain, or subtle generative edits (e.g., changing only a background element).

## 3. Evaluation Metrics
Provance rejects simple binary "accuracy" in favor of forensic-grade metrics.

### 3.1 Trust-Weighted Accuracy (TWA)
We penalize "Confident Wrong" answers more heavily than "Honest Uncertainty."
$$TWA = \frac{C_{correct} - (2 \times C_{incorrect})}{Total - C_{inconclusive}}$$
*Where $C$ is the count of assets in each result category.*

### 3.2 False Positive Rate (FPR) on Authentic Media
The most critical metric for newsrooms. An "Authentic" image flagged as "Synthetic" is a failure of trust.
**Provance Target:** < 0.5% on Tier 1 & 2.

### 3.3 Explainability Score (ES)
A binary check for each asset: Does the tool provide a verifiable reason for its verdict?
- **0:** Black-box score only (e.g., "92% AI").
- **1:** Signal-level evidence (e.g., "Inconsistent pixel frequency detected," "DiT patch artifacts identified").

## 5. Standardized Generation Prompts
To ensure the synthetic dataset is diverse and challenging, we use a set of standardized prompts across all generators (Midjourney, Flux, DALL-E, etc.):

- **High-Fidelity Portrait**: "Close-up portrait of an elderly man with deep wrinkles, soft natural lighting, 8k, highly detailed skin texture."
- **Optical Edge Case**: "A glass of water on a wooden table with complex refractions and sunlight hitting the surface."
- **Low-Light Scenarios**: "A city street at night during rain, neon signs reflecting in puddles, cinematic lighting, shot on 35mm film."
- **Text & Geometry**: "A storefront with a sign that says 'Provance Trust' in clear serif typography, architectural photography."

## 6. Benchmark Procedure

### 6.1 Comparison Baseline
We test the following tools using their most recent public API or web interface:
1. **Provance** (Multi-signal engine)
2. **Hive AI**
3. **Sensity AI**
4. **Reality Defender**
5. **Illuminarty** (Baseline open-source)

### 6.2 Blind Testing
All assets are processed through all tools without any metadata or context provided, simulating a blind investigation.

### 6.3 Result Normalization
To compare Provance's 6-class verdict system with 0-100 scores:
- **0.0 - 0.2:** Authentic / Likely Authentic
- **0.2 - 0.5:** Suspicious / Inconclusive
- **0.5 - 1.0:** Likely Synthetic / Synthetic

## 7. Reporting and Transparency
The results will be published as an interactive dashboard on `provance.ai/benchmark` and a downloadable technical whitepaper.

- **Per-Model Performance**: How well does each tool detect Flux.1 vs. Midjourney?
- **Compression Sensitivity**: At what JPEG quality level does detection break?
- **Failure Analysis**: Public disclosure of assets that fooled all tools, including Provance.

---
*Created by AI Researcher | 2026-06-25*
