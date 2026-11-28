; Inno Setup Script — WACRM Commercial Suite v5.3.1 (Client App + Publisher HQ + Hardware Permission Auto-Fix)
[Setup]
AppId={{9A3E5D10-5310-4C2A-9B01-WACRMSUITE531}
AppName=WACRM Commercial Suite
AppVersion=5.3.1
AppPublisher=PT WACRM Digital Nusantara
AppPublisherURL=https://wacrm-seven-dusky.vercel.app
AppSupportURL=https://wacrm-publisher-hq.vercel.app
DefaultDirName={localappdata}\WACRM Commercial Suite
DefaultGroupName=WACRM Commercial Suite
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=WACRM-Commercial-Suite-v5.3.1-Windows-Setup
SetupIconFile=payload\wacrm-commercial.ico
UninstallDisplayIcon={app}\wacrm-commercial.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Buat shortcut WACRM Commercial OS & Publisher HQ di Desktop"; GroupDescription: "Shortcut:"; Flags: checkedonce
Name: "autofixperm"; Description: "Aktifkan otomatis izin Kamera, Mikrofon & Notifikasi Windows + Browser"; GroupDescription: "Izin Perangkat Keras:"; Flags: checkedonce

[Files]
Source: "dist\WACRM-Suite-Launcher.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\wacrm-commercial.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\Fix-WACRM-Hardware-Permissions.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "README-GO-COMMERCIAL-INSTALLER.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\WACRM Commercial OS v5.3"; Filename: "{app}\WACRM-Suite-Launcher.exe"; Parameters: "--client"; IconFilename: "{app}\wacrm-commercial.ico"
Name: "{group}\WACRM Publisher HQ v5.3"; Filename: "{app}\WACRM-Suite-Launcher.exe"; Parameters: "--publisher"; IconFilename: "{app}\wacrm-commercial.ico"
Name: "{group}\WACRM Perbaiki Izin Kamera & Mikrofon"; Filename: "{app}\WACRM-Suite-Launcher.exe"; Parameters: "--doctor"; IconFilename: "{app}\wacrm-commercial.ico"
Name: "{group}\Uninstall WACRM Commercial Suite"; Filename: "{uninstallexe}"
Name: "{autodesktop}\WACRM Commercial OS v5.3"; Filename: "{app}\WACRM-Suite-Launcher.exe"; Parameters: "--client"; IconFilename: "{app}\wacrm-commercial.ico"; Tasks: desktopicon
Name: "{autodesktop}\WACRM Publisher HQ v5.3"; Filename: "{app}\WACRM-Suite-Launcher.exe"; Parameters: "--publisher"; IconFilename: "{app}\wacrm-commercial.ico"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\Fix-WACRM-Hardware-Permissions.ps1"" -Quiet"; Flags: runhidden waituntilterminated; Tasks: autofixperm
Filename: "{app}\WACRM-Suite-Launcher.exe"; Parameters: "--client"; Description: "Buka WACRM Commercial OS v5.3 sekarang (memerlukan internet aktif)"; Flags: nowait postinstall skipifsilent
