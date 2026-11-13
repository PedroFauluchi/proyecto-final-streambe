const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- DOMINIO IMC (TP2 / Actividad 4) ---
const RANGOS_IMC = [
  { limite: 18.5, categoria: "Bajo peso" },
  { limite: 25, categoria: "Peso normal" },
  { limite: 30, categoria: "Sobrepeso" },
  { limite: 35, categoria: "Obesidad grado I" },
  { limite: 40, categoria: "Obesidad grado II" },
  { limite: Infinity, categoria: "Obesidad grado III" },
];

function validarDatosIMC(peso, altura) {
  if (peso == null || altura == null || peso === "" || altura === "") {
    return "Faltan datos: peso y altura son obligatorios";
  }
  if (Number(peso) <= 0 || Number(altura) <= 0) {
    return "Peso y altura deben ser valores positivos";
  }
  return null;
}

function calcularValorIMC(peso, altura) {
  const imcSinRedondear = peso / (altura * altura);
  return Math.round(imcSinRedondear * 10) / 10;
}

function clasificarIMC(imc) {
  return RANGOS_IMC.find((rango) => imc < rango.limite).categoria;
}

function describirRangoPorSexo(imc, sexo) {
  if (sexo !== "F" && sexo !== "M") return null;
  const genero = sexo === "F" ? "mujeres" : "hombres";
  if (imc >= 18.5 && imc < 25) return `Dentro del rango saludable para ${genero}`;
  if (imc < 18.5) return `Por debajo del rango saludable para ${genero}`;
  return `Por encima del rango saludable para ${genero}`;
}

// --- BASE DE DATOS EN MEMORIA ---
const db = {
  perfiles: {
    u1: {
      usuarioId: "u1",
      nombre: "Pedro Fauluchi",
      edad: 18,
      sexo: "M",
      altura: 1.75,
      peso: 70,
      objetivoPeso: 68,
      objetivoCaloriasDiarias: 2200,
    },
  },
  historialIMC: [
    {
      id: 1,
      usuarioId: "u1",
      peso: 70,
      altura: 1.75,
      sexo: "M",
      imc: 22.9,
      categoria: "Peso normal",
      detalleSexo: "Dentro del rango saludable para hombres",
      fecha: new Date().toISOString(),
    },
  ],
  alimentos: [
    { id: "a1", nombre: "Pechuga de pollo (150g)", categoria: "Carnes", caloriasPorPorcion: 248, precio: 3200, comercio: "Carrefour" },
    { id: "a2", nombre: "Pechuga de pollo (150g)", categoria: "Carnes", caloriasPorPorcion: 248, precio: 2950, comercio: "Coto" },
    { id: "a3", nombre: "Arroz integral (1 taza)", categoria: "Cereales", caloriasPorPorcion: 216, precio: 1400, comercio: "Carrefour" },
    { id: "a4", nombre: "Arroz integral (1 taza)", categoria: "Cereales", caloriasPorPorcion: 216, precio: 1250, comercio: "Día" },
    { id: "a5", nombre: "Yogur descremado (200g)", categoria: "Lácteos", caloriasPorPorcion: 95, precio: 1100, comercio: "Coto" },
    { id: "a6", nombre: "Banana mediana", categoria: "Frutas", caloriasPorPorcion: 105, precio: 650, comercio: "Verdulería Local" },
    { id: "a7", nombre: "Avena arrollada (50g)", categoria: "Cereales", caloriasPorPorcion: 190, precio: 980, comercio: "Día" },
  ],
  consumos: [],
  historialPeso: [
    { id: "p1", usuarioId: "u1", mes: "2026-09", valor: 71.5, fecha: "2026-09-01" },
    { id: "p2", usuarioId: "u1", mes: "2026-10", valor: 70.0, fecha: "2026-10-01" },
  ],
};

// --- ENDPOINTS ---
app.get("/api/perfil/:usuarioId", (req, res) => {
  const perfil = db.perfiles[req.params.usuarioId] || null;
  if (!perfil) return res.status(404).json({ error: "Perfil no encontrado" });
  res.json(perfil);
});

app.post("/api/perfil", (req, res) => {
  const { usuarioId = "u1", nombre, edad, sexo, altura, peso, objetivoCaloriasDiarias } = req.body;
  if (!nombre || !edad || !altura || !peso) {
    return res.status(400).json({ error: "Nombre, edad, altura y peso son obligatorios" });
  }
  if (Number(edad) < 16) {
    return res.status(400).json({ error: "NutriMeta está diseñada para personas desde los 16 años[cite: 1, 7]." });
  }
  const perfil = { usuarioId, nombre, edad: Number(edad), sexo, altura: Number(altura), peso: Number(peso), objetivoCaloriasDiarias: Number(objetivoCaloriasDiarias) || 2000 };
  db.perfiles[usuarioId] = perfil;
  res.json(perfil);
});

app.post("/api/imc", (req, res) => {
  const { usuarioId = "u1", peso, altura, sexo } = req.body;
  const errorVal = validarDatosIMC(peso, altura);
  if (errorVal) return res.status(400).json({ error: errorVal });

  const pesoNum = Number(peso);
  const alturaNum = Number(altura);
  const imc = calcularValorIMC(pesoNum, alturaNum);
  const categoria = clasificarIMC(imc);
  const detalleSexo = describirRangoPorSexo(imc, sexo);

  const registro = { id: Date.now(), usuarioId, peso: pesoNum, altura: alturaNum, sexo: sexo || null, imc, categoria, detalleSexo, fecha: new Date().toISOString() };
  db.historialIMC.unshift(registro);
  res.status(201).json(registro);
});

app.get("/api/imc/:usuarioId", (req, res) => {
  const historial = db.historialIMC.filter((r) => r.usuarioId === req.params.usuarioId);
  res.json(historial);
});

app.get("/api/alimentos", (req, res) => {
  const { categoria, nombre } = req.query;
  let resultados = db.alimentos;
  if (categoria && categoria !== "Todas") {
    resultados = resultados.filter((a) => a.categoria.toLowerCase() === categoria.toLowerCase());
  }
  if (nombre) {
    resultados = resultados.filter((a) => a.nombre.toLowerCase().includes(nombre.toLowerCase()));
  }
  res.json(resultados);
});

app.get("/api/alimentos/precios", (req, res) => {
  const { nombre, comercio } = req.query;
  let lista = db.alimentos;
  if (nombre) lista = lista.filter((a) => a.nombre.toLowerCase().includes(nombre.toLowerCase()));
  if (comercio && comercio !== "Todos") lista = lista.filter((a) => a.comercio.toLowerCase() === comercio.toLowerCase());
  lista.sort((a, b) => a.precio - b.precio);
  res.json(lista);
});

app.post("/api/consumos", (req, res) => {
  const { usuarioId = "u1", alimentoId, porciones, fecha } = req.body;
  const alimento = db.alimentos.find((a) => a.id === alimentoId);
  if (!alimento || !porciones || porciones <= 0) {
    return res.status(400).json({ error: "Alimento inválido o porciones incorrectas" });
  }
  const porcionesNum = Number(porciones);
  const caloriasTotales = Math.round(alimento.caloriasPorPorcion * porcionesNum);
  const consumo = { id: `c_${Date.now()}`, usuarioId, alimentoId, nombreAlimento: alimento.nombre, porciones: porcionesNum, caloriasTotales, fecha: fecha || new Date().toISOString().split("T")[0] };
  db.consumos.unshift(consumo);
  res.status(201).json(consumo);
});

app.get("/api/consumos/:usuarioId/resumen", (req, res) => {
  const { usuarioId } = req.params;
  const { rango = "diario" } = req.query;
  const perfil = db.perfiles[usuarioId] || { objetivoCaloriasDiarias: 2000 };
  const objetivoDiario = perfil.objetivoCaloriasDiarias;
  const hoyStr = new Date().toISOString().split("T")[0];

  let consumosFiltrados = [];
  let objetivoAplicable = objetivoDiario;

  if (rango === "semanal") {
    const hace7 = new Date();
    hace7.setDate(hace7.getDate() - 6);
    const limiteStr = hace7.toISOString().split("T")[0];
    consumosFiltrados = db.consumos.filter((c) => c.usuarioId === usuarioId && c.fecha >= limiteStr);
    objetivoAplicable = objetivoDiario * 7;
  } else {
    consumosFiltrados = db.consumos.filter((c) => c.usuarioId === usuarioId && c.fecha === hoyStr);
  }

  const totalConsumido = consumosFiltrados.reduce((acc, item) => acc + item.caloriasTotales, 0);

  res.json({
    rango,
    totalConsumido,
    objetivo: objetivoAplicable,
    diferencia: objetivoAplicable - totalConsumido,
    porcentaje: Math.round((totalConsumido / objetivoAplicable) * 100),
    registros: consumosFiltrados,
  });
});

app.get("/api/peso/:usuarioId/historial", (req, res) => {
  const historial = db.historialPeso.filter((p) => p.usuarioId === req.params.usuarioId);
  res.json({ historial, comparacionReciente: historial.length > 1 ? { variacionMensual: Number((historial[historial.length-1].valor - historial[historial.length-2].valor).toFixed(1)) } : null });
});

app.post("/api/peso", (req, res) => {
  const { usuarioId = "u1", valor, fecha } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: "Peso inválido" });
  const fechaStr = fecha || new Date().toISOString().split("T")[0];
  const registro = { id: `p_${Date.now()}`, usuarioId, valor: Number(valor), fecha: fechaStr, mes: fechaStr.slice(0, 7) };
  db.historialPeso.push(registro);
  res.status(201).json(registro);
});

app.listen(PORT, () => {
  console.log(`Servidor NutriMeta corriendo en http://localhost:${PORT}`);
});