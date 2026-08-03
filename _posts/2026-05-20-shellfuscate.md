---
layout: post
title: "ShellFuscate: A Shellcode Obfuscator and Encryptor"
date: 2026-05-20
tags: [PE Headers]
description: "ShellFuscate is a tool for ofuscating and optionally encrypting shellcode to bypass antivirus controls."
---

Shellcode is often the functional payload embedded within malware. However, antivirus software has a very easy time identifying malicious shellcode via their signature. Here I want to talk about what a signature is, how antivirus software aquires and uses that signature, and an overview of a tool that attempts to bypass signature based detection.

