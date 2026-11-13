const API = "http://localhost:3001/api";
const USUARIO_ID = "u1";
let rangoResumen = "diario";

function cambiarTab(tab) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.className = "tab-btn px-3.5 py-2 rounded-xl text-sm font-medium text-emerald-100 hover:bg-emerald-600 cursor-pointer";
  });
  document.getElementById(`seccion-${tab}`).classList.remove('hidden');
  document.getElementById(`btn-${tab}`).className = "tab-btn px-3.5 py-2 rounded-xl text-sm font-medium bg-white text-emerald-800 shadow-sm cursor-pointer";

  if (tab === 'perfil') cargarPerfil();
  if (tab === 'consumos') { cargarAlimentosSelect(); cargarResumenConsumos(); }
  if (tab === 'alimentos') filtrarAlimentos();
  if (tab === 'peso') cargarHistorialPeso();
}

async function cargarPerfil() {
  try {
    const res = await fetch(`${API}/perfil/${USUARIO_ID}`);
    const data = await res.json();
    if (res.ok) {
      document.getElementById('p-nombre').value = data.nombre || '';
      document.getElementById('p-edad').value = data.edad || '';
      document.getElementById('p-sexo').value = data.sexo || 'M';
      document.getElementById('p-altura').value = data.altura || '';
      document.getElementById('p-peso').value = data.peso || '';
      document.getElementById('p-calorias').value = data.objetivoCaloriasDiarias || 2000;
    }
    cargarHistorialIMC();
  } catch (err) { console.error(err); }
}

async function guardarPerfil(e) {
  e.preventDefault();
  const payload = {
    usuarioId: USUARIO_ID,
    nombre: document.getElementById('p-nombre').value,
    edad: document.getElementById('p-edad').value,
    sexo: document.getElementById('p-sexo').value,
    altura: document.getElementById('p-altura').value,
    peso: document.getElementById('p-peso').value,
    objetivoCaloriasDiarias: document.getElementById('p-calorias').value
  };

  try {
    const resP = await fetch(`${API}/perfil`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const dataP = await resP.json();
    if (!resP.ok) throw new Error(dataP.error);

    const resIMC = await fetch(`${API}/imc`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ usuarioId: USUARIO_ID, peso: payload.peso, altura: payload.altura, sexo: payload.sexo })
    });
    const dataIMC = await resIMC.json();

    document.getElementById('msg-perfil').innerHTML = `<div class="p-3 mb-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">Perfil guardado e IMC calculado correctamente.</div>`;
    mostrarResultadoIMC(dataIMC);
    cargarHistorialIMC();
  } catch (err) {
    document.getElementById('msg-perfil').innerHTML = `<div class="p-3 mb-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">${err.message}</div>`;
  }
}

function mostrarResultadoIMC(item) {
  document.getElementById('imc-resultado-contenido').innerHTML = `
    <div class="mt-2 flex items-baseline gap-4">
      <span class="text-4xl font-extrabold text-slate-900">${item.imc}</span>
      <span class="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">${item.categoria}</span>
    </div>
    ${item.detalleSexo ? `<p class="mt-2 text-sm text-slate-600">${item.detalleSexo}</p>` : ''}
  `;
}

async function cargarHistorialIMC() {
  try {
    const res = await fetch(`${API}/imc/${USUARIO_ID}`);
    const data = await res.json();
    if (data.length > 0) mostrarResultadoIMC(data[0]);
    document.getElementById('historial-imc-lista').innerHTML = data.map(h => `
      <div class="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100">
        <div><strong>IMC ${h.imc}</strong> — ${h.categoria} (${h.peso}kg / ${h.altura}m)</div>
        <div class="text-xs text-slate-400">${new Date(h.fecha).toLocaleDateString()}</div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function cargarAlimentosSelect() {
  try {
    const res = await fetch(`${API}/alimentos`);
    const data = await res.json();
    document.getElementById('select-alimentos').innerHTML = data.map(a => `
      <option value="${a.id}">${a.nombre} (${a.caloriasPorPorcion} kcal) - $${a.precio} [${a.comercio}]</option>
    `).join('');
  } catch (err) { console.error(err); }
}

async function registrarConsumo(e) {
  e.preventDefault();
  const payload = {
    usuarioId: USUARIO_ID,
    alimentoId: document.getElementById('select-alimentos').value,
    porciones: document.getElementById('c-porciones').value
  };
  try {
    const res = await fetch(`${API}/consumos`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Error al registrar");
    document.getElementById('msg-consumo').innerHTML = `<div class="p-2 mb-2 bg-emerald-50 text-emerald-700 text-xs rounded">Consumo agregado.</div>`;
    cargarResumenConsumos();
  } catch (err) {
    document.getElementById('msg-consumo').innerHTML = `<div class="p-2 mb-2 bg-red-50 text-red-700 text-xs rounded">${err.message}</div>`;
  }
}

function cambiarRangoResumen(r) {
  rangoResumen = r;
  document.getElementById('btn-rango-diario').className = r === 'diario' ? "px-3 py-1 rounded-lg text-sm font-medium bg-white shadow text-emerald-700 cursor-pointer" : "px-3 py-1 rounded-lg text-sm font-medium text-slate-600 cursor-pointer";
  document.getElementById('btn-rango-semanal').className = r === 'semanal' ? "px-3 py-1 rounded-lg text-sm font-medium bg-white shadow text-emerald-700 cursor-pointer" : "px-3 py-1 rounded-lg text-sm font-medium text-slate-600 cursor-pointer";
  cargarResumenConsumos();
}

async function cargarResumenConsumos() {
  try {
    const res = await fetch(`${API}/consumos/${USUARIO_ID}/resumen?rango=${rangoResumen}`);
    const data = await res.json();
    document.getElementById('resumen-calorico-box').innerHTML = `
      <div class="flex justify-between font-semibold mb-1">
        <span>Consumido: ${data.totalConsumido} kcal</span>
        <span>Objetivo: ${data.objetivo} kcal (${data.porcentaje}%)</span>
      </div>
      <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div class="h-3 bg-emerald-600 rounded-full transition-all" style="width: ${Math.min(data.porcentaje, 100)}%"></div>
      </div>
    `;
    document.getElementById('lista-registros-consumo').innerHTML = data.registros.map(r => `
      <div class="flex justify-between items-center p-2 rounded border border-slate-100 bg-slate-50 text-xs">
        <span>${r.nombreAlimento} (${r.porciones} porción/es)</span>
        <span class="font-bold text-emerald-700">${r.caloriasTotales} kcal</span>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function filtrarAlimentos() {
  const nombre = document.getElementById('filtro-nombre').value;
  const comercio = document.getElementById('filtro-comercio').value;
  try {
    const res = await fetch(`${API}/alimentos/precios?nombre=${encodeURIComponent(nombre)}&comercio=${encodeURIComponent(comercio)}`);
    const data = await res.json();
    document.getElementById('grid-alimentos').innerHTML = data.map(item => `
      <div class="p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
        <div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${item.categoria}</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 ml-1">${item.comercio}</span>
          <h3 class="font-bold text-slate-800 mt-2">${item.nombre}</h3>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span class="text-sm text-slate-600">${item.caloriasPorPorcion} kcal</span>
          <span class="text-lg font-extrabold text-emerald-700">$${item.precio}</span>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function cargarHistorialPeso() {
  try {
    const res = await fetch(`${API}/peso/${USUARIO_ID}/historial`);
    const data = await res.json();
    document.getElementById('historial-peso-box').innerHTML = data.historial.map(p => `
      <div class="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
        <span>Mes: <strong>${p.mes}</strong> (${p.fecha})</span>
        <span class="font-bold text-emerald-700">${p.valor} kg</span>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function agregarPeso(e) {
  e.preventDefault();
  const valor = document.getElementById('peso-valor').value;
  try {
    const res = await fetch(`${API}/peso`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ usuarioId: USUARIO_ID, valor })
    });
    if (!res.ok) throw new Error("Error al registrar peso");
    document.getElementById('peso-valor').value = '';
    document.getElementById('msg-peso').innerHTML = `<div class="p-2 mb-2 bg-emerald-50 text-emerald-700 text-xs rounded">Peso guardado.</div>`;
    cargarHistorialPeso();
  } catch (err) {
    document.getElementById('msg-peso').innerHTML = `<div class="p-2 mb-2 bg-red-50 text-red-700 text-xs rounded">${err.message}</div>`;
  }
}

// Cargar perfil al iniciar
cargarPerfil();