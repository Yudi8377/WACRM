using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

namespace WacrmCommercialSuite
{
    internal static class Program
    {
        private const string ClientAppUrl = "https://wacrm-seven-dusky.vercel.app";
        private const string PublisherUrl = "https://wacrm-publisher-hq.vercel.app";
        private const string SuiteVersion = "5.3.1";

        [STAThread]
        private static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string mode = args.Length > 0 ? (args[0] ?? "").Trim().ToLowerInvariant() : "--client";

            // Always self-heal Windows & isolated profile permissions on startup
            string baseDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "WACRM Commercial Suite"
            );
            bool policyOk = EnsureWindowsPrivacyAndBrowserPolicies();
            bool clientPrefOk = EnsureProfileMediaPermissions(Path.Combine(baseDir, "ClientProfile"));
            bool pubPrefOk = EnsureProfileMediaPermissions(Path.Combine(baseDir, "PublisherProfile"));

            if (mode == "--doctor")
            {
                string browser = FindChromiumBrowser() ?? "Browser default sistem";
                MessageBox.Show(
                    "WACRM v" + SuiteVersion + " - Hardware Permission Doctor\n\n" +
                    "1. Izin Privasi Windows (Kamera & Mikrofon): " + (policyOk ? "AKTIF (Allow)" : "Periksa Pengaturan Privasi Windows") + "\n" +
                    "2. Profil WACRM Client App (Kamera/Mic/Notifikasi): " + (clientPrefOk ? "TEROTORISASI OTOMATIS" : "Perlu restart aplikasi") + "\n" +
                    "3. Profil WACRM Publisher HQ: " + (pubPrefOk ? "TEROTORISASI OTOMATIS" : "Perlu restart aplikasi") + "\n" +
                    "4. Engine Desktop Terdeteksi: " + browser + "\n\n" +
                    "Domain Terdaftar:\n- " + ClientAppUrl + "\n- " + PublisherUrl + "\n\n" +
                    "Tips: Tutup semua jendela WACRM/Edge/Chrome yang masih terbuka lalu buka ulang WACRM agar perubahan izin langsung berlaku.",
                    "WACRM Hardware Permission Doctor v" + SuiteVersion,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                return;
            }

            bool isPublisher = mode == "--publisher";
            string targetUrl = isPublisher ? PublisherUrl : ClientAppUrl;
            string appLabel = isPublisher
                ? "WACRM Publisher HQ v" + SuiteVersion
                : "WACRM Commercial OS v" + SuiteVersion;

            if (!EnsureOnlineConnectivity(targetUrl, appLabel))
            {
                return;
            }

            string profileDir = Path.Combine(baseDir, isPublisher ? "PublisherProfile" : "ClientProfile");
            try { Directory.CreateDirectory(profileDir); } catch { }

            string browserExe = FindChromiumBrowser();
            if (!string.IsNullOrEmpty(browserExe))
            {
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = browserExe,
                        Arguments = string.Format(
                            "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1420,880 --disable-features=TranslateUI --no-first-run --no-default-browser-check",
                            targetUrl,
                            profileDir
                        ),
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                    return;
                }
                catch
                {
                    // Fallback to system browser below
                }
            }

            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetUrl,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Tidak dapat membuka " + appLabel + ":\n" + ex.Message + "\n\nURL: " + targetUrl,
                    appLabel,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static bool EnsureWindowsPrivacyAndBrowserPolicies()
        {
            bool ok = true;
            string[] consentKeys = new[]
            {
                @"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam",
                @"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam\NonPackaged",
                @"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone",
                @"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone\NonPackaged"
            };
            foreach (string keyPath in consentKeys)
            {
                try
                {
                    using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath))
                    {
                        if (key != null) key.SetValue("Value", "Allow", RegistryValueKind.String);
                    }
                }
                catch
                {
                    ok = false;
                }
            }

            string[] policyRoots = new[]
            {
                @"Software\Policies\Microsoft\Edge",
                @"Software\Policies\Google\Chrome"
            };
            string[] urlLists = new[]
            {
                "VideoCaptureAllowedUrls",
                "AudioCaptureAllowedUrls",
                "NotificationsAllowedForUrls"
            };
            foreach (string root in policyRoots)
            {
                try
                {
                    using (RegistryKey rKey = Registry.CurrentUser.CreateSubKey(root))
                    {
                        if (rKey != null)
                        {
                            rKey.SetValue("VideoCaptureAllowed", 1, RegistryValueKind.DWord);
                            rKey.SetValue("AudioCaptureAllowed", 1, RegistryValueKind.DWord);
                        }
                    }
                    foreach (string list in urlLists)
                    {
                        using (RegistryKey lKey = Registry.CurrentUser.CreateSubKey(root + @"\" + list))
                        {
                            if (lKey != null)
                            {
                                lKey.SetValue("1", ClientAppUrl, RegistryValueKind.String);
                                lKey.SetValue("2", PublisherUrl, RegistryValueKind.String);
                            }
                        }
                    }
                }
                catch
                {
                    // Non-fatal if locked by corporate admin
                }
            }
            return ok;
        }

        private static bool EnsureProfileMediaPermissions(string profileDir)
        {
            try
            {
                string defaultDir = Path.Combine(profileDir, "Default");
                Directory.CreateDirectory(defaultDir);
                string prefPath = Path.Combine(defaultDir, "Preferences");
                if (!File.Exists(prefPath))
                {
                    string rules =
                        "\"" + ClientAppUrl + ":443,*\":{\"last_modified\":\"13380000000000000\",\"setting\":1}," +
                        "\"" + ClientAppUrl + ",*\":{\"last_modified\":\"13380000000000000\",\"setting\":1}," +
                        "\"" + PublisherUrl + ":443,*\":{\"last_modified\":\"13380000000000000\",\"setting\":1}," +
                        "\"" + PublisherUrl + ",*\":{\"last_modified\":\"13380000000000000\",\"setting\":1}";
                    string json =
                        "{\"profile\":{\"content_settings\":{\"exceptions\":{" +
                        "\"media_stream_camera\":{" + rules + "}," +
                        "\"media_stream_mic\":{" + rules + "}," +
                        "\"notifications\":{" + rules + "}" +
                        "}}}}";
                    File.WriteAllText(prefPath, json, new UTF8Encoding(false));
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static bool EnsureOnlineConnectivity(string url, string appLabel)
        {
            while (true)
            {
                try
                {
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)768 | SecurityProtocolType.Tls;
                    var req = (HttpWebRequest)WebRequest.Create(url.TrimEnd('/') + "/api/health");
                    req.Method = "GET";
                    req.Timeout = 5500;
                    req.ReadWriteTimeout = 5500;
                    using (var res = (HttpWebResponse)req.GetResponse())
                    {
                        if ((int)res.StatusCode >= 200 && (int)res.StatusCode < 500)
                        {
                            return true;
                        }
                    }
                }
                catch
                {
                    // Prompt user gracefully
                }

                var choice = MessageBox.Show(
                    appLabel + " beroperasi secara ONLINE untuk sinkronisasi real-time database, lisensi, kasir & AI.\n\n" +
                    "Koneksi internet ke " + url + " belum terdeteksi.\n\n" +
                    "- Klik RETRY (Coba Lagi) setelah internet aktif\n" +
                    "- Klik IGNORE (Abaikan) untuk tetap membuka aplikasi\n" +
                    "- Klik ABORT (Batal) untuk keluar",
                    appLabel + " - Pemeriksaan Koneksi Online",
                    MessageBoxButtons.AbortRetryIgnore,
                    MessageBoxIcon.Warning
                );

                if (choice == DialogResult.Retry) continue;
                if (choice == DialogResult.Ignore) return true;
                return false;
            }
        }

        private static string FindChromiumBrowser()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidates = new[]
            {
                Path.Combine(pfx86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(pfx86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(local, @"BraveSoftware\Brave-Browser\Application\brave.exe")
            };

            foreach (string path in candidates)
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    return path;
                }
            }
            return null;
        }
    }
}
