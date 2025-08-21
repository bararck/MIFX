# MIFX-Automation

Automasi testing untuk platform **MIFX** menggunakan **Playwright**. Repository ini berisi script untuk login, dashboard, trading, dan utilitas pendukung.

## 📂 Struktur Project

```

MIFX-AUTOMATION/
│
├─ pages/                  # Page Object Model
│   ├─ BasePage.js
│   ├─ DashboardPage.js
│   ├─ LoginPage.js
│   └─ TradePage.js
│
├─ tests/                  # Test scripts
│   ├─ login.spec.js
│   └─ trade.spec.js
│
├─ utils/                  # Utilities & helper functions
│   ├─ helpers.js
│   └─ TestData.js
│
├─ playwright.config.js    # Konfigurasi Playwright
├─ package.json
├─ package-lock.json
└─ .env                    # Environment variables

````

## ⚡ Fitur

- Login otomatis
- Navigasi Dashboard
- Simulasi trading
- Utility untuk data testing
- Generate report otomatis menggunakan Playwright

## 💻 Instalasi

1. Clone repository ini:

```bash
git clone https://github.com/username/MIFX-Automation.git
cd MIFX-Automation
````

2. Install dependencies:

```bash
npm install
```

3. Install browser dependencies Playwright:

```bash
npx playwright install --with-deps
```

4. Buat file `.env` sesuai kebutuhan environment.

## 🧪 Menjalankan Test

* Menjalankan semua test:

```bash
npm run test
```

* Menjalankan test spesifik:

```bash
npx playwright test tests/login.spec.js
```

* Generate report:

```bash
npx playwright show-report
```

## 🛠️ Struktur Code

* **pages/** → Implementasi Page Object Model untuk tiap halaman.
* **tests/** → Test case automation.
* **utils/** → Fungsi helper dan data testing.
* **playwright.config.js** → Konfigurasi global Playwright (timeout, baseURL, reporter, dll.)

## 📄 Catatan

* Pastikan `.env` berisi credentials untuk login.
* Playwright akan membuat report otomatis di folder `playwright-report/`.

## 📜 License

MIT License © 2025
