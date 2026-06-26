# Provance Forensic Research & Methodology
*Mapping Generative Signatures and Confidence Algorithms*

## 1. Generative Signature Catalog

This catalog identifies the forensic traces (artifacts) characteristic of current state-of-the-art (SOTA) generative models.

### 1.1 Sora (OpenAI) - Video
*   **Model Class:** Diffusion-Transformer (DiT).
*   **Temporal Artifacts:** 
    *   **Physics Inconsistency:** Failures in fluid dynamics (water flow) and complex object interactions (objects merging).
    *   **Patch Boundary Discontinuities:** Subtle misalignments between spatial-temporal patches used in the transformer architecture.
*   **Frequency Domain:** 
    *   **Spectral Spikes:** Characteristic peaks in the temporal-frequency domain resulting from the periodic nature of patch-based generation.
*   **Provenance:** 
    *   **C2PA Integration:** OpenAI includes C2PA metadata; its absence in a "high-quality" video is a secondary suspicious signal.

### 1.2 Midjourney v6 - Image
*   **Model Class:** Latent Diffusion.
*   **Forensic Artifacts:**
    *   **Spectral Decoupling:** Statistical anomalies in the high-frequency bands where the model struggles to replicate natural sensor noise.
    *   **Dithering Patterns:** Unique noise-shaping patterns used to enhance perceived texture.
*   **Visual Quirks:**
    *   **Non-Natural Bokeh:** Mathematically perfect but optically impossible depth-of-field transitions.
    *   **Texture Over-Smoothing:** Loss of micro-texture in "flat" areas (e.g., skin or sky) compared to natural film grain or sensor noise.

### 1.3 Kling AI - Video
*   **Model Class:** Large-scale Video Diffusion.
*   **Signatures:**
    *   **Motion Warping:** High-frequency jitter or "jello effect" on fast-moving edges that doesn't match camera shutter behavior.
    *   **Lighting Consistency:** Light sources that don't correctly affect the environment in a temporally stable way (e.g., shadows lagging behind objects).
*   **Compression:**
    *   **Post-Processing Signatures:** Kling often applies specific sharpening filters that leave detectable ringing artifacts.

### 1.4 Flux.1 (Black Forest Labs) - Image
*   **Model Class:** Rectified Flow / Diffusion.
*   **Signatures:**
    *   **Flow Trajectory Artifacts:** Rectified Flow models leave a different statistical distribution of pixel values compared to standard diffusion, detectable via high-order statistics.
    *   **Text/Geometry Precision:** Unlike earlier models, Flux is highly precise; forensics must pivot from "logic errors" (text/hands) to "pixel-level statistical errors."
*   **Grid Patterns:** Subtle checkerboard artifacts in the chrominance channels (U/V) due to the VAE upscaling process.

---

## 2. Multi-Signal Confidence Model

The Provance Veracity Score is calculated using a weighted average of independent forensic signals.

### 2.1 Mathematical Weights

| Signal Component | Weight | Key Metrics |
| :--- | :--- | :--- |
| **Generative Fingerprints** | **35%** | Model-specific spectral peaks, patch consistency, DiT artifacts. |
| **Pixel/Frequency Analysis** | **25%** | Fourier transform anomalies, PRNU (Photo Response Non-Uniformity) analysis. |
| **Metadata Forensics** | **20%** | EXIF consistency, editing history, camera-specific metadata matching. |
| **Compression/Splicing** | **10%** | ELA (Error Level Analysis), double-quantization detection. |
| **Cryptographic Provenance** | **10%** | C2PA / Content Credentials validation. |

### 2.2 Confidence Calculation
The final score $S$ is calculated as:
$$S = \sum (w_i \cdot c_i)$$
Where:
*   $w_i$ is the weight of signal $i$.
*   $c_i$ is the confidence score of signal $i$ (0 to 1).

**Classification Mapping:**
*   **90-100%:** Synthetic / Authentic (Confirmed)
*   **75-89%:** Likely Synthetic / Likely Authentic
*   **55-74%:** Suspicious / Probable
*   **<55%:** Inconclusive

---

## 3. Benchmarking Datasets

To ensure the defensibility of our signals, Provance benchmarks against these industry-standard datasets:

| Dataset | Type | Focus | Reference |
| :--- | :--- | :--- | :--- |
| **FaceForensics++** | Video | Facial manipulation and deepfakes. | [ondyari/FaceForensics](https://github.com/ondyari/FaceForensics) |
| **DFDC** | Video | Large-scale deepfake detection. | [Meta AI / DFDC](https://ai.meta.com/datasets/deepfake-detection-challenge/) |
| **GenImage** | Image | Multi-model generative image detection. | [GenImage-Dataset](https://github.com/GenImage-Dataset/GenImage) |
| **OpenForensics** | Image | Real-world face forgery detection. | [mrt654/OpenForensics](https://github.com/mrt654/OpenForensics) |
| **CSI Dataset** | Mixed | Common Synthetic Images. | [CSI-Dataset](https://github.com/ZhenxingJian/CSI-Dataset) |
| **AntifakePrompt** | Mixed | Prompt-based deepfake benchmarking. | [AntifakePrompt](https://github.com/AntifakePrompt/AntifakePrompt) |

---

## 4. Methodology Note: "Explainable Evidence"

Provance moves beyond black-box scores. For every "Synthetic" verdict, the report must cite at least two convergent signals (e.g., "Spectral spikes detected" AND "Inconsistent motion vectors").

*Revision 1.0 - AI Researcher*
