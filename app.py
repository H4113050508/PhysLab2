
from flask import Flask, render_template, request, jsonify
import math
import re
import sys
from pathlib import Path
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext


def resource_path(relative_path):
    """Resolve templates/static both in source mode and PyInstaller bundle."""
    base_path = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return str(base_path / relative_path)


app = Flask(
    __name__,
    template_folder=resource_path("templates"),
    static_folder=resource_path("static"),
)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
app.config["JSON_SORT_KEYS"] = False


@app.route("/health")
def health():
    return jsonify({"status": "ok", "application": "PhysLab 2.0"})


@app.route("/")
def index():
    return render_template("index.html", modules=list(MODULES.values()) if "MODULES" in globals() else [])


@app.route("/gerak-parabola")
def gerak_parabola():
    return render_template("gerak_parabola.html")


@app.route("/api/gerak-parabola", methods=["POST"])
def hitung_gerak_parabola():
    data = request.get_json(silent=True) or {}

    try:
        v0 = float(data["velocity"])
        sudut = float(data["angle"])
        g = float(data["gravity"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Parameter harus berupa angka."}), 400

    if not all(math.isfinite(n) for n in (v0, sudut, g)):
        return jsonify({"error": "Parameter harus berupa angka yang valid."}), 400

    if not (0 < v0 <= 100):
        return jsonify({"error": "Kecepatan harus lebih dari 0 hingga 100 m/s."}), 400

    if not (0 < sudut < 90):
        return jsonify({"error": "Sudut harus di antara 0 dan 90 derajat."}), 400

    if not (0 < g <= 20):
        return jsonify({"error": "Gravitasi harus lebih dari 0 hingga 20 m/s²."}), 400

    theta = math.radians(sudut)
    vx = v0 * math.cos(theta)
    vy0 = v0 * math.sin(theta)

    waktu_total = 2 * vy0 / g
    tinggi_maks = vy0**2 / (2 * g)
    jarak = vx * waktu_total
    waktu_puncak = vy0 / g

    jumlah_interval = 20
    tabel = []

    for i in range(jumlah_interval + 1):
        t = waktu_total * i / jumlah_interval
        x = vx * t
        y = max(0.0, vy0 * t - 0.5 * g * t**2)
        vy = vy0 - g * t

        tabel.append({
            "time": round(t, 4),
            "x": round(x, 4),
            "y": round(y, 4),
            "vx": round(vx, 4),
            "vy": round(vy, 4)
        })

    return jsonify({
        "initial_vx": round(vx, 4),
        "initial_vy": round(vy0, 4),
        "flight_time": round(waktu_total, 4),
        "time_to_peak": round(waktu_puncak, 4),
        "max_height": round(tinggi_maks, 4),
        "range": round(jarak, 4),
        "data": tabel
    })

@app.route("/api/ukur-gerak-parabola", methods=["POST"])
def ukur_gerak_parabola():
    data = request.get_json(silent=True) or {}

    try:
        v0 = float(data["velocity"])
        sudut = float(data["angle"])
        g = float(data["gravity"])
        t = float(data["time"])
    except (KeyError, TypeError, ValueError):
        return jsonify({
            "error": "Semua parameter harus berupa angka."
        }), 400

    if not all(math.isfinite(n) for n in (v0, sudut, g, t)):
        return jsonify({
            "error": "Parameter harus berupa angka yang valid."
        }), 400

    if not (0 < v0 <= 100):
        return jsonify({"error": "Kecepatan harus lebih dari 0 hingga 100 m/s."}), 400

    if not (0 < sudut < 90):
        return jsonify({"error": "Sudut harus di antara 0 dan 90 derajat."}), 400

    if not (0 < g <= 20):
        return jsonify({"error": "Gravitasi harus lebih dari 0 hingga 20 m/s²."}), 400

    theta = math.radians(sudut)
    vx = v0 * math.cos(theta)
    vy0 = v0 * math.sin(theta)
    waktu_total = 2 * vy0 / g

    if not (0 <= t <= waktu_total):
        return jsonify({
            "error": f"Waktu harus antara 0 dan {waktu_total:.4f} sekon."
        }), 400

    x = vx * t
    y = vy0 * t - 0.5 * g * t**2
    vy = vy0 - g * t

    return jsonify({
        "time": round(t, 6),
        "x": round(x, 6),
        "y": round(max(0.0, y), 6),
        "vx": round(vx, 6),
        "vy": round(vy, 6),
        "flight_time": round(waktu_total, 6)
    })


# Katalog modul PhysLab: halaman praktikum generik dengan perhitungan di Python.
MODULES = {'x-notasi-ilmiah-angka-penting': {'slug': 'x-notasi-ilmiah-angka-penting', 'kelas': 'X', 'title': 'Notasi Ilmiah dan Angka Penting', 'category': 'Pengukuran', 'description': 'Konversi notasi ilmiah, identifikasi angka penting, pembulatan, dan operasi hasil pengukuran.', 'model': 'notasi'}, 'x-besaran-pengukuran': {'slug': 'x-besaran-pengukuran', 'kelas': 'X', 'title': 'Besaran dan Pengukuran', 'category': 'Pengukuran', 'description': 'Bandingkan pengukuran berulang dan ketidakpastian sederhana.', 'param_label': 'Panjang benda', 'param_unit': 'cm', 'default': 10, 'min': 1, 'max': 50, 'step': 1, 'model': 'pengukuran'}, 'x-energi-alternatif': {'slug': 'x-energi-alternatif', 'kelas': 'X', 'title': 'Energi Alternatif', 'category': 'Energi', 'description': 'Amati pengaruh intensitas sumber terhadap energi keluaran model panel surya.', 'param_label': 'Intensitas cahaya', 'param_unit': '%', 'default': 70, 'min': 10, 'max': 100, 'step': 5, 'model': 'energi'}, 'x-pemanasan-global': {'slug': 'x-pemanasan-global', 'kelas': 'X', 'title': 'Pemanasan Global', 'category': 'Lingkungan', 'description': 'Amati perubahan suhu model akibat peningkatan konsentrasi gas rumah kaca.', 'param_label': 'Konsentrasi relatif', 'param_unit': 'unit', 'default': 2, 'min': 0, 'max': 10, 'step': 1, 'model': 'pemanasan'}, 'xi-vektor-kinematika': {'slug': 'xi-vektor-kinematika', 'kelas': 'XI', 'title': 'Vektor dan Kinematika Partikel', 'category': 'Kinematika', 'description': 'Uji hubungan kecepatan, waktu, dan perpindahan pada gerak lurus.', 'param_label': 'Kecepatan', 'param_unit': 'm/s', 'default': 5, 'min': 1, 'max': 20, 'step': 1, 'model': 'kinematika'}, 'xi-optik': {'slug': 'xi-optik', 'kelas': 'XI', 'title': 'Optik', 'category': 'Optik', 'description': 'Selidiki hubungan jarak benda, jarak bayangan, dan fokus lensa tipis.', 'param_label': 'Jarak benda', 'param_unit': 'cm', 'default': 30, 'min': 10, 'max': 100, 'step': 5, 'model': 'optik'}, 'xi-fluida': {'slug': 'xi-fluida', 'kelas': 'XI', 'title': 'Fluida', 'category': 'Fluida', 'description': 'Amati tekanan hidrostatis pada kedalaman yang berbeda.', 'param_label': 'Kedalaman', 'param_unit': 'm', 'default': 1, 'min': 0.2, 'max': 5, 'step': 0.2, 'model': 'fluida'}, 'xi-termodinamika': {'slug': 'xi-termodinamika', 'kelas': 'XI', 'title': 'Termodinamika', 'category': 'Termodinamika', 'description': 'Amati perubahan suhu gas pada model pemanasan sederhana.', 'param_label': 'Energi panas', 'param_unit': 'J', 'default': 100, 'min': 10, 'max': 500, 'step': 10, 'model': 'termodinamika'}, 'xi-gelombang-bunyi': {'slug': 'xi-gelombang-bunyi', 'kelas': 'XI', 'title': 'Gelombang Bunyi', 'category': 'Gelombang', 'description': 'Selidiki hubungan frekuensi dan panjang gelombang bunyi.', 'param_label': 'Frekuensi', 'param_unit': 'Hz', 'default': 440, 'min': 100, 'max': 1000, 'step': 20, 'model': 'bunyi'}, 'xi-gelombang-cahaya': {'slug': 'xi-gelombang-cahaya', 'kelas': 'XI', 'title': 'Gelombang Cahaya', 'category': 'Gelombang', 'description': 'Amati hubungan panjang gelombang dan frekuensi cahaya model.', 'param_label': 'Panjang gelombang', 'param_unit': 'nm', 'default': 550, 'min': 380, 'max': 750, 'step': 10, 'model': 'cahaya'}, 'xi-dinamika-partikel': {'slug': 'xi-dinamika-partikel', 'kelas': 'XI', 'title': 'Dinamika Partikel', 'category': 'Dinamika', 'description': 'Uji hubungan gaya, massa, dan percepatan menurut Hukum II Newton.', 'param_label': 'Gaya resultan', 'param_unit': 'N', 'default': 10, 'min': 1, 'max': 50, 'step': 1, 'model': 'dinamika'}, 'xii-listrik-statis': {'slug': 'xii-listrik-statis', 'kelas': 'XII', 'title': 'Listrik Statis', 'category': 'Listrik', 'description': 'Amati perubahan gaya listrik model terhadap jarak dua muatan.', 'param_label': 'Jarak muatan', 'param_unit': 'm', 'default': 0.2, 'min': 0.05, 'max': 1, 'step': 0.05, 'model': 'listrikstatis'}, 'xii-listrik-dinamis': {'slug': 'xii-listrik-dinamis', 'kelas': 'XII', 'title': 'Listrik Dinamis', 'category': 'Listrik', 'description': 'Uji hubungan tegangan, hambatan, dan arus listrik.', 'param_label': 'Tegangan', 'param_unit': 'V', 'default': 12, 'min': 1, 'max': 24, 'step': 1, 'model': 'listrikdinamis'}, 'xii-medan-magnetik': {'slug': 'xii-medan-magnetik', 'kelas': 'XII', 'title': 'Medan Magnetik', 'category': 'Magnet', 'description': 'Amati model medan magnet di sekitar kawat berarus.', 'param_label': 'Arus listrik', 'param_unit': 'A', 'default': 2, 'min': 0.5, 'max': 10, 'step': 0.5, 'model': 'magnet'}, 'xii-induksi-elektromagnetik': {'slug': 'xii-induksi-elektromagnetik', 'kelas': 'XII', 'title': 'Induksi Elektromagnetik', 'category': 'Induksi', 'description': 'Amati besar GGL induksi model terhadap laju perubahan fluks.', 'param_label': 'Laju perubahan fluks', 'param_unit': 'Wb/s', 'default': 2, 'min': 0.2, 'max': 10, 'step': 0.2, 'model': 'induksi'}, 'xii-arus-bolak-balik': {'slug': 'xii-arus-bolak-balik', 'kelas': 'XII', 'title': 'Arus Bolak-Balik', 'category': 'Listrik', 'description': 'Uji nilai tegangan efektif dari tegangan maksimum AC.', 'param_label': 'Tegangan maksimum', 'param_unit': 'V', 'default': 12, 'min': 1, 'max': 24, 'step': 1, 'model': 'ac'}, 'xii-teknologi-digital': {'slug': 'xii-teknologi-digital', 'kelas': 'XII', 'title': 'Teknologi Digital', 'category': 'Digital', 'description': 'Eksplorasi jumlah keadaan biner dan kapasitas data sederhana.', 'param_label': 'Jumlah bit', 'param_unit': 'bit', 'default': 4, 'min': 1, 'max': 12, 'step': 1, 'model': 'digital'}, 'xii-dualisme-gelombang-partikel': {'slug': 'xii-dualisme-gelombang-partikel', 'kelas': 'XII', 'title': 'Dualisme Gelombang-Partikel', 'category': 'Fisika Modern', 'description': 'Hitung panjang gelombang de Broglie dari momentum partikel model.', 'param_label': 'Momentum', 'param_unit': 'kg m/s', 'default': 1e-24, 'min': 1e-25, 'max': 1e-23, 'step': 1e-25, 'model': 'debroglie'}, 'xii-relativitas': {'slug': 'xii-relativitas', 'kelas': 'XII', 'title': 'Relativitas', 'category': 'Fisika Modern', 'description': 'Amati faktor Lorentz saat kecepatan mendekati kecepatan cahaya.', 'param_label': 'Kecepatan relatif', 'param_unit': 'c', 'default': 0.5, 'min': 0.1, 'max': 0.9, 'step': 0.1, 'model': 'relativitas'}, 'xii-fisika-inti': {'slug': 'xii-fisika-inti', 'kelas': 'XII', 'title': 'Fisika Inti', 'category': 'Fisika Modern', 'description': 'Eksplorasi energi ekuivalen massa melalui E = mc².', 'param_label': 'Massa', 'param_unit': 'kg', 'default': 1e-06, 'min': 1e-07, 'max': 1e-05, 'step': 1e-07, 'model': 'inti'}, 'xii-radioaktivitas': {'slug': 'xii-radioaktivitas', 'kelas': 'XII', 'title': 'Radioaktivitas', 'category': 'Fisika Modern', 'description': 'Amati peluruhan eksponensial jumlah inti terhadap waktu.', 'param_label': 'Waktu', 'param_unit': 'waktu paruh', 'default': 1, 'min': 0, 'max': 5, 'step': 0.25, 'model': 'radioaktivitas'}}

@app.route("/modul/<slug>")
def modul_umum(slug):
    item = MODULES.get(slug)
    if not item:
        return render_template("module_not_found.html"), 404
    if item.get("model") == "notasi":
        return render_template("notasi_angka_penting.html", module=item)
    return render_template("module.html", module=item, guide=PRACTICUM_GUIDES.get(item.get("model"), {}))

@app.route("/api/modul/<slug>", methods=["POST"])
def hitung_modul_umum(slug):
    item = MODULES.get(slug)
    if not item:
        return jsonify({"error": "Modul tidak ditemukan."}), 404
    data = request.get_json(silent=True) or {}
    try:
        value = float(data.get("value", item["default"]))
        aux = float(data.get("aux", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Semua parameter harus berupa angka yang valid."}), 400
    if not math.isfinite(value) or value < item["min"] or value > item["max"]:
        return jsonify({"error": f"Nilai harus berada pada rentang {item['min']} sampai {item['max']}."}), 400
    if not math.isfinite(aux):
        return jsonify({"error": "Parameter alat kedua harus berupa angka hingga."}), 400

    model = item["model"]
    instrument = str(data.get("instrument", "caliper"))
    focus = 10.0
    if model == "optik":
        try:
            focus = float(data.get("focus", 10.0))
        except (TypeError, ValueError):
            return jsonify({"error": "Nilai fokus lensa tidak valid."}), 400
        if not math.isfinite(focus) or not 5 <= focus <= 25:
            return jsonify({"error": "Jarak fokus lensa harus 5 sampai 25 cm."}), 400

    # Parameter kedua (aux) benar-benar dipakai pada model yang memilikinya.
    # Rentang di sini juga divalidasi di backend agar API tidak bisa menerima nilai liar.
    aux_ranges = {
        "pengukuran": (0.01, 1.0), "energi": (5, 30), "pemanasan": (0, 80),
        "kinematika": (1, 10), "fluida": (700, 1300), "termodinamika": (10, 100),
        "bunyi": (-10, 40), "cahaya": (1, 2.5), "dinamika": (0.5, 10),
        "listrikstatis": (0.1, 5), "listrikdinamis": (1, 20), "magnet": (1, 15),
        "induksi": (10, 100), "ac": (10, 100), "digital": (1, 8),
        "relativitas": (1, 100),
        "inti": (0.01, 100), "radioaktivitas": (100, 10000)
    }
    if model in aux_ranges:
        amin, amax = aux_ranges[model]
        # Untuk pengukuran, rentang bergantung pada instrumen yang dipilih.
        if model == "pengukuran":
            if instrument == "micrometer": amin, amax = 0.01, 0.05
            elif instrument == "balance": amin, amax = 0.1, 1.0
        if not amin <= aux <= amax:
            return jsonify({"error": f"Parameter alat kedua harus berada pada rentang {amin:g} sampai {amax:g}."}), 400

    def calc(v):
        # Semua hasil adalah model ideal. Asumsi tetap dibuat eksplisit agar dapat
        # dibandingkan dengan hasil eksperimen nyata dan tidak disalahartikan sebagai data ukur.
        if model == "pengukuran":
            if instrument == "micrometer":
                uncertainty = aux / 20  # resolusi mm -> setengah skala, lalu konversi mm ke cm
                label = "Ketidakpastian pengukuran (cm), mikrometer"
            elif instrument == "balance":
                uncertainty = aux / 2
                label = "Ketidakpastian massa (g), neraca digital"
            else:
                uncertainty = aux / 20  # resolusi mm -> cm, lalu dibagi dua
                label = "Ketidakpastian pengukuran (cm), jangka sorong"
            return v, uncertainty, label
        if model == "energi":
            irradiance = 1000 * (v / 100)  # W/m², 100% = 1000 W/m²
            area = 0.02  # m², luas panel asumsi
            power = irradiance * area * (aux / 100)
            return v, power, "Daya listrik panel surya (W), luas 0,02 m²"
        if model == "pemanasan":
            effective = v * (1 - aux / 100)
            return v, 25 + 1.5 * effective, "Suhu model (°C), suhu awal 25 °C"
        if model == "kinematika": return v, v * aux, f"Perpindahan (m), waktu {aux:g} s, kecepatan tetap"
        if model == "optik":
            if abs(v - focus) < 1e-9: return v, float("inf"), f"Jarak bayangan (cm), f = {focus:g} cm (di tak hingga)"
            image = focus * v / (v - focus)
            return v, image, f"Jarak bayangan bertanda (cm), f = {focus:g} cm"
        if model == "fluida": return v, (aux * 9.81 * v), "Tekanan hidrostatis (Pa), P = ρgh"
        if model == "termodinamika": return v, v / aux, "Kenaikan suhu (K), ΔT = Q/C"
        if model == "bunyi":
            speed = 331.3 + 0.606 * aux
            return v, speed / v, f"Panjang gelombang bunyi (m), cepat rambat {speed:.2f} m/s"
        if model == "cahaya": return v, v / aux, "Panjang gelombang dalam medium (nm), λ = λ₀/n"
        if model == "dinamika": return v, v / aux, "Percepatan (m/s²), a = F/m"
        if model == "listrikstatis":
            charge = aux * 1e-6
            return v, 8.9875517923e9 * charge * charge / (v*v), "Gaya Coulomb (N), dua muatan sama besar"
        if model == "listrikdinamis": return v, v / aux, "Arus listrik (A), I = V/R"
        if model == "magnet": return v, 2e-7 * v / (aux / 100), "Medan magnet (T), kawat lurus panjang"
        if model == "induksi": return v, aux * v, "GGL induksi (V), |ε| = N|ΔΦ/Δt|"
        if model == "ac": return v, (v / math.sqrt(2)) / aux, "Arus efektif (A), Iₑf = Vₑf/R"
        if model == "digital": return v, (2 ** int(round(v))) * aux, "Kapasitas kombinasi berbobot (byte), 2ⁿ × byte/kombinasi"
        if model == "debroglie": return v, 6.62607015e-34 / v, "Panjang gelombang de Broglie (m), λ = h/p"
        if model == "relativitas":
            gamma = 1 / math.sqrt(1-v*v)
            return v, gamma * aux, "Waktu teramati (ns), Δt = γΔτ"
        if model == "inti": return v, (v * aux / 100) * (299792458**2), "Energi ekuivalen (J), E = (fraksi massa)mc²"
        if model == "radioaktivitas": return v, aux * (0.5 ** v), "Jumlah inti tersisa (model), N = N₀(1/2)ⁿ"
        return v, v, "Hasil model"

    try:
        x, y, label = calc(value)
        if not math.isfinite(y):
            # Tak hingga pada jarak benda = fokus adalah hasil fisika yang sah,
            # tetapi bukan nilai numerik yang aman untuk tabel/grafik.
            y = None
        series = []
        lo, hi = item["min"], item["max"]
        for i in range(11):
            v = lo + (hi-lo)*i/10
            sx, sy, _ = calc(v)
            if math.isfinite(sy):
                series.append({"x": sx, "y": sy})
        notes = {
            "energi": "Asumsi: irradiansi 100% = 1000 W/m² dan luas panel 0,02 m²; daya = irradiansi × luas × efisiensi.",
            "pemanasan": "Model pedagogis linear: suhu awal 25 °C; pengaruh konsentrasi dikurangi faktor tutupan awan. Bukan model iklim atmosfer lengkap.",
            "fluida": "Asumsi fluida diam, tekanan ukur (gauge), dan g = 9,81 m/s².",
            "termodinamika": "Asumsi tidak ada kehilangan kalor dan kapasitas kalor sistem konstan.",
            "bunyi": "Asumsi bunyi merambat di udara; c ≈ 331,3 + 0,606T (m/s), T dalam °C.",
            "cahaya": "Frekuensi tetap saat memasuki medium; panjang gelombang berkurang menjadi λ₀/n.",
            "dinamika": "Asumsi gaya resultan konstan dan gesekan diabaikan.",
            "magnet": "Asumsi kawat lurus panjang; B = μ₀I/(2πr), medium udara/vakum.",
            "induksi": "Asumsi perubahan fluks seragam; ε = N|ΔΦ/Δt|.",
            "ac": "Asumsi sumber sinusoidal dan beban resistif murni.",
            "radioaktivitas": "n menyatakan banyaknya waktu paruh yang telah berlalu; hasil adalah nilai harapan kontinu, bukan hitungan acak inti."
        }
        return jsonify({
            "title": item["title"], "input": x, "output": y,
            "output_label": label, "series": series,
            "note": notes.get(model, "Model ideal untuk pembelajaran; hasil merupakan prediksi teori, bukan data eksperimen laboratorium nyata.")
        })
    except (ValueError, OverflowError, ZeroDivisionError) as exc:
        return jsonify({"error": f"Perhitungan tidak dapat dilakukan: {exc}"}), 400



def _decimal_input(value):
    text = str(value).strip().replace(',', '.')
    if not text or not re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?', text):
        raise ValueError('Masukkan angka yang valid, gunakan titik atau koma untuk desimal.')
    number = Decimal(text)
    if not number.is_finite():
        raise ValueError('Angka harus berupa nilai hingga.')
    if len(number.as_tuple().digits) > 50 or abs(number.adjusted()) > 300:
        raise ValueError('Gunakan maksimal 50 digit dan orde bilangan antara 10⁻³⁰⁰ sampai 10³⁰⁰.')
    return text, number


def _sig_fig_count(text):
    mantissa = re.split(r'[eE]', text)[0].lstrip('+-').replace('.', '')
    mantissa = mantissa.lstrip('0')
    if not mantissa:
        return 1
    if '.' not in re.split(r'[eE]', text)[0] and not re.search(r'[eE]', text):
        mantissa = mantissa.rstrip('0') or '0'
    return len(mantissa)


def _scientific(value):
    if value == 0:
        return '0 × 10⁰'
    raw = f'{value:E}'
    coeff, exponent = raw.split('E')
    return f'{coeff} × 10^{int(exponent)}'


def _round_sig(value, figures):
    if value == 0:
        return Decimal(0)
    exponent = value.copy_abs().adjusted() - figures + 1
    quantum = Decimal('1').scaleb(exponent)
    with localcontext() as ctx:
        ctx.prec = max(50, figures + abs(exponent) + 10)
        rounded = value.quantize(quantum, rounding=ROUND_HALF_UP)
        # Jika pembulatan membawa 9,99... ke orde berikutnya (mis. 9,995 -> 10,0),
        # posisi digit terakhir yang dipertahankan ikut bergeser satu tempat.
        if rounded != 0 and rounded.copy_abs().adjusted() > value.copy_abs().adjusted():
            new_exponent = rounded.copy_abs().adjusted() - figures + 1
            rounded = rounded.quantize(Decimal('1').scaleb(new_exponent), rounding=ROUND_HALF_UP)
        return rounded


def _ambiguous_integer_zeros(text):
    mantissa = re.split(r'[eE]', text)[0].lstrip('+-')
    return '.' not in mantissa and not re.search(r'[eE]', text) and len(mantissa) > 1 and mantissa.endswith('0')


@app.route('/api/notasi-angka-penting', methods=['POST'])
def api_notasi_angka_penting():
    data = request.get_json(silent=True) or {}
    action = data.get('action', 'convert')
    try:
        if action == 'convert':
            raw, value = _decimal_input(data.get('value', '0.000456'))
            return jsonify({'ok': True, 'decimal': format(value, 'f'), 'scientific': _scientific(value), 'significant_figures': _sig_fig_count(raw), 'ambiguous_trailing_zeros': _ambiguous_integer_zeros(raw)})
        if action == 'round':
            raw, value = _decimal_input(data.get('value', '0'))
            figures = int(data.get('figures', 3))
            if not 1 <= figures <= 15:
                raise ValueError('Angka penting harus 1 sampai 15.')
            rounded = _round_sig(value, figures)
            return jsonify({'ok': True, 'rounded': format(rounded, 'f'), 'scientific': _scientific(rounded), 'significant_figures': figures})
        if action == 'operation':
            raw_a, a = _decimal_input(data.get('a', '0'))
            raw_b, b = _decimal_input(data.get('b', '0'))
            op = data.get('operator', 'multiply')
            if op in ('add', 'subtract'):
                place = max(a.as_tuple().exponent, b.as_tuple().exponent)
                quantum = Decimal('1').scaleb(place)
                with localcontext() as ctx:
                    ctx.prec = 120
                    result = a + b if op == 'add' else a - b
                    rounded = result.quantize(quantum, rounding=ROUND_HALF_UP)
                operation_name = 'Penjumlahan' if op == 'add' else 'Pengurangan'
                rule = f'{operation_name}: bulatkan ke posisi desimal paling tidak teliti (10^{place}).'
            elif op == 'multiply':
                figures = min(_sig_fig_count(raw_a), _sig_fig_count(raw_b))
                with localcontext() as ctx:
                    ctx.prec = 120
                    result = a * b
                rounded = _round_sig(result, figures)
                rule = f'Perkalian: ikuti jumlah angka penting paling sedikit ({figures}).'
            elif op == 'divide':
                if b == 0:
                    raise ValueError('Pembagian dengan nol tidak diperbolehkan.')
                figures = min(_sig_fig_count(raw_a), _sig_fig_count(raw_b))
                with localcontext() as ctx:
                    ctx.prec = 120
                    result = a / b
                rounded = _round_sig(result, figures)
                rule = f'Pembagian: ikuti jumlah angka penting paling sedikit ({figures}).'
            else:
                raise ValueError('Pilih operasi yang tersedia.')
            return jsonify({'ok': True, 'raw_result': str(result), 'result': format(rounded, 'f'), 'scientific': _scientific(rounded), 'rule': rule})
        raise ValueError('Jenis perhitungan tidak dikenal.')
    except (ValueError, InvalidOperation, ArithmeticError) as exc:
        return jsonify({'ok': False, 'error': str(exc)}), 400


PRACTICUM_GUIDES = {
    'pengukuran': {'objective': 'Mengukur panjang dan diameter benda', 'tools': 'Jangka sorong, mikrometer sekrup, neraca digital, penggaris, benda uji', 'steps': ['Catat skala utama dan nonius jangka sorong', 'ukur diameter benda pada beberapa orientasi', 'ulangi dengan mikrometer', 'timbang benda bila diperlukan.'], 'variables': 'Panjang/diameter/massa benda; resolusi alat; jumlah pengulangan.', 'safety': 'Jangan menjepit benda terlalu kuat. Pastikan nol alat ukur sebelum membaca.'},
    'energi': {'objective': 'Menyelidiki pengaruh intensitas cahaya terhadap keluaran panel surya', 'tools': 'Panel surya mini, lampu sumber cahaya, voltmeter, amperemeter, kabel penghubung', 'steps': ['Arahkan lampu ke panel pada jarak tetap', 'ubah intensitas sumber secara bertahap', 'ukur tegangan dan arus', 'hitung daya listrik P = V × I', 'ulangi tiap kondisi.'], 'variables': 'Intensitas cahaya; tegangan; arus; daya keluaran; jarak lampu.', 'safety': 'Jangan melihat langsung ke sumber cahaya intensitas tinggi. Periksa sambungan listrik tegangan rendah.'},
    'pemanasan': {'objective': 'Mengamati model efek rumah kaca', 'tools': 'Dua bejana transparan, termometer/sensor suhu, lampu pemanas, penutup transparan', 'steps': ['Letakkan termometer pada kedua bejana', 'tutup salah satu bejana', 'nyalakan lampu dengan jarak sama', 'catat suhu berkala', 'bandingkan perubahan suhu kedua kondisi.'], 'variables': 'Jenis penutup; waktu penyinaran; suhu awal dan suhu akhir.', 'safety': 'Hindari menyentuh lampu atau bejana yang panas. Model virtual menyederhanakan proses atmosfer.'},
    'kinematika': {'objective': 'Menganalisis gerak lurus kereta dinamika', 'tools': 'Kereta dinamika, rel lintasan, penggaris/meteran, stopwatch atau sensor waktu', 'steps': ['Atur lintasan mendatar', 'letakkan kereta pada titik awal', 'jalankan kereta', 'ukur perpindahan pada selang waktu tertentu', 'ulangi untuk beberapa kecepatan.'], 'variables': 'Kecepatan; waktu; perpindahan; kondisi lintasan.', 'safety': 'Pastikan lintasan stabil dan area gerak kereta bebas hambatan.'},
    'optik': {'objective': 'Menentukan hubungan jarak benda, jarak bayangan, dan fokus lensa', 'tools': 'Rel optik, sumber cahaya/benda, lensa cembung, layar, penggaris', 'steps': ['Susun benda, lensa, dan layar segaris pada rel', 'geser layar sampai bayangan tajam', 'catat jarak benda dan bayangan', 'ulangi dengan jarak benda berbeda', 'tentukan fokus menggunakan persamaan lensa tipis.'], 'variables': 'Jarak benda; jarak bayangan; fokus lensa; jenis bayangan.', 'safety': 'Jangan arahkan sumber cahaya kuat atau laser ke mata.'},
    'fluida': {'objective': 'Menyelidiki tekanan hidrostatis terhadap kedalaman', 'tools': 'Gelas ukur/bejana transparan, fluida, penggaris kedalaman, sensor tekanan/manometer', 'steps': ['Isi bejana dengan fluida', 'tentukan titik acuan permukaan', 'tempatkan sensor pada beberapa kedalaman', 'catat tekanan', 'bandingkan dengan massa jenis fluida.'], 'variables': 'Kedalaman; massa jenis; tekanan; percepatan gravitasi.', 'safety': 'Jaga meja tetap kering dan jauhkan perangkat listrik dari tumpahan.'},
    'termodinamika': {'objective': 'Mengamati perubahan suhu pada sistem yang dipanaskan', 'tools': 'Kalorimeter/bejana, termometer, pemanas, pengaduk, stopwatch', 'steps': ['Ukur suhu awal', 'berikan energi panas pada interval yang ditentukan', 'aduk perlahan', 'catat suhu setiap interval', 'bandingkan perubahan suhu terhadap energi yang diberikan.'], 'variables': 'Energi panas; massa zat; kapasitas kalor; suhu awal/akhir; waktu.', 'safety': 'Jangan menyentuh pemanas atau cairan panas secara langsung. Gunakan penjepit dan pelindung.'},
    'bunyi': {'objective': 'Menyelidiki frekuensi dan panjang gelombang bunyi', 'tools': 'Garpu tala atau speaker, mikrofon/sensor bunyi, osiloskop atau pencacah frekuensi, penggaris', 'steps': ['Atur frekuensi sumber', 'tempatkan mikrofon pada posisi tetap', 'amati sinyal', 'ukur frekuensi', 'hitung panjang gelombang menggunakan cepat rambat bunyi pada medium.'], 'variables': 'Frekuensi; amplitudo; suhu medium; cepat rambat; panjang gelombang.', 'safety': 'Mulai dari volume rendah dan hindari paparan bunyi keras.'},
    'cahaya': {'objective': 'Mengamati difraksi/interferensi cahaya', 'tools': 'Sumber laser berdaya rendah, kisi difraksi, layar, penggaris, dudukan optik', 'steps': ['Pasang kisi di depan layar', 'arahkan berkas sejajar dan tegak lurus kisi', 'ukur jarak kisi-layar dan jarak terang pusat ke terang orde pertama', 'ulangi untuk orde lain.'], 'variables': 'Panjang gelombang; jarak kisi-layar; jarak antarfringe; orde difraksi.', 'safety': 'Jangan pernah mengarahkan laser ke mata atau permukaan reflektif.'},
    'dinamika': {'objective': 'Menguji hubungan gaya, massa, dan percepatan', 'tools': 'Kereta dinamika, rel, katrol, beban gantung, dinamometer, stopwatch/sensor', 'steps': ['Rangkai kereta dengan beban melalui katrol', 'ukur massa total', 'ubah gaya penarik', 'ukur percepatan', 'ulangi dengan massa berbeda', 'bandingkan dengan Hukum II Newton.'], 'variables': 'Gaya resultan; massa total; percepatan; gesekan.', 'safety': 'Pastikan beban tidak jatuh ke kaki dan rel terkunci.'},
    'listrikstatis': {'objective': 'Mengamati interaksi muatan listrik statis', 'tools': 'Batang plastik/akrilik, kain penggosok, elektroskop, bola uji ringan', 'steps': ['Netralisasi elektroskop', 'gosok batang dengan kain', 'dekatkan batang tanpa menyentuh elektroskop', 'amati daun elektroskop', 'ulangi dengan jenis batang atau jarak berbeda.'], 'variables': 'Jenis muatan; jarak; respons elektroskop; kondisi penggosokan.', 'safety': 'Gunakan demonstrasi tegangan statis rendah; jauhkan dari perangkat sensitif.'},
    'listrikdinamis': {'objective': 'Menguji hubungan tegangan, arus, dan hambatan', 'tools': 'Catu daya DC tegangan rendah, resistor, amperemeter, voltmeter, kabel, sakelar', 'steps': ['Rangkai resistor dan amperemeter secara seri', 'pasang voltmeter paralel pada resistor', 'mulai dari tegangan kecil', 'catat V dan I', 'ubah tegangan atau hambatan', 'bandingkan V/I.'], 'variables': 'Tegangan; arus; hambatan; daya listrik.', 'safety': 'Matikan catu daya sebelum mengubah rangkaian. Gunakan tegangan rendah dan hindari hubung singkat.'},
    'magnet': {'objective': 'Mengamati medan magnet di sekitar kawat berarus', 'tools': 'Catu daya DC rendah, kawat lurus, kompas kecil, amperemeter, penggaris', 'steps': ['Susun kawat lurus', 'tempatkan kompas pada jarak tertentu', 'alirkan arus kecil', 'amati arah jarum', 'ubah arah arus dan jarak kompas', 'catat perubahan.'], 'variables': 'Arus; jarak dari kawat; arah medan magnet; orientasi kompas.', 'safety': 'Matikan sumber sebelum mengubah sambungan; jangan biarkan kawat panas.'},
    'induksi': {'objective': 'Menyelidiki GGL induksi pada kumparan', 'tools': 'Kumparan, magnet batang, galvanometer, penggaris/penanda gerak', 'steps': ['Hubungkan kumparan ke galvanometer', 'gerakkan magnet masuk dan keluar kumparan', 'amati arah simpangan', 'ubah kecepatan gerak atau jumlah lilitan', 'bandingkan besar induksi.'], 'variables': 'Kecepatan magnet; arah gerak; jumlah lilitan; simpangan galvanometer.', 'safety': 'Gunakan magnet permanen kecil; jauhkan dari kartu magnetik dan perangkat sensitif.'},
    'ac': {'objective': 'Mengamati karakteristik arus bolak-balik', 'tools': 'Sumber AC terisolasi tegangan rendah, resistor, multimeter AC, osiloskop', 'steps': ['Hubungkan resistor ke sumber AC aman', 'amati bentuk gelombang pada osiloskop', 'ukur tegangan maksimum dan efektif', 'ubah frekuensi', 'catat perubahan.'], 'variables': 'Tegangan maksimum; tegangan efektif; frekuensi; periode.', 'safety': 'Hanya gunakan sumber AC tegangan rendah terisolasi. Jangan praktik pada stopkontak rumah.'},
    'digital': {'objective': 'Menguji rangkaian logika digital dasar', 'tools': 'Breadboard, catu daya DC 5 V, IC gerbang logika, sakelar input, LED, resistor pembatas', 'steps': ['Matikan catu daya saat merangkai', 'pasang IC sesuai diagram pin', 'hubungkan input melalui sakelar', 'pasang LED dengan resistor', 'nyalakan catu daya', 'uji seluruh kombinasi input dan catat output.'], 'variables': 'Kombinasi input biner; keluaran logika; jenis gerbang.', 'safety': 'Periksa polaritas dan pin IC; gunakan tegangan sesuai datasheet; matikan daya sebelum merangkai ulang.'},
    'debroglie': {'objective': 'Mengeksplorasi hubungan momentum dan panjang gelombang de Broglie melalui model', 'tools': 'Komputer simulasi, panel parameter momentum, grafik hasil', 'steps': ['Masukkan beberapa nilai momentum pada rentang yang disediakan', 'jalankan perhitungan', 'catat panjang gelombang', 'buat grafik λ terhadap 1/p', 'interpretasikan hubungan berbanding terbalik.'], 'variables': 'Momentum; panjang gelombang; konstanta Planck.', 'safety': 'Ini eksperimen komputasional, bukan percobaan partikel berenergi tinggi.'},
    'relativitas': {'objective': 'Mengeksplorasi faktor Lorentz pada kecepatan relativistik', 'tools': 'Komputer simulasi, pengatur rasio kecepatan terhadap c, grafik faktor Lorentz', 'steps': ['Pilih beberapa nilai v/c di bawah 1', 'jalankan model', 'catat faktor Lorentz', 'amati kenaikan saat v mendekati c', 'bandingkan dengan kondisi kecepatan rendah.'], 'variables': 'Rasio v/c; faktor Lorentz; perubahan waktu/panjang model.', 'safety': 'Eksperimen komputasional berdasarkan relativitas khusus; bukan pengukuran benda nyata.'},
    'inti': {'objective': 'Menghitung kesetaraan massa dan energi', 'tools': 'Komputer simulasi, panel input massa, kalkulator/grafik', 'steps': ['Masukkan beberapa nilai massa', 'hitung energi ekuivalen dengan E = mc²', 'catat hasil dalam joule dan notasi ilmiah', 'bandingkan skala hasil.'], 'variables': 'Massa; energi ekuivalen; kecepatan cahaya.', 'safety': 'Model komputasional; tidak melibatkan reaksi atau bahan nuklir.'},
    'radioaktivitas': {'objective': 'Memodelkan peluruhan radioaktif dan waktu paruh', 'tools': 'Komputer simulasi, pengatur waktu paruh, grafik jumlah inti', 'steps': ['Tentukan jumlah inti awal dan waktu paruh', 'jalankan model pada beberapa waktu', 'catat jumlah inti tersisa', 'buat grafik jumlah inti terhadap waktu', 'tentukan waktu ketika jumlah menjadi setengah.'], 'variables': 'Waktu; waktu paruh; jumlah inti awal dan sisa.', 'safety': 'Simulasi matematika; tidak menggunakan sumber radioaktif atau bahan berbahaya.'}
}

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
