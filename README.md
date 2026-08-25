# Calcolatore Stipendio Netto — Italia 2026

Prototipo web che, data una **RAL** (Retribuzione Annua Lorda), calcola il **netto annuo e mensile** di un lavoratore dipendente e mostra, riga per riga, tutte le voci trattenute dal lordo.

**Demo:** https://jethr-task-ruby.vercel.app/

---

## Caso modellato

Un caso standard, con semplificazioni esplicite e dichiarate in app:

- Impiegato a **tempo indeterminato**, in forza per l'intero anno
- Residenza fiscale a **Milano** (Lombardia)
- Nessun familiare a carico, nessuna agevolazione, reddito da solo lavoro dipendente

---

## Stack

- **Vite + React + TypeScript** — SPA client-side, nessun backend: il calcolo è deterministico e gira interamente nel browser. Next.js sarebbe stato sovradimensionato per un'app senza server né routing.
- **shadcn/ui** + Tailwind per l'interfaccia.
- **Vitest** per i test del motore di calcolo.

---

## Come funziona il calcolo

Il netto non è una formula unica: è una **pipeline ordinata** di trattenute, in cui ogni passo dipende dal precedente. Tutta la logica vive in `src/lib/taxEngine.ts` (funzioni pure, nessuna dipendenza da React); le costanti fiscali, con la fonte inline, in `src/constants/taxConsts.ts`.

1. **Contributi INPS** — 9,19% della RAL (quota a carico del lavoratore).
2. **Imponibile fiscale** = RAL − contributi INPS.
3. **IRPEF lorda** — scaglioni progressivi 2026: 23% fino a 28.000, 33% da 28.000 a 50.000, 43% oltre. Ogni aliquota colpisce solo la quota di reddito nel proprio intervallo.
4. **Detrazione da lavoro dipendente** (art. 13 TUIR) — decrescente, abbatte l'IRPEF; include il bonus di 65€ nella fascia 25.000–35.000.
5. **Cuneo fiscale strutturale 2026** — due meccanismi alternativi: fino a 20.000 è una *somma esente* che si aggiunge al netto; da 20.000 a 40.000 è una *detrazione* che abbatte l'IRPEF (piena fino a 32.000, poi decrescente).
6. **IRPEF netta** = max(0, IRPEF lorda − detrazione lavoro − cuneo detrazione).
7. **Addizionale regionale Lombardia** — progressiva per scaglioni sull'imponibile.
8. **Addizionale comunale Milano** — 0,80% sull'intero imponibile, dovuta solo oltre la soglia di esenzione di 23.000 (soglia, non franchigia).
9. **Netto annuo** = RAL − INPS − IRPEF netta − addizionali + eventuale cuneo somma esente.
10. **Netto mensile** — il netto annuo è ripartito su mensilità di importo diverso: i mesi ordinari portano le detrazioni, le mensilità aggiuntive (13ª/14ª) sono tassate al **marginale** e senza detrazioni (art. 23 c. 2 lett. b, DPR 600/1973). Vengono mostrati media, mese ordinario e mese aggiuntivo.

---

## Fonti

Ogni voce della scomposizione è numerata e rimanda alla **fonte primaria** su cui è verificabile — non a sintesi di terze parti.

| # | Voce | Riferimento |
|---|------|-------------|
| 1 | Contributi INPS 9,19% | art. 12 L. 153/1969 · INPS, aliquote contributive |
| 2 | Scaglioni IRPEF 23/33/43 | art. 11 TUIR · L. 199/2025 (Legge di Bilancio 2026) |
| 3 | Detrazione lavoro dipendente | art. 13 TUIR |
| 4 | Cuneo fiscale strutturale | L. 199/2025 (Legge di Bilancio 2026) |
| 5 | Addizionale regionale Lombardia | art. 72 l.r. Lombardia 10/2003 · Regione Lombardia |
| 6 | Addizionale comunale Milano | Dipartimento delle Finanze (MEF) |
| 7 | Mensilità aggiuntive | art. 23 c. 2 lett. b, DPR 600/1973 |

Nota sulla vigenza: gli artt. 11 e 13 del TUIR sono abrogati dal **D.Lgs. 117/2026** (nuovo TUIR) con effetto dal **1° gennaio 2027**. Per l'anno d'imposta 2026 restano gli articoli vigenti; il codice lo annota esplicitamente.

---

## Assunzioni

Elencate anche in app, accanto al risultato:

- Rapporto a tempo indeterminato, full-year; residenza a Milano.
- Importi **non arrotondati all'euro**.
- Nessun familiare a carico, nessuna agevolazione ulteriore, reddito da solo lavoro dipendente.
- Ignorata l'aliquota INPS aggiuntiva dell'1% oltre la prima fascia (~52.190€).
- Ignorato il minimo garantito di 690€ sulla detrazione (irrilevante per un rapporto full-year).
- Addizionali stimate sull'anno corrente (nella realtà si versano ad acconto/saldo l'anno successivo).
- Netto mensile su 13 mensilità salvo diversa selezione.

---

## Eseguire in locale

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # Vitest
npm run build      # build statica in dist/
```

---

## Limiti noti

Prototipo su un caso standard, per scelta. Fuori scope: familiari a carico, redditi diversi dal lavoro dipendente, altre regioni/comuni, premi di produttività e fringe benefit, arrotondamento IRPEF all'euro, massimali/minimali contributivi. Ognuno è un'estensione naturale della pipeline, non una riscrittura.
