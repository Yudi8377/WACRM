package com.wacrm.android

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.app.PendingIntent
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Base64
import org.json.JSONObject
import java.util.Locale
import android.view.View
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import android.webkit.PermissionRequest
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineContainer: LinearLayout

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var printWebView: WebView? = null
    private var pendingBluetoothPrint: Pair<String, String>? = null
    private var pendingUsbPrint: Pair<ByteArray, String>? = null
    private var usbReceiverRegistered: Boolean = false
    private var textToSpeech: TextToSpeech? = null
    private var ttsReady: Boolean = false
    private var pendingSpeech: Pair<String, String>? = null

    private val usbPermissionAction = "com.wacrm.android.USB_PRINTER_PERMISSION"

    private val usbPermissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != usbPermissionAction) return
            val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
            val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            }
            val job = pendingUsbPrint
            pendingUsbPrint = null
            if (granted && device != null && job != null) {
                sendBytesToUsbDevice(device, job.first, job.second)
            } else if (!granted) {
                Toast.makeText(
                    this@MainActivity,
                    "Izin perangkat USB OTG ditolak. Sambungkan ulang kabel USB-C / Micro-USB lalu izinkan akses printer.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private val voiceRecognizerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == Activity.RESULT_OK) {
                val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                val transcript = matches?.firstOrNull()?.trim()
                if (!transcript.isNullOrEmpty()) {
                    val quoted = JSONObject.quote(transcript)
                    webView.evaluateJavascript(
                        "window.__wacrmOnVoiceResult && window.__wacrmOnVoiceResult($quoted);",
                        null
                    )
                    return@registerForActivityResult
                }
            }
            webView.evaluateJavascript(
                "window.__wacrmOnVoiceError && window.__wacrmOnVoiceError('cancelled');",
                null
            )
        }

    private val mediaPermissionsLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            val req = pendingWebPermissionRequest
            pendingWebPermissionRequest = null
            if (req != null) {
                val allGranted = results.values.all { it }
                if (allGranted) req.grant(req.resources) else req.deny()
            }
        }

    private val bluetoothPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val job = pendingBluetoothPrint
            pendingBluetoothPrint = null
            if (granted && job != null) {
                printBluetoothEscPos(job.first, job.second)
            } else if (!granted) {
                Toast.makeText(
                    this,
                    "Izin Bluetooth diperlukan untuk mencetak ke printer thermal.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

    private val prefs by lazy {
        getSharedPreferences("wacrm_android_prefs", Context.MODE_PRIVATE)
    }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback ?: return@registerForActivityResult
            filePathCallback = null
            val uris = if (result.resultCode == Activity.RESULT_OK) {
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            } else {
                null
            }
            callback.onReceiveValue(uris)
        }

    private fun getBaseUrl(): String {
        val saved = prefs.getString("server_base_url", null)
        return saved?.let { UrlValidator.normalizeBaseUrl(it) } ?: BuildConfig.WACRM_BASE_URL
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.wacrm_webview)
        swipeRefresh = findViewById(R.id.swipe_refresh)
        progressBar = findViewById(R.id.loading_progress)
        offlineContainer = findViewById(R.id.offline_container)

        findViewById<Button>(R.id.btn_retry).setOnClickListener {
            loadInitialPage()
        }
        findViewById<Button>(R.id.btn_server_settings).setOnClickListener {
            showServerSettingsDialog()
        }

        configureWebView()
        configureSwipeRefresh()
        configureBackNavigation()
        initTextToSpeech()

        ContextCompat.registerReceiver(
            this,
            usbPermissionReceiver,
            IntentFilter(usbPermissionAction),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        usbReceiverRegistered = true

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            loadInitialPage()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadsImagesAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = true
            allowFileAccess = false
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString WACRM-Android/${BuildConfig.VERSION_NAME}"
        }

        webView.addJavascriptInterface(WacrmJsBridge(this), "WACRMAndroid")

        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            if (!url.startsWith("https://")) return@setDownloadListener
            try {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimetype)
                    addRequestHeader("cookie", CookieManager.getInstance().getCookie(url))
                    addRequestHeader("User-Agent", userAgent)
                    setDescription("Mengunduh file dari WACRM")
                    val filename = URLUtil.guessFileName(url, contentDisposition, mimetype)
                    setTitle(filename)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                }
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, "Mengunduh file ke folder Downloads...", Toast.LENGTH_SHORT).show()
            } catch (_: Exception) {
                Toast.makeText(this, "Tidak dapat memulai unduhan file.", Toast.LENGTH_SHORT).show()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
                progressBar.progress = newProgress
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent() ?: return false
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback = null
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val originUrl = request.origin?.toString() ?: ""
                if (originUrl.isNotEmpty() && !UrlValidator.isSameOriginHost(originUrl, getBaseUrl())) {
                    request.deny()
                    return
                }
                val needed = mutableListOf<String>()
                if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED
                ) {
                    needed.add(Manifest.permission.CAMERA)
                }
                if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
                ) {
                    needed.add(Manifest.permission.RECORD_AUDIO)
                }
                if (needed.isNotEmpty()) {
                    pendingWebPermissionRequest = request
                    mediaPermissionsLauncher.launch(needed.toTypedArray())
                } else {
                    request.grant(request.resources)
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (UrlValidator.isSameOriginHost(url, getBaseUrl())) {
                        return false
                    }
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (_: Exception) {
                    false
                }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                offlineContainer.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                CookieManager.getInstance().flush()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    swipeRefresh.isRefreshing = false
                    webView.visibility = View.GONE
                    offlineContainer.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun configureSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.wacrm_emerald)
        swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            webView.canScrollVertically(-1)
        }
        swipeRefresh.setOnRefreshListener {
            if (isOnline()) {
                webView.reload()
            } else {
                swipeRefresh.isRefreshing = false
                Toast.makeText(this, "Tidak ada koneksi internet.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        )
    }

    private fun loadInitialPage() {
        if (!isOnline()) {
            webView.visibility = View.GONE
            offlineContainer.visibility = View.VISIBLE
            return
        }
        offlineContainer.visibility = View.GONE
        webView.visibility = View.VISIBLE
        val deepPath = UrlValidator.safeDeepLinkPath(intent?.data?.path)
        webView.loadUrl("${getBaseUrl()}$deepPath")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val deepPath = UrlValidator.safeDeepLinkPath(intent.data?.path)
        if (deepPath.isNotEmpty() && isOnline()) {
            webView.loadUrl("${getBaseUrl()}$deepPath")
        }
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    fun printCurrentWebView(title: String) {
        try {
            val printManager = getSystemService(Context.PRINT_SERVICE) as PrintManager
            val adapter = webView.createPrintDocumentAdapter(title)
            printManager.print(title, adapter, PrintAttributes.Builder().build())
        } catch (_: Exception) {
            Toast.makeText(this, "Gagal membuka layanan cetak WiFi Android.", Toast.LENGTH_LONG).show()
        }
    }

    fun printHtmlDocument(title: String, html: String) {
        try {
            val helper = WebView(this)
            helper.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    val printManager = getSystemService(Context.PRINT_SERVICE) as PrintManager
                    val adapter = view.createPrintDocumentAdapter(title)
                    printManager.print(title, adapter, PrintAttributes.Builder().build())
                    printWebView = null
                }
            }
            printWebView = helper
            helper.loadDataWithBaseURL(getBaseUrl(), html, "text/html", "UTF-8", null)
        } catch (_: Exception) {
            Toast.makeText(this, "Gagal membuka layanan cetak WiFi Android.", Toast.LENGTH_LONG).show()
        }
    }

    @SuppressLint("MissingPermission")
    fun printBluetoothEscPos(base64Payload: String, jobName: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val hasPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
            if (!hasPermission) {
                pendingBluetoothPrint = Pair(base64Payload, jobName)
                bluetoothPermissionLauncher.launch(Manifest.permission.BLUETOOTH_CONNECT)
                return
            }
        }

        val btManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = btManager?.adapter
        if (adapter == null || !adapter.isEnabled) {
            Toast.makeText(
                this,
                "Aktifkan Bluetooth dan pasangkan printer thermal terlebih dahulu di Pengaturan Android.",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        val bonded: List<BluetoothDevice> = try {
            adapter.bondedDevices?.toList() ?: emptyList()
        } catch (_: SecurityException) {
            emptyList()
        }

        if (bonded.isEmpty()) {
            Toast.makeText(
                this,
                "Belum ada printer Bluetooth yang terpasang (paired) pada ponsel ini.",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        val bytes = try {
            Base64.decode(base64Payload, Base64.DEFAULT)
        } catch (_: Exception) {
            Toast.makeText(this, "Payload ESC/POS tidak valid.", Toast.LENGTH_SHORT).show()
            return
        }

        if (bonded.size == 1) {
            sendBytesToBluetoothDevice(bonded[0], bytes, jobName)
            return
        }

        val labels = bonded.map { dev ->
            val devName = try {
                dev.name ?: dev.address
            } catch (_: SecurityException) {
                dev.address
            }
            "$devName (${dev.address})"
        }.toTypedArray()

        AlertDialog.Builder(this)
            .setTitle("Pilih Printer Thermal Bluetooth")
            .setItems(labels) { _, which ->
                sendBytesToBluetoothDevice(bonded[which], bytes, jobName)
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    @SuppressLint("MissingPermission")
    private fun sendBytesToBluetoothDevice(device: BluetoothDevice, bytes: ByteArray, jobName: String) {
        Toast.makeText(this, "Mencetak $jobName ke printer Bluetooth...", Toast.LENGTH_SHORT).show()
        Thread {
            val sppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
            var socket: android.bluetooth.BluetoothSocket? = null
            try {
                socket = device.createRfcommSocketToServiceRecord(sppUuid)
                socket.connect()
                socket.outputStream.use { os ->
                    os.write(bytes)
                    os.flush()
                }
                runOnUiThread {
                    Toast.makeText(this, "Cetak thermal Bluetooth berhasil ($jobName).", Toast.LENGTH_LONG).show()
                }
            } catch (err: Exception) {
                runOnUiThread {
                    Toast.makeText(
                        this,
                        "Gagal mencetak via Bluetooth: ${err.localizedMessage ?: "Pastikan printer menyala"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                try {
                    socket?.close()
                } catch (_: Exception) {
                    // ignore close error
                }
            }
        }.start()
    }

    /**
     * Direct USB-C / Micro-USB OTG ESC/POS Printing via Android UsbManager.
     * Supports Thermal 58mm/80mm, Label QR printers, and EDC USB printers.
     */
    fun printUsbEscPos(base64Payload: String, jobName: String) {
        val usbManager = getSystemService(Context.USB_SERVICE) as? UsbManager
        if (usbManager == null) {
            Toast.makeText(this, "Layanan USB Host OTG tidak tersedia di perangkat ini.", Toast.LENGTH_LONG).show()
            return
        }

        val devices = usbManager.deviceList?.values?.toList() ?: emptyList()
        if (devices.isEmpty()) {
            Toast.makeText(
                this,
                "Tidak ada printer USB terdeteksi. Pastikan kabel USB-C / Micro-USB OTG tersambung & OTG aktif di Pengaturan HP.",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        val bytes = try {
            Base64.decode(base64Payload, Base64.DEFAULT)
        } catch (_: Exception) {
            Toast.makeText(this, "Data cetak ESC/POS USB tidak valid.", Toast.LENGTH_SHORT).show()
            return
        }

        // Prioritize USB Printer Class (0x07), otherwise pick first device with bulk OUT endpoint
        val targetDevice = devices.firstOrNull { findUsbPrinterEndpoint(it) != null }
        if (targetDevice == null) {
            Toast.makeText(
                this,
                "Perangkat USB terdeteksi tetapi bukan printer ESC/POS. Untuk printer Inkjet/LaserJet USB, gunakan tombol 'Inkjet / LaserJet / AirPrint'.",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        if (usbManager.hasPermission(targetDevice)) {
            sendBytesToUsbDevice(targetDevice, bytes, jobName)
            return
        }

        pendingUsbPrint = Pair(bytes, jobName)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val permissionIntent = PendingIntent.getBroadcast(
            this,
            0,
            Intent(usbPermissionAction).setPackage(packageName),
            flags
        )
        usbManager.requestPermission(targetDevice, permissionIntent)
    }

    private fun findUsbPrinterEndpoint(device: UsbDevice): Pair<UsbInterface, UsbEndpoint>? {
        var fallback: Pair<UsbInterface, UsbEndpoint>? = null
        for (i in 0 until device.interfaceCount) {
            val usbInterface = device.getInterface(i)
            for (e in 0 until usbInterface.endpointCount) {
                val ep = usbInterface.getEndpoint(e)
                if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                    if (usbInterface.interfaceClass == UsbConstants.USB_CLASS_PRINTER) {
                        return Pair(usbInterface, ep)
                    }
                    if (fallback == null) {
                        fallback = Pair(usbInterface, ep)
                    }
                }
            }
        }
        return fallback
    }

    private fun sendBytesToUsbDevice(device: UsbDevice, bytes: ByteArray, jobName: String) {
        val usbManager = getSystemService(Context.USB_SERVICE) as? UsbManager ?: return
        val pair = findUsbPrinterEndpoint(device)
        if (pair == null) {
            Toast.makeText(this, "Endpoint cetak USB OTG tidak ditemukan.", Toast.LENGTH_LONG).show()
            return
        }
        Toast.makeText(this, "Mencetak $jobName melalui kabel USB OTG...", Toast.LENGTH_SHORT).show()
        Thread {
            val (usbInterface, outEndpoint) = pair
            val connection = usbManager.openDevice(device)
            if (connection == null) {
                runOnUiThread {
                    Toast.makeText(this, "Gagal membuka koneksi printer USB OTG.", Toast.LENGTH_LONG).show()
                }
                return@Thread
            }
            try {
                if (!connection.claimInterface(usbInterface, true)) {
                    throw IllegalStateException("Interface printer USB sedang digunakan.")
                }
                val chunkSize = 4096
                var offset = 0
                while (offset < bytes.size) {
                    val len = minOf(chunkSize, bytes.size - offset)
                    val chunk = bytes.copyOfRange(offset, offset + len)
                    val written = connection.bulkTransfer(outEndpoint, chunk, chunk.size, 5000)
                    if (written < 0) {
                        throw IllegalStateException("Transfer USB OTG terputus pada byte $offset.")
                    }
                    offset += len
                }
                runOnUiThread {
                    Toast.makeText(
                        this,
                        "Cetak USB-C / Micro-USB OTG berhasil ($jobName).",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (err: Exception) {
                runOnUiThread {
                    Toast.makeText(
                        this,
                        "Gagal cetak USB OTG: ${err.localizedMessage ?: "Periksa kabel & daya printer"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                try {
                    connection.releaseInterface(usbInterface)
                    connection.close()
                } catch (_: Exception) {
                    // ignore close error
                }
            }
        }.start()
    }

    fun showServerSettingsDialog() {
        val input = EditText(this).apply {
            setText(getBaseUrl())
            hint = "https://wacrm-seven-dusky.vercel.app"
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(this)
            .setTitle("Pengaturan Server WACRM")
            .setMessage("Masukkan URL server HTTPS WACRM Anda atau pilih pintasan cepat:")
            .setView(input)
            .setPositiveButton("Simpan & Muat") { _, _ ->
                val normalized = UrlValidator.normalizeBaseUrl(input.text.toString())
                if (normalized == null) {
                    Toast.makeText(this, "URL harus diawali https:// yang valid.", Toast.LENGTH_LONG).show()
                } else {
                    prefs.edit().putString("server_base_url", normalized).apply()
                    webView.loadUrl(normalized)
                }
            }
            .setNeutralButton("Mode Demo") { _, _ ->
                webView.loadUrl("${getBaseUrl()}/demo")
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun initTextToSpeech() {
        if (textToSpeech != null) return
        textToSpeech = TextToSpeech(this) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        runOnUiThread {
                            webView.evaluateJavascript(
                                "window.__wacrmOnSpeechEnd && window.__wacrmOnSpeechEnd();",
                                null
                            )
                        }
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        runOnUiThread {
                            webView.evaluateJavascript(
                                "window.__wacrmOnSpeechEnd && window.__wacrmOnSpeechEnd();",
                                null
                            )
                        }
                    }
                })
                val queued = pendingSpeech
                pendingSpeech = null
                if (queued != null) {
                    runOnUiThread { speakCompanionText(queued.first, queued.second) }
                }
            }
        }
    }

    private fun resolveBestTtsLocale(tts: TextToSpeech, lang: String) {
        val candidates = listOf(
            Locale.forLanguageTag(lang),
            Locale("id", "ID"),
            Locale("in", "ID"),
            Locale("ms", "MY"),
            Locale.getDefault()
        )
        for (loc in candidates) {
            val res = tts.setLanguage(loc)
            if (res != TextToSpeech.LANG_MISSING_DATA && res != TextToSpeech.LANG_NOT_SUPPORTED) {
                return
            }
        }
    }

    fun speakCompanionText(text: String, lang: String) {
        if (textToSpeech == null) {
            pendingSpeech = Pair(text, lang)
            initTextToSpeech()
            return
        }
        if (!ttsReady) {
            pendingSpeech = Pair(text, lang)
            return
        }
        try {
            val tts = textToSpeech ?: return
            resolveBestTtsLocale(tts, lang)
            tts.setSpeechRate(0.96f)
            tts.setPitch(1.03f)
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "wacrm-companion-${System.currentTimeMillis()}")
        } catch (_: Exception) {
            webView.evaluateJavascript(
                "window.__wacrmOnSpeechEnd && window.__wacrmOnSpeechEnd();",
                null
            )
        }
    }

    fun stopCompanionSpeech() {
        try {
            textToSpeech?.stop()
        } catch (_: Exception) {
            // ignore
        }
    }

    private fun allowedBiometricAuthenticators(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.BIOMETRIC_WEAK or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        } else {
            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        }
    }

    fun isBiometricAuthAvailable(): Boolean {
        val manager = BiometricManager.from(this)
        val status = manager.canAuthenticate(allowedBiometricAuthenticators())
        return status == BiometricManager.BIOMETRIC_SUCCESS
    }

    fun showBiometricLoginPrompt(title: String, subtitle: String) {
        val executor = ContextCompat.getMainExecutor(this)
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                webView.evaluateJavascript(
                    "window.__wacrmBiometricResult && window.__wacrmBiometricResult(true, 'verified');",
                    null
                )
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                val quoted = JSONObject.quote(errString.toString())
                webView.evaluateJavascript(
                    "window.__wacrmBiometricResult && window.__wacrmBiometricResult(false, $quoted);",
                    null
                )
            }

            override fun onAuthenticationFailed() {
                Toast.makeText(
                    this@MainActivity,
                    "Sidik jari atau wajah tidak cocok. Silakan coba lagi.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        val prompt = BiometricPrompt(this, executor, callback)
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(allowedBiometricAuthenticators())
            .build()
        prompt.authenticate(info)
    }

    fun startVoiceRecognition(lang: String) {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Bicara dengan AI Companion WACRM...")
            }
            voiceRecognizerLauncher.launch(intent)
        } catch (_: Exception) {
            val msg = JSONObject.quote("Layanan Google Voice / Pengenalan Suara belum aktif di HP ini.")
            webView.evaluateJavascript(
                "window.__wacrmOnVoiceError && window.__wacrmOnVoiceError($msg);",
                null
            )
            Toast.makeText(this, "Layanan pengenalan suara belum aktif di HP ini.", Toast.LENGTH_LONG).show()
        }
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onDestroy() {
        if (usbReceiverRegistered) {
            try {
                unregisterReceiver(usbPermissionReceiver)
            } catch (_: Exception) {
                // ignore
            }
            usbReceiverRegistered = false
        }
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
