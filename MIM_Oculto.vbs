Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\.mine\manager"
WshShell.Run "cmd /c npm run start:standalone", 0, false

