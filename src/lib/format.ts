/** Formattazione degli importi in convenzione italiana (separatore migliaia ".", decimali ","). */

const formattatoreEuro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // La convenzione it-IT non raggrupperebbe le migliaia sotto le 5 cifre ("2757,00"):
  // in una colonna di importi incolonnati la disomogeneità si nota, quindi forziamo il punto.
  useGrouping: "always",
});

/** Es. 23425.52 → "23.425,52 €". */
export function formattaEuro(importo: number): string {
  return formattatoreEuro.format(importo);
}

/** Come `formattaEuro`, ma con il segno meno esplicito davanti alle trattenute. */
export function formattaTrattenuta(importo: number): string {
  return `− ${formattaEuro(importo)}`;
}
