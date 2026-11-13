; Instalador de Bandly — textos y licencia personalizados.
; Incluido por Tauri (bundle.windows.nsis.installerHooks) ANTES de definir las páginas,
; por eso las variables MUI_* de abajo llegan a las páginas correspondientes.

!define LEGALDIR "${__FILEDIR__}"

; ── Bienvenida ──
!define MUI_WELCOMEPAGE_TITLE "Te damos la bienvenida a Bandly"
!define MUI_WELCOMEPAGE_TEXT "Este asistente instalará Bandly en tu equipo.$\r$\n$\r$\nMultitracks, secuencias, letras y luces de tu equipo, sincronizados en vivo desde una sola pantalla.$\r$\n$\r$\nTe recomendamos cerrar las demás aplicaciones antes de continuar. Pulsa Siguiente para empezar."

; ── Contrato: se exige marcar «Acepto» de forma explícita ──
!define MUI_LICENSEPAGE_CHECKBOX
!define MUI_LICENSEPAGE_CHECKBOX_TEXT "Acepto el contrato de licencia, la política de privacidad y la política de reembolsos"
!define MUI_LICENSEPAGE_TEXT_TOP "Lee el documento completo (usa la barra de desplazamiento). Incluye tres partes: contrato de licencia, privacidad y reembolsos."

; ── Final ──
!define MUI_FINISHPAGE_TITLE "Bandly está listo"
!define MUI_FINISHPAGE_TEXT "La instalación terminó correctamente.$\r$\n$\r$\nConecta tu interfaz de audio, inicia sesión con tu cuenta Bandly y descarga tus canciones para usarlas sin conexión.$\r$\n$\r$\nGuardamos una copia de la licencia y las políticas en la carpeta de instalación."
!define MUI_FINISHPAGE_LINK "Visitar getbandly.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://getbandly.com"

; ── Copia del contrato en la carpeta de instalación ──
!macro NSIS_HOOK_POSTINSTALL
  SetOutPath "$INSTDIR"
  File "/oname=Licencia y politicas.txt" "${LEGALDIR}\licencia.txt"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$INSTDIR\Licencia y politicas.txt"
!macroend
