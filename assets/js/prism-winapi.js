// Extends Prism's C grammar with Win32 API vocabulary.
// WinAPI function names → token.builtin
// ALL_CAPS identifiers (constants, typedefs, SAL annotations) → token.macro
(function () {
  if (typeof Prism === 'undefined') return;

  var winapiFunctions = /\b(?:CloseHandle|CopyMemory|CreateFile[AW]?|CreateFileMapping[AW]?|CreateProcess[AW]?|CreateRemoteThread(?:Ex)?|CreateThread|CreateToolhelp32Snapshot|DuplicateHandle|EnumProcesses|EnumProcessModules|ExitProcess|ExitThread|FreeLibrary|GetCurrentProcess(?:Id)?|GetCurrentThread(?:Id)?|GetExitCodeProcess|GetExitCodeThread|GetLastError|GetModuleFileName[AW]?|GetModuleHandle(?:Ex)?[AW]?|GetProcAddress|GetProcessHeap|GetThreadContext|HeapAlloc|HeapCreate|HeapDestroy|HeapFree|HeapReAlloc|LoadLibrary(?:Ex)?[AW]?|LocalAlloc|LocalFree|MapViewOfFile|MessageBox[AW]?|Module32(?:First|Next)[AW]?|OpenProcess|OpenThread|Process32(?:First|Next)[AW]?|QueueUserAPC|ReadFile|ReadProcessMemory|RegCloseKey|RegCreateKey(?:Ex)?[AW]?|RegDeleteKey[AW]?|RegOpenKey(?:Ex)?[AW]?|RegQueryValue(?:Ex)?[AW]?|RegSetValue(?:Ex)?[AW]?|ResumeThread|SetLastError|SetThreadContext|ShellExecute[AW]?|Sleep(?:Ex)?|SuspendThread|TerminateProcess|TerminateThread|Thread32(?:First|Next)|UnmapViewOfFile|VirtualAlloc(?:Ex)?|VirtualFree(?:Ex)?|VirtualProtect(?:Ex)?|VirtualQuery(?:Ex)?|WaitForMultipleObjects|WaitForSingleObject|WinExec|WriteFile|WriteProcessMemory|fprintf|memcmp|memcpy|memmove|memset|printf|snprintf|sprintf|strcat|strchr|strcmp|strcpy|strlen|strncmp|strncpy|strstr|wcscat|wcschr|wcscmp|wcscpy|wcslen|wcsncmp|wcsstr|wprintf)\b/;

  var winapiMacros = /\b[A-Z][A-Z0-9_]+\b/;

  function patch() {
    var c = Prism.languages.c;
    if (!c || c.__winapiPatched) return;
    Prism.languages.insertBefore('c', 'function', {
      'winapi-function': { pattern: winapiFunctions, alias: 'builtin' },
      'winapi-macro':    { pattern: winapiMacros,    alias: 'macro'   }
    });
    Prism.languages.c.__winapiPatched = true;
  }

  patch();
  Prism.hooks.add('before-tokenize', function (env) {
    if (env.language === 'c') patch();
  });
})();
