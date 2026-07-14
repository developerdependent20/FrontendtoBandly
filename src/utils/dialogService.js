// Reemplazo de window.confirm/alert/prompt por popups propios de Bandly.
// Patrón "servicio imperativo + host único": cualquier componente puede llamar
// confirmDialog()/alertDialog()/promptDialog() sin necesidad de renderizar nada
// localmente — el <DialogHost/> montado una sola vez en main.jsx escucha estas
// llamadas y muestra el popup correspondiente.

let listener = null;
let activeResolve = null;

export function _setDialogListener(fn) {
  listener = fn;
}

function open(request) {
  return new Promise((resolve) => {
    activeResolve = resolve;
    listener?.(request);
  });
}

export function _resolveDialog(value) {
  activeResolve?.(value);
  activeResolve = null;
  listener?.(null);
}

// Reemplazo directo de window.confirm(msg) -> await confirmDialog(msg)
// También acepta un objeto de opciones: { title, message, confirmText, cancelText, danger }
export function confirmDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : (opts || {});
  return open({
    mode: 'confirm',
    title: o.title ?? (o.danger ? '¿Estás seguro?' : 'Confirmar'),
    message: o.message ?? '',
    confirmText: o.confirmText ?? (o.danger ? 'Sí, eliminar' : 'Confirmar'),
    cancelText: o.cancelText ?? 'Cancelar',
    danger: !!o.danger
  });
}

// Reemplazo directo de alert(msg) -> alertDialog(msg). No requiere await:
// el flujo continúa igual que con alert() nativo, pero sin bloquear el hilo.
export function alertDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : (opts || {});
  return open({
    mode: 'alert',
    title: o.title ?? (o.danger ? 'Error' : 'Aviso'),
    message: o.message ?? '',
    confirmText: o.confirmText ?? 'Entendido',
    danger: !!o.danger
  });
}

// Reemplazo directo de prompt(msg, defaultValue) -> await promptDialog(msg, defaultValue)
// Resuelve con el string ingresado, o null si se cancela (igual que prompt()).
export function promptDialog(message, defaultValue = '') {
  return open({
    mode: 'prompt',
    title: 'Ingresa un valor',
    message: message ?? '',
    defaultValue,
    confirmText: 'Aceptar',
    cancelText: 'Cancelar'
  });
}
