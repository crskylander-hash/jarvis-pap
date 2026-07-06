#!/usr/bin/env python3
# ============================================================
# PROJETO JARVIS — Cliente para Raspberry Pi Zero 2W (os óculos)
# Autor: Carlos Rafael Resendes Silva — PAP 2026
#
# Como funciona (ciclo infinito):
#   1. Captura áudio do microfone USB (sounddevice, 16 kHz mono)
#   2. Reconhecimento de voz LOCAL com Vosk (modelo pequeno pt)
#   3. Quando ouve a wake word "JARVIS" (com tolerância a erros),
#      a frase seguinte (ou o resto da mesma frase) é o comando
#   4. Envia o comando ao backend (POST /chat) com o device_id
#   5. Fala a resposta com espeak-ng em português
#
# Porquê estas escolhas (ver DECISOES.md):
#   • Vosk: único STT offline viável no Zero 2W (512 MB RAM)
#   • espeak-ng: TTS leve e fiável em Raspberry Pi OS Lite
# ============================================================
import json
import os
import queue
import subprocess
import sys
import time
import uuid
from pathlib import Path

import requests
import sounddevice as sd
from vosk import KaldiRecognizer, Model

# ------------------------------------------------------------
# CONFIGURAÇÃO (pode ser alterada por variáveis de ambiente)
# ------------------------------------------------------------
# URL do backend no PythonAnywhere (definir em /etc/default/jarvis ou .env)
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
# Pasta do modelo Vosk (descarregado no INSTALL_RPI.md)
MODELO_VOSK = os.getenv("MODELO_VOSK", str(Path.home() / "vosk-model-small-pt-0.3"))
# Taxa de amostragem do microfone (16 kHz é o ideal para o Vosk)
TAXA_AMOSTRAGEM = 16000
# Ficheiro onde fica guardado o device_id destes óculos
FICHEIRO_DEVICE = Path.home() / ".jarvis_device_id"
# Velocidade da fala do espeak-ng (palavras por minuto)
VELOCIDADE_FALA = 155

# Palavras aceites como wake word (erros comuns do reconhecimento pt)
DICIONARIO_WAKE = {
    "jarvis", "jarvi", "jarve", "jarves", "jarbis", "jarbas", "javis",
    "davis", "darvis", "garvis", "harvis", "jervis", "iarvis", "xavis",
}


def levenshtein(a: str, b: str) -> int:
    """Distância de Levenshtein (nº mínimo de edições entre duas palavras)."""
    if len(a) < len(b):
        a, b = b, a
    anterior = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        atual = [i]
        for j, cb in enumerate(b, 1):
            atual.append(min(
                anterior[j] + 1,        # apagar
                atual[j - 1] + 1,       # inserir
                anterior[j - 1] + (ca != cb),  # substituir
            ))
        anterior = atual
    return anterior[-1]


def e_wake_word(palavra: str) -> bool:
    """True se a palavra for "jarvis" (dicionário + Levenshtein <= 2)."""
    p = "".join(c for c in palavra.lower() if c.isalpha())
    if len(p) < 4:
        return False
    return p in DICIONARIO_WAKE or levenshtein(p, "jarvis") <= 2


def extrair_comando(frase: str) -> tuple[bool, str]:
    """Procura a wake word na frase.
    Devolve (detetada, comando) — comando é o texto depois da wake word."""
    palavras = frase.split()
    for i, palavra in enumerate(palavras):
        if e_wake_word(palavra):
            return True, " ".join(palavras[i + 1:]).strip()
    return False, ""


def obter_device_id() -> str:
    """Lê (ou cria na primeira execução) o device_id destes óculos."""
    if FICHEIRO_DEVICE.exists():
        return FICHEIRO_DEVICE.read_text().strip()
    novo = str(uuid.uuid4())
    FICHEIRO_DEVICE.write_text(novo)
    return novo


def falar(texto: str) -> None:
    """Fala o texto pelo altifalante com espeak-ng (voz portuguesa)."""
    try:
        subprocess.run(
            ["espeak-ng", "-v", "pt", "-s", str(VELOCIDADE_FALA), texto],
            check=False,
            timeout=120,
        )
    except FileNotFoundError:
        print("[ERRO] espeak-ng não instalado — ver INSTALL_RPI.md")


def perguntar_ao_jarvis(device_id: str, session_id: str, mensagem: str) -> str:
    """Envia a pergunta ao backend e devolve a resposta (com 2 tentativas)."""
    for tentativa in range(2):
        try:
            resposta = requests.post(
                f"{BACKEND_URL}/chat",
                json={
                    "device_id": device_id,
                    "session_id": session_id,
                    "mensagem": mensagem,
                },
                timeout=30,
            )
            resposta.raise_for_status()
            return resposta.json()["resposta"]
        except requests.RequestException as erro:
            print(f"[AVISO] Falha na chamada ao backend ({erro}); tentativa {tentativa + 1}")
            time.sleep(1.5)
    return "Desculpa, não consegui contactar o servidor. Verifica a ligação à Internet."


def principal() -> None:
    print("== JARVIS — cliente Raspberry Pi ==")

    # 1) Carrega o modelo de reconhecimento (demora ~10 s no Zero 2W)
    if not Path(MODELO_VOSK).exists():
        print(f"[ERRO] Modelo Vosk não encontrado em {MODELO_VOSK} — ver INSTALL_RPI.md")
        sys.exit(1)
    print("A carregar o modelo de voz…")
    reconhecedor = KaldiRecognizer(Model(MODELO_VOSK), TAXA_AMOSTRAGEM)

    device_id = obter_device_id()
    session_id = str(uuid.uuid4())  # nova sessão a cada arranque
    print(f"Dispositivo: {device_id}")

    # 2) Fila de blocos de áudio vindos do microfone
    fila_audio: queue.Queue = queue.Queue()

    def callback_audio(indata, frames, tempo, estado):
        """Chamado pelo sounddevice a cada bloco de áudio capturado."""
        if estado:
            print(f"[AVISO] Áudio: {estado}")
        fila_audio.put(bytes(indata))

    a_espera_de_comando = False  # True depois de ouvir só "JARVIS"

    # 3) Ciclo principal: escutar → reconhecer → responder
    with sd.RawInputStream(
        samplerate=TAXA_AMOSTRAGEM,
        blocksize=8000,          # blocos de 0,5 s
        dtype="int16",
        channels=1,
        callback=callback_audio,
    ):
        falar("JARVIS pronto.")
        print("A escutar — diz «JARVIS» seguido da tua pergunta.")

        while True:
            bloco = fila_audio.get()
            if not reconhecedor.AcceptWaveform(bloco):
                continue  # frase ainda não terminou

            # Frase completa reconhecida
            frase = json.loads(reconhecedor.Result()).get("text", "").strip()
            if not frase:
                continue
            print(f"Ouvi: {frase}")

            if a_espera_de_comando:
                # A frase anterior foi só "JARVIS" — esta é o comando
                a_espera_de_comando = False
                comando = frase
            else:
                detetada, comando = extrair_comando(frase)
                if not detetada:
                    continue  # sem wake word: ignorar (privacidade)
                if not comando:
                    # Só disse "JARVIS" — confirma e espera pela pergunta
                    falar("Sim?")
                    a_espera_de_comando = True
                    continue

            # 4) Pergunta ao backend e fala a resposta
            print(f"Comando: {comando}")
            resposta = perguntar_ao_jarvis(device_id, session_id, comando)
            print(f"JARVIS: {resposta}")
            falar(resposta)

            # Limpa áudio acumulado enquanto o JARVIS falava
            # (para não se ouvir a si próprio)
            while not fila_audio.empty():
                fila_audio.get_nowait()


if __name__ == "__main__":
    try:
        principal()
    except KeyboardInterrupt:
        print("\nJARVIS desligado.")
