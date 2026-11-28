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
InstallPrompt=Instal WACRM Publisher HQ v5.3 (Offline Installer - Operasi Online)?
DisplayLicense=
FinishMessage=WACRM Publisher HQ v5.3 siap digunakan dari Desktop & Start Menu!
TargetName=WACRM-Publisher-HQ-v5.3-Setup.exe
FriendlyName=WACRM Publisher HQ v5.3 Offline Setup
AppLaunched=cmd /c powershell -NoProfile -ExecutionPolicy Bypass -File Setup-WACRM-Publisher-HQ.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0="Setup-WACRM-Publisher-HQ.ps1"
FILE1="Uninstall-WACRM-Publisher-HQ.ps1"
FILE2="WacrmPublisherLauncher.cs"
FILE3="wacrm-publisher.ico"
[SourceFiles]
SourceFiles0=payload\
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
%FILE3%=
