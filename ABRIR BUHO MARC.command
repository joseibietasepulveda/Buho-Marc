#!/bin/zsh

set -u

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PORT="3000"
APP_URL="http://127.0.0.1:${APP_PORT}/app"
LOG_FILE="${APP_DIR}/.buho-marc.log"
PID_FILE="${APP_DIR}/.buho-marc.pid"

pause_on_error() {
  echo
  echo "$1"
  if [[ -f "$LOG_FILE" ]]; then
    echo
    echo "Últimas líneas del registro:"
    tail -n 18 "$LOG_FILE"
  fi
  echo
  echo "Presiona una tecla para cerrar."
  read -k 1
  exit 1
}

process_directory() {
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1
}

stop_process_tree() {
  local parent_pid="$1"
  local child_pid
  local children
  children="$(pgrep -P "$parent_pid" 2>/dev/null || true)"
  if [[ -n "$children" ]]; then
    while IFS= read -r child_pid; do
      [[ -n "$child_pid" ]] && stop_process_tree "$child_pid"
    done <<< "$children"
  fi
  kill -TERM "$parent_pid" 2>/dev/null || true
}

cd "$APP_DIR" || pause_on_error "No se pudo abrir la carpeta de Buho Marc."

if ! command -v npm >/dev/null 2>&1 && [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
  source "${HOME}/.nvm/nvm.sh"
fi

command -v npm >/dev/null 2>&1 || pause_on_error "No se encontró Node.js. Instala Node.js 22 o superior e inténtalo nuevamente."
command -v lsof >/dev/null 2>&1 || pause_on_error "No se encontró la herramienta necesaria para revisar el puerto local."

echo "Preparando Buho Marc..."

if [[ -f "$PID_FILE" ]]; then
  saved_pid="$(tr -cd '0-9' < "$PID_FILE")"
  if [[ -n "$saved_pid" ]] && kill -0 "$saved_pid" 2>/dev/null; then
    saved_directory="$(process_directory "$saved_pid")"
    if [[ "$saved_directory" == "$APP_DIR" ]]; then
      echo "Cerrando la instancia anterior..."
      stop_process_tree "$saved_pid"
    fi
  fi
fi

listening_pids="$(lsof -tiTCP:"$APP_PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$listening_pids" ]]; then
  while IFS= read -r listening_pid; do
    [[ -z "$listening_pid" ]] && continue
    listening_directory="$(process_directory "$listening_pid")"
    if [[ "$listening_directory" == "$APP_DIR" ]]; then
      echo "Liberando la instancia anterior de Buho Marc..."
      stop_process_tree "$listening_pid"
    else
      pause_on_error "El puerto ${APP_PORT} está ocupado por otra aplicación. Ciérrala antes de iniciar Buho Marc."
    fi
  done <<< "$listening_pids"
fi

for attempt in {1..30}; do
  remaining_pids="$(lsof -tiTCP:"$APP_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -z "$remaining_pids" ]] && break
  sleep 0.1
done

if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  echo "Preparando dependencias por primera vez..."
  npm install --no-audit --no-fund || pause_on_error "No se pudieron preparar las dependencias."
fi

echo "Iniciando la aplicación..."
npm run dev -- --hostname 127.0.0.1 --port "$APP_PORT" > "$LOG_FILE" 2>&1 &
launcher_pid="$!"
echo "$launcher_pid" > "$PID_FILE"

for attempt in {1..80}; do
  if curl -fsS "$APP_URL" >/dev/null 2>&1; then
    echo "Buho Marc está lista. Abriendo el navegador..."
    open "$APP_URL"
    echo
    echo "Buho Marc seguirá activa mientras esta ventana permanezca abierta."
    echo "Puedes cerrarla para detener la aplicación."
    wait "$launcher_pid"
    exit $?
  fi
  if ! kill -0 "$launcher_pid" 2>/dev/null; then
    pause_on_error "Buho Marc no pudo iniciarse."
  fi
  sleep 0.25
done

pause_on_error "Buho Marc tardó demasiado en iniciar."
