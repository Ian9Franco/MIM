Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\.mine\manager"
WshShell.Run "cmd /c node_modules\.bin\tauri.cmd dev", 0, false

