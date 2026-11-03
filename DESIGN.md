---
name: Mis Nonos
description: Sistema visual "Calma clínica" para la app de la residencia, mobile first, en modo claro y oscuro.
colors:
  salmon: "#fa8072"
  salmon-on: "#1f0f0b"
  salmon-ink: "#863a2a"
  salmon-tint: "#fde8de"
  salmon-wash: "#fef1eb"
  emergency-red: "#b42318"
  danger-surface: "#fef3f2"
  danger-border: "#fecdca"
  warning-surface: "#fef4e6"
  warning-text: "#93370d"
  success-surface: "#ecfdf3"
  success-text: "#067647"
  info-surface: "#eff4ff"
  info-text: "#1849a9"
  ink: "#16201e"
  ink-muted: "#57625f"
  paper: "#ffffff"
  surface: "#f7faf9"
  muted: "#f3f6f5"
  line: "#dfe6e3"
  dark-salmon: "#f28b78"
  dark-salmon-on: "#2a110c"
  dark-salmon-ink: "#f7a796"
  dark-salmon-tint: "#3b211b"
  dark-background: "#0e1513"
  dark-card: "#151e1b"
  dark-muted: "#1c2724"
  dark-line: "#26332f"
  dark-ink: "#e8eeec"
  dark-ink-muted: "#9ba8a4"
  dark-emergency-red: "#d92d20"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  hint:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.375
  input:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  card: "14px"
  hero: "18px"
  dialog: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.salmon}"
    textColor: "{colors.salmon-on}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
    typography: "{typography.input}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-emergency:
    backgroundColor: "{colors.emergency-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 14px"
    typography: "{typography.input}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  badge-primary:
    backgroundColor: "{colors.salmon-tint}"
    textColor: "{colors.salmon-ink}"
    rounded: "{rounded.full}"
    height: "24px"
    padding: "0 10px"
  badge-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.emergency-red}"
    rounded: "{rounded.full}"
    height: "24px"
    padding: "0 10px"
  nav-item-active:
    backgroundColor: "{colors.salmon-tint}"
    textColor: "{colors.salmon-ink}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 12px"
  emergency-call:
    backgroundColor: "{colors.emergency-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    height: "64px"
    padding: "12px 16px"
---

# Design System: Mis Nonos

## Overview

**Creative North Star: "Calma clínica"**

Ordenado como un consultorio, tranquilo como una casa. La app la usa
personal de la residencia, muchas veces mayor o poco técnico: cada pantalla
tiene que entenderse de un vistazo, con áreas táctiles grandes y sin
adornos. La calidez la pone el salmón de la marca; la claridad, superficies
planas, bordes finos y una sola familia tipográfica.

El sistema es denso solo donde hace falta (listas de residentes, novedades)
y generoso en todo lo demás. Es mobile first: la misma pantalla funciona en
un celular con barra inferior y en escritorio con menú lateral. Tiene modo
claro y oscuro con los mismos roles de color.

El rojo no es parte de la marca: es la señal de emergencia. Por eso el
salmón se usa claro, con texto oscuro encima, y nunca se oscurece hasta
parecerse al rojo.

**Key Characteristics:**

- Salmón claro como relleno de acción; salmón oscuro (tinta) para texto,
  bordes de selección y foco.
- Rojo reservado para emergencias, alergias y errores.
- Plano por defecto: bordes y tonos separan, la sombra solo para lo que
  flota.
- Áreas táctiles de 44 a 64 px; texto de campos a 16 px.
- Ningún estado depende solo del color: siempre lleva texto o ícono.

## Colors

Un acento cálido sobre neutros muy apenas verdosos, con una paleta de
estados aparte y el rojo como color exclusivo de emergencia.

### Primary

- **Salmón** (#fa8072; oscuro #f28b78): relleno de la acción principal de
  cada pantalla, el botón "+" de la barra inferior, el cuadro del logo, el
  panel de la pantalla de ingreso y la portada de la landing. Siempre con
  texto **Salmón noche** (#1f0f0b; oscuro #2a110c) encima, a 6,7:1.
- **Tinta salmón** (#863a2a; oscuro #f7a796): el salmón cuando va como
  texto o línea sobre fondo claro: enlaces, "Volver", pestaña activa del
  teléfono, bordes de opción elegida, casillas marcadas y anillo de foco
  (7,9:1 sobre blanco).
- **Durazno** (#fde8de; oscuro #3b211b): fondo de lo elegido o destacado
  sin ser acción: ítem activo del menú lateral, insignias de tono
  principal, avatares, chip del turno, ícono de los estados vacíos.
- **Durazno claro** (#fef1eb): fondo de acento más suave.

### Secondary

- **Rojo de emergencia** (#b42318; oscuro #d92d20): botón de llamar al
  servicio de emergencia, banner de alergias, errores y acciones
  destructivas. Sobre **Superficie de peligro** (#fef3f2) con borde
  (#fecdca) en avisos.

### Tertiary

- **Estados**: advertencia (#fef4e6 / #93370d), éxito (#ecfdf3 / #067647)
  e información (#eff4ff / #1849a9). Solo para avisos e insignias, siempre
  con texto o ícono.

### Neutral

- **Tinta** (#16201e; oscuro #e8eeec): texto principal.
- **Tinta suave** (#57625f; oscuro #9ba8a4): ayudas, descripciones y
  metadatos.
- **Papel** (#ffffff; oscuro #151e1b en tarjetas): tarjetas, campos,
  encabezado y barra inferior.
- **Superficie** (#f7faf9; oscuro #0e1513): fondo de pantalla y del menú
  lateral.
- **Gris suave** (#f3f6f5; oscuro #1c2724): hover de botones contorno y
  fantasma, insignias neutras.
- **Línea** (#dfe6e3; oscuro #26332f): bordes de tarjetas, campos y
  separadores.

### Named Rules

**The Red Is Emergency Rule.** El rojo saturado se usa solo para
emergencias, alergias, errores y acciones destructivas. Ningún color de
marca puede acercarse a él: si un salmón nuevo con texto blanco necesita
oscurecerse para dar contraste, se descarta.

**The Light Fill, Dark Ink Rule.** El salmón claro se usa solo como
relleno, con texto oscuro. Cuando el color de marca va como texto, borde o
foco sobre fondo claro, se usa la tinta salmón (`text-primary-ink`,
`border-primary-ink`, `accent-primary-ink`), nunca `text-primary`.

**The Never Color Alone Rule.** Cada estado lleva texto o ícono además del
color (insignias, avisos, alergias).

## Typography

**Display Font:** Geist (con system-ui, sans-serif)
**Body Font:** Geist (con system-ui, sans-serif)
**Label/Mono Font:** Geist Mono solo para datos técnicos.

**Character:** Una sola sans neutra y bien legible: la jerarquía sale del
peso (400, 500, 600) y del tamaño, no de cambiar de familia.

### Hierarchy

- **Display** (600, 30px, 1.25, tracking -0.025em; 36px desde `sm`): titular
  de la landing pública.
- **Headline** (600, 24px, 1.33, tracking -0.025em): título de cada
  pantalla (`PageHeader`). Las pantallas de ingreso y la landing usan 26px.
- **Title** (600, 16px): títulos de tarjeta y de estados vacíos.
- **Body** (400, 15px, 1.5): texto de botones medianos, ítems de menú y
  contenido de listas.
- **Body small** (400, 14px): descripciones y la mayoría del texto
  secundario.
- **Label** (500, 14px): etiquetas de campos.
- **Hint** (400, 13px, 1.375): ayuda y errores debajo de los campos.
- **Input** (400, 16px): todo campo de texto, para que el teléfono no haga
  zoom al enfocarlo.

### Named Rules

**The 16px Field Rule.** Ningún campo de texto baja de 16px.

**The Weight Ladder Rule.** El énfasis se logra con peso (medium y
semibold) y tamaño. Nada de mayúsculas decorativas ni etiquetas sobre los
títulos: el título se sostiene solo.

## Layout

Mobile first. En el teléfono, encabezado fijo de 56px con la residencia y
barra inferior fija de 84px (Pacientes · Novedades · "+" · Turnos · Más),
con margen lateral de 16px. Desde `lg` (1024px), menú lateral fijo de 260px
y contenido de hasta 1152px (`max-w-6xl`) con margen de 32px. Las pantallas
de una sola tarea (ficha de emergencia, formularios) se angostan a 576px.

Ritmo de espaciado en múltiplos de 4px: 4–8px dentro de un grupo, 12–16px
entre elementos de una tarjeta y 20–32px entre bloques. Las tarjetas usan
16–20px de relleno interno.

## Elevation & Depth

Plana por defecto. Las superficies se separan con el tono (Superficie
detrás, Papel adelante) y con bordes de 1px en Línea. Los campos llevan una
sombra mínima (`shadow-xs`). La sombra con relieve aparece solo en lo que
flota sobre el contenido: el botón "+" de la barra inferior y el diálogo de
bienvenida.

### Shadow Vocabulary

- **Campo** (`shadow-xs`): campos de texto y selects.
- **Flotante** (`shadow-lg`): botón "+" elevado de la barra inferior, con
  un anillo de 4px del color de la barra.
- **Diálogo** (`shadow-xl`): diálogo de bienvenida de la guía.

### Named Rules

**The Flat-By-Default Rule.** Una tarjeta nunca lleva sombra: si necesita
separarse, usa borde y tono. La sombra queda para lo que flota.

## Shapes

Esquinas suavemente redondeadas y constantes: 10px en botones, campos e
ítems de menú; 14px en tarjetas y en los botones de llamada de emergencia;
18px en la portada de la landing; 20px en diálogos. Insignias, avatares,
el botón "+" y el chip del turno son píldoras o círculos completos. Bordes
de 1px; 1.5px en opciones elegidas y 2px solo en el banner de alergias.

## Components

### Buttons

Firmes y sin vueltas.

- **Shape:** esquinas de 10px; alto de 48px (`lg`, por defecto) o 44px
  (`md`).
- **Primary:** relleno Salmón con texto Salmón noche, 500. Hover al 90%.
- **Outline:** Papel con borde Línea y texto Tinta; hover en Gris suave.
- **Ghost:** sin fondo; hover en Gris suave.
- **Destructive:** Rojo de emergencia con texto blanco.
- **Focus:** anillo de 3px de la tinta salmón al 40%.
- **Disabled:** opacidad 60%, sin eventos.

### Chips

- **Insignias:** píldoras de 24px de alto, 12px, 500, siempre con texto.
  Tonos: neutral, principal (Durazno + tinta salmón), éxito, advertencia,
  peligro e información.
- **Filtros y opciones elegidas:** borde de tinta salmón sobre fondo
  Durazno, texto semibold.

### Cards / Containers

- **Corner Style:** 14px.
- **Background:** Papel sobre Superficie.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1px Línea.
- **Internal Padding:** encabezado de 16px × 20px con borde inferior;
  cuerpo de 16–20px.

### Inputs / Fields

- **Style:** 48px de alto, Papel, borde Línea, esquinas de 10px, texto de
  16px, sombra `shadow-xs`.
- **Focus:** el borde pasa a la tinta salmón más un anillo de 3px al 25%.
- **Error / Disabled:** borde Rojo de emergencia con anillo al 20% y
  mensaje de 13px en rojo, enlazado con `aria-describedby`; deshabilitado
  al 60%.
- **Casillas:** 18px, marcadas en tinta salmón, dentro de una fila con
  borde y área táctil amplia.

### Navigation

- **Menú lateral (escritorio):** ítems de 44px, 15px medium, ícono de 20px.
  Activo: fondo Durazno, texto tinta salmón, semibold. Administración
  separada abajo por una línea.
- **Barra inferior (teléfono):** pestañas de 60px con ícono de 24px y
  etiqueta de 12px en Tinta suave; activa en tinta salmón semibold. El "+"
  central es un círculo Salmón de 56px elevado 20px.
- **Encabezado:** Papel al 85–95% con desenfoque, campana de avisos con
  contador rojo.

### Emergency Call Button

El componente propio del sistema. Fila de al menos 64px que se toca entera,
esquinas de 14px, número o ícono en un círculo de 40px a la izquierda y
"Llamar" a la derecha como píldora de 44px. En el centro, tres líneas: a quién
se llama (semibold), el parentesco o rol (14px, apagado) y el número (15px, en
color de texto y cifras tabulares, para dictarlo o marcarlo desde otro
teléfono).

Tres pesos, nunca más de uno destacado a la vez:

- **Emergencia:** el servicio contratado, en relleno Rojo de emergencia con
  texto blanco. Es el único rojo sólido de la pantalla.
- **Principal:** solo cuando no hay servicio cargado, la primera llamada posible
  (el primer familiar con teléfono o, si no hay, el médico de cabecera) va en
  relleno Salmón con texto oscuro.
- **Normal:** el resto, en Papel con borde, numerados en orden de llamada.

Un contacto sin teléfono se muestra con borde punteado y "Sin teléfono
cargado", sin correr la numeración. Arriba, el banner de alergias con borde de
2px en el color de peligro, ícono y texto en negrita; sin alergias, una
tarjeta neutra, nunca roja. Debajo de las llamadas, la dirección de la
residencia; la hoja de derivación va al final como botón contorno ("Para
entregar a la ambulancia"). En esta pantalla la barra inferior no muestra el
"+".

## Do's and Don'ts

### Do:

- **Do** usar Salmón (#fa8072) solo como relleno, con texto Salmón noche
  (#1f0f0b).
- **Do** usar la tinta salmón (#863a2a) para todo texto, borde de
  selección, casilla o anillo de foco del color de marca.
- **Do** mantener áreas táctiles de al menos 44px y los campos en 48px con
  texto de 16px.
- **Do** acompañar cada estado con texto o ícono.
- **Do** separar superficies con borde de 1px y tono antes que con sombra.

### Don't:

- **Don't** usar `text-primary`, `border-primary` ni `accent-primary` sobre
  fondo claro: el salmón claro no llega a 3:1.
- **Don't** oscurecer el salmón para ponerle texto blanco: se confunde con
  el rojo de emergencia.
- **Don't** usar el rojo para nada que no sea emergencia, alergia, error o
  acción destructiva.
- **Don't** poner sombra en tarjetas.
- **Don't** mostrar módulos, métricas o adornos que no ayuden a la tarea.
