# Algorithms And Intelligence Layer

## 1. Intelligence Strategy

The platform should use a layered intelligence model:

1. deterministic forensic signals
2. learned classification models
3. attribution retrieval
4. ensemble scoring
5. evidence-grounded explanation generation

This lowers dependence on any single model and better supports explainability.

## 2. Core Algorithms

## Algorithm A: Frequency Analysis

- Objective: detect frequency-domain artifacts associated with synthetic generation
- Inputs: normalized image tensor or grayscale projection
- Outputs: frequency anomaly score, heat regions, evidence metadata
- Logic flow:
  1. normalize image
  2. compute FFT or wavelet transform
  3. compare spectral distribution against baseline patterns
  4. score anomaly intensity
- Optimization methods: precomputed baseline statistics, batch transforms, image downsampling
- Scalability approach: CPU-friendly processing, parallelized by worker pool
- Risk mitigation: avoid over-weighting frequency signal in compressed or low-resolution images

### Pseudocode

```text
function analyze_frequency(image):
  normalized = normalize(image)
  spectrum = fft(normalized)
  features = summarize_spectrum(spectrum)
  score = compare_to_reference(features)
  return score, features
```

## Algorithm B: Neural Classification

- Objective: classify whether media appears synthetic based on learned visual patterns
- Inputs: image tensor and optional metadata context
- Outputs: synthetic probability, class logits, attention artifacts
- Logic flow:
  1. preprocess image
  2. run CNN backbone for local texture patterns
  3. run transformer branch for global consistency
  4. fuse outputs
  5. calibrate confidence
- Optimization methods: ONNX export, mixed precision on GPU, cached preprocessing
- Scalability approach: separate CPU and GPU serving pools
- Risk mitigation: maintain calibration checks and drift monitoring

## Algorithm C: Metadata Forensics

- Objective: inspect metadata consistency and absence/presence signals
- Inputs: original file bytes and extracted metadata
- Outputs: metadata integrity score and evidence flags
- Logic flow:
  1. parse EXIF/container metadata
  2. check for expected device-origin patterns
  3. flag inconsistencies or suspicious absences
- Optimization methods: lightweight parser execution
- Scalability approach: near-zero-cost pre-filter stage
- Risk mitigation: do not equate missing metadata with synthetic media by itself

## Algorithm D: Noise Fingerprint Matching

- Objective: compare noise residuals against fingerprint vectors for known generators
- Inputs: denoised residual map or embedding vector
- Outputs: nearest generator candidates and attribution confidence
- Logic flow:
  1. extract noise residual
  2. embed into fingerprint vector
  3. query vector index
  4. apply confidence and support thresholds
- Optimization methods: approximate nearest-neighbor retrieval
- Scalability approach: vector index partitioning by model family
- Risk mitigation: return `unknown` when candidate separation is weak

## Algorithm E: Facial And Anatomy Analysis

- Objective: detect geometry and consistency anomalies in faces, hands, and body structure
- Inputs: image and detected anatomical landmarks
- Outputs: anatomical anomaly score and localized evidence
- Logic flow:
  1. detect face, hand, or pose landmarks
  2. measure symmetry and anatomical plausibility
  3. compare against tolerated variance ranges
- Optimization methods: run only when relevant entities are detected
- Scalability approach: selective invocation
- Risk mitigation: handle occlusion and stylized content conservatively

## Algorithm F: Temporal Consistency

- Objective: detect instability across video frames
- Inputs: sampled video frames and motion vectors
- Outputs: temporal anomaly score and affected intervals
- Logic flow:
  1. sample frames adaptively
  2. compute optical flow
  3. compare object and texture continuity across windows
  4. score instability clusters
- Optimization methods: adaptive frame sampling, clip chunking
- Scalability approach: batch processing by clip segments on GPU where needed
- Risk mitigation: avoid over-flagging low-light or heavily compressed video

## Algorithm G: Ensemble Scoring

- Objective: combine independent signals into final verdict and confidence
- Inputs: per-signal scores, calibration data, media context
- Outputs: final verdict, confidence, uncertainty band, rationale summary
- Logic flow:
  1. validate signal availability
  2. normalize scores
  3. apply context-aware weights
  4. compute aggregate probability
  5. route to `ai`, `real`, or `uncertain`
- Optimization methods: precomputed calibration tables
- Scalability approach: lightweight aggregation after worker completion
- Risk mitigation: thresholding tuned to minimize harmful false positives

### Pseudocode

```text
function compute_ensemble(signal_scores, context):
  normalized = normalize_scores(signal_scores, context)
  weighted = apply_weights(normalized, context)
  probability = aggregate(weighted)
  verdict = assign_verdict(probability, uncertainty_band)
  return verdict, probability
```

## Algorithm H: Explanation Synthesis

- Objective: generate readable explanations grounded only in evidence
- Inputs: final verdict, signal evidence, thresholds, methodology version
- Outputs: structured explanation payload
- Logic flow:
  1. select top contributing signals
  2. convert signal evidence to human-readable claims
  3. include uncertainty or limitations
  4. generate sectioned explanation
- Optimization methods: deterministic templates before LLM augmentation
- Scalability approach: low-cost rule-based generation for MVP
- Risk mitigation: prohibit unsupported causal claims

## 3. Flow Diagram

```text
Upload
  -> validation
  -> scan record creation
  -> signal workers run in parallel
      -> frequency
      -> neural
      -> metadata
      -> noise fingerprint
      -> anatomy
      -> temporal (video only)
  -> ensemble scoring
  -> attribution thresholding
  -> explanation synthesis
  -> persistence
  -> UI / API delivery
```

## 4. Data Feedback Loop

1. capture uncertain and disputed cases
2. route for human review
3. label outcomes where possible
4. feed benchmark and retraining pipeline
5. update calibration and fingerprint database

## 5. Scalability Strategy

- keep deterministic signals CPU-accessible
- reserve GPUs for heavy inference and video
- cache repeated file hashes
- separate image and video worker queues
- version fingerprint datasets independently from classifier models

## 6. Risk Register For Intelligence Layer

- dataset bias and drift
- overconfident calibration
- attribution instability on new model releases
- explanation mismatch with underlying evidence
- adversarial evasion over time

## 7. Recommendations

1. Start with deterministic + neural + ensemble for image MVP.
2. Treat attribution as a gated premium capability, not a guaranteed output.
3. Use rule-based explanation generation before introducing LLM-generated language.
4. Maintain a formal benchmark suite before public claims about performance.

