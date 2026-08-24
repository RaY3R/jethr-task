/*
 *  STIPENDIO NETTO ITALIA 2026
 *  RAL − INPS − IRPEF netta − addizionali + cuneo esente = NETTO
 *
 *  Modulo di sole funzioni pure: nessuna dipendenza da React, nessun I/O,
 *  nessuno stato. Le aliquote e le soglie vivono in `src/constants/taxConsts.ts`,
 *  ognuna con la propria fonte normativa inline.
 *
 *  Caso modellato: impiegato a tempo indeterminato, full-year, residente a
 *  Milano, senza familiari a carico né agevolazioni, con reddito da solo
 *  lavoro dipendente. Le semplificazioni sono elencate in `ASSUNZIONI`.
 */

import {
  ADD_COMUNALE_MILANO,
  ALIQUOTA_INPS_LAVORATORE,
  CUNEO,
  DETRAZIONE_LAVORO,
  MENSILITA_DEFAULT,
  SCAGLIONI_ADD_REGIONALE_LOMBARDIA,
  SCAGLIONI_IRPEF,
  type Scaglione,
} from "@/constants/taxConsts";

/**
 * Il cuneo fiscale 2026 agisce in due modi alternativi a seconda del reddito:
 * sotto i 20.000€ è una somma esente che si aggiunge al netto, sopra è una
 * detrazione che abbatte l'IRPEF. Il tipo tiene distinti i due effetti.
 */
export type Cuneo = {
  tipo: "detrazione" | "sommaEsente";
  importo: number;
};

/** Scomposizione completa del calcolo: ogni voce intermedia è esposta, non solo il totale. */
export type RisultatoNetto = {
  ral: number;
  contributiInps: number;
  imponibileFiscale: number;
  irpefLorda: number;
  detrazioneLavoro: number;
  cuneo: Cuneo;
  irpefNetta: number;
  addRegionale: number;
  addComunale: number;
  nettoAnnuo: number;
  nettoMensile: number;
};

/**
 * Applica un'imposta progressiva per scaglioni: ogni aliquota colpisce solo la
 * quota di reddito che ricade nel proprio intervallo, non l'intero importo.
 */
function imponiPerScaglioni(imponibile: number, scaglioni: Scaglione[]): number {
  return scaglioni.reduce((imposta, { da, a, aliquota }) => {
    const quota = Math.min(imponibile, a) - da;
    return quota > 0 ? imposta + quota * aliquota : imposta;
  }, 0);
}

/** Contributi previdenziali a carico del lavoratore, calcolati sulla RAL. */
export function calcolaContributiInps(ral: number): number {
  return ral * ALIQUOTA_INPS_LAVORATORE;
}

/** IRPEF lorda, prima di qualsiasi detrazione. */
export function calcolaIrpefLorda(imponibileFiscale: number): number {
  return imponiPerScaglioni(imponibileFiscale, SCAGLIONI_IRPEF);
}

/**
 * Detrazione per redditi da lavoro dipendente (art. 13 TUIR): importo fisso
 * fino a 15.000€, poi decrescente a tratti fino ad azzerarsi a 50.000€.
 * Nella fascia 25.000–35.000€ si somma un bonus fisso.
 */
export function calcolaDetrazioneLavoro(imponibileFiscale: number): number {
  const r = imponibileFiscale;
  const d = DETRAZIONE_LAVORO;

  let detrazione: number;
  if (r <= d.SOGLIA_FASCIA_BASSA) {
    detrazione = d.IMPORTO_FASCIA_BASSA;
  } else if (r <= d.SOGLIA_INTERMEDIA) {
    detrazione =
      d.BASE_DECRESCENTE +
      (d.QUOTA_AGGIUNTIVA * (d.SOGLIA_INTERMEDIA - r)) / d.AMPIEZZA_FASCIA_INTERMEDIA;
  } else if (r <= d.SOGLIA_ALTA) {
    detrazione = (d.BASE_DECRESCENTE * (d.SOGLIA_ALTA - r)) / d.AMPIEZZA_FASCIA_ALTA;
  } else {
    detrazione = 0;
  }

  const spettaBonus = r > d.BONUS_DA && r <= d.BONUS_A;
  return detrazione + (spettaBonus ? d.BONUS : 0);
}

/**
 * Cuneo fiscale strutturale 2026. Fino a 20.000€ di imponibile è una somma
 * esente (percentuale dell'intero imponibile, non della sola quota di fascia);
 * da 20.000€ a 40.000€ è una detrazione da 1.000€, costante fino a 32.000€ e
 * poi linearmente decrescente fino ad azzerarsi.
 */
export function calcolaCuneo(imponibileFiscale: number): Cuneo {
  const r = imponibileFiscale;

  if (r <= CUNEO.SOGLIA_SOMMA_ESENTE) {
    const fascia = CUNEO.FASCE_SOMMA_ESENTE.find((f) => r <= f.fino_a);
    // `fascia` è sempre definita: l'ultima soglia coincide con SOGLIA_SOMMA_ESENTE.
    return { tipo: "sommaEsente", importo: r * (fascia?.aliquota ?? 0) };
  }

  if (r <= CUNEO.SOGLIA_INIZIO_DECALAGE) {
    return { tipo: "detrazione", importo: CUNEO.DETRAZIONE_PIENA };
  }

  if (r <= CUNEO.SOGLIA_AZZERAMENTO) {
    const residuo = CUNEO.SOGLIA_AZZERAMENTO - r;
    const ampiezza = CUNEO.SOGLIA_AZZERAMENTO - CUNEO.SOGLIA_INIZIO_DECALAGE;
    return { tipo: "detrazione", importo: (CUNEO.DETRAZIONE_PIENA * residuo) / ampiezza };
  }

  return { tipo: "detrazione", importo: 0 };
}

/** Addizionale regionale Lombardia, progressiva per scaglioni sull'imponibile fiscale. */
export function calcolaAddizionaleRegionale(imponibileFiscale: number): number {
  return imponiPerScaglioni(imponibileFiscale, SCAGLIONI_ADD_REGIONALE_LOMBARDIA);
}

/**
 * Addizionale comunale Milano: aliquota unica sull'intero imponibile, dovuta
 * solo oltre la soglia di esenzione. La soglia non è una franchigia — superata,
 * l'aliquota colpisce tutto l'imponibile, non solo l'eccedenza.
 */
export function calcolaAddizionaleComunale(imponibileFiscale: number): number {
  if (imponibileFiscale <= ADD_COMUNALE_MILANO.SOGLIA_ESENZIONE) return 0;
  return imponibileFiscale * ADD_COMUNALE_MILANO.ALIQUOTA;
}

/**
 * Calcola il netto annuo e mensile a partire dalla RAL, restituendo tutte le
 * voci intermedie della busta paga semplificata.
 *
 * @param ral Retribuzione Annua Lorda in euro (≥ 0).
 * @param mensilita Numero di mensilità contrattuali su cui spalmare il netto.
 * @throws Se la RAL non è un numero finito ≥ 0 o le mensilità non sono > 0.
 */
export function calcolaNetto(ral: number, mensilita: number = MENSILITA_DEFAULT): RisultatoNetto {
  if (!Number.isFinite(ral) || ral < 0) {
    throw new RangeError("La RAL deve essere un numero finito maggiore o uguale a zero.");
  }
  if (!Number.isFinite(mensilita) || mensilita <= 0) {
    throw new RangeError("Le mensilità devono essere un numero finito maggiore di zero.");
  }

  const contributiInps = calcolaContributiInps(ral);
  const imponibileFiscale = ral - contributiInps;

  const irpefLorda = calcolaIrpefLorda(imponibileFiscale);
  const detrazioneLavoro = calcolaDetrazioneLavoro(imponibileFiscale);
  const cuneo = calcolaCuneo(imponibileFiscale);

  // Il cuneo abbatte l'IRPEF solo quando è modellato come detrazione;
  // come somma esente entra invece direttamente nel netto (vedi sotto).
  const cuneoDetrazione = cuneo.tipo === "detrazione" ? cuneo.importo : 0;
  const cuneoSommaEsente = cuneo.tipo === "sommaEsente" ? cuneo.importo : 0;

  // Le detrazioni non generano credito d'imposta: l'IRPEF si ferma a zero.
  const irpefNetta = Math.max(0, irpefLorda - detrazioneLavoro - cuneoDetrazione);

  const addRegionale = calcolaAddizionaleRegionale(imponibileFiscale);
  const addComunale = calcolaAddizionaleComunale(imponibileFiscale);

  const nettoAnnuo =
    ral - contributiInps - irpefNetta - addRegionale - addComunale + cuneoSommaEsente;

  return {
    ral,
    contributiInps,
    imponibileFiscale,
    irpefLorda,
    detrazioneLavoro,
    cuneo,
    irpefNetta,
    addRegionale,
    addComunale,
    nettoAnnuo,
    nettoMensile: nettoAnnuo / mensilita,
  };
}

/** Semplificazioni applicate dal motore, da mostrare in UI accanto al risultato. */
export const ASSUNZIONI: readonly string[] = [
  "Impiegato a tempo indeterminato, in forza per l'intero anno.",
  "Residenza fiscale a Milano (Lombardia).",
  "Nessun familiare a carico e nessuna agevolazione o detrazione ulteriore.",
  "Reddito da solo lavoro dipendente, nessun altro reddito.",
  "Ignorata l'aliquota INPS aggiuntiva dell'1% oltre la prima fascia di retribuzione (~52.190€).",
  "Ignorato il minimo garantito di 690€ sulla detrazione da lavoro dipendente, irrilevante per un rapporto full-year.",
  "Addizionali regionale e comunale stimate sull'anno corrente: nella realtà si versano ad acconto e saldo nell'anno successivo.",
  "Netto mensile su 13 mensilità salvo diversa selezione.",
  "Calcolo riferito all'anno d'imposta 2026: dal 1° gennaio 2027 si applica il nuovo TUIR (D.Lgs. 117/2026), che sostituisce gli articoli del TUIR citati nelle fonti.",
];

/**
 * Identificativo stabile di una fonte. Ogni voce della scomposizione ne cita
 * uno, così il numero di nota mostrato in busta paga e la voce dell'elenco
 * "Fonti" restano allineati senza duplicare le stringhe.
 */
export type IdFonte =
  | "inps"
  | "irpef"
  | "detrazioneLavoro"
  | "cuneo"
  | "addRegionale"
  | "addComunale";

/** Una singola norma o pagina ufficiale citata, con il proprio link. */
export type Riferimento = {
  /** Come la norma va citata. Vedi `RIFERIMENTI`: una norma, una sola forma. */
  etichetta: string;
  /** Pagina ufficiale su cui il riferimento è verificabile. */
  url: string;
  /** Chi pubblica quella pagina. */
  editore: string;
  /**
   * Norma che ha abrogato questo riferimento quando l'abrogazione ha effetto
   * differito: fino a quella data il riferimento resta quello applicabile, e
   * citarlo senza dirlo darebbe una fonte formalmente superata.
   */
  abrogatoDa?: { riferimento: Riferimento; dal: string };
};

/**
 * Il nuovo TUIR abroga i primi 191 articoli del DPR 917/1986 — quindi anche
 * gli artt. 11 e 13 citati qui — ma le sue disposizioni si applicano dal
 * 1° gennaio 2027. Per l'anno d'imposta 2026 restano vigenti gli articoli
 * vecchi, e il calcolo non cambia.
 */
const NUOVO_TUIR: Riferimento = {
  etichetta: "D.Lgs. 19 giugno 2026, n. 117 (nuovo TUIR)",
  url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2026-06-19;117",
  editore: "Normattiva",
};

const ABROGAZIONE_TUIR = { riferimento: NUOVO_TUIR, dal: "1° gennaio 2027" };

export type Fonte = {
  id: IdFonte;
  /** Titolo leggibile della voce nell'elenco delle fonti. */
  voce: string;
  /** Cosa stabilisce la norma, in una riga. */
  dettaglio: string;
  /** Ogni norma citata dalla voce, ciascuna con il proprio link. */
  riferimenti: readonly Riferimento[];
};

/**
 * Le norme citate, definite una volta sola.
 *
 * Diverse voci citano la stessa legge (la Legge di Bilancio 2026 vale sia per
 * gli scaglioni IRPEF sia per il cuneo): passando sempre da qui, la stessa
 * norma non può comparire con due nomi diversi in punti diversi dell'elenco.
 *
 * Gli URL puntano alla fonte ufficiale, non a riassunti di terze parti: i
 * permalink Normattiva usano lo schema URN che risolve all'atto vigente.
 */
const RIFERIMENTI = {
  tuirArt11: {
    etichetta: "art. 11 TUIR (DPR 22 dicembre 1986, n. 917)",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1986-12-22;917~art11",
    editore: "Normattiva",
    abrogatoDa: ABROGAZIONE_TUIR,
  },
  tuirArt13: {
    etichetta: "art. 13 TUIR (DPR 22 dicembre 1986, n. 917)",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1986-12-22;917~art13",
    editore: "Normattiva",
    abrogatoDa: ABROGAZIONE_TUIR,
  },
  leggeBilancio2026: {
    etichetta: "L. 30 dicembre 2025, n. 199 (Legge di Bilancio 2026)",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2025-12-30;199",
    editore: "Normattiva",
  },
  l153Art12: {
    etichetta: "art. 12 L. 30 aprile 1969, n. 153",
    url: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1969-04-30;153~art12",
    editore: "Normattiva",
  },
  inpsAliquote: {
    etichetta: "Aliquote contributive vigenti",
    url: "https://www.inps.it/it/it/inps-comunica/diritti-e-obblighi-in-materia-di-sicurezza-sociale-nell-unione-e/per-le-imprese/aliquote-contributive.html",
    editore: "INPS",
  },
  lombardiaArt72: {
    etichetta: "art. 72 l.r. Lombardia 14 luglio 2003, n. 10",
    url: "https://normelombardia.consiglio.regione.lombardia.it/normelombardia/Accessibile/main.aspx?view=showpart&selnode=lr002003071400010&idparte=lr002003071400010",
    editore: "Consiglio regionale della Lombardia",
  },
  lombardiaAliquote: {
    etichetta: "Addizionale regionale IRPEF, aliquote per scaglione",
    url: "https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef",
    editore: "Regione Lombardia",
  },
  milanoAddizionale: {
    // Registro ufficiale del MEF: riporta aliquota e soglia deliberate dal Comune.
    etichetta: "Addizionale comunale IRPEF di Milano, aliquota e soglia deliberate",
    url: "https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/risultato.htm?anno=9999&lista=1&pagina=lombardia.htm&cm=&pr=MI&cc=F205&r=1",
    editore: "Dipartimento delle Finanze (MEF)",
  },
} as const satisfies Record<string, Riferimento>;

/**
 * Riferimenti normativi delle aliquote usate. L'ordine di questo array è anche
 * la numerazione delle note che compaiono accanto alle voci della busta paga.
 */
export const FONTI: readonly Fonte[] = [
  {
    id: "inps",
    voce: "Contributi INPS 9,19%",
    dettaglio:
      "Quota a carico del lavoratore su un'aliquota FPLD del 33%, ripartita 23,81% datore / 9,19% lavoratore.",
    riferimenti: [RIFERIMENTI.l153Art12, RIFERIMENTI.inpsAliquote],
  },
  {
    id: "irpef",
    voce: "Scaglioni IRPEF 23% / 33% / 43%",
    dettaglio:
      "Tre scaglioni progressivi sull'imponibile fiscale, nella misura in vigore dal 2026.",
    riferimenti: [RIFERIMENTI.tuirArt11, RIFERIMENTI.leggeBilancio2026],
  },
  {
    id: "detrazioneLavoro",
    voce: "Detrazione da lavoro dipendente",
    dettaglio:
      "Detrazione decrescente per scaglioni, con un bonus fisso di 65€ tra 25.000€ e 35.000€ di imponibile.",
    riferimenti: [RIFERIMENTI.tuirArt13],
  },
  {
    id: "cuneo",
    voce: "Cuneo fiscale strutturale",
    dettaglio:
      "Somma esente fino a 20.000€ di imponibile, detrazione tra 20.000€ e 40.000€.",
    riferimenti: [RIFERIMENTI.leggeBilancio2026],
  },
  {
    id: "addRegionale",
    voce: "Addizionale regionale Lombardia",
    dettaglio: "Aliquote progressive per scaglione sull'imponibile fiscale.",
    riferimenti: [RIFERIMENTI.lombardiaArt72, RIFERIMENTI.lombardiaAliquote],
  },
  {
    id: "addComunale",
    voce: "Addizionale comunale Milano 0,80%",
    dettaglio:
      "Aliquota unica sull'intero imponibile, dovuta solo oltre la soglia di esenzione di 23.000€.",
    riferimenti: [RIFERIMENTI.milanoAddizionale],
  },
];

/** Numero di nota di una fonte, 1-based, coerente con l'ordine di `FONTI`. */
export function numeroFonte(id: IdFonte): number {
  return FONTI.findIndex((fonte) => fonte.id === id) + 1;
}
