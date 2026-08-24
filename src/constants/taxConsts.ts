/*
 *  COSTANTI FISCALI — anno d'imposta 2026
 *
 *  Ogni costante riporta inline la fonte normativa da cui è tratta.
 *  Caso modellato: lavoratore dipendente, residente a Milano (Lombardia).
 */

/** Uno scaglione a aliquota costante, applicata solo alla quota di reddito compresa nell'intervallo. */
export type Scaglione = {
  /** Estremo inferiore escluso dalla quota (la quota parte da qui). */
  da: number;
  /** Estremo superiore incluso; `Infinity` per l'ultimo scaglione. */
  a: number;
  /** Aliquota in forma decimale (0.23 = 23%). */
  aliquota: number;
};

// Contributi previdenziali a carico del lavoratore dipendente (FPLD).
// Quota lavoratore FPLD, 33% ripartito 23,81% datore / 9,19% lavoratore, art. 12 L. 153/1969 (INPS, aliquote contributive)
export const ALIQUOTA_INPS_LAVORATORE = 0.0919;

// IRPEF, scaglioni progressivi applicati per quota di reddito.
// Come per l'art. 13, l'art. 11 è abrogato dal D.Lgs. 117/2026 con effetto dal
// 1° gennaio 2027: per il 2026 questi scaglioni restano quelli applicabili.
// art. 11 TUIR, L. 199/2025
export const SCAGLIONI_IRPEF: Scaglione[] = [
  { da: 0, a: 28_000, aliquota: 0.23 }, // art. 11 TUIR, L. 199/2025
  { da: 28_000, a: 50_000, aliquota: 0.33 }, // art. 11 TUIR, L. 199/2025
  { da: 50_000, a: Infinity, aliquota: 0.43 }, // art. 11 TUIR, L. 199/2025
];

// Detrazione per redditi da lavoro dipendente, art. 13 TUIR.
// L'art. 13 è abrogato dal D.Lgs. 19 giugno 2026, n. 117 (nuovo TUIR), le cui
// disposizioni però si applicano dal 1° gennaio 2027: per l'anno d'imposta 2026
// resta vigente l'art. 13 e questi importi non cambiano. Da rivedere per il 2027.
export const DETRAZIONE_LAVORO = {
  /** Importo fisso per redditi fino a 15.000€. */ // art. 13 TUIR
  IMPORTO_FASCIA_BASSA: 1_955,
  /** Soglia di fine della fascia a importo fisso. */ // art. 13 TUIR
  SOGLIA_FASCIA_BASSA: 15_000,
  /** Base della detrazione decrescente nelle fasce superiori. */ // art. 13 TUIR
  BASE_DECRESCENTE: 1_910,
  /** Quota aggiuntiva che si azzera al raggiungimento dei 28.000€. */ // art. 13 TUIR
  QUOTA_AGGIUNTIVA: 1_190,
  /** Soglia intermedia: fine della fascia 15.000–28.000€. */ // art. 13 TUIR
  SOGLIA_INTERMEDIA: 28_000,
  /** Ampiezza della fascia 15.000–28.000€, denominatore del decalage. */ // art. 13 TUIR
  AMPIEZZA_FASCIA_INTERMEDIA: 13_000,
  /** Soglia oltre la quale la detrazione si azzera. */ // art. 13 TUIR
  SOGLIA_ALTA: 50_000,
  /** Ampiezza della fascia 28.000–50.000€, denominatore del decalage. */ // art. 13 TUIR
  AMPIEZZA_FASCIA_ALTA: 22_000,
  /** Bonus fisso aggiuntivo nella fascia 25.000–35.000€. */ // art. 13 TUIR
  BONUS: 65,
  /** Estremo inferiore (escluso) della fascia che dà diritto al bonus. */ // art. 13 TUIR
  BONUS_DA: 25_000,
  /** Estremo superiore (incluso) della fascia che dà diritto al bonus. */ // art. 13 TUIR
  BONUS_A: 35_000,
} as const;

// Cuneo fiscale strutturale, Legge di Bilancio 2026
export const CUNEO = {
  /** Fino a questa soglia il beneficio è una somma esente che si aggiunge al netto. */ // Cuneo fiscale strutturale, Legge di Bilancio 2026
  SOGLIA_SOMMA_ESENTE: 20_000,
  /** Scaglioni della somma esente: aliquota applicata all'intero imponibile della fascia. */ // Cuneo fiscale strutturale, Legge di Bilancio 2026
  FASCE_SOMMA_ESENTE: [
    { fino_a: 8_500, aliquota: 0.071 }, // Cuneo fiscale strutturale, Legge di Bilancio 2026
    { fino_a: 15_000, aliquota: 0.053 }, // Cuneo fiscale strutturale, Legge di Bilancio 2026
    { fino_a: 20_000, aliquota: 0.048 }, // Cuneo fiscale strutturale, Legge di Bilancio 2026
  ],
  /** Detrazione piena riconosciuta nella fascia 20.000–32.000€. */ // Cuneo fiscale strutturale, Legge di Bilancio 2026
  DETRAZIONE_PIENA: 1_000,
  /** Soglia oltre la quale la detrazione inizia a decrescere. */ // Cuneo fiscale strutturale, Legge di Bilancio 2026
  SOGLIA_INIZIO_DECALAGE: 32_000,
  /** Soglia oltre la quale la detrazione è azzerata. */ // Cuneo fiscale strutturale, Legge di Bilancio 2026
  SOGLIA_AZZERAMENTO: 40_000,
} as const;

// Addizionale regionale IRPEF, applicata per scaglioni sull'imponibile fiscale.
// Regione Lombardia, addizionale regionale IRPEF (l.r. 10/2003 art. 72)
export const SCAGLIONI_ADD_REGIONALE_LOMBARDIA: Scaglione[] = [
  { da: 0, a: 15_000, aliquota: 0.0123 }, // Regione Lombardia, addizionale regionale IRPEF (l.r. 10/2003 art. 72)
  { da: 15_000, a: 28_000, aliquota: 0.0158 }, // Regione Lombardia, addizionale regionale IRPEF (l.r. 10/2003 art. 72)
  { da: 28_000, a: 50_000, aliquota: 0.0172 }, // Regione Lombardia, addizionale regionale IRPEF (l.r. 10/2003 art. 72)
  { da: 50_000, a: Infinity, aliquota: 0.0173 }, // Regione Lombardia, addizionale regionale IRPEF (l.r. 10/2003 art. 72)
];

// Addizionale comunale IRPEF: aliquota unica sull'intero imponibile, dovuta solo
// se l'imponibile supera la soglia di esenzione (che non è una franchigia).
export const ADD_COMUNALE_MILANO = {
  /** Aliquota unica applicata all'intero imponibile. */ // Comune di Milano, addizionale comunale IRPEF 2026, soglia esenzione 23.000€
  ALIQUOTA: 0.008,
  /** Sotto o pari a questa soglia l'addizionale non è dovuta. */ // Comune di Milano, addizionale comunale IRPEF 2026, soglia esenzione 23.000€
  SOGLIA_ESENZIONE: 23_000,
} as const;

/** Mensilità contrattuali di default per il caso standard impiegatizio. */
export const MENSILITA_DEFAULT = 13;
