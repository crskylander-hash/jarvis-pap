# JARVIS — Instalação no Raspberry Pi Zero 2W (os óculos)

Guia passo a passo para pôr o cliente JARVIS a funcionar num
Raspberry Pi Zero 2W com microfone USB e altifalante, sem precisar
de monitor nem teclado (instalação "headless").

## 1. Preparar o cartão SD (no PC)

1. Descarrega o **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insere o cartão microSD (mínimo 16 GB) no PC.
3. No Imager:
   - **Device**: Raspberry Pi Zero 2 W
   - **OS**: Raspberry Pi OS (other) → **Raspberry Pi OS Lite (32-bit)**
     (Lite = sem ambiente gráfico; 32-bit gasta menos dos 512 MB de RAM)
   - **Storage**: o teu cartão SD
4. Clica **Next → Edit Settings** e preenche (é isto que dispensa o monitor):
   - Hostname: `jarvis`
   - Username: `pi` / password à tua escolha
   - **Wi-Fi**: nome e password da tua rede (e do hotspot do telemóvel
     para a demonstração na escola!) — país `PT`
   - Services: ativa **SSH** com password
5. Grava e espera. Mete o cartão no Raspberry Pi e liga a alimentação.

## 2. Entrar no Raspberry Pi por SSH

No PC (PowerShell), com o RPi ligado há ~2 minutos:

```
ssh pi@jarvis.local
```

(Se não encontrar, vê o IP no router/hotspot e usa `ssh pi@<ip>`.)

## 3. Instalar as dependências do sistema

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip libportaudio2 espeak-ng alsa-utils git unzip
```

## 4. Verificar o microfone USB e o altifalante

Liga o microfone USB (com o adaptador OTG) e o altifalante, depois:

```bash
arecord -l    # deve aparecer o microfone USB (card 1, por exemplo)
aplay -l      # deve aparecer a saída de som
espeak-ng -v pt "Olá, eu sou o JARVIS"   # teste do altifalante
arecord -d 3 teste.wav && aplay teste.wav # gravar 3 s e ouvir de volta
```

Se o som sair no sítio errado, define o dispositivo por defeito com
`sudo raspi-config` → System Options → Audio.

## 5. Instalar o cliente JARVIS

```bash
cd ~
git clone https://github.com/crskylander-hash/jarvis-pap.git
cd jarvis-pap/rpi-client

# Ambiente virtual + dependências (demora uns minutos no Zero 2W)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Modelo de reconhecimento de voz em português (~50 MB)
cd ~
wget https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip
unzip vosk-model-small-pt-0.3.zip
rm vosk-model-small-pt-0.3.zip
```

## 6. Configurar o URL do backend

```bash
sudo nano /etc/default/jarvis
```

Conteúdo (substitui pelo teu URL real do PythonAnywhere):

```
BACKEND_URL=https://oteuusername.pythonanywhere.com
```

## 7. Testar à mão

```bash
cd ~/jarvis-pap/rpi-client
BACKEND_URL=https://oteuusername.pythonanywhere.com .venv/bin/python jarvis_client.py
```

Diz **«JARVIS»** — ele responde «Sim?» — e faz a tua pergunta.
`Ctrl+C` para sair.

## 8. Arranque automático (systemd)

Para o JARVIS ligar sozinho quando os óculos recebem energia:

```bash
sudo cp ~/jarvis-pap/rpi-client/jarvis.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jarvis
```

Comandos úteis:

```bash
systemctl status jarvis        # está a correr?
journalctl -u jarvis -f        # ver o que ele está a ouvir/responder
sudo systemctl restart jarvis  # reiniciar
```

## Resolução de problemas

| Sintoma | Solução |
|---|---|
| `Modelo Vosk não encontrado` | Confirma que a pasta `~/vosk-model-small-pt-0.3` existe (passo 5) |
| Não ouve nada | `arecord -l`; testa gravar com `arecord -d 3 t.wav` |
| Voz não sai | `aplay -l` e `raspi-config` → Audio; testa `espeak-ng -v pt "teste"` |
| `não consegui contactar o servidor` | Vê o `BACKEND_URL` em `/etc/default/jarvis` e a ligação Wi-Fi |
| Arranque lento | Normal: o modelo demora ~10 s a carregar no Zero 2W |
