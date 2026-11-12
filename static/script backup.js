
const velocityInput = document.getElementById("velocity");
const angleInput = document.getElementById("angle");
const gravityInput = document.getElementById("gravity");

const runButton = document.getElementById("runExperiment");
const resetButton = document.getElementById("resetExperiment");
const exportButton = document.getElementById("exportCsv");
const statusText = document.getElementById("experimentStatus");

const totalTimeOutput = document.getElementById("totalTime");
const maxHeightOutput = document.getElementById("maxHeight");
const rangeOutput = document.getElementById("range");
const resultsTable = document.getElementById("resultsTable");

const trajectoryCanvas = document.getElementById("trajectoryCanvas");
const xGraphCanvas = document.getElementById("xGraph");
const yGraphCanvas = document.getElementById("yGraph");
const pathGraphCanvas = document.getElementById("pathGraph");

let experimentData = [];
let animationFrame = null;
let animationStart = null;
let currentResult = null;

function drawAxes(ctx, width, height, padding = 42) {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(padding, 12);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - 12, height - padding);
    ctx.stroke();
}

function drawLineGraph(canvas, points, xKey, yKey, xLabel, yLabel) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width = Math.max(canvas.clientWidth, 320);
    const height = canvas.height = 220;
    const padding = 42;

    drawAxes(ctx, width, height, padding);

    if (!points.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = "13px sans-serif";
        ctx.fillText("Jalankan percobaan untuk melihat grafik", 12, 28);
        return;
    }

    const maxX = Math.max(...points.map(p => p[xKey]), 0.001);
    const maxY = Math.max(...points.map(p => p[yKey]), 0.001);
    const plotWidth = width - padding - 14;
    const plotHeight = height - padding - 20;

    ctx.fillStyle = "#334155";
    ctx.font = "12px sans-serif";
    ctx.fillText(`${yLabel}`, 5, 15);
    ctx.fillText(`${xLabel} (s)`, width - 65, height - 8);

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = padding + (point[xKey] / maxX) * plotWidth;
        const y = height - padding - (point[yKey] / maxY) * plotHeight;

        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();
}

function drawTrajectory(canvas, points, animatedPoint = null) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width = Math.max(canvas.clientWidth, 320);
    const height = canvas.height = 280;
    const padding = 35;

    drawAxes(ctx, width, height, padding);

    if (!points.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = "13px sans-serif";
        ctx.fillText("Lintasan akan tampil setelah percobaan dijalankan", 12, 25);
        return;
    }

    const maxX = Math.max(...points.map(p => p.x), 1);
    const maxY = Math.max(...points.map(p => p.y), 1);
    const plotWidth = width - padding - 15;
    const plotHeight = height - padding - 18;

    ctx.fillStyle = "#334155";
    ctx.font = "12px sans-serif";
    ctx.fillText("y (m)", 5, 15);
    ctx.fillText("x (m)", width - 55, height - 8);

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    points.forEach((point, index) => {
        const x = padding + (point.x / maxX) * plotWidth;
        const y = height - padding - (point.y / maxY) * plotHeight;

        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    if (animatedPoint) {
        const x = padding + (animatedPoint.x / maxX) * plotWidth;
        const y = height - padding - (animatedPoint.y / maxY) * plotHeight;

        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawAllGraphs(points) {
    drawTrajectory(trajectoryCanvas, points);
    drawLineGraph(xGraphCanvas, points, "time", "x", "Waktu", "Posisi horizontal x (m)");
    drawLineGraph(yGraphCanvas, points, "time", "y", "Waktu", "Posisi vertikal y (m)");
    drawLineGraph(pathGraphCanvas, points, "x", "y", "Posisi horizontal x", "Posisi vertikal y (m)");
}

function fillTable(points) {
    resultsTable.innerHTML = "";

    points.forEach((point, index) => {
        const row = document.createElement("tr");
        [
            index + 1,
            point.time.toFixed(4),
            point.x.toFixed(4),
            point.y.toFixed(4),
            point.vx.toFixed(4),
            point.vy.toFixed(4)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        resultsTable.appendChild(row);
    });
}

function stopAnimation() {
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    animationStart = null;
}

function animateTrajectory(points) {
    stopAnimation();

    if (!points.length) return;

    const duration = 2500;

    function frame(timestamp) {
        if (animationStart === null) animationStart = timestamp;

        const progress = Math.min((timestamp - animationStart) / duration, 1);
        const index = Math.min(
            Math.floor(progress * (points.length - 1)),
            points.length - 1
        );

        drawTrajectory(trajectoryCanvas, points, points[index]);

        if (progress < 1) {
            animationFrame = requestAnimationFrame(frame);
        } else {
            animationFrame = null;
            animationStart = null;
        }
    }

    animationFrame = requestAnimationFrame(frame);
}

async function runExperiment() {
    runButton.disabled = true;
    statusText.textContent = "Menghitung percobaan...";

    try {
        const response = await fetch("/api/gerak-parabola", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                velocity: Number(velocityInput.value),
                angle: Number(angleInput.value),
                gravity: Number(gravityInput.value)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Perhitungan gagal.");
        }

        currentResult = result;
        experimentData = result.data;

        totalTimeOutput.textContent = `${result.flight_time} s`;
        maxHeightOutput.textContent = `${result.max_height} m`;
        rangeOutput.textContent = `${result.range} m`;

        fillTable(experimentData);
        drawAllGraphs(experimentData);
        animateTrajectory(experimentData);

        exportButton.disabled = false;
        statusText.textContent = "Percobaan berhasil. Data hasil pengamatan tersedia.";
    } catch (error) {
        statusText.textContent = `Terjadi kesalahan: ${error.message}`;
    } finally {
        runButton.disabled = false;
    }
}

function resetExperiment() {
    stopAnimation();

    experimentData = [];
    currentResult = null;
    resultsTable.innerHTML = "";

    totalTimeOutput.textContent = "-";
    maxHeightOutput.textContent = "-";
    rangeOutput.textContent = "-";

    exportButton.disabled = true;
    statusText.textContent = "Atur parameter, lalu jalankan percobaan.";

    drawAllGraphs([]);
}

function exportCsv() {
    if (!experimentData.length) return;

    const headers = ["Waktu (s)", "Posisi X (m)", "Posisi Y (m)", "Kecepatan VX (m/s)", "Kecepatan VY (m/s)"];
    const rows = experimentData.map(p => [
        p.time, p.x, p.y, p.vx, p.vy
    ]);

    const csv = [headers, ...rows]
        .map(row => row.join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hasil-gerak-parabola.csv";
    link.click();
    URL.revokeObjectURL(url);
}

runButton.addEventListener("click", runExperiment);
resetButton.addEventListener("click", resetExperiment);
exportButton.addEventListener("click", exportCsv);

drawAllGraphs([]);

const observationTimeInput = document.getElementById("observationTime");
const measurePositionButton = document.getElementById("measurePosition");
const recordObservationButton = document.getElementById("recordObservation");
const clearObservationsButton = document.getElementById("clearObservations");

const observedXOutput = document.getElementById("observedX");
const observedYOutput = document.getElementById("observedY");
const measurementStatus = document.getElementById("measurementStatus");
const observationsTable = document.getElementById("observationsTable");

let selectedObservation = null;
let recordedObservations = [];


async function observePosition() {
    if (!currentResult || !experimentData.length) {
        measurementStatus.textContent =
            "Jalankan percobaan terlebih dahulu.";
        return;
    }

    const selectedTime = Number(observationTimeInput.value);

    if (
        observationTimeInput.value.trim() === "" ||
        !Number.isFinite(selectedTime) ||
        selectedTime < 0
    ) {
        measurementStatus.textContent =
            "Masukkan waktu pengamatan yang valid.";
        recordObservationButton.disabled = true;
        return;
    }

    measurePositionButton.disabled = true;
    recordObservationButton.disabled = true;
    measurementStatus.textContent =
        "Mengukur posisi berdasarkan model fisika...";

    try {
        const response = await fetch("/api/ukur-gerak-parabola", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                velocity: Number(velocityInput.value),
                angle: Number(angleInput.value),
                gravity: Number(gravityInput.value),
                time: selectedTime
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Pengukuran gagal.");
        }

        selectedObservation = {
            time: result.time,
            x: result.x,
            y: result.y
        };

        observedXOutput.textContent = `${result.x.toFixed(4)} m`;
        observedYOutput.textContent = `${result.y.toFixed(4)} m`;

        recordObservationButton.disabled = false;
        measurementStatus.textContent =
            `Posisi dihitung tepat pada t = ${result.time.toFixed(2)} s.`;
    } catch (error) {
        selectedObservation = null;
        measurementStatus.textContent =
            `Pengukuran gagal: ${error.message}`;
    } finally {
        measurePositionButton.disabled = false;
    }
}

function renderObservations() {
    observationsTable.innerHTML = "";

    if (recordedObservations.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 8;
        cell.textContent =
            "Belum ada hasil pengamatan yang dicatat.";

        row.appendChild(cell);
        observationsTable.appendChild(row);
        return;
    }

    recordedObservations.forEach((point, index) => {
        const theta = Number(angleInput.value) * Math.PI / 180;
        const v0 = Number(velocityInput.value);
        const g = Number(gravityInput.value);

        const vx0 = v0 * Math.cos(theta);
        const vy0 = v0 * Math.sin(theta);

        const xTheory = vx0 * point.time;
        const yTheory = Math.max(
            0,
            vy0 * point.time - 0.5 * g * point.time ** 2
        );

        const deltaX = Math.abs(point.x - xTheory);
        const deltaY = Math.abs(point.y - yTheory);

        const row = document.createElement("tr");

        [
            index + 1,
            point.time.toFixed(4),
            point.x.toFixed(4),
            point.y.toFixed(4),
            xTheory.toFixed(4),
            yTheory.toFixed(4),
            deltaX.toFixed(4),
            deltaY.toFixed(4)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        observationsTable.appendChild(row);
    });
}
function recordObservation() {
    if (!selectedObservation) {
        measurementStatus.textContent =
            "Klik Amati Posisi terlebih dahulu.";
        return;
    }

    recordedObservations.push({ ...selectedObservation });
    renderObservations();

    measurementStatus.textContent =
        `Pengamatan ke-${recordedObservations.length} berhasil dicatat.`;

    recordObservationButton.disabled = true;
}

function clearObservations() {
    recordedObservations = [];
    selectedObservation = null;

    observedXOutput.textContent = "— m";
    observedYOutput.textContent = "— m";
    recordObservationButton.disabled = true;

    renderObservations();

    measurementStatus.textContent =
        "Catatan pengamatan telah dihapus.";
}

measurePositionButton.addEventListener("click", observePosition);
recordObservationButton.addEventListener("click", recordObservation);
clearObservationsButton.addEventListener("click", clearObservations);

function drawComparisonGraph(canvasId, variable, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width = Math.max(canvas.clientWidth, 320);
    const height = canvas.height = 250;
    const pad = { left: 52, right: 18, top: 24, bottom: 42 };

    ctx.clearRect(0, 0, width, height);

    if (!experimentData.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = "14px sans-serif";
        ctx.fillText("Jalankan percobaan terlebih dahulu.", 12, 30);
        return;
    }

    const theory = experimentData;
    const observed = recordedObservations;

    const maxTime = Math.max(
        theory[theory.length - 1].time,
        0.1
    );

    const allValues = [
        ...theory.map(p => p[variable]),
        ...observed.map(p => p[variable])
    ];

    let minY = Math.min(0, ...allValues);
    let maxY = Math.max(1, ...allValues);

    if (maxY === minY) maxY = minY + 1;

    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const px = t => pad.left + (t / maxTime) * plotW;
    const py = v => height - pad.bottom -
        ((v - minY) / (maxY - minY)) * plotH;

    // Sumbu dan garis kisi.
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (plotH * i) / 4;
        const value = maxY - ((maxY - minY) * i) / 4;

        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();

        ctx.textAlign = "right";
        ctx.fillText(value.toFixed(2), pad.left - 7, y + 4);
    }

    for (let i = 0; i <= 4; i++) {
        const t = (maxTime * i) / 4;
        const x = px(t);

        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, height - pad.bottom);
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillText(t.toFixed(2), x, height - pad.bottom + 17);
    }

    ctx.strokeStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, height - pad.bottom);
    ctx.lineTo(width - pad.right, height - pad.bottom);
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.fillText("Waktu (s)", pad.left + plotW / 2, height - 7);

    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();

    // Garis prediksi teori.
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();

    theory.forEach((p, i) => {
        if (i === 0) ctx.moveTo(px(p.time), py(p[variable]));
        else ctx.lineTo(px(p.time), py(p[variable]));
    });

    ctx.stroke();

    // Titik data pengamatan yang dicatat pengguna.
    ctx.fillStyle = "#dc2626";

    observed.forEach(p => {
        ctx.beginPath();
        ctx.arc(px(p.time), py(p[variable]), 4.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawComparisonGraphs() {
    drawComparisonGraph(
        "comparisonXGraph",
        "x",
        "Posisi X (m)"
    );

    drawComparisonGraph(
        "comparisonYGraph",
        "y",
        "Posisi Y (m)"
    );

    const status = document.getElementById("comparisonStatus");

    if (status) {
        status.textContent = recordedObservations.length
            ? `${recordedObservations.length} titik pengamatan dibandingkan dengan prediksi teori.`
            : "Belum ada titik pengamatan. Catat hasil pengukuran untuk menampilkan titik pada grafik.";
    }
}

// Perbarui grafik setelah pengguna mencatat atau menghapus pengamatan.
recordObservationButton.addEventListener("click", drawComparisonGraphs);
clearObservationsButton.addEventListener("click", drawComparisonGraphs);

// Perbarui grafik setelah perhitungan selesai.
runButton.addEventListener("click", () => {
    const check = () => {
        if (experimentData.length) {
            drawComparisonGraphs();
        }
    };

    // Memeriksa kembali setelah proses permintaan Python selesai.
    requestAnimationFrame(() => requestAnimationFrame(check));
});

drawComparisonGraphs();
