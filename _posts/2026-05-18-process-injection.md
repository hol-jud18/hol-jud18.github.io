---
layout: post
title: "Process Injection via DLL Injection"
date: 2026-05-18
tags: [Process Injection]
description: "Exploring a process injection technique where we will enumerate running processes and inject a DLL into that process"
---

In this post I would like to explore first how to enumerate running processes, match a target process, and inject a DLL into that process.

The first thing to accomplish is to find all processes running on the machine which brings us to our first challenge.

Windows provides a very userful structure in tlhelp32.h called `PROCESSENTRY32` which is parsed by the tlhelp32.h functions `CreateToolhelp32Snapshot Process32First Process32Next`.

You can learn more about the structure from Microsoft here: [Microsoft Documentation](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32)

