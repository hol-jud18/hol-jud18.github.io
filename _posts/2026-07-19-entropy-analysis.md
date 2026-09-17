---
layout: post
title: "A Deep Dive on Entropy Analysis"
date: 2026-06-20
tags: [PE Headers]
description: "Entropy measures how much information is compressed in a data stream."
---

Entropy is the measure of randomness in data. This metric is useful because real network data in the form of IP addresses, UUIDs, MAC addresses, etc. have specific entropy characteristics. When you format shellcode as network data, it has different characteristics than real data.

Entropy analysis is fantastic because it works against all obfuscation formats.

## What Is Entropy

The mathematical definition of entropy is:

$H(X)=-\sum p(x)\log_2p(x)$

$p(x)$ tells us how likely an event is to happen while $\log_2p(x)$ tells us how much information the outcome contains. As a result, the second term will provide more information if the outcome is less likely to occur. We then calculate $-p(x)\log_2p(x)$ for every possible and add that all together giving us what is essentially the average amount of information.

High entropy means bytes are varied and unpredictable, while low entropy tells us that bytes repeat or follow some patterns.

| Data Type | Entropy | Why |
|---|---|---|
| `00 00 00 00 00...` (nulls) | 0 | Only one unique byte, fully predictable |
| `01 02 03 04 05...` (sequential) | ~7.62 | 256 unique bytes, uniform distribution |
| `ff ff ff ff ff...` (fills) | 0 | Repetitive |
| Random bytes (no pattern) | ~8.0 | Maximum entropy for 8-bit data |
| English text | ~4.7 | Biased toward common letters (e, t, a, etc.) |
| Base64-encoded data | ~6.0 | 64 possible characters, more uniform than text |
| IPv4 strings | ~3–5 | Dependent on actual IP distribution |

## Does Shellcode Have Distinct Entropy

