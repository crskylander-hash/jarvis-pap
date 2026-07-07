# TESTES.md — Plano de testes do Projeto JARVIS

## 1. Testes automáticos do backend (pytest)

Correr na pasta `backend` (com o venv ativo):

```
.venv\Scripts\python.exe -m pytest tests -q     (Windows)
pytest tests -q                                  (Linux/PythonAnywhere)
```

**Resultado atual: 19 testes, todos a passar** ✅
Cobrem: `/health`, validação do `/chat` (422), fluxo normal de conversa,
comando "envia para a app" (com e sem histórico), deteção do comando em
6 variações de frase + 4 frases que NÃO devem disparar, e o resumo de
emergência.

## 2. Checklist manual da PWA

Marcar cada item depois de testar no browser (Chrome/Edge recomendado).

### Conversa por voz
- [ ] Clicar no anel central → o browser pede permissão de microfone
- [ ] Falar uma pergunta em português → a transcrição aparece em itálico enquanto falo
- [ ] A resposta chega, aparece na conversa e é FALADA em voz PT
- [ ] Botão "⏹ Silenciar" interrompe a fala imediatamente
- [ ] Deslizador de velocidade muda a voz (testar 0,8× e 1,5×) e fica guardado ao recarregar

### Wake word (modo mãos-livres)
- [ ] Ligar "🎙 Mãos-livres" → dizer «JARVIS» sozinho → aparece "Sim? Diz lá…"
- [ ] Dizer «JARVIS, que horas são» (tudo seguido) → responde sem passo intermédio
- [ ] Falar SEM dizer "JARVIS" → nada é enviado (privacidade)
- [ ] Pronunciar mal ("járvi", "jarves") → continua a acordar (Levenshtein ≤ 2)

### Envia para a app
- [ ] Pedir algo extenso (ex.: «explica-me a Revolução dos Cravos em detalhe»)
- [ ] Dizer «envia para a app» → por voz ouve-se SÓ o resumo + "enviei o resto para a tua app"
- [ ] A notificação aparece (se as notificações foram autorizadas)
- [ ] Na página **Leitura** está a resposta completa, com a pergunta e a hora
- [ ] Variações: «manda para o telemóvel», «podes enviar isso para a aplicação»

### Idioma, vozes e exportação
- [ ] Mudar o "Idioma" para English → falar em inglês → o JARVIS responde em inglês, com voz inglesa
- [ ] Voltar a Português → tudo regressa ao normal (e a escolha sobrevive ao recarregar)
- [ ] O menu "Voz" só mostra vozes do idioma escolhido; escolher uma diferente muda a voz
- [ ] Botão "⬇ Exportar conversa" descarrega um .txt com a conversa completa

### Histórico, memória e privacidade
- [ ] Recarregar a página → a conversa anterior continua lá (device_id no localStorage)
- [ ] Fazer uma pergunta de seguimento (ex.: «e quem foi o presidente a seguir?») → o JARVIS lembra-se do contexto
- [ ] Abrir a app noutro browser/dispositivo → o histórico está VAZIO (RLS: cada device só vê o seu)

### Dashboard
- [ ] Métricas corretas: nº de conversas, tokens, latência média, custo estimado
- [ ] Indicador "Sistema online" verde com o backend ligado
- [ ] Desligar o backend (ou modo avião) → passa a "Sistema offline" em ≤30 s
- [ ] Fazer uma pergunta noutra aba → o dashboard atualiza SOZINHO (Realtime)

### PWA (instalação)
- [ ] Chrome/Edge PC: ícone "Instalar" na barra de endereço funciona
- [ ] Android: "Adicionar ao ecrã principal" → abre em janela própria, sem barra do browser
- [ ] Com a rede desligada, a interface ainda abre (service worker)

## 3. Checklist do protótipo (óculos / Raspberry Pi)
- [ ] Ligar a alimentação → ~40 s depois ouve-se "JARVIS pronto." (systemd)
- [ ] Dizer «JARVIS» → responde "Sim?"
- [ ] Fazer uma pergunta → resposta falada pelo altifalante
- [ ] A conversa dos óculos aparece no dashboard da PWA (mesmo cérebro, dois rostos)
- [ ] Dizer «JARVIS, envia para a app» → resposta completa aparece na PWA
- [ ] Tirar e voltar a ligar a energia → recupera sozinho (Restart=always)

## 4. Testes de erro (resiliência)
- [ ] Backend desligado → a PWA mostra mensagem de erro clara em PT, não crasha
- [ ] Pergunta vazia → o botão Enviar está desativado
- [ ] «envia para a app» sem histórico → "Ainda não tenho nenhuma resposta para enviar"
