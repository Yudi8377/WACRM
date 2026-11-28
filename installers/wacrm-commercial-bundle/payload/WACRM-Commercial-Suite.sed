[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=Instal WACRM Commercial Suite v5.3.1 (Client App + Publisher HQ + Auto-Fix Izin Kamera/Mikrofon)?
DisplayLicense=
FinishMessage=WACRM Commercial Suite v5.3.1 + Izin Kamera/Mikrofon otomatis siap digunakan!
TargetName=WACRM-Commercial-Suite-v5.3.1-Setup.exe
FriendlyName=WACRM Commercial Suite v5.3.1 Offline Setup
AppLaunched=cmd /c powershell -NoProfile -ExecutionPolicy Bypass -File Setup-WACRM-Commercial.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0="Setup-WACRM-Commercial.ps1"
FILE1="Fix-WACRM-Hardware-Permissions.ps1"
FILE2="Uninstall-WACRM-Commercial.ps1"
FILE3="WacrmCommercialLauncher.cs"
FILE4="wacrm-commercial.ico"
[SourceFiles]
SourceFiles0=payload\
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
%FILE3%=
%FILE4%=
