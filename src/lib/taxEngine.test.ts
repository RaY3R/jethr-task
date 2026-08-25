import { describe, expect, it } from "vitest";

import {
  calcolaNetto,
  FONTI,
  numeroFonte,
  type IdFonte,
  type Riferimento,
} from "./taxEngine";

/**
 * Tolleranza di ±1€: gli importi attesi derivano dalle formule normative
 * calcolate a mano e possono divergere per arrotondamenti sui decimali.
 */
const TOLLERANZA_EURO = 1;

/** Asserisce che due importi coincidano entro la tolleranza di arrotondamento. */
function attendiEuro(effettivo: number, atteso: number) {
  expect(Math.abs(effettivo - atteso)).toBeLessThanOrEqual(TOLLERANZA_EURO);
}

describe("calcolaNetto — RAL 30.000€", () => {
  const r = calcolaNetto(30000);

  it("espone la RAL ricevuta in input", () => {
    expect(r.ral).toBe(30000);
  });

  it("calcola i contributi INPS al 9,19%", () => {
    attendiEuro(r.contributiInps, 2757.0);
  });

  it("calcola l'imponibile fiscale", () => {
    attendiEuro(r.imponibileFiscale, 27243.0);
  });

  it("calcola l'IRPEF lorda per scaglioni", () => {
    attendiEuro(r.irpefLorda, 6265.89);
  });

  it("calcola la detrazione da lavoro dipendente, bonus +65€ incluso", () => {
    attendiEuro(r.detrazioneLavoro, 2044.29);
  });

  it("applica il cuneo fiscale come detrazione da 1.000€", () => {
    expect(r.cuneo.tipo).toBe("detrazione");
    attendiEuro(r.cuneo.importo, 1000);
  });

  it("calcola l'IRPEF netta", () => {
    attendiEuro(r.irpefNetta, 3221.6);
  });

  it("calcola l'addizionale regionale Lombardia", () => {
    attendiEuro(r.addRegionale, 377.94);
  });

  it("calcola l'addizionale comunale Milano", () => {
    attendiEuro(r.addComunale, 217.94);
  });

  it("calcola il netto annuo", () => {
    attendiEuro(r.nettoAnnuo, 23425.52);
  });

  it("calcola il netto mensile su 13 mensilità di default", () => {
    attendiEuro(r.nettoMensile, 23425.52 / 13);
  });
});

describe("calcolaNetto — RAL 50.000€", () => {
  const r = calcolaNetto(50000);

  it("calcola l'imponibile fiscale", () => {
    attendiEuro(r.imponibileFiscale, 45405.0);
  });

  it("calcola l'IRPEF lorda attraversando due scaglioni", () => {
    attendiEuro(r.irpefLorda, 12183.65);
  });

  it("calcola la detrazione da lavoro dipendente senza il bonus +65€", () => {
    attendiEuro(r.detrazioneLavoro, 398.93);
  });

  it("azzera il cuneo fiscale oltre i 40.000€ di imponibile", () => {
    expect(r.cuneo.importo).toBe(0);
  });

  it("calcola l'IRPEF netta", () => {
    attendiEuro(r.irpefNetta, 11784.72);
  });

  it("calcola l'addizionale regionale Lombardia", () => {
    attendiEuro(r.addRegionale, 689.27);
  });

  it("calcola l'addizionale comunale Milano", () => {
    attendiEuro(r.addComunale, 363.24);
  });

  it("calcola il netto annuo", () => {
    attendiEuro(r.nettoAnnuo, 32567.77);
  });
});

describe("cuneo fiscale — somma esente fino a 20.000€ di imponibile", () => {
  it("applica il 7,1% fino a 8.500€ e somma l'importo al netto", () => {
    const r = calcolaNetto(9000); // imponibile 8.172,90 → fascia ≤ 8.500
    expect(r.cuneo.tipo).toBe("sommaEsente");
    attendiEuro(r.cuneo.importo, r.imponibileFiscale * 0.071);

    // La somma esente si aggiunge al netto, non riduce l'IRPEF.
    attendiEuro(
      r.nettoAnnuo,
      9000 - r.contributiInps - r.irpefNetta - r.addRegionale - r.addComunale + r.cuneo.importo,
    );
  });

  it("applica il 5,3% tra 8.500€ e 15.000€", () => {
    const r = calcolaNetto(14000); // imponibile 12.713,40
    expect(r.cuneo.tipo).toBe("sommaEsente");
    attendiEuro(r.cuneo.importo, r.imponibileFiscale * 0.053);
  });

  it("applica il 4,8% tra 15.000€ e 20.000€", () => {
    const r = calcolaNetto(20000); // imponibile 18.162,00
    expect(r.cuneo.tipo).toBe("sommaEsente");
    attendiEuro(r.cuneo.importo, r.imponibileFiscale * 0.048);
  });
});

describe("cuneo fiscale — detrazione decrescente tra 32.000€ e 40.000€", () => {
  it("riduce linearmente la detrazione fino ad azzerarla", () => {
    const r = calcolaNetto(40000); // imponibile 36.324,00
    expect(r.cuneo.tipo).toBe("detrazione");
    attendiEuro(r.cuneo.importo, (1000 * (40000 - r.imponibileFiscale)) / 8000);
  });
});

describe("regole di contorno", () => {
  it("non produce mai IRPEF netta negativa", () => {
    const r = calcolaNetto(10000);
    expect(r.irpefNetta).toBeGreaterThanOrEqual(0);
  });

  it("azzera l'addizionale comunale sotto la soglia di 23.000€", () => {
    const r = calcolaNetto(24000); // imponibile 21.794,40 → sotto soglia
    expect(r.addComunale).toBe(0);
  });

  it("rispetta il numero di mensilità richiesto", () => {
    const r = calcolaNetto(30000, 14);
    attendiEuro(r.nettoMensile, r.nettoAnnuo / 14);
  });

  it("gestisce una RAL nulla senza produrre NaN", () => {
    const r = calcolaNetto(0);
    expect(r.nettoAnnuo).toBe(0);
    expect(r.nettoMensile).toBe(0);
  });

  it("rifiuta valori non finiti, negativi o mensilità nulle", () => {
    expect(() => calcolaNetto(-1)).toThrow();
    expect(() => calcolaNetto(Number.NaN)).toThrow();
    expect(() => calcolaNetto(30000, 0)).toThrow();
  });
});

describe("fonti", () => {
  it("assegna a ogni fonte un numero di nota 1-based coerente con l'ordine", () => {
    FONTI.forEach((fonte, indice) => {
      expect(numeroFonte(fonte.id)).toBe(indice + 1);
    });
  });

  it("non contiene id duplicati, che sdoppierebbero la numerazione delle note", () => {
    const id = FONTI.map((fonte) => fonte.id);
    expect(new Set(id).size).toBe(id.length);
  });

  /** Tutti i riferimenti citati, comprese le norme abroganti annidate. */
  function tuttiIRiferimenti(): Riferimento[] {
    const raccolti: Riferimento[] = [];
    for (const fonte of FONTI) {
      for (const riferimento of fonte.riferimenti) {
        raccolti.push(riferimento);
        if (riferimento.abrogatoDa) raccolti.push(riferimento.abrogatoDa.riferimento);
      }
    }
    return raccolti;
  }

  it("dà un link a ogni norma citata, non solo alla prima", () => {
    for (const fonte of FONTI) {
      expect(fonte.riferimenti.length).toBeGreaterThan(0);
    }
    for (const riferimento of tuttiIRiferimenti()) {
      expect(riferimento.url.startsWith("https://")).toBe(true);
      expect(riferimento.etichetta.length).toBeGreaterThan(0);
      expect(riferimento.editore.length).toBeGreaterThan(0);
    }
  });

  it("cita la stessa norma sempre con lo stesso nome e lo stesso link", () => {
    // La Legge di Bilancio 2026 compare sia sotto IRPEF sia sotto il cuneo, e il
    // nuovo TUIR abroga due articoli diversi: se una delle occorrenze ribattezzasse
    // la norma, l'elenco mostrerebbe due nomi per una sola legge.
    const perUrl = new Map<string, Set<string>>();
    const perEtichetta = new Map<string, Set<string>>();

    for (const { url, etichetta } of tuttiIRiferimenti()) {
      perUrl.set(url, (perUrl.get(url) ?? new Set()).add(etichetta));
      perEtichetta.set(etichetta, (perEtichetta.get(etichetta) ?? new Set()).add(url));
    }

    for (const [url, etichette] of perUrl) {
      expect([url, [...etichette]]).toEqual([url, [[...etichette][0]]]);
    }
    for (const [etichetta, url] of perEtichetta) {
      expect([etichetta, [...url]]).toEqual([etichetta, [[...url][0]]]);
    }
  });

  it("segnala l'abrogazione differita degli articoli del TUIR citati", () => {
    // Gli artt. 11 e 13 TUIR sono abrogati dal D.Lgs. 117/2026, che però si
    // applica dal 1° gennaio 2027: per il 2026 restano loro la norma vigente,
    // ma citarli senza dirlo darebbe una fonte formalmente superata.
    const tuir = tuttiIRiferimenti().filter((r) => r.etichetta.includes("TUIR (DPR"));
    expect(tuir.length).toBe(2);

    for (const riferimento of tuir) {
      expect(riferimento.abrogatoDa?.dal.toLocaleDateString()).toBe("01/01/2027");
      expect(riferimento.abrogatoDa?.riferimento.etichetta).toContain("D.Lgs. 19 giugno 2026");
    }
  });

  it("copre tutte le voci calcolate della scomposizione", () => {
    // Se una voce nuova resta senza fonte, questo elenco va aggiornato di pari passo.
    const attese: IdFonte[] = [
      "inps",
      "irpef",
      "detrazioneLavoro",
      "cuneo",
      "addRegionale",
      "addComunale",
      "mensilitaAggiuntive"
    ];
    expect(FONTI.map((fonte) => fonte.id).sort()).toEqual([...attese].sort());
  });
});
