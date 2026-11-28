using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Windows.Forms;

namespace WacrmPublisherHq
{
    internal static class Program
    {
        private const string PublisherUrl = "https://wacrm-publisher-hq.vercel.app";
        private const string ClientAppUrl = "https://wacrm-seven-dusky.vercel.app";

        [STAThread]
        private static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool openClient = args.Length > 0 && string.Equals(args[0], "--client", StringComparison.OrdinalIgnoreCase);
            string targetUrl = openClient ? ClientAppUrl : PublisherUrl;
            string appLabel = openClient ? "WACRM Client App v5.3" : "WACRM Publisher HQ v5.3";

            if (!EnsureOnlineConnectivity(targetUrl, appLabel))
            {
                return;
            }

            string profileDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "WACRM Publisher HQ",
                openClient ? "ClientProfile" : "PublisherProfile"
            );
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
                            "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1420,880 --disable-features=TranslateUI",
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
                    // Fallback to default system browser below
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
                    // Fall through to friendly dialog
                }

                var choice = MessageBox.Show(
                    appLabel + " beroperasi secara ONLINE untuk menyinkronkan lisensi, tenant & data keuangan secara real-time.\n\n" +
                    "Koneksi internet ke " + url + " belum terdeteksi.\n\n" +
                    "- Klik RETRY (Coba Lagi) setelah internet aktif\n" +
                    "- Klik IGNORE (Abaikan) untuk tetap membuka jendela aplikasi\n" +
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
