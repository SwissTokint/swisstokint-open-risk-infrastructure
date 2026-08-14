param([Parameter(Mandatory = $true)][string]$TargetsBase64)

$ErrorActionPreference = 'Stop'
$LiteralTarget = @((ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($TargetsBase64)))))

if (-not ('PomRx.NativeStreams' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace PomRx {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct WIN32_FIND_STREAM_DATA {
    public long StreamSize;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 296)]
    public string StreamName;
  }

  public static class NativeStreams {
    private const uint INVALID_FILE_ATTRIBUTES = 0xFFFFFFFF;
    private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x400;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFileAttributesW(string fileName);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFindHandle FindFirstStreamW(
      string fileName, int infoLevel, out WIN32_FIND_STREAM_DATA data, int flags);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool FindNextStreamW(
      SafeFindHandle handle, out WIN32_FIND_STREAM_DATA data);

    public sealed class SafeFindHandle : SafeHandleZeroOrMinusOneIsInvalid {
      private SafeFindHandle() : base(true) {}
      [DllImport("kernel32.dll")]
      private static extern bool FindClose(IntPtr handle);
      protected override bool ReleaseHandle() { return FindClose(handle); }
    }

    public static string[] Enumerate(string path) {
      var names = new List<string>();
      WIN32_FIND_STREAM_DATA data;
      using (var handle = FindFirstStreamW(path, 0, out data, 0)) {
        if (handle.IsInvalid) {
          int firstError = Marshal.GetLastWin32Error();
          if (firstError == 18 || firstError == 38) return names.ToArray();
          throw new Win32Exception(firstError);
        }
        names.Add(data.StreamName);
        while (FindNextStreamW(handle, out data)) names.Add(data.StreamName);
        int error = Marshal.GetLastWin32Error();
        if (error != 18 && error != 38) throw new Win32Exception(error);
      }
      return names.ToArray();
    }

    public static bool IsReparsePoint(string path) {
      uint attributes = GetFileAttributesW(path);
      if (attributes == INVALID_FILE_ATTRIBUTES) throw new Win32Exception(Marshal.GetLastWin32Error());
      return (attributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0;
    }
  }
}
'@
}

$records = @(
  foreach ($targetSpec in $LiteralTarget) {
    $target = if ($targetSpec -is [string]) { $targetSpec } else { [string]$targetSpec.path }
    $checkAds = if ($targetSpec -is [string]) { $true } else { [bool]$targetSpec.check_ads }
    $reparse = [PomRx.NativeStreams]::IsReparsePoint($target)
    $streams = [System.Collections.Generic.List[string]]::new()
    if ($checkAds -and -not $reparse) {
      foreach ($streamName in [PomRx.NativeStreams]::Enumerate($target)) { $streams.Add($streamName) }
    }
    [pscustomobject]@{
      path = $target
      reparse = $reparse
      streams = [string[]]$streams.ToArray()
    }
  }
)
ConvertTo-Json -InputObject $records -Depth 3 -Compress
