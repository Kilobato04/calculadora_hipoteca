# Calculadora Hipotecaria · Cofinavit + Banco

Simulador interactivo para planeación de hipoteca con esquema Cofinavit (Infonavit + crédito bancario), enfocado en escenarios de copropiedad, pre-pagos con finiquito laboral y ahorro acumulado pre-firma.

## Características

- **Cálculo en tiempo real** sin guardado de datos · todo se procesa en el navegador
- **Estructura financiera transparente:** desglose de recursos vs aplicación con detección de déficit por concepto
- **Simulador de pre-pagos** con tres escenarios independientes:
  - Aplicación de finiquito laboral
  - Ahorro mensual + aguinaldo (Oct–Ene)
  - Escenario combinado
- **Cálculo inverso de ahorro** dado un objetivo de mensualidad
- **Presets de seguros bancarios:** simula impacto del CAT al desbundlear pólizas
- **Validación de liquidez al cierre** con sugerencias automáticas para cubrir déficit
- **Diseño editorial responsive** en paleta neutra para uso de mesa con broker

## Estructura del proyecto

```
calculadora-hipotecaria/
├── index.html          # Markup y estructura
├── styles.css          # Estilos · paleta neutra editorial
├── app.js              # Lógica de cálculos (amortización francesa, pre-pagos, déficit)
├── netlify.toml        # Configuración de deploy en Netlify
├── .gitignore          # Exclusiones de Git
├── LICENSE             # MIT
└── README.md           # Este archivo
```

## Uso local

No requiere build ni dependencias. Abre `index.html` directamente en el navegador, o con un servidor estático:

```bash
# Opción 1: Python
python3 -m http.server 8000

# Opción 2: Node (npx)
npx serve .
```

Visita `http://localhost:8000`.

## Deploy en Netlify

Este repo está configurado para deploy automático en Netlify desde la rama `main`. Al hacer push, Netlify detecta los cambios y publica la nueva versión.

Configuración de deploy en `netlify.toml`:
- Sitio estático sin build step
- Carpeta de publicación: raíz (`.`)
- Headers de seguridad básicos aplicados

## Tecnología

- HTML5 semántico
- CSS3 con variables custom · sin frameworks
- JavaScript vanilla · sin dependencias
- Tipografía: Fraunces (display) + Inter Tight (body) + JetBrains Mono (datos numéricos), vía Google Fonts

## Aviso

Calculadora de uso personal. Los resultados son estimaciones con base en fórmulas estándar de amortización francesa. Validar con asesor financiero o broker bancario antes de tomar decisiones. No constituye asesoría financiera, legal ni fiscal.

## Licencia

MIT
