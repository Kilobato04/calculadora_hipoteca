const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const fmt2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  const pct = (n) => (isFinite(n) ? n.toFixed(2) + '%' : '—');
  const num = (id) => parseFloat(document.getElementById(id).value) || 0;
  const set = (id, val) => { document.getElementById(id).textContent = val; };

  function pagoFrances(principal, tasaAnual, anios) {
    if (principal <= 0 || anios <= 0) return 0;
    const n = anios * 12;
    const i = (tasaAnual / 100) / 12;
    if (i === 0) return principal / n;
    return principal * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  }

  // Saldo insoluto tras k meses pagados (sin abonos extra)
  function saldoInsoluto(principal, tasaAnual, anios, mesesPagados) {
    if (mesesPagados <= 0) return principal;
    const n = anios * 12;
    const i = (tasaAnual / 100) / 12;
    if (i === 0) return Math.max(0, principal - (principal / n) * mesesPagados);
    const factor = Math.pow(1 + i, mesesPagados);
    const factorTotal = Math.pow(1 + i, n);
    const saldo = principal * (factorTotal - factor) / (factorTotal - 1);
    return Math.max(0, saldo);
  }

  // Saldo tras k meses con abonos mensuales extra constantes + aguinaldo en mes 3
  function saldoConAbonosMensuales(principal, tasaAnual, anios, pagoRegular, abonoMensual, aguinaldo, mesesAplicados) {
    const i = (tasaAnual / 100) / 12;
    let s = principal;
    for (let k = 1; k <= mesesAplicados; k++) {
      s = s * (1 + i) - pagoRegular - abonoMensual;
      if (k === 3) s -= aguinaldo; // Diciembre
    }
    return Math.max(0, s);
  }

  // Calcular abono mensual necesario para alcanzar un saldo objetivo
  function calcularAhorroParaObjetivo(principal, tasaAnual, anios, pagoRegular, aguinaldo, mesesAplicados, finiquitoRemanente, saldoObjetivo) {
    // Búsqueda binaria
    let lo = 0, hi = 500000;
    for (let iter = 0; iter < 80; iter++) {
      const mid = (lo + hi) / 2;
      // Saldo con abonos mensuales + aguinaldo + finiquito al final
      let s = saldoConAbonosMensuales(principal, tasaAnual, anios, pagoRegular, mid, aguinaldo, mesesAplicados);
      s -= finiquitoRemanente;
      if (s > saldoObjetivo) lo = mid;
      else hi = mid;
    }
    return Math.max(0, (lo + hi) / 2);
  }

  // Calcular saldo que produce un pago objetivo dados plazo restante y tasa
  function saldoParaPagoObjetivo(pagoObjetivo, tasaAnual, mesesRestantes) {
    const i = (tasaAnual / 100) / 12;
    if (i === 0) return pagoObjetivo * mesesRestantes;
    return pagoObjetivo * (Math.pow(1+i, mesesRestantes) - 1) / (i * Math.pow(1+i, mesesRestantes));
  }

  // Nuevo pago mensual tras reducir principal
  function nuevoPagoTrasAbono(saldoActual, abono, tasaAnual, mesesRestantes) {
    const nuevoSaldo = Math.max(0, saldoActual - abono);
    if (nuevoSaldo <= 0 || mesesRestantes <= 0) return { pago: 0, saldo: 0 };
    const i = (tasaAnual / 100) / 12;
    if (i === 0) return { pago: nuevoSaldo / mesesRestantes, saldo: nuevoSaldo };
    const pago = nuevoSaldo * (i * Math.pow(1 + i, mesesRestantes)) / (Math.pow(1 + i, mesesRestantes) - 1);
    return { pago, saldo: nuevoSaldo };
  }

  // Plazo buttons
  document.querySelectorAll('.plazo-group').forEach(group => {
    const target = group.dataset.target;
    group.querySelectorAll('.plazo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.plazo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).value = btn.dataset.val;
        calcular();
      });
    });
  });

  // Bank tabs
  const bankPresets = {
    banamex: { tasa: 10.25, cat: 15.00, name: 'Banamex' },
    banorte: { tasa: 10.50, cat: 13.50, name: 'Banorte' }
  };
  document.querySelectorAll('.bank-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bank-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const preset = bankPresets[tab.dataset.bank];
      document.getElementById('tasaBanco').value = preset.tasa;
      document.getElementById('catBanco').value = preset.cat;
      document.getElementById('bankName').textContent = preset.name;
      calcular();
    });
  });

  // Toggles
  document.querySelectorAll('.toggle').forEach(t => {
    t.addEventListener('click', () => {
      t.classList.toggle('active');
      const targetId = t.dataset.target;
      if (targetId) {
        const target = document.getElementById(targetId);
        target.style.display = t.classList.contains('active') ? 'grid' : 'none';
      }
      calcular();
    });
  });

  // Finiquito toggle (standalone, no display target)
  document.getElementById('tgFiniquito').addEventListener('click', () => {
    const statusEl = document.getElementById('finiquitoStatus');
    const isActive = document.getElementById('tgFiniquito').classList.contains('active');
    statusEl.classList.toggle('active', isActive);
    statusEl.textContent = isActive ? 'Activo' : 'Inactivo';
    document.getElementById('dotFiniquito').parentElement.classList.toggle('enabled', isActive);
    calcular();
  });

  // Ahorro toggle
  document.getElementById('tgAhorro').addEventListener('click', () => {
    const statusEl = document.getElementById('ahorroStatus');
    const isActive = document.getElementById('tgAhorro').classList.contains('active');
    statusEl.classList.toggle('active', isActive);
    statusEl.textContent = isActive ? 'Activo' : 'Inactivo';
    document.getElementById('dotAhorro').parentElement.classList.toggle('enabled', isActive);
    calcular();
  });

  // Sub-tabs del simulador
  document.querySelectorAll('.sub-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.pane).classList.add('active');
    });
  });

  // Auto-llenar ahorro con el óptimo calculado
  document.getElementById('btnAutoAhorro').addEventListener('click', () => {
    const optimo = parseFloat(document.getElementById('ahorroRequerido').dataset.value || '0');
    if (optimo > 0) {
      document.getElementById('ahorroMensual').value = Math.round(optimo);
      // Asegurar que ambos toggles estén activos para el escenario combinado
      if (!document.getElementById('tgFiniquito').classList.contains('active')) {
        document.getElementById('tgFiniquito').click();
      }
      if (!document.getElementById('tgAhorro').classList.contains('active')) {
        document.getElementById('tgAhorro').click();
      } else {
        calcular();
      }
    }
  });

  // Limpiar ahorro
  document.getElementById('btnClearAhorro').addEventListener('click', () => {
    document.getElementById('ahorroMensual').value = 0;
    calcular();
  });

  // Presets de seguros
  const seguroPresets = {
    banamex: {
      vida: true, danos: true,
      vidaMonto: 450, danosMonto: 600,
      cat: 15.00,
      nota: 'Banamex bundle: seguros incluidos en pago mensual. CAT alto ~15% — considera desbundlear para ahorrar ~$350/mes.'
    },
    propio: {
      vida: false, danos: false,
      vidaMonto: 0, danosMonto: 0,
      cat: 11.50,
      nota: 'Pólizas propias: daños ya cubierto por cuota de mantenimiento; vida cubierto por seguro de empresa. Negociar CAT ~11.5% con Banamex.'
    },
    ninguno: {
      vida: false, danos: false,
      vidaMonto: 0, danosMonto: 0,
      cat: 11.00,
      nota: 'Sin seguros Banamex. Asegúrate que las coberturas propias aplican durante toda la vigencia del crédito.'
    }
  };

  document.querySelectorAll('.seguro-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      // Visual state
      document.querySelectorAll('.seguro-preset').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'var(--bg)';
        b.style.color = 'var(--ink-soft)';
        b.style.borderColor = 'var(--line)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--ink)';
      btn.style.color = 'var(--bg)';
      btn.style.borderColor = 'var(--ink)';

      const preset = seguroPresets[btn.dataset.preset];

      // Vida toggle
      const tgVida = document.getElementById('tgSeguroVida');
      const seguroVidaWrap = document.getElementById('seguroVidaWrap');
      if (preset.vida) {
        tgVida.classList.add('active');
        seguroVidaWrap.style.display = 'grid';
      } else {
        tgVida.classList.remove('active');
        seguroVidaWrap.style.display = 'none';
      }
      document.getElementById('seguroVida').value = preset.vidaMonto;

      // Daños toggle
      const tgDanos = document.getElementById('tgSeguroDanos');
      const seguroDanosWrap = document.getElementById('seguroDanosWrap');
      if (preset.danos) {
        tgDanos.classList.add('active');
        seguroDanosWrap.style.display = 'grid';
      } else {
        tgDanos.classList.remove('active');
        seguroDanosWrap.style.display = 'none';
      }
      document.getElementById('seguroDanos').value = preset.danosMonto;

      // CAT
      document.getElementById('catBanco').value = preset.cat;

      // Nota
      document.getElementById('seguroPresetNote').textContent = preset.nota;

      calcular();
    });
  });

  function calcular() {
    const precio = num('precioCasa');
    const participacion = num('participacion');
    const miParte = precio * (participacion / 100);
    set('miParte', fmt.format(miParte));

    // === Textos dinámicos basados en % de participación ===
    const pctStr = participacion.toFixed(0) + '%';
    const pctParejaStr = (100 - participacion).toFixed(0) + '%';
    document.getElementById('headerEyebrow').textContent =
      `Corrida Hipotecaria · Mi parte (${pctStr})`;
    document.getElementById('headerDesc').textContent =
      `Simulador enfocado en mi ${pctStr} de la propiedad. La parte de mi pareja (${pctParejaStr}) ya está cubierta por separado e incluye sus propios gastos notariales.`;
    document.getElementById('notarioSectionTitle').textContent =
      `Gastos notariales (mi ${pctStr})`;
    document.getElementById('checkEngancheLabel').textContent =
      `Enganche mi parte (${pctStr})`;

    // Recursos propios
    const ahorroFirme = num('ahorroFirme');
    const ahorroExtra = num('ahorroExtra');
    const saldoSub = num('saldoSubcuenta');
    const recursoPropio = ahorroFirme + ahorroExtra;
    const ahorroLiquidoEfectivo = ahorroFirme - saldoSub + ahorroExtra;
    document.getElementById('ahorroLiquidoEfectivo').value = ahorroLiquidoEfectivo.toLocaleString('es-MX');
    set('engancheLiquido', fmt.format(recursoPropio));

    // Infonavit
    const credInf = num('creditoInfonavit');
    const plazoInf = num('plazoInfonavit');
    const tasaInf = num('tasaInfonavit');
    const catInf = num('catInfonavit');
    const retencionMensual = num('retencionMensual');
    const fondoProteccion = num('fondoProteccion');
    const aportPatronal = num('aportacionPatronal');
    const gastosTitPct = num('gastosTitulacionPct');
    const comInf = num('comisionInfonavit');
    const gastosTit = credInf * (gastosTitPct / 100);
    const pagoInfTeorico = pagoFrances(credInf, tasaInf, plazoInf);
    const totalIntInf = (pagoInfTeorico * plazoInf * 12) - credInf;
    const egresoMensualInf = retencionMensual + fondoProteccion;

    // Bank
    const credBco = num('creditoBanco');
    const plazoBco = num('plazoBanco');
    const tasaBco = num('tasaBanco');
    const catBco = num('catBanco');
    const comBco = num('comisionBanco');
    const avaluo = num('avaluo');
    const segVidaActive = document.getElementById('tgSeguroVida').classList.contains('active');
    const segDanosActive = document.getElementById('tgSeguroDanos').classList.contains('active');
    const segVida = segVidaActive ? num('seguroVida') : 0;
    const segDanos = segDanosActive ? num('seguroDanos') : 0;
    const pagoBco = pagoFrances(credBco, tasaBco, plazoBco);
    const totalIntBco = (pagoBco * plazoBco * 12) - credBco;
    const pagoTotalBco = pagoBco + segVida + segDanos;

    document.getElementById('seguroVidaAnual').value = (segVida * 12).toLocaleString('es-MX');
    document.getElementById('seguroDanosAnual').value = (segDanos * 12).toLocaleString('es-MX');

    // Gastos notariales
    const gastosTotalNot = num('gastosNotarialesTotal');
    const gastosMiPct = num('gastosPct');
    const miGastosNot = gastosTotalNot * (gastosMiPct / 100);
    set('miGastosNotariales', fmt.format(miGastosNot));

    // ¿Notario consolidado al crédito? Si sí, no compromete liquidez al cierre
    const notarioConsolidado = document.getElementById('tgNotarioConsolidado').classList.contains('active');
    const miGastosNotLiquidos = notarioConsolidado ? 0 : miGastosNot;

    // Liquidación informativa
    const liquidacion = num('liquidacion');
    set('liquidacionDisplay', '+ ' + fmt.format(liquidacion));

    // Capacidad de pago (DTI)
    const ingresoNeto = num('ingresoNeto');
    const dtiTargetVal = num('dtiTarget');
    const pagoMaxSaludable = ingresoNeto * (dtiTargetVal / 100);
    document.getElementById('pagoMaxSaludable').value = Math.round(pagoMaxSaludable).toLocaleString('es-MX');

    // Summary
    const pagoMensualTotal = egresoMensualInf + pagoTotalBco;
    set('pagoMensualTotal', Math.round(pagoMensualTotal).toLocaleString('es-MX'));
    set('pagoInfonavit', fmt.format(egresoMensualInf));
    set('pagoBanco', fmt.format(pagoTotalBco));

    // Estructura
    // IMPORTANTE: cuando el notario se consolida al crédito Banamex, el crédito
    // incluye un extra = miGastosNot. Ese extra NO es "excedente libre" — es dinero
    // que financia el notario. Lo mostramos con transparencia:

    // Parte del crédito Banamex destinada a la compra vs al notario
    const credBcoParaCompra = notarioConsolidado ? Math.max(0, credBco - miGastosNot) : credBco;
    const credBcoParaNotario = notarioConsolidado ? Math.min(credBco, miGastosNot) : 0;

    const recursosTotales = recursoPropio + credInf + credBco;
    // Necesidad REAL siempre incluye todos los gastos (líquidos o consolidados)
    const necesidadTotal = miParte + miGastosNot + gastosTit + comBco + avaluo + comInf;

    set('rPrecio', fmt.format(precio));
    set('rParticipacion', participacion.toFixed(0) + '% del valor');
    set('rMiParte', fmt.format(miParte));
    set('rEnganche', fmt.format(recursoPropio));
    set('rInfonavitNeto', fmt.format(credInf));
    set('rBanco', fmt.format(credBco));

    // Subtítulo del crédito Banamex indicando si incluye notario
    if (notarioConsolidado && miGastosNot > 0) {
      document.getElementById('rBancoSub').textContent =
        `${fmt.format(credBcoParaCompra)} compra + ${fmt.format(miGastosNot)} notario`;
    } else {
      document.getElementById('rBancoSub').textContent = 'Financiamiento de la compra';
    }

    // Notario con etiqueta de origen
    set('rNotarioVal', fmt.format(miGastosNot));
    if (notarioConsolidado) {
      document.getElementById('rNotarioSub').textContent = 'Consolidado al crédito Banamex · no es líquido';
    } else {
      document.getElementById('rNotarioSub').textContent = 'Líquido · pagar al cierre';
    }

    set('rTitulacionVal', fmt.format(gastosTit));
    set('rComisionesVal', fmt.format(comBco + avaluo + comInf));
    set('rTotalRecursos', fmt.format(recursosTotales));
    set('rNecesidadTotal', fmt.format(necesidadTotal));

    const balanceGeneral = recursosTotales - necesidadTotal;
    const rBal = document.getElementById('rBalance');
    const rBalLabel = document.getElementById('rBalanceLabel');
    if (Math.abs(balanceGeneral) < 1000) {
      rBal.textContent = fmt.format(0) + ' · cuadra';
      rBal.style.color = 'var(--positive)';
      rBalLabel.textContent = 'Diferencia';
    } else if (balanceGeneral > 0) {
      rBal.textContent = '+ ' + fmt.format(balanceGeneral);
      rBal.style.color = 'var(--positive)';
      rBalLabel.textContent = 'Excedente de recursos';
    } else {
      rBal.textContent = '− ' + fmt.format(Math.abs(balanceGeneral));
      rBal.style.color = 'var(--negative)';
      rBalLabel.textContent = 'Déficit · faltan recursos';
    }

    // Verify strip
    const vs = document.getElementById('verifyStrip');
    const vt = document.getElementById('verifyText');
    const financiamientoMiParte = recursoPropio + credInf + credBco;
    const diffMiParte = financiamientoMiParte - miParte;
    if (Math.abs(diffMiParte) < 1000) {
      vs.className = 'verify-strip ok';
      vt.textContent = `Recursos cuadran exactamente con mi 45% (${fmt.format(miParte)}).`;
    } else if (diffMiParte > 0) {
      vs.className = 'verify-strip ok';
      const notaConsol = notarioConsolidado ? ' (notario ya en crédito Banamex)' : '';
      vt.textContent = `Recursos superan mi 45% por ${fmt.format(diffMiParte)}${notaConsol} — excedente cubre gastos líquidos (${fmt.format(miGastosNotLiquidos + gastosTit)}).`;
    } else {
      vs.className = 'verify-strip warn';
      vt.textContent = `Faltan ${fmt.format(Math.abs(diffMiParte))} para cubrir mi 45% del valor.`;
    }

    // Infonavit block
    set('infPrincipal', fmt2.format(credInf));
    set('infTasas', tasaInf.toFixed(2) + '% · ' + catInf.toFixed(2) + '%');
    set('infPlazo', plazoInf + ' años (' + (plazoInf * 12) + ' meses)');
    set('infMensualidad', fmt2.format(pagoInfTeorico));
    set('infRetencion', fmt2.format(retencionMensual));
    set('infFPP', fmt2.format(fondoProteccion));
    set('infEgresoTotal', fmt2.format(egresoMensualInf));
    set('infAportPatronal', '+ ' + fmt2.format(aportPatronal));
    set('infInteresesTotales', fmt.format(totalIntInf));
    set('infGastosTit', fmt.format(gastosTit));

    // Bank block
    set('bcoPrincipal', fmt.format(credBco));
    set('bcoTasas', tasaBco.toFixed(2) + '% · ' + catBco.toFixed(2) + '%');
    set('bcoPlazo', plazoBco + ' años (' + (plazoBco * 12) + ' meses)');
    set('bcoMensualidad', fmt.format(pagoBco));
    set('bcoSegVida', segVidaActive ? fmt.format(segVida) : 'No aplica');
    set('bcoSegDanos', segDanosActive ? fmt.format(segDanos) : 'No aplica');
    set('bcoTotal', fmt.format(pagoTotalBco));
    set('bcoInteresesTotales', fmt.format(totalIntBco));
    set('bcoComision', fmt.format(comBco + avaluo));

    // Gastos
    set('gnTotal', fmt.format(gastosTotalNot));
    set('gnPct', gastosMiPct + '% del total');
    set('gnMiParte', notarioConsolidado ? `${fmt.format(miGastosNot)} (en crédito)` : fmt.format(miGastosNot));
    set('gnTitulacion', fmt.format(gastosTit));
    set('gnBanco', fmt.format(comBco + avaluo));
    const totalGastosMi = miGastosNotLiquidos + gastosTit + comBco + avaluo + comInf;
    set('gnTotalMi', fmt.format(totalGastosMi));

    // Balance líquido
    // ========= CÁLCULO UNIFICADO DE LIQUIDEZ AL CIERRE =========
    // Una sola fuente de verdad para todas las secciones que evalúan déficit/excedente.
    //
    // Premisa: al cierre necesitas cubrir CON LIQUIDEZ los siguientes conceptos:
    //   a) La parte de mi 45% que los créditos NO alcanzan a cubrir
    //      - El crédito Banamex puede estar inflado para incluir notario (consolidado)
    //      - Por eso usamos credBcoParaCompra, no credBco
    //   b) Gastos obligatoriamente líquidos:
    //      - Titulación Infonavit (no se puede consolidar)
    //      - Comisiones apertura + avalúo
    //      - Notario líquido (si NO está consolidado en el crédito)
    //
    // Si recursoPropio cubre todo → excedente
    // Si no alcanza → déficit
    //
    const aporteLiquidoEnganche = Math.max(0, miParte - credInf - credBcoParaCompra);
    const gastosObligatoriosLiquidos = gastosTit + comBco + avaluo + comInf;
    const gastosNotarioLiquido = notarioConsolidado ? 0 : miGastosNot;
    const liquidezRequeridaTotal = aporteLiquidoEnganche + gastosObligatoriosLiquidos + gastosNotarioLiquido;
    const liquidezDisponible = recursoPropio;

    // UNA SOLA MÉTRICA: positivo = déficit (falta); negativo = excedente (sobra)
    const deficitTotal = liquidezRequeridaTotal - liquidezDisponible;

    // balanceLiquido y excedenteRecursos para retrocompatibilidad con las secciones viejas
    // (ambas reflejan la misma realidad que deficitTotal, con signo invertido)
    const balanceLiquido = -deficitTotal;
    const excedenteRecursos = recursosTotales - miParte;
    const gastosACubrir = gastosNotarioLiquido + gastosObligatoriosLiquidos;

    // Variables legacy usadas más abajo en la sección de alerta
    const liquidezRequeridaEnganche = aporteLiquidoEnganche;

    // Evaluar cada concepto individualmente: lo ideal es cubrir cada concepto
    // Pero como el dinero es fungible, el análisis es del total
    // Sin embargo, mostramos qué "alcanza y qué no" si fueran pagos secuenciales

    let remanenteLiquidez = liquidezDisponible;

    // Concepto 1: Enganche
    const cubiertoEnganche = Math.min(remanenteLiquidez, liquidezRequeridaEnganche);
    const deficitEnganche = Math.max(0, liquidezRequeridaEnganche - cubiertoEnganche);
    remanenteLiquidez = Math.max(0, remanenteLiquidez - liquidezRequeridaEnganche);

    // Concepto 2: Notario líquido
    const cubiertoNotario = Math.min(remanenteLiquidez, miGastosNotLiquidos);
    const deficitNotario = Math.max(0, miGastosNotLiquidos - cubiertoNotario);
    remanenteLiquidez = Math.max(0, remanenteLiquidez - miGastosNotLiquidos);

    // Concepto 3: Titulación Infonavit
    const cubiertoTitulacion = Math.min(remanenteLiquidez, gastosTit);
    const deficitTitulacion = Math.max(0, gastosTit - cubiertoTitulacion);
    remanenteLiquidez = Math.max(0, remanenteLiquidez - gastosTit);

    // Concepto 4: Comisiones
    const comisionesTotal = comBco + avaluo + comInf;
    const cubiertoComisiones = Math.min(remanenteLiquidez, comisionesTotal);
    const deficitComisiones = Math.max(0, comisionesTotal - cubiertoComisiones);
    remanenteLiquidez = Math.max(0, remanenteLiquidez - comisionesTotal);

    function renderCheck(elId, requerido, deficit, label) {
      const row = document.getElementById(elId);
      const icon = row.querySelector('.deficit-icon');
      const val = row.querySelector('.value');
      const lbl = row.querySelector('.label');
      if (requerido <= 0) {
        icon.textContent = '—';
        icon.style.background = 'var(--ink-muted)';
        val.textContent = 'No aplica';
        val.style.color = 'var(--ink-muted)';
        row.classList.remove('deficit-row');
      } else if (deficit <= 0) {
        icon.textContent = '✓';
        icon.style.background = 'var(--positive)';
        val.textContent = fmt.format(requerido);
        val.style.color = 'var(--ink)';
        row.classList.remove('deficit-row');
      } else {
        icon.textContent = '!';
        icon.style.background = 'var(--negative)';
        val.textContent = `Falta ${fmt.format(deficit)}`;
        val.style.color = 'var(--negative)';
        row.classList.add('deficit-row');
      }
    }

    renderCheck('checkEnganche', liquidezRequeridaEnganche, deficitEnganche, 'Enganche');
    renderCheck('checkNotario', miGastosNotLiquidos, deficitNotario, 'Notario');
    renderCheck('checkTitulacion', gastosTit, deficitTitulacion, 'Titulación');
    renderCheck('checkComisiones', comisionesTotal, deficitComisiones, 'Comisiones');

    // Estado general
    const alertSection = document.getElementById('deficitAlertSection');
    const alertTitle = document.getElementById('deficitAlertTitle');
    const alertNum = document.getElementById('deficitAlertNum');
    const mainStatus = document.getElementById('deficitMainStatus');
    const mainLabel = document.getElementById('deficitMainLabel');
    const mainSub = document.getElementById('deficitMainSub');
    const mainAmount = document.getElementById('deficitMainAmount');
    const sugerenciasBox = document.getElementById('deficitSugerencias');
    const opcionesList = document.getElementById('deficitOpcionesList');

    if (deficitTotal <= 0) {
      // Todo OK
      alertSection.style.borderLeftColor = 'var(--positive)';
      alertSection.style.background = 'linear-gradient(135deg,rgba(61,90,61,0.04),var(--bg-card))';
      alertTitle.textContent = 'Validación de liquidez al cierre';
      alertNum.textContent = '✓';
      alertNum.style.color = 'var(--positive)';
      mainStatus.style.background = 'rgba(61,90,61,0.08)';
      mainLabel.textContent = 'Liquidez suficiente al cierre';
      mainSub.textContent = `Excedente de ${fmt.format(-deficitTotal)} después de enganche + gastos líquidos`;
      mainAmount.textContent = '+ ' + fmt.format(-deficitTotal);
      mainAmount.style.color = 'var(--positive)';
      sugerenciasBox.style.display = 'none';
    } else {
      // Déficit detectado
      alertSection.style.borderLeftColor = 'var(--negative)';
      alertSection.style.background = 'linear-gradient(135deg,rgba(139,58,46,0.05),var(--bg-card))';
      alertTitle.textContent = '⚠ Déficit detectado';
      alertNum.textContent = '!';
      alertNum.style.color = 'var(--negative)';
      mainStatus.style.background = 'rgba(139,58,46,0.08)';
      mainLabel.textContent = 'Faltan recursos líquidos al cierre';
      mainSub.textContent = `Requeridos ${fmt.format(liquidezRequeridaTotal)} · disponibles ${fmt.format(liquidezDisponible)}`;
      mainAmount.textContent = '− ' + fmt.format(deficitTotal);
      mainAmount.style.color = 'var(--negative)';

      // Generar opciones para cubrir déficit
      sugerenciasBox.style.display = 'block';
      const opciones = [];

      // Opción 1: Aumentar crédito Banamex
      const nuevoCreditoBanamex = credBco + deficitTotal;
      const nuevoPagoBanamex = pagoFrances(nuevoCreditoBanamex, tasaBco, plazoBco);
      const impactoPago = nuevoPagoBanamex - pagoBco;
      opciones.push({
        label: `<strong>Aumentar crédito Banamex</strong> a ${fmt.format(nuevoCreditoBanamex)}`,
        sub: `Impacto mensualidad: +${fmt.format(impactoPago)}/mes`,
        value: '+ ' + fmt.format(deficitTotal)
      });

      // Opción 2: Aumentar ahorro previo a firma
      opciones.push({
        label: `<strong>Ahorro adicional antes de firma</strong>`,
        sub: `Aumenta el campo "Ahorro extra a capital" en la sección 02`,
        value: '+ ' + fmt.format(deficitTotal)
      });

      // Opción 3: Negociar reducción notario
      if (deficitNotario > 0 && !notarioConsolidado) {
        opciones.push({
          label: `<strong>Consolidar notario al crédito</strong>`,
          sub: `Activa el toggle en sección 05 para eliminar ${fmt.format(miGastosNotLiquidos)} de necesidad líquida`,
          value: '+ ' + fmt.format(miGastosNotLiquidos)
        });
      }

      // Opción 4: Reducir monto del notario negociado
      if (miGastosNot > 300000) {
        const notarioNegociado = Math.max(300000, gastosTotalNot * 0.7);
        const ahorroNegociacion = (gastosTotalNot - notarioNegociado) * (gastosMiPct / 100);
        if (ahorroNegociacion > 0) {
          opciones.push({
            label: `<strong>Negociar notario a la baja</strong> (30% descuento típico)`,
            sub: `Reducir de ${fmt.format(gastosTotalNot)} a ${fmt.format(notarioNegociado)} total`,
            value: '+ ' + fmt.format(ahorroNegociacion)
          });
        }
      }

      opcionesList.innerHTML = opciones.map(o => `
        <div class="deficit-option">
          <div class="opt-label">${o.label}<br><span style="color:var(--ink-muted);font-size:11px">${o.sub}</span></div>
          <div class="opt-value">${o.value}</div>
        </div>
      `).join('');
    }

    // Balance líquido (se mantiene la sección original)

    set('balEnganche', fmt.format(recursoPropio));
    set('balDiferencia', fmt.format(miParte));
    set('balGastos', fmt.format(gastosACubrir));
    const balNetoEl = document.getElementById('balDiferenciaNeta');
    if (balanceLiquido >= 0) {
      balNetoEl.textContent = '+ ' + fmt.format(balanceLiquido);
      balNetoEl.style.color = 'var(--positive)';
    } else {
      balNetoEl.textContent = '− ' + fmt.format(Math.abs(balanceLiquido));
      balNetoEl.style.color = 'var(--negative)';
    }

    const box = document.getElementById('deficitBox');
    const label = document.getElementById('deficitLabel');
    const sub = document.getElementById('deficitSub');
    const amt = document.getElementById('deficitAmount');

    if (balanceLiquido >= 0) {
      box.classList.remove('negative');
      box.classList.add('positive');
      label.textContent = 'Excedente disponible';
      sub.textContent = 'Cubre mi parte + gastos con margen';
      amt.textContent = '+ ' + fmt.format(balanceLiquido);
    } else {
      box.classList.remove('positive');
      box.classList.add('negative');
      label.textContent = 'Déficit · solicitar excedente';
      sub.textContent = 'Aumentar crédito bancario o aportar más líquido';
      amt.textContent = '− ' + fmt.format(Math.abs(balanceLiquido));
    }

    // Sugerencia al broker — crédito bancario óptimo
    // Lógica: el crédito debe ser exactamente lo necesario para que NO haya déficit líquido ni excedente
    // Usamos deficitTotal (métrica de liquidez REAL) en vez de balanceLiquido (que mezcla créditos + recursos)
    //
    //   Si deficitTotal > 0 (falta liquidez real): aumentar crédito por ese monto
    //   Si deficitTotal < 0 (sobra liquidez): reducir crédito por el excedente líquido
    //
    const ajusteCredito = deficitTotal; // déficit (+) → aumentar; excedente (−) → reducir
    const creditoBancoOptimo = Math.max(0, credBco + ajusteCredito);

    set('sugBancoOrig', fmt.format(credBco));

    const sugExcEl = document.getElementById('sugExcedente');
    const sugLabelEl = document.getElementById('sugAjusteLabel');
    if (ajusteCredito > 1) {
      // Déficit: pedir más
      sugLabelEl.textContent = 'Monto adicional a solicitar';
      sugExcEl.textContent = '+ ' + fmt.format(ajusteCredito);
      sugExcEl.style.color = 'var(--negative)';
    } else if (ajusteCredito < -1) {
      // Excedente: pedir menos
      sugLabelEl.textContent = 'Reducción recomendada';
      sugExcEl.textContent = '− ' + fmt.format(Math.abs(ajusteCredito));
      sugExcEl.style.color = 'var(--positive)';
    } else {
      sugLabelEl.textContent = 'Ajuste recomendado';
      sugExcEl.textContent = fmt.format(0);
      sugExcEl.style.color = 'var(--ink)';
    }

    set('sugBancoFinal', fmt.format(creditoBancoOptimo));

    // === Hint del crédito óptimo junto al input editable ===
    // Muestra diferencia vs el actual y ofrece botón para aplicar
    const creditoOptimoText = document.getElementById('creditoOptimoText');
    const btnAplicarOptimo = document.getElementById('btnAplicarOptimo');
    const diff = creditoBancoOptimo - credBco;
    if (Math.abs(diff) < 100) {
      creditoOptimoText.textContent = '✓ Monto óptimo al cierre';
      creditoOptimoText.style.color = 'var(--positive)';
      btnAplicarOptimo.style.display = 'none';
    } else if (diff > 0) {
      creditoOptimoText.innerHTML = `Óptimo: <strong style="color:var(--negative)">${fmt.format(creditoBancoOptimo)}</strong> (+${fmt.format(diff)})`;
      btnAplicarOptimo.style.display = 'inline-block';
      btnAplicarOptimo.dataset.target = Math.round(creditoBancoOptimo);
    } else {
      creditoOptimoText.innerHTML = `Óptimo: <strong style="color:var(--positive)">${fmt.format(creditoBancoOptimo)}</strong> (−${fmt.format(Math.abs(diff))})`;
      btnAplicarOptimo.style.display = 'inline-block';
      btnAplicarOptimo.dataset.target = Math.round(creditoBancoOptimo);
    }

    // ========= SIMULADOR DE PRE-PAGOS =========
    const finiquitoActivo = document.getElementById('tgFiniquito').classList.contains('active');
    const ahorroActivo = document.getElementById('tgAhorro').classList.contains('active');

    // El finiquito es el mismo monto que la liquidación declarada en sección 06
    // Mantenemos el campo `finiquitoMonto` visible pero siempre refleja `liquidacion`
    document.getElementById('finiquitoMonto').value = liquidacion;
    const finiquitoBruto = liquidacion;
    const penalizacion = num('penalizacion');
    const finiquitoNeto = finiquitoBruto * (1 - penalizacion / 100);

    const ahorroMens = num('ahorroMensual');
    const mesesAhorro = num('mesesAhorro');
    const aguinaldo = num('aguinaldo');
    const objetivoMensual = num('objetivoMensual');

    // === Cálculo inverso: ¿cuánto ahorro mensual para alcanzar objetivo? ===
    const objetivoPI = Math.max(0, objetivoMensual - segVida - segDanos);
    const plazoBcoMeses = plazoBco * 12;
    const mesesYaPagados = mesesAhorro; // los 4 meses de oct-ene
    const mesesRestantesBco = plazoBcoMeses - mesesYaPagados;
    const saldoNecesarioObjetivo = saldoParaPagoObjetivo(objetivoPI, tasaBco, mesesRestantesBco);

    // Saldo Infonavit al mes 4 (para calcular remanente finiquito)
    const plazoInfMeses = plazoInf * 12;
    const saldoInfMes4Calc = saldoInsoluto(credInf, tasaInf, plazoInf, mesesYaPagados);
    const remanenteFiniquitoSiLiquida = Math.max(0, finiquitoNeto - saldoInfMes4Calc);

    // Pago regular Banamex original
    const pagoRegularBco = pagoBco; // P+I sin seguros (abonos se descuentan aparte)

    // Calcular ahorro óptimo
    const ahorroOptimo = calcularAhorroParaObjetivo(
      credBco, tasaBco, plazoBco, pagoRegularBco, aguinaldo,
      mesesYaPagados, remanenteFiniquitoSiLiquida, saldoNecesarioObjetivo
    );

    // Mostrar ahorro requerido
    const ahorroReqEl = document.getElementById('ahorroRequerido');
    ahorroReqEl.textContent = fmt.format(ahorroOptimo) + '/mes';
    ahorroReqEl.dataset.value = ahorroOptimo;
    document.getElementById('ahorroRequeridoSub').textContent =
      `Σ ${fmt.format(ahorroOptimo * mesesAhorro)} + aguinaldo ${fmt.format(aguinaldo)}`;

    // Timeline de abonos mensuales
    set('tlOct', fmt.format(ahorroMens));
    set('tlNov', fmt.format(ahorroMens));
    set('tlDic', fmt.format(ahorroMens + aguinaldo));
    set('tlEne', fmt.format(ahorroMens));
    const totalAbonosOctEne = ahorroMens * mesesAhorro + aguinaldo;
    set('tlTotalAhorro', fmt.format(totalAbonosOctEne));

    // Mini cards
    set('miMensuales', fmt.format(ahorroMens * mesesAhorro));
    set('miAguinaldo', fmt.format(aguinaldo));
    set('miTotal', fmt.format(totalAbonosOctEne));
    set('miAbonoBanamex', ahorroActivo ? '+ ' + fmt.format(totalAbonosOctEne) : '—');

    // Combined tab status indicators
    document.getElementById('comboFiniquitoStatus').textContent = finiquitoActivo ? '●' : '○';
    document.getElementById('comboFiniquitoStatus').style.color = finiquitoActivo ? 'var(--positive)' : 'var(--ink-muted)';
    document.getElementById('comboAhorroStatus').textContent = ahorroActivo ? '●' : '○';
    document.getElementById('comboAhorroStatus').style.color = ahorroActivo ? 'var(--positive)' : 'var(--ink-muted)';
    set('comboAhorroAcum', ahorroActivo ? '+ ' + fmt.format(totalAbonosOctEne) : '—');

    // Escenario ANTES (pagos normales 4 meses sin abonos extra)
    const pagoAntesInfonavit = egresoMensualInf;
    const pagoAntesBanco = pagoTotalBco;
    const pagoAntesTotal = pagoAntesInfonavit + pagoAntesBanco;

    // Saldos al mes 4 sin ningún abono extra (escenario "antes")
    const saldoInfMes4 = saldoInsoluto(credInf, tasaInf, plazoInf, mesesYaPagados);
    const saldoBcoMes4Natural = saldoInsoluto(credBco, tasaBco, plazoBco, mesesYaPagados);
    const deudaAntesTotal = saldoInfMes4 + saldoBcoMes4Natural;

    // Intereses restantes escenario antes
    const intInfAntesRestantes = (pagoFrances(credInf, tasaInf, plazoInf) * (plazoInfMeses - mesesYaPagados)) - saldoInfMes4;
    const intBcoAntesRestantes = (pagoBco * (plazoBcoMeses - mesesYaPagados)) - saldoBcoMes4Natural;
    const intAntesTotalRestantes = intInfAntesRestantes + intBcoAntesRestantes;

    // === Escenario DESPUÉS (con pre-pagos activos) ===
    // Saldo Banamex al mes 4 considerando abonos mensuales directos (si ahorro activo)
    const saldoBcoMes4ConAbonos = ahorroActivo
      ? saldoConAbonosMensuales(credBco, tasaBco, plazoBco, pagoRegularBco, ahorroMens, aguinaldo, mesesYaPagados)
      : saldoBcoMes4Natural;

    // Aplicación del finiquito al final del mes 4
    let pagoAInfonavit = 0;
    let abonoFiniquitoBanco = 0;
    let infonavitLiquidado = false;

    if (finiquitoActivo) {
      pagoAInfonavit = Math.min(finiquitoNeto, saldoInfMes4);
      abonoFiniquitoBanco = finiquitoNeto - pagoAInfonavit;
      infonavitLiquidado = pagoAInfonavit >= saldoInfMes4 - 1;
    }

    // Saldo Banamex final tras finiquito remanente
    const nuevoSaldoBco = Math.max(0, saldoBcoMes4ConAbonos - abonoFiniquitoBanco);
    const abonoTotalBanamex = (ahorroActivo ? totalAbonosOctEne : 0) + abonoFiniquitoBanco;

    // Nuevo pago Banamex
    const { pago: nuevoPagoBcoPI } = nuevoPagoTrasAbono(nuevoSaldoBco, 0, tasaBco, mesesRestantesBco);
    const nuevoPagoTotalBco = nuevoSaldoBco > 0 ? (nuevoPagoBcoPI + segVida + segDanos) : 0;
    const nuevosInteresesBco = nuevoSaldoBco > 0
      ? (nuevoPagoBcoPI * mesesRestantesBco) - nuevoSaldoBco
      : 0;

    const anyActive = finiquitoActivo || ahorroActivo;
    const infLiquidadoFinal = finiquitoActivo && infonavitLiquidado;
    const saldoInfDespues = infLiquidadoFinal ? 0 : Math.max(0, saldoInfMes4 - pagoAInfonavit);
    const pagoDespuesInf = infLiquidadoFinal ? 0 : pagoAntesInfonavit;
    const pagoDespuesBco = nuevoPagoTotalBco;
    const pagoDespuesTotal = pagoDespuesInf + pagoDespuesBco;
    const deudaDespuesTotal = saldoInfDespues + nuevoSaldoBco;

    const intInfRestantes = infLiquidadoFinal ? 0 : intInfAntesRestantes;
    const intDespuesTotal = intInfRestantes + nuevosInteresesBco;

    const ahorroMensualFinal = pagoAntesTotal - pagoDespuesTotal;
    const ahorroInteresesFinal = intAntesTotalRestantes - intDespuesTotal;

    // Update pasos visuales
    set('simFiniquitoNeto', fmt.format(finiquitoNeto));
    document.getElementById('simFiniquitoSub').textContent =
      penalizacion > 0 ? `Bruto ${fmt.format(finiquitoBruto)} − ${penalizacion}%` : 'Sin penalización';
    set('simPagoInfonavit', fmt.format(pagoAInfonavit));
    document.getElementById('simInfonavitSub').textContent =
      finiquitoActivo ? (infonavitLiquidado ? 'Liquidado completo' : 'Liquidación parcial') : 'Sin aplicar';
    set('simAbonoBanco', fmt.format(abonoTotalBanamex));
    document.getElementById('simBancoSub').textContent =
      (finiquitoActivo || ahorroActivo)
        ? (finiquitoActivo && ahorroActivo ? 'Abonos + remanente finiquito' : (finiquitoActivo ? 'Remanente finiquito' : 'Abonos mensuales'))
        : 'Sin aplicar';

    document.getElementById('simStep1').classList.toggle('applied', finiquitoActivo);
    document.getElementById('simStep2').classList.toggle('applied', finiquitoActivo && pagoAInfonavit > 0);
    document.getElementById('simStep3').classList.toggle('applied', (finiquitoActivo || ahorroActivo) && abonoTotalBanamex > 0);

    // Comparación
    set('simPagoAntes', fmt.format(pagoAntesTotal) + '/mes');
    set('simInfAntes', fmt.format(pagoAntesInfonavit));
    set('simBcoAntes', fmt.format(pagoAntesBanco));
    set('simDeudaAntes', fmt.format(deudaAntesTotal));
    set('simIntAntes', fmt.format(intAntesTotalRestantes));

    let sideLabel = 'Después';
    if (finiquitoActivo && ahorroActivo) sideLabel = 'Después: finiquito + abonos';
    else if (finiquitoActivo) sideLabel = 'Después del finiquito';
    else if (ahorroActivo) sideLabel = 'Después de abonos Oct–Ene';
    document.getElementById('sideLabelDespues').textContent = sideLabel;

    if (anyActive) {
      set('simPagoDespues', fmt.format(pagoDespuesTotal) + '/mes');
      set('simInfDespues', infLiquidadoFinal ? 'Liquidado ✓' : fmt.format(pagoDespuesInf));
      set('simBcoDespues', fmt.format(pagoDespuesBco));
      set('simDeudaDespues', fmt.format(deudaDespuesTotal));
      set('simIntDespues', fmt.format(intDespuesTotal));
      set('simAhorroMensualResult', '− ' + fmt.format(ahorroMensualFinal) + '/mes');

      let subText = '';
      if (finiquitoActivo && ahorroActivo) {
        subText = `Infonavit liquidado + ${fmt.format(abonoTotalBanamex)} a Banamex (saldo: ${fmt.format(nuevoSaldoBco)})`;
      } else if (finiquitoActivo) {
        subText = infLiquidadoFinal
          ? `Infonavit liquidado · ${fmt.format(abonoFiniquitoBanco)} a Banamex`
          : 'Abono parcial a Infonavit';
      } else {
        subText = `${fmt.format(totalAbonosOctEne)} a Banamex en abonos mensuales`;
      }
      document.getElementById('simAhorroSub').textContent = subText;
      set('simAhorroIntereses', '− ' + fmt.format(ahorroInteresesFinal));
      document.getElementById('simAhorroIntSub').textContent =
        `Ahorro en intereses en los ${Math.round(mesesRestantesBco/12)} años restantes`;

      set('comboAplicacion', fmt.format(abonoTotalBanamex + pagoAInfonavit));

      // Indicador visual: ¿se alcanzó el objetivo?
      if (Math.abs(pagoDespuesBco - objetivoMensual) < 50) {
        document.getElementById('simPagoDespues').style.color = 'var(--positive)';
      } else {
        document.getElementById('simPagoDespues').style.color = 'var(--positive)';
      }
    } else {
      set('simPagoDespues', '— /mes');
      set('simInfDespues', '—');
      set('simBcoDespues', '—');
      set('simDeudaDespues', '—');
      set('simIntDespues', '—');
      set('simAhorroMensualResult', '—');
      document.getElementById('simAhorroSub').textContent = 'Activa módulos para ver el impacto';
      set('simAhorroIntereses', '—');
      document.getElementById('simAhorroIntSub').textContent = 'Activa módulos para ver el impacto';
      set('comboAplicacion', '—');
    }

    // === ANÁLISIS DE SENSIBILIDAD DE PARTICIPACIÓN ===
    renderSensibilidad({
      precio, credInf, credBco, tasaBco, plazoBco,
      recursoPropio, gastosTotalNot, gastosTit,
      comBco, avaluo, comInf, notarioConsolidado,
      segVida, segDanos, participacionActual: participacion,
      egresoMensualInf, ingresoNeto: num('ingresoNeto'), dtiTarget: num('dtiTarget')
    });
  }

  // Render de tabla de sensibilidad al % de participación
  function renderSensibilidad(params) {
    const {
      precio, credInf, credBco, tasaBco, plazoBco,
      recursoPropio, gastosTotalNot, gastosTit,
      comBco, avaluo, comInf, notarioConsolidado,
      segVida, segDanos, participacionActual,
      egresoMensualInf, ingresoNeto, dtiTarget
    } = params;

    const tbody = document.getElementById('sensitivityBody');
    const insight = document.getElementById('sensitivityInsight');
    if (!tbody) return;

    // Capacidad de pago mensual derivada del DTI
    const pagoMaxTotal = ingresoNeto * (dtiTarget / 100);

    const rangos = [];
    // Barrido 38% a 50% en pasos de 1%
    for (let p = 38; p <= 50; p++) {
      const miParte = precio * (p / 100);
      const miNotario = gastosTotalNot * (p / 100);

      // Crédito óptimo al cierre para este %
      // Derivado de liquidez_req = recurso_propio
      // miParte - credInf - (credOpt - notarioConsol) + gastosObligLiq + notarioLiq = recursoPropio
      // Si notario consolidado:
      //   credOpt = miParte - credInf + miNotario + gastosObligLiq - recursoPropio
      // Si no:
      //   credOpt = miParte - credInf + gastosObligLiq + miNotario - recursoPropio
      // (resulta el mismo en ambos casos porque los conceptos suman igual)
      const gastosObligLiq = gastosTit + comBco + avaluo + comInf;
      const creditoOpt = Math.max(0, miParte - credInf + miNotario + gastosObligLiq - recursoPropio);

      // Déficit al cierre con el crédito ACTUAL (fijo en credBco), NO el óptimo
      // Esto muestra cuánto faltaría/sobraría si se mantiene el crédito actual
      const credBcoParaCompra = notarioConsolidado ? Math.max(0, credBco - miNotario) : credBco;
      const aporteLiq = Math.max(0, miParte - credInf - credBcoParaCompra);
      const gastosNotarioLiq = notarioConsolidado ? 0 : miNotario;
      const liquidezReq = aporteLiq + gastosObligLiq + gastosNotarioLiq;
      const deficit = liquidezReq - recurso_propio_safe(recursoPropio);

      // Pago mensual con crédito óptimo
      const pagoPI = pagoFrances(creditoOpt, tasaBco, plazoBco);
      const pagoTotalBanco = pagoPI + segVida + segDanos;
      const pagoTotalMensual = egresoMensualInf + pagoTotalBanco;
      const dtiResultante = ingresoNeto > 0 ? (pagoTotalMensual / ingresoNeto) * 100 : 0;
      const dtiOK = pagoTotalMensual <= pagoMaxTotal;

      rangos.push({
        p, miParte, miNotario, deficit, creditoOpt,
        pagoTotal: pagoTotalMensual, dti: dtiResultante, dtiOK
      });
    }

    // ==== Criterio de óptimo ====
    // El óptimo realista es el % MÁS ALTO que cumple AMBOS:
    //   (a) deficit ≤ 0 (liquidez al cierre alcanza)
    //   (b) dtiOK (pago mensual cabe en el DTI target)
    // Si no existe ningún % que cumpla ambos, mostrar el que más se acerque
    const candidatos = rangos.filter(r => r.deficit <= 0 && r.dtiOK);
    const optimo = candidatos.length > 0
      ? candidatos[candidatos.length - 1]  // el % más alto que cumple ambos
      : rangos.reduce((best, r) => {
          // Fallback: el que tenga menos "dolor" combinado
          const dolor = Math.max(0, r.deficit) / 100000 + Math.max(0, r.pagoTotal - pagoMaxTotal) / 1000;
          const dolorBest = Math.max(0, best.deficit) / 100000 + Math.max(0, best.pagoTotal - pagoMaxTotal) / 1000;
          return dolor < dolorBest ? r : best;
        }, rangos[0]);

    // Render tabla
    tbody.innerHTML = rangos.map(r => {
      const isCurrent = r.p === Math.round(participacionActual);
      const isOptimal = r.p === optimo.p;
      const deficitColor = r.deficit > 1 ? 'var(--negative)' : r.deficit < -1 ? 'var(--positive)' : 'var(--ink)';
      const deficitText = r.deficit > 1
        ? '+ ' + fmt.format(r.deficit)
        : r.deficit < -1
          ? '− ' + fmt.format(Math.abs(r.deficit))
          : fmt.format(0);
      const dtiColor = r.dtiOK ? 'var(--positive)' : 'var(--negative)';
      const dtiIcon = r.dtiOK ? '✓' : '✗';

      let bgStyle = '';
      let badge = '';
      if (isCurrent && isOptimal) {
        bgStyle = 'background:rgba(61,90,61,0.12);font-weight:500';
        badge = ' <span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--positive);letter-spacing:0.08em">ACTUAL · ÓPTIMO</span>';
      } else if (isCurrent) {
        bgStyle = 'background:rgba(122,106,79,0.08);font-weight:500';
        badge = ' <span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--accent);letter-spacing:0.08em">ACTUAL</span>';
      } else if (isOptimal) {
        bgStyle = 'background:rgba(61,90,61,0.06)';
        badge = ' <span style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:var(--positive);letter-spacing:0.08em">ÓPTIMO</span>';
      }

      return `<tr style="border-bottom:1px dotted var(--line-soft);${bgStyle}">
        <td style="padding:8px 6px;font-family:'JetBrains Mono',monospace">${r.p}%${badge}</td>
        <td style="padding:8px 6px;text-align:right;font-family:'JetBrains Mono',monospace">${fmt.format(r.miParte)}</td>
        <td style="padding:8px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:${deficitColor}">${deficitText}</td>
        <td style="padding:8px 6px;text-align:right;font-family:'JetBrains Mono',monospace">${fmt.format(r.creditoOpt)}</td>
        <td style="padding:8px 6px;text-align:right;font-family:'JetBrains Mono',monospace">${fmt.format(r.pagoTotal)}</td>
        <td style="padding:8px 6px;text-align:right;font-family:'JetBrains Mono',monospace;color:${dtiColor}">${r.dti.toFixed(1)}% ${dtiIcon}</td>
      </tr>`;
    }).join('');

    // Insight textual
    const actual = rangos.find(r => r.p === Math.round(participacionActual));
    if (actual && optimo) {
      if (actual.p === optimo.p) {
        insight.innerHTML = `<strong>Estás en el punto óptimo.</strong> Tu ${actual.p}% cumple ambos criterios: liquidez al cierre (${actual.deficit <= 0 ? 'con excedente de ' + fmt.format(-actual.deficit) : 'déficit ' + fmt.format(actual.deficit)}) y DTI sano (${actual.dti.toFixed(1)}% del ingreso neto, bajo el ${dtiTarget}% target).`;
      } else {
        const direccion = optimo.p > actual.p ? 'subir' : 'bajar';
        const motivoActual = [];
        if (actual.deficit > 1) motivoActual.push(`déficit de ${fmt.format(actual.deficit)} al cierre`);
        if (!actual.dtiOK) motivoActual.push(`pago mensual ${fmt.format(actual.pagoTotal)} excede el DTI target (${fmt.format(pagoMaxTotal)})`);

        insight.innerHTML = `<strong>Óptimo recomendado: ${optimo.p}%.</strong> Tu ${actual.p}% actual ${motivoActual.length ? 'presenta: ' + motivoActual.join(' · ') : 'es viable pero deja margen desaprovechado'}. ${direccion === 'bajar' ? 'Bajando' : 'Subiendo'} a ${optimo.p}% obtendrías: pago mensual ${fmt.format(optimo.pagoTotal)} (DTI ${optimo.dti.toFixed(1)}%), crédito bancario ${fmt.format(optimo.creditoOpt)}, mi parte ${fmt.format(optimo.miParte)}.`;
      }
    }
  }

  // Helper: recurso propio seguro
  function recurso_propio_safe(v) { return v || 0; }

  document.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.addEventListener('input', calcular);
  });

  // Sincronización % participación ↔ % gastos notariales
  // Si el usuario no ha modificado manualmente gastosPct, se sincroniza con participacion
  let gastosPctManualOverride = false;
  const participacionInput = document.getElementById('participacion');
  const gastosPctInput = document.getElementById('gastosPct');
  const gastosPctHint = document.getElementById('gastosPctHint');

  gastosPctInput.addEventListener('input', (e) => {
    // Detectar si el usuario modificó manualmente (no vía sync programático)
    if (!e.isTrusted) return; // cambio programático, ignorar
    const participacionVal = parseFloat(participacionInput.value) || 0;
    const gastosVal = parseFloat(gastosPctInput.value) || 0;
    if (Math.abs(gastosVal - participacionVal) > 0.01) {
      gastosPctManualOverride = true;
      gastosPctHint.textContent = 'override manual · doble click para resincronizar';
      gastosPctHint.style.color = 'var(--warning)';
    } else {
      gastosPctManualOverride = false;
      gastosPctHint.textContent = 'sincronizado con sección 01';
      gastosPctHint.style.color = 'var(--ink-muted)';
    }
  });

  // Doble click en gastosPct para resincronizar
  gastosPctInput.addEventListener('dblclick', () => {
    gastosPctManualOverride = false;
    gastosPctInput.value = participacionInput.value;
    gastosPctHint.textContent = 'sincronizado con sección 01';
    gastosPctHint.style.color = 'var(--ink-muted)';
    calcular();
  });

  // Cuando cambia participacion, si no hay override, sincronizar gastosPct
  participacionInput.addEventListener('input', () => {
    if (!gastosPctManualOverride) {
      gastosPctInput.value = participacionInput.value;
    }
    // calcular() ya se dispara por el listener general
  });

  // Aplicar crédito óptimo sugerido al input editable
  document.getElementById('btnAplicarOptimo').addEventListener('click', () => {
    const btn = document.getElementById('btnAplicarOptimo');
    const target = parseFloat(btn.dataset.target || '0');
    if (target > 0) {
      document.getElementById('creditoBanco').value = target;
      calcular();
    }
  });

  // ============================================================
  // PERSISTENCIA · Google Sheets vía Apps Script webhook
  // ============================================================
  //
  // CONFIGURACIÓN:
  // 1. Despliega el Apps Script (ver apps-script.gs) como web app
  // 2. Pega la URL del webhook y el token aquí abajo
  // 3. El token debe coincidir con SECRET_TOKEN del Apps Script
  //
  // Si dejas WEBHOOK_URL vacío, los botones mostrarán un mensaje de config
  //
  const WEBHOOK_URL = ''; // ← pega aquí la URL del Apps Script (termina en /exec)
  const WEBHOOK_TOKEN = ''; // ← pega aquí el SECRET_TOKEN del Apps Script

  // Campos con inputs numéricos/texto
  const FIELD_IDS = [
    'precioCasa', 'participacion',
    'ahorroFirme', 'ahorroExtra', 'saldoSubcuenta',
    'creditoInfonavit', 'plazoInfonavit', 'tasaInfonavit', 'catInfonavit',
    'retencionMensual', 'fondoProteccion', 'aportacionPatronal',
    'gastosTitulacionPct', 'comisionInfonavit',
    'creditoBanco', 'plazoBanco', 'tasaBanco', 'catBanco',
    'comisionBanco', 'avaluo',
    'seguroVida', 'seguroDanos',
    'gastosNotarialesTotal', 'gastosPct',
    'liquidacion', 'liquidacionFecha',
    'ingresoNeto', 'dtiTarget',
    'penalizacion', 'ahorroMensual', 'mesesAhorro', 'aguinaldo',
    'objetivoMensual'
  ];

  // Toggles (booleanos)
  const TOGGLE_IDS = {
    seguroVidaActivo: 'tgSeguroVida',
    seguroDanosActivo: 'tgSeguroDanos',
    notarioConsolidado: 'tgNotarioConsolidado',
    finiquitoActivo: 'tgFiniquito',
    ahorroActivo: 'tgAhorro'
  };

  function leerTextoDesplegado(id) {
    // Lee el contenido de textContent y limpia formato de moneda/porcentaje
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.textContent || '').trim();
  }

  function recolectarDatos(nombreEscenario, notas) {
    const data = {
      escenario_nombre: nombreEscenario || '(sin nombre)',
      notas: notas || ''
    };

    // Inputs de valor
    FIELD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const v = el.value;
        // Convertir a número si parece numérico; dejar como texto si no
        const n = parseFloat(v);
        data[id] = (!isNaN(n) && isFinite(n)) ? n : v;
      }
    });

    // Toggles
    Object.keys(TOGGLE_IDS).forEach(dataKey => {
      const el = document.getElementById(TOGGLE_IDS[dataKey]);
      data[dataKey] = el ? el.classList.contains('active') : false;
    });

    // Snapshot de resultados calculados (lectura del DOM)
    // Extrae el número del formato de moneda
    const parseMoney = (str) => {
      if (!str) return null;
      const cleaned = str.replace(/[^\d.-]/g, '');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    };

    data.resultado_miParte = parseMoney(leerTextoDesplegado('miParte'));
    data.resultado_pagoMensualTotal = parseFloat(
      (document.getElementById('pagoMensualTotal').textContent || '0').replace(/[^\d.-]/g, '')
    );
    data.resultado_pagoInfonavit = parseMoney(leerTextoDesplegado('pagoInfonavit'));
    data.resultado_pagoBanco = parseMoney(leerTextoDesplegado('pagoBanco'));
    data.resultado_creditoBancoOptimo = parseMoney(leerTextoDesplegado('sugBancoFinal'));

    // Déficit total: lo extraemos del texto del monto principal
    const deficitStr = leerTextoDesplegado('deficitMainAmount');
    const deficitNum = parseMoney(deficitStr);
    // Si tenía "+" es excedente (positivo), si "−" es déficit (negativo para nosotros)
    // En el schema, deficitTotal positivo = déficit (falta), negativo = excedente
    const esExcedente = deficitStr.includes('+');
    data.resultado_deficitTotal = deficitNum !== null
      ? (esExcedente ? -Math.abs(deficitNum) : Math.abs(deficitNum))
      : null;

    // DTI actual resultante
    const ingreso = parseFloat(document.getElementById('ingresoNeto').value) || 0;
    if (ingreso > 0 && data.resultado_pagoMensualTotal) {
      data.resultado_dtiActual = +((data.resultado_pagoMensualTotal / ingreso) * 100).toFixed(2);
    } else {
      data.resultado_dtiActual = null;
    }

    return data;
  }

  function mostrarEstado(tipo, mensaje) {
    const el = document.getElementById('persistStatus');
    el.className = 'persist-status ' + tipo;
    el.textContent = mensaje;
    if (tipo === 'ok') {
      setTimeout(() => { el.className = 'persist-status'; el.textContent = ''; }, 5000);
    }
  }

  // Guardar escenario
  document.getElementById('btnGuardarEscenario').addEventListener('click', async () => {
    if (!WEBHOOK_URL || !WEBHOOK_TOKEN) {
      mostrarEstado('err', '⚠ Configura WEBHOOK_URL y WEBHOOK_TOKEN en app.js');
      return;
    }

    const nombre = document.getElementById('escenarioNombre').value.trim();
    const notas = document.getElementById('escenarioNotas').value.trim();
    if (!nombre) {
      mostrarEstado('err', 'Ingresa un nombre para el escenario antes de guardar');
      document.getElementById('escenarioNombre').focus();
      return;
    }

    mostrarEstado('loading', 'Guardando escenario...');
    try {
      const data = recolectarDatos(nombre, notas);
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        // Apps Script no acepta preflight CORS con application/json; usamos text/plain
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: WEBHOOK_TOKEN, data: data })
      });
      const result = await res.json();
      if (result.ok) {
        mostrarEstado('ok', `✓ Guardado en fila ${result.row}`);
        // Limpiar inputs para el próximo escenario
        document.getElementById('escenarioNombre').value = '';
        document.getElementById('escenarioNotas').value = '';
      } else {
        mostrarEstado('err', '✗ ' + (result.error || 'Error desconocido'));
      }
    } catch (err) {
      mostrarEstado('err', '✗ Error de red: ' + err.message);
    }
  });

  // Cargar último escenario guardado
  document.getElementById('btnCargarUltimo').addEventListener('click', async () => {
    if (!WEBHOOK_URL || !WEBHOOK_TOKEN) {
      mostrarEstado('err', '⚠ Configura WEBHOOK_URL y WEBHOOK_TOKEN en app.js');
      return;
    }
    if (!confirm('¿Cargar el último escenario guardado? Se reemplazarán los valores actuales.')) return;

    mostrarEstado('loading', 'Cargando...');
    try {
      const url = `${WEBHOOK_URL}?token=${encodeURIComponent(WEBHOOK_TOKEN)}`;
      const res = await fetch(url, { method: 'GET' });
      const result = await res.json();
      if (!result.ok) {
        mostrarEstado('err', '✗ ' + (result.error || 'Error desconocido'));
        return;
      }
      if (!result.data) {
        mostrarEstado('err', 'Sin escenarios guardados todavía');
        return;
      }
      aplicarDatosACalculadora(result.data);
      mostrarEstado('ok', `✓ Cargado escenario "${result.data.escenario_nombre || '(sin nombre)'}" (fila ${result.row})`);
    } catch (err) {
      mostrarEstado('err', '✗ Error de red: ' + err.message);
    }
  });

  function aplicarDatosACalculadora(data) {
    // Aplicar valores a inputs
    FIELD_IDS.forEach(id => {
      if (data[id] !== undefined && data[id] !== null && data[id] !== '') {
        const el = document.getElementById(id);
        if (el) el.value = data[id];
      }
    });

    // Aplicar toggles
    Object.keys(TOGGLE_IDS).forEach(dataKey => {
      const el = document.getElementById(TOGGLE_IDS[dataKey]);
      if (!el) return;
      const deseado = data[dataKey] === true || data[dataKey] === 'SÍ';
      const actual = el.classList.contains('active');
      if (deseado !== actual) {
        el.click(); // usa el handler existente para sincronizar estado visible
      }
    });

    // Nombre del escenario cargado en el input
    if (data.escenario_nombre) {
      document.getElementById('escenarioNombre').value = data.escenario_nombre;
    }
    if (data.notas) {
      document.getElementById('escenarioNotas').value = data.notas;
    }

    // Recalcular toda la hoja
    calcular();
  }

  document.getElementById('btnReset').addEventListener('click', () => {
    if (confirm('¿Restablecer todos los valores?')) location.reload();
  });
  document.getElementById('btnPrint').addEventListener('click', () => window.print());

  calcular();
