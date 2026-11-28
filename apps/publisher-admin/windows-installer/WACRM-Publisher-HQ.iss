; Inno Setup Script — WACRM Publisher HQ v5.3 Offline Windows Installer (Online Operation)
[Setup]
AppId={{8F4C7B2A-5D3E-4E9B-B102-5300WACRMHQ}
AppName=WACRM Publisher HQ
AppVersion=5.3.0
AppPublisher=PT WACRM Digital Nusantara
AppPublisherURL=https://wacrm-publisher-hq.vercel.app
AppSupportURL=https://wacrm-publisher-hq.vercel.app
DefaultDirName={localappdata}\WACRM Publisher HQ
DefaultGroupName=WACRM Publisher HQ
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=WACRM-Publisher-HQ-v5.3-Setup
SetupIconFile=payload\wacrm-publisher.ico
UninstallDisplayIcon={app}\wacrm-publisher.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Buat ikon WACRM Publisher HQ di Desktop"; GroupDescription: "Shortcut:"; Flags: checkedonce

[Files]
Source: "dist\WACRM-Publisher-HQ.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\wacrm-publisher.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "README-INSTALL-WINDOWS.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\WACRM Publisher HQ v5.3"; Filename: "{app}\WACRM-Publisher-HQ.exe"; IconFilename: "{app}\wacrm-publisher.ico"
Name: "{group}\WACRM Client App v5.3"; Filename: "{app}\WACRM-Publisher-HQ.exe"; Parameters: "--client"; IconFilename: "{app}\wacrm-publisher.ico"
Name: "{group}\Uninstall WACRM Publisher HQ"; Filename: "{uninstallexe}"
Name: "{autodesktop}\WACRM Publisher HQ"; Filename: "{app}\WACRM-Publisher-HQ.exe"; IconFilename: "{app}\wacrm-publisher.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\WACRM-Publisher-HQ.exe"; Description: "Buka WACRM Publisher HQ sekarang (memerlukan internet aktif)"; Flags: nowait postinstall skipifsilent
