Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\.mine\manager"
WshShell.Run "cmd /c npx tauri dev", 0, false
